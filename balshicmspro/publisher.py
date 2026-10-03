"""
Balshi Instagram CMS - Graph API Publisher Daemon (publisher.py)
Background service that queries SQLite WAL for due scheduled posts, exposes a
temporary threaded HTTP server via pyngrok (Static Domain), orchestrates Meta
Instagram Graph API v21.0 container creation, status polling, publication, and cleanup.
"""

import os
import sys
import time
import shutil
import logging
import threading
import functools
import socketserver
from http.server import SimpleHTTPRequestHandler
from typing import Optional, Dict, Any, List
from datetime import datetime
import requests
import schedule
from dotenv import load_dotenv
from pyngrok import ngrok, conf

import database

# Import terminal UI utilities for dynamic dashboard
from terminal_ui import (
    clear_screen,
    print_banner,
    print_status,
    print_queue_table,
    print_empty_queue,
    print_error_box,
    print_success_box,
    print_publishing_header,
    ASCII_DB_ICON,
    RED,
)

# Load environment variables
load_dotenv()

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [Publisher] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("Publisher")
# Suppress console output from logger so the dashboard owns stdout
logger.propagate = False
_file_handler_added = False


def render_dashboard(posts: List[Dict[str, Any]], error_msg: Optional[str] = None) -> None:
    """
    Clears the terminal and renders the dynamic Balshi Publisher dashboard.
    - IDLE state (red)  : when no Scheduled posts are due.
    - ONLINE state (green): when 1+ posts are queued/due.
    Displays the ASCII_DB_ICON, status badge, queue table, and a live timestamp.
    """
    clear_screen()
    print_banner("BALSHI PUBLISHER", extra_info=[ASCII_DB_ICON.strip()], clear=False)

    now_str = datetime.now().strftime("%A, %d %b %Y  %H:%M:%S")
    print(f"\033[90m  ⏱  Local time: {now_str}\033[0m\n")

    if error_msg:
        print_error_box("Publisher Error", error_msg, "Check .env credentials and database permissions.")

    if not posts:
        print(f"\033[1;31m  [ STATUS: 🔴 IDLE — NO QUEUED POSTS ]\033[0m\n")
        print_empty_queue(datetime.now().strftime("%I:%M:%S %p"))
    else:
        print(f"\033[1;32m  [ STATUS: 🟢 ONLINE — {len(posts)} QUEUED POST(S) READY TO PUBLISH ]\033[0m\n")
        print_queue_table(posts, current_epoch=int(time.time()))

    print(f"\033[90m  Press Ctrl+C to stop the publisher daemon.\033[0m\n")


# Hardcoded Default Fallbacks so credentials are never missing
DEFAULT_META_ACCESS_TOKEN = "EAAO8VlTokeABSjPjIRrLp3YRmz6lXb4iyQZCZBvcyN1TBb9IVZBEN8h9knIiCQUtwKZAhbikc1MV3ENvlPl6zEAkhSJjSewmDlsvrkEt3NgcoM3DlIYtlBIjgoZAI2u5XmzJPv5mxg1mPysIUiGxaLhZCqe06RZBYciHbXkStWCZARo7IbXfulB42aZC4Fnnw"
DEFAULT_IG_USER_ID = "17841426807831177"
DEFAULT_NGROK_AUTHTOKEN = "3JWrBVC98IP7ee0Swwygh9ZB7hY_79Eys3ntt2Wgo149mTghQ"
DEFAULT_NGROK_DOMAIN = "obligate-unhinge-defeat.ngrok-free.dev"
DEFAULT_LOCAL_HTTP_PORT = 8088

# Configuration settings
READY_DIR = os.path.abspath("ready")
PUBLISHED_DIR = os.path.abspath("published")
os.makedirs(READY_DIR, exist_ok=True)
os.makedirs(PUBLISHED_DIR, exist_ok=True)

IG_USER_ID = (os.getenv("IG_USER_ID") or DEFAULT_IG_USER_ID).strip()
META_ACCESS_TOKEN = (os.getenv("META_ACCESS_TOKEN") or DEFAULT_META_ACCESS_TOKEN).strip()
NGROK_AUTHTOKEN = (os.getenv("NGROK_AUTHTOKEN") or DEFAULT_NGROK_AUTHTOKEN).strip()
NGROK_DOMAIN = (os.getenv("NGROK_DOMAIN") or DEFAULT_NGROK_DOMAIN).strip()
LOCAL_HTTP_PORT = int((os.getenv("LOCAL_HTTP_PORT") or str(DEFAULT_LOCAL_HTTP_PORT)).strip())
GRAPH_API_VERSION = "v21.0"
GRAPH_BASE_URL = f"https://graph.facebook.com/{GRAPH_API_VERSION}"


class ReusableTCPServer(socketserver.TCPServer):
    """TCPServer with address reuse enabled to avoid TIME_WAIT socket binding errors."""
    allow_reuse_address = True


def start_threaded_http_server(directory: str, port: int) -> ReusableTCPServer:
    """
    CRITICAL CONSTRAINT: Starts an http.server serving the given directory inside
    a daemon thread. Never blocks the main execution flow.
    """
    handler = functools.partial(SimpleHTTPRequestHandler, directory=directory)
    server = ReusableTCPServer(("127.0.0.1", port), handler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    logger.info(f"Threaded HTTP server started on http://127.0.0.1:{port} serving '{directory}'")
    return server


def publish_single_post(post: Dict[str, Any]) -> bool:
    """
    Executes the full 6-step publishing workflow for a single scheduled post:
    1. Start threaded HTTP server pointing to /ready/
    2. Tunnel with pyngrok Free Static Domain
    3. Verify public Ngrok image URL is strictly accessible over HTTPS
    4. Container Creation: POST https://graph.facebook.com/v21.0/{ig_user_id}/media
    5. Polling: GET https://graph.facebook.com/v21.0/{container_id}?fields=status_code,status
    6. Publishing: POST https://graph.facebook.com/v21.0/{ig_user_id}/media_publish
    7. Strict Check & Cleanup: Verify valid numeric ID returned, move file, update DB status.
    """
    post_id = post["id"]
    title = post["title"]
    image_path = post["image_path"].replace("\\", "/")
    caption = post["caption"]

    print_publishing_header(post_id, title)
    logger.info(f"Processing scheduled post #{post_id}: '{title}'")

    if not os.path.exists(image_path):
        err = f"Image file does not exist at path: '{image_path}'"
        print_error_box("Missing Image File", err, "Ensure image was saved into /ready/ directory.")
        logger.error(err)
        database.update_post_status(post_id, "Failed_MissingFile")
        return False

    if not IG_USER_ID or not META_ACCESS_TOKEN:
        err = "Missing IG_USER_ID or META_ACCESS_TOKEN credentials."
        print_error_box("Missing Credentials", err, "Check .env or system fallback defaults.")
        logger.error(err)
        return False

    http_server: Optional[ReusableTCPServer] = None
    active_tunnel = None
    filename = os.path.basename(image_path)

    try:
        # -------------------------------------------------------------
        # Step 1: Threaded Local HTTP Server
        # -------------------------------------------------------------
        print(f"\033[90m  [1/6] Starting local HTTP server on port {LOCAL_HTTP_PORT}...\033[0m")
        http_server = start_threaded_http_server(READY_DIR, LOCAL_HTTP_PORT)

        # -------------------------------------------------------------
        # Step 2: Ngrok Tunneling with Free Static Domain
        # -------------------------------------------------------------
        if NGROK_AUTHTOKEN:
            ngrok.set_auth_token(NGROK_AUTHTOKEN)

        print(f"\033[90m  [2/6] Connecting pyngrok tunnel (Domain: {NGROK_DOMAIN or 'Ephemeral'})...\033[0m")
        if NGROK_DOMAIN:
            active_tunnel = ngrok.connect(LOCAL_HTTP_PORT, domain=NGROK_DOMAIN)
        else:
            active_tunnel = ngrok.connect(LOCAL_HTTP_PORT)

        public_base_url = active_tunnel.public_url.rstrip("/")
        # Force HTTPS scheme
        if public_base_url.startswith("http://"):
            public_base_url = "https://" + public_base_url[len("http://"):]

        public_image_url = f"{public_base_url}/{filename}".replace("\\", "/")
        print(f"\033[1;36m  🌐 Public Image URL: {public_image_url}\033[0m")

        # Step 2b: Verify public Ngrok image URL accessibility over HTTPS
        print(f"\033[90m  [2b] Verifying Ngrok HTTPS URL reachability...\033[0m")
        try:
            head_check = requests.get(public_image_url, timeout=12, stream=True)
            print(f"\033[90m  [2b] Ngrok reachability check HTTP {head_check.status_code}\033[0m")
            if head_check.status_code != 200:
                print(f"\033[1;33m  ⚠️ Warning: Ngrok URL returned HTTP {head_check.status_code}. Proceeding with container creation...\033[0m")
        except Exception as check_exc:
            print(f"\033[1;33m  ⚠️ Ngrok pre-check warning: {check_exc}\033[0m")

        # -------------------------------------------------------------
        # Step 3: Container Creation (POST /media)
        # -------------------------------------------------------------
        container_endpoint = f"{GRAPH_BASE_URL}/{IG_USER_ID}/media"
        container_payload = {
            "image_url": public_image_url,
            "caption": caption,
            "access_token": META_ACCESS_TOKEN
        }

        print(f"\033[1;34m  [3/6] Submitting media container to Meta Graph API...\033[0m")
        print(f"\033[90m  POST {container_endpoint}\033[0m")
        resp = requests.post(container_endpoint, data=container_payload, timeout=30)

        print(f"\033[1;37m  Meta /media HTTP Response: {resp.status_code}\033[0m")
        try:
            container_data = resp.json()
            print(f"\033[90m  Meta /media JSON: {container_data}\033[0m")
        except Exception:
            container_data = {}
            print(f"\033[1;31m  Meta /media Raw Text: {resp.text}\033[0m")

        if resp.status_code != 200 or "error" in container_data:
            err_details = container_data.get("error", {}).get("message", resp.text)
            print_error_box(
                f"Meta Container Creation Failed (HTTP {resp.status_code})",
                f"Error: {err_details}\nFull Response: {container_data}",
                "Ensure META_ACCESS_TOKEN has instagram_content_publish permissions and IG_USER_ID is an Instagram Business/Creator account."
            )
            database.update_post_status(post_id, "Failed")
            return False

        container_id = container_data.get("id")
        if not container_id:
            err_details = f"Missing container 'id' in response: {container_data}"
            print_error_box("Meta Container ID Missing", err_details)
            database.update_post_status(post_id, "Failed")
            return False

        print(f"\033[1;32m  ✓ Media container created. Container ID: {container_id}\033[0m")

        # -------------------------------------------------------------
        # Step 4: Polling Status (GET /{container_id}?fields=status_code,status)
        # -------------------------------------------------------------
        status_endpoint = f"{GRAPH_BASE_URL}/{container_id}"
        status_params = {
            "fields": "status_code,status",
            "access_token": META_ACCESS_TOKEN
        }

        print(f"\033[1;34m  [4/6] Polling Meta container processing status...\033[0m")
        is_finished = False
        max_poll_attempts = 24  # 24 attempts * 5 sec = 120 sec max wait
        for attempt in range(1, max_poll_attempts + 1):
            time.sleep(5)
            try:
                poll_resp = requests.get(status_endpoint, params=status_params, timeout=15)
                try:
                    status_json = poll_resp.json()
                except Exception:
                    status_json = {"raw": poll_resp.text}

                container_status = status_json.get("status_code", "UNKNOWN")
                status_detail = status_json.get("status", "No additional details")
                print(f"\033[90m  [{attempt}/{max_poll_attempts}] Container status: {container_status} | Detail: {status_detail} | Response: {status_json}\033[0m")

                if container_status == "FINISHED":
                    is_finished = True
                    break
                elif container_status == "IN_PROGRESS":
                    # Continue polling on next iteration
                    continue
                elif container_status in ("ERROR", "EXPIRED"):
                    err_msg = f"Container status: {container_status}\nDetail: {status_detail}\nFull JSON: {status_json}"
                    print_error_box("Meta Processing Error", err_msg, "Meta failed to download or decode image from public Ngrok URL.")
                    logger.error(f"Container {container_id} failed with status '{container_status}': {status_detail}")
                    database.update_post_status(post_id, "Failed")
                    return False
            except requests.RequestException as re:
                print(f"\033[1;33m  Polling network warning (attempt #{attempt}): {re}\033[0m")

        if not is_finished:
            err_msg = f"Container polling timed out after {max_poll_attempts * 5} seconds without reaching FINISHED."
            print_error_box("Meta Processing Timeout", err_msg)
            database.update_post_status(post_id, "Failed")
            return False

        print(f"\033[1;32m  ✓ Container processing FINISHED.\033[0m")

        # -------------------------------------------------------------
        # Step 5: Publishing (POST /media_publish)
        # -------------------------------------------------------------
        publish_endpoint = f"{GRAPH_BASE_URL}/{IG_USER_ID}/media_publish"
        publish_payload = {
            "creation_id": container_id,
            "access_token": META_ACCESS_TOKEN
        }

        print(f"\033[1;34m  [5/6] Invoking Meta /media_publish endpoint...\033[0m")
        print(f"\033[90m  POST {publish_endpoint}\033[0m")
        pub_resp = requests.post(publish_endpoint, data=publish_payload, timeout=30)

        print(f"\033[1;37m  Meta /media_publish HTTP Response: {pub_resp.status_code}\033[0m")
        try:
            pub_data = pub_resp.json()
            print(f"\033[90m  Meta /media_publish JSON: {pub_data}\033[0m")
        except Exception:
            pub_data = {}
            print(f"\033[1;31m  Meta /media_publish Raw Text: {pub_resp.text}\033[0m")

        # Strict validation: error must be null and valid numeric id returned
        if pub_resp.status_code != 200 or "error" in pub_data:
            err_msg = pub_data.get("error", {}).get("message", pub_resp.text)
            print_error_box(
                f"Meta Publish Execution Failed (HTTP {pub_resp.status_code})",
                f"Error: {err_msg}\nFull Response: {pub_data}"
            )
            database.update_post_status(post_id, "Failed")
            return False

        instagram_post_id = pub_data.get("id")
        if not instagram_post_id or not str(instagram_post_id).isdigit():
            err_msg = f"Invalid or missing Instagram post id returned: {pub_data}"
            print_error_box("Invalid Post ID from Meta", err_msg)
            database.update_post_status(post_id, "Failed")
            return False

        # -------------------------------------------------------------
        # Step 6: Cleanup & Database Update (ONLY upon verified success)
        # -------------------------------------------------------------
        print(f"\033[1;32m  [6/6] Verified Instagram Post ID: {instagram_post_id}\033[0m")
        print_success_box(
            f"Successfully Published Post #{post_id} to Instagram!",
            f"Instagram Post ID: {instagram_post_id}\nHeadline: {title}"
        )

        dest_path = os.path.join(PUBLISHED_DIR, filename).replace("\\", "/")
        shutil.move(image_path, dest_path)
        database.update_post_status(post_id, "Posted", image_path=dest_path)
        logger.info(f"Database updated: Post #{post_id} marked as 'Posted'")
        return True

    except requests.RequestException as e:
        err_msg = f"Network error interacting with Meta Graph API: {e}"
        print_error_box("Network Error", err_msg)
        logger.error(err_msg)
        database.update_post_status(post_id, "Failed")
        return False
    except Exception as e:
        err_msg = f"Unexpected error publishing post #{post_id}: {e}"
        print_error_box("Unexpected Error", err_msg)
        logger.error(err_msg, exc_info=True)
        database.update_post_status(post_id, "Failed")
        return False
    finally:
        # Guarantee resource teardown so ports and ngrok tunnels do not leak
        if active_tunnel:
            try:
                print(f"\033[90m  Teardown: Closing ngrok tunnel: {active_tunnel.public_url}\033[0m")
                ngrok.disconnect(active_tunnel.public_url)
            except Exception as e:
                logger.warning(f"Error disconnecting ngrok: {e}")

        if http_server:
            try:
                print(f"\033[90m  Teardown: Shutting down local HTTP server...\033[0m")
                http_server.shutdown()
                http_server.server_close()
            except Exception as e:
                logger.warning(f"Error shutting down HTTP server: {e}")


def check_and_publish_due_posts() -> None:
    """
    Main job scheduled to run every 60 seconds.
    1. Reconciles any legacy 'Approved' posts to 'Scheduled' so none are silently skipped.
    2. Ensures all image paths in the database use normalized forward slashes.
    3. Queries SQLite for status == 'Scheduled' and post_timestamp <= current_epoch.
    """
    try:
        reconciled = database.reconcile_approved_posts()
        if reconciled > 0:
            logger.info(f"Resilience Fallback: Automatically updated {reconciled} legacy 'Approved' post(s) to 'Scheduled'.")
        database.normalize_all_image_paths()
    except Exception as e:
        logger.warning(f"Error during legacy status/path reconciliation: {e}")

    current_epoch = int(time.time())
    error_msg: Optional[str] = None
    try:
        due_posts = database.get_due_scheduled_posts(current_epoch)
        render_dashboard(due_posts)
        for post in due_posts:
            publish_single_post(post)
    except Exception as e:
        error_msg = str(e)
        render_dashboard([], error_msg=error_msg)
        logger.error(f"Error during scheduled database query: {e}")


def main() -> None:
    """Entry point: runs immediately once, then loops every 60 seconds."""
    # Initial dashboard render (shows IDLE or queue on startup)
    database.init_db()
    database.reconcile_approved_posts()
    database.normalize_all_image_paths()

    # Immediate first check + dashboard render
    check_and_publish_due_posts()

    # Continuous schedule loop every 60 seconds
    schedule.every(60).seconds.do(check_and_publish_due_posts)

    try:
        while True:
            schedule.run_pending()
            time.sleep(1)
    except (KeyboardInterrupt, SystemExit):
        clear_screen()
        print_banner("BALSHI PUBLISHER", extra_info=["Publisher daemon stopped gracefully. Goodbye!"], clear=False)
        print(f"\033[1;33m  👋 Publisher daemon stopped. Have a great day!\033[0m\n")


if __name__ == "__main__":
    main()
