"""
Balshi Instagram CMS - Streamlit Desktop Editor Interface (app.py)
A modern, creator-friendly desktop-grade editor for composing and scheduling
1170x1463 Instagram Creator posts.

Features:
- Two-Column Split Layout (st.columns([1, 1]))
  * Left Column: Studio Workspace with structured, icon-labeled expanders:
    1. 🖼️ Image Transformations (Zoom 1.0x-3.0x, Pan X, Pan Y, Rotation -45° to +45°)
    2. ✍️ Headline & Typography (Headline, Font Size 45, Text X, Text Y, Max W, Max H)
    3. 📝 Post Details & Scheduling (Title, Caption, Date, Time, Schedule Button)
  * Right Column: Real-time Live Mockup Preview (1170x1463)
- Strict 3-Layer Composite Pipeline:
  Layer 1 (Bottom): User Photo with cover-scale, zoom, pan, and rotation
  Layer 2 (Middle): Master template 'balshitemplate.png' pasted with alpha mask
  Layer 3 (Top): Left-aligned dynamic text with Roboto-Black, Photoshop -50 tracking, and auto-fit fallback
- SQLite WAL Database persistence (balshi_posts.db)
"""

import os
import io
import time
from datetime import datetime, date, time as dtime
from PIL import Image
import streamlit as st
from dotenv import load_dotenv
import terminal_ui

# Load environment variables with fallback defaults
load_dotenv()

DEFAULT_META_ACCESS_TOKEN = "EAAO8VlTokeABSjPjIRrLp3YRmz6lXb4iyQZCZBvcyN1TBb9IVZBEN8h9knIiCQUtwKZAhbikc1MV3ENvlPl6zEAkhSJjSewmDlsvrkEt3NgcoM3DlIYtlBIjgoZAI2u5XmzJPv5mxg1mPysIUiGxaLhZCqe06RZBYciHbXkStWCZARo7IbXfulB42aZC4Fnnw"
DEFAULT_IG_USER_ID = "17841426807831177"
DEFAULT_NGROK_AUTHTOKEN = "3JWrBVC98IP7ee0Swwygh9ZB7hY_79Eys3ntt2Wgo149mTghQ"
DEFAULT_NGROK_DOMAIN = "obligate-unhinge-defeat.ngrok-free.dev"
DEFAULT_LOCAL_HTTP_PORT = 8088

META_ACCESS_TOKEN = (os.getenv("META_ACCESS_TOKEN") or DEFAULT_META_ACCESS_TOKEN).strip()
IG_USER_ID = (os.getenv("IG_USER_ID") or DEFAULT_IG_USER_ID).strip()
NGROK_AUTHTOKEN = (os.getenv("NGROK_AUTHTOKEN") or DEFAULT_NGROK_AUTHTOKEN).strip()
NGROK_DOMAIN = (os.getenv("NGROK_DOMAIN") or DEFAULT_NGROK_DOMAIN).strip()
LOCAL_HTTP_PORT = int((os.getenv("LOCAL_HTTP_PORT") or str(DEFAULT_LOCAL_HTTP_PORT)).strip())

from database import (
    init_db,
    insert_post,
    get_all_posts,
    get_archive_posts,
    get_scheduled_posts,
    get_pending_posts,
    update_post_status,
    delete_post
)
from graphics import (
    render_preview,
    render_graphic,
    get_template_path,
    DEFAULT_BOX_X,
    DEFAULT_BOX_Y,
    DEFAULT_MAX_WIDTH,
    DEFAULT_MAX_HEIGHT,
    DEFAULT_FONT_SIZE,
    DEFAULT_FONT_PATH,
    DEFAULT_TRACKING,
    DEFAULT_LINE_SPACING,
    TEMPLATE_DEFAULT_PATH
)

# Initialize console banner once per session
if "terminal_banner_shown" not in st.session_state:
    st.session_state["terminal_banner_shown"] = True
    terminal_ui.print_banner(
        "STREAMLIT CREATOR STUDIO",
        extra_info=[
            "Studio Interface: http://localhost:8501",
            "3-Layer Compositor: Active (1170×1463)",
            "Database: balshi_posts.db (WAL Journal Mode)"
        ],
        clear=True
    )
    terminal_ui.print_status("✓", "Streamlit Creator Studio UI online at http://localhost:8501")

# Set Streamlit Page Configuration
st.set_page_config(
    page_title="Balshi Instagram Creator Studio",
    page_icon="📸",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Ensure runtime directories exist
os.makedirs("ready", exist_ok=True)
os.makedirs("published", exist_ok=True)
os.makedirs("fonts", exist_ok=True)
os.makedirs("assets", exist_ok=True)
init_db()

# ------------------------------------------------------------------------------
# INJECT MODERN CREATOR-GRADE DESKTOP STUDIO CSS
# ------------------------------------------------------------------------------
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    
    .main .block-container {
        padding-top: 1.25rem;
        padding-bottom: 2.5rem;
        max-width: 1400px;
    }
    
    /* Studio Header */
    .studio-header {
        background: linear-gradient(135deg, #090e17 0%, #0f172a 100%);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        padding: 16px 22px;
        margin-bottom: 18px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
    }
    
    .studio-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(0, 230, 118, 0.1);
        border: 1px solid rgba(0, 230, 118, 0.28);
        color: #00e676;
        padding: 4px 12px;
        border-radius: 9999px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
    }
    
    /* Modern Expander Card Polish */
    .streamlit-expanderHeader {
        background: #0f172a !important;
        border-radius: 10px !important;
        border: 1px solid #1e293b !important;
        font-weight: 600 !important;
        font-size: 14px !important;
        color: #f1f5f9 !important;
        padding: 0.65rem 1rem !important;
        transition: all 0.2s ease !important;
    }
    
    .streamlit-expanderHeader:hover {
        background: #1e293b !important;
        border-color: #334155 !important;
        color: #00e676 !important;
    }
    
    .streamlit-expanderContent {
        background: #090d16 !important;
        border: 1px solid #1e293b !important;
        border-top: none !important;
        border-bottom-left-radius: 10px !important;
        border-bottom-right-radius: 10px !important;
        padding: 1rem !important;
    }
    
    /* Primary Schedule Post Button */
    div.stButton > button[kind="primary"] {
        background: linear-gradient(135deg, #00e676 0%, #00b0ff 100%) !important;
        color: #050505 !important;
        font-weight: 800 !important;
        font-size: 15px !important;
        letter-spacing: 0.02em !important;
        padding: 0.75rem 1.5rem !important;
        border-radius: 10px !important;
        border: none !important;
        box-shadow: 0 4px 16px rgba(0, 230, 118, 0.3) !important;
        transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1) !important;
        cursor: pointer !important;
    }
    
    div.stButton > button[kind="primary"]:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 8px 24px rgba(0, 230, 118, 0.45) !important;
        filter: brightness(1.06) !important;
    }
    
    div.stButton > button[kind="primary"]:active {
        transform: scale(0.97) translateY(0) !important;
        box-shadow: 0 2px 8px rgba(0, 230, 118, 0.2) !important;
    }
    
    /* Secondary Action Button */
    div.stButton > button[kind="secondary"] {
        background: #1e293b !important;
        color: #f1f5f9 !important;
        font-weight: 600 !important;
        border: 1px solid #334155 !important;
        border-radius: 10px !important;
        transition: all 0.18s ease !important;
    }
    
    div.stButton > button[kind="secondary"]:hover {
        background: #273549 !important;
        border-color: #475569 !important;
        transform: translateY(-1.5px) !important;
    }
    
    div.stButton > button[kind="secondary"]:active {
        transform: scale(0.97) !important;
    }
    
    /* Canvas Container Frame */
    .preview-card {
        background: #090d16;
        border: 1px solid #1e293b;
        border-radius: 14px;
        padding: 16px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
    }
</style>
""", unsafe_allow_html=True)

# ------------------------------------------------------------------------------
# TOP APP HEADER
# ------------------------------------------------------------------------------
st.markdown(
    """
    <div class="studio-header">
        <div>
            <div style="display:flex; align-items:center; gap:10px;">
                <h1 style="margin:0; font-size:22px; font-weight:800; color:#ffffff; letter-spacing:-0.02em;">
                    Balshi Instagram Creator Studio
                </h1>
                <span class="studio-pill">● 3-LAYER COMPOSITOR ACTIVE</span>
            </div>
            <p style="margin:4px 0 0 0; font-size:12.5px; color:#94a3b8;">
                Photo Transforms (Zoom/Pan/Rotate) • balshitemplate.png Overlay • Left-Aligned Roboto Black with -50 Tracking
            </p>
        </div>
        <div style="display:flex; gap:8px;">
            <div style="background:#0f172a; border:1px solid #1e293b; border-radius:8px; padding:6px 12px; font-family:'JetBrains Mono', monospace; font-size:11px; color:#cbd5e1;">
                1170 × 1463 (4:5)
            </div>
        </div>
    </div>
    """,
    unsafe_allow_html=True
)

tab_studio, tab_queue = st.tabs(["🎨 Creator Studio", "📦 Scheduled Queue & Archive"])

# ==============================================================================
# TAB 1: CREATOR STUDIO (Two-Column Split Layout)
# ==============================================================================
with tab_studio:
    col_workspace, col_preview = st.columns([1, 1], gap="large")

    # --------------------------------------------------------------------------
    # LEFT COLUMN: STUDIO WORKSPACE WITH ICON-LABELED EXPANDER CARDS
    # --------------------------------------------------------------------------
    with col_workspace:
        st.markdown("### 🛠️ Studio Workspace")
        st.caption("Adjust photo framing, typography bounding box, and publication details:")

        # Photo File Selection with Native Drag-and-Drop
        st.markdown("**Photo Source** *(Drag & Drop or Browse)*")
        uploaded_photo = st.file_uploader(
            "Drag and drop image here (.jpg, .jpeg, .png, .webp)",
            type=["jpg", "jpeg", "png", "webp"],
            help="High-resolution image. Drop or select an image to render on Layer 1 beneath balshitemplate.png."
        )

        # ----------------------------------------------------------------------
        # EXPANDER 1: 🖼️ Image Transformations
        # ----------------------------------------------------------------------
        with st.expander("🖼️ Image Transformations (Zoom, Pan, Rotate)", expanded=True):
            st.caption("Frame and align the subject within the 1170×1463 canvas:")

            col_t1, col_t2 = st.columns(2)
            with col_t1:
                zoom_val = st.slider(
                    "Zoom Multiplier",
                    min_value=1.0,
                    max_value=3.0,
                    value=1.0,
                    step=0.05,
                    format="%.2fx",
                    help="Scales photo beyond the base 1170×1463 cover scale. Default: 1.00x."
                )

                pan_x_val = st.slider(
                    "Pan X (Horizontal)",
                    min_value=-600,
                    max_value=600,
                    value=0,
                    step=5,
                    format="%dpx",
                    help="Shift photo horizontally in pixels. Positive shifts right, negative shifts left."
                )

            with col_t2:
                rotation_val = st.slider(
                    "Rotation",
                    min_value=-45,
                    max_value=45,
                    value=0,
                    step=1,
                    format="%d°",
                    help="Rotate photo smoothly with high-fidelity bicubic resampling. Default: 0°."
                )

                pan_y_val = st.slider(
                    "Pan Y (Vertical)",
                    min_value=-600,
                    max_value=600,
                    value=0,
                    step=5,
                    format="%dpx",
                    help="Shift photo vertically in pixels. Positive shifts down, negative shifts up."
                )

            st.caption(f"📐 Active Transform: Zoom {zoom_val:.2f}x | Pan ({pan_x_val:+d}px, {pan_y_val:+d}px) | Rotation {rotation_val:+d}°")

        # ----------------------------------------------------------------------
        # EXPANDER 2: ✍️ Headline & Typography
        # ----------------------------------------------------------------------
        with st.expander("✍️ Headline & Typography", expanded=True):
            headline_input = st.text_input(
                "Headline (Renders on Graphic & Saves internally)",
                value="MARKETS SURGE AS TECH LEADERS RATIFY HISTORIC PROTOCOL ACCORD",
                help="Rendered strictly left-aligned on Layer 3 over balshitemplate.png and stored as post title."
            )

            col_f1, col_f2 = st.columns(2)
            with col_f1:
                font_size_val = st.slider(
                    "Font Size",
                    min_value=24,
                    max_value=70,
                    value=DEFAULT_FONT_SIZE,
                    step=1,
                    format="%dpx",
                    help="Base font size in px. Default: 45px. Auto-shrinks if text overflows box."
                )

                text_x_val = st.slider(
                    "Text X Position (Left Margin)",
                    min_value=0,
                    max_value=350,
                    value=DEFAULT_BOX_X,
                    step=5,
                    format="%dpx",
                    help="Left margin in pixels. Default 65px aligns with BREAKING badge."
                )

                max_w_val = st.slider(
                    "Max Text Width",
                    min_value=400,
                    max_value=1170,
                    value=DEFAULT_MAX_WIDTH,
                    step=10,
                    format="%dpx",
                    help="Maximum width before word wrapping. Default 1040px."
                )

            with col_f2:
                tracking_offset_px = (DEFAULT_TRACKING / 1000.0) * font_size_val
                st.markdown(
                    f"""
                    <div style="background:#0b1120; border:1px solid #1e293b; border-radius:8px; padding:8px 12px; margin-bottom:8px;">
                        <div style="font-size:11px; color:#94a3b8;">Photoshop Tracking (-50)</div>
                        <div style="font-size:13px; font-weight:700; color:#00e676; font-family:monospace;">
                            offset = ({tracking_offset_px:.2f}px/char)
                        </div>
                    </div>
                    """,
                    unsafe_allow_html=True
                )

                text_y_val = st.slider(
                    "Text Y Position (Top Offset)",
                    min_value=850,
                    max_value=1350,
                    value=DEFAULT_BOX_Y,
                    step=5,
                    format="%dpx",
                    help="Top offset in pixels. Default 1175px positions text beneath BREAKING badge."
                )

                max_h_val = st.slider(
                    "Max Text Height",
                    min_value=80,
                    max_value=400,
                    value=DEFAULT_MAX_HEIGHT,
                    step=10,
                    format="%dpx",
                    help="Maximum vertical box height before auto-decrementing font size."
                )

        # ----------------------------------------------------------------------
        # EXPANDER 3: 📝 Post Details & Scheduling
        # ----------------------------------------------------------------------
        with st.expander("📝 Post Details & Scheduling", expanded=True):
            caption_input = st.text_area(
                "Instagram Caption",
                value="Breaking updates from today's major market announcement.\n\n#balshi #breaking #technology #markets",
                height=90,
                help="Caption broadcasted with published Instagram feed post."
            )

            col_d, col_t = st.columns(2)
            with col_d:
                sched_date = st.date_input("Target Date", value=date.today())
            with col_t:
                sched_time = st.time_input("Target Time", value=dtime(hour=14, minute=30))

            target_dt = datetime.combine(sched_date, sched_time)
            target_epoch = int(target_dt.timestamp())

            # Prepare active photo source
            if uploaded_photo is not None:
                active_photo_source = uploaded_photo
            else:
                # Default placeholder image with gradient tone
                active_photo_source = Image.new("RGB", (1170, 1463), (24, 32, 48))

            rendered_image = None
            image_bytes = None
            render_err = None

            try:
                # Render dynamic preview via render_preview with transform controls
                rendered_image = render_preview(
                    photo=active_photo_source,
                    title=headline_input,
                    font_size=font_size_val,
                    text_x=text_x_val,
                    text_y=text_y_val,
                    max_w=max_w_val,
                    max_h=max_h_val,
                    zoom=zoom_val,
                    offset_x=pan_x_val,
                    offset_y=pan_y_val,
                    rotation=float(rotation_val),
                    tracking=DEFAULT_TRACKING,
                    line_spacing=DEFAULT_LINE_SPACING
                )
                # Convert rendered image on the fly to a 100% quality JPEG byte stream
                buf = io.BytesIO()
                rgb_export = rendered_image.convert("RGB") if rendered_image.mode != "RGB" else rendered_image
                rgb_export.save(buf, format="JPEG", quality=100, subsampling=0)
                image_bytes = buf.getvalue()
            except Exception as ex:
                render_err = ex

            st.write("")
            col_b1, col_b2 = st.columns([1, 1], gap="small")
            with col_b1:
                schedule_button_clicked = st.button("📥 Save to Queue", type="primary", use_container_width=True)
            with col_b2:
                if image_bytes is not None:
                    download_filename = f"balshi_{int(time.time())}.jpg"
                    st.download_button(
                        label="📥 Download High-Res Graphic",
                        data=image_bytes,
                        file_name=download_filename,
                        mime="image/jpeg",
                        use_container_width=True
                    )
                else:
                    st.button("📥 Download High-Res Graphic", disabled=True, use_container_width=True)

    # --------------------------------------------------------------------------
    # RIGHT COLUMN: LIVE MOCKUP PREVIEW (1170x1463)
    # --------------------------------------------------------------------------
    with col_preview:
        st.markdown("### 👁️ Live Mockup Preview (1170×1463)")
        st.caption("Layer 1 (Transformed Photo) → Layer 2 (balshitemplate.png) → Layer 3 (Dynamic Text)")

        if render_err is not None:
            st.error(f"Render Error: {render_err}")
        elif rendered_image is not None:
            st.image(rendered_image, use_container_width=True)

            # Metadata Strip below preview
            st.markdown(
                f"""
                <div style="display:flex; justify-content:space-between; align-items:center; background:#0b1120; border:1px solid #1e293b; border-radius:8px; padding:10px 14px; margin-top:8px; font-size:11.5px; font-family:'JetBrains Mono', monospace; color:#94a3b8;">
                    <span>DIM: 1170×1463</span>
                    <span>ZOOM: {zoom_val:.2f}x | PAN: ({pan_x_val:+d}, {pan_y_val:+d})</span>
                    <span>ROT: {rotation_val:+d}°</span>
                    <span>FONT: {font_size_val}px</span>
                </div>
                """,
                unsafe_allow_html=True
            )

        # Handle post submission — saves as Pending (awaiting approval in Queue tab)
        if schedule_button_clicked:
            if not headline_input.strip():
                st.error("Please enter a valid Headline before saving.")
            elif image_bytes is None:
                st.error("Cannot save: image rendering failed.")
            else:
                # Use UTC epoch for post_timestamp to stay timezone-consistent with publisher.py
                target_epoch = int(datetime.combine(sched_date, sched_time).timestamp())
                timestamp_now = int(time.time())
                out_filename = f"balshi_{target_epoch}_{timestamp_now}.jpg"
                out_path = os.path.join("ready", out_filename).replace("\\", "/")

                try:
                    with open(out_path, "wb") as f:
                        f.write(image_bytes)

                    new_post_id = insert_post(
                        title=headline_input.strip(),
                        image_path=out_path,
                        caption=caption_input.strip(),
                        post_timestamp=target_epoch,
                        status="Pending"
                    )

                    st.success(f"✅ Post #{new_post_id} saved to queue as **Pending**. Go to the **Queue & Archive** tab to approve it.")
                    terminal_ui.print_status("📥", f"Post #{new_post_id} saved to queue (Pending): '{headline_input[:35]}...'")
                    time.sleep(1.2)
                    st.rerun()
                except Exception as ex:
                    st.error(f"Failed to generate and save graphic: {ex}")
                    terminal_ui.print_error_box("Save Failed", str(ex), "Verify directory permissions.")


# ==============================================================================
# TAB 2: QUEUE & ARCHIVE
# ==============================================================================
with tab_queue:

    # --------------------------------------------------------------------------
    # SECTION 1: APPROVAL INBOX — Pending posts awaiting approval
    # --------------------------------------------------------------------------
    st.markdown("### ✍️ Approval Inbox — Pending Posts")
    st.caption("Posts saved here need your approval before the publisher daemon will process them.")

    pending_posts = get_pending_posts()

    if pending_posts:
        for post in pending_posts:
            post_time_str = datetime.fromtimestamp(post["post_timestamp"]).strftime("%Y-%m-%d %H:%M:%S")
            with st.container():
                col_info, col_thumb, col_actions = st.columns([3, 1, 1.2])
                with col_info:
                    st.markdown(f"**#{post['id']} • {post['title']}** &nbsp; <span style='background:#f59e0b22; color:#f59e0b; border:1px solid #f59e0b55; border-radius:6px; padding:2px 8px; font-size:11px; font-weight:700;'>⏳ PENDING</span>", unsafe_allow_html=True)
                    st.caption(f"📅 Scheduled for: {post_time_str} | Path: `{post['image_path']}`")
                    st.text_area("Caption", value=post["caption"], height=80, disabled=True, key=f"p_cap_{post['id']}")

                with col_thumb:
                    if os.path.exists(post["image_path"]):
                        st.image(post["image_path"], width=130)
                    else:
                        st.caption("📁 Graphic queued")

                with col_actions:
                    st.write("")
                    if st.button("✅ Approve", key=f"btn_approve_{post['id']}", type="primary", use_container_width=True):
                        update_post_status(post["id"], "Scheduled")
                        terminal_ui.print_status("✅", f"Post #{post['id']} approved → Scheduled")
                        st.success(f"Post #{post['id']} approved and moved to Scheduled!")
                        time.sleep(0.8)
                        st.rerun()

                    if st.button("🗑️ Reject & Delete", key=f"btn_pdel_{post['id']}", use_container_width=True):
                        delete_post(post["id"])
                        if os.path.exists(post["image_path"]):
                            try:
                                os.remove(post["image_path"])
                            except Exception:
                                pass
                        st.warning(f"Post #{post['id']} rejected and deleted.")
                        time.sleep(0.8)
                        st.rerun()
                st.divider()
    else:
        st.info("✅ No posts awaiting approval — inbox is clear.")

    # --------------------------------------------------------------------------
    # SECTION 2: SCHEDULED QUEUE — Approved posts waiting to be published
    # --------------------------------------------------------------------------
    st.markdown("### 📋 Scheduled Queue")
    st.caption("These posts have been approved and will be published by the daemon when their scheduled time arrives.")

    scheduled_posts = get_scheduled_posts()

    if scheduled_posts:
        for post in scheduled_posts:
            post_time_str = datetime.fromtimestamp(post["post_timestamp"]).strftime("%Y-%m-%d %H:%M:%S")
            with st.container():
                col_info, col_thumb, col_actions = st.columns([3, 1, 1.2])
                with col_info:
                    st.markdown(f"**#{post['id']} • {post['title']}** &nbsp; <span style='background:#00e67622; color:#00e676; border:1px solid #00e67655; border-radius:6px; padding:2px 8px; font-size:11px; font-weight:700;'>🟢 SCHEDULED</span>", unsafe_allow_html=True)
                    st.caption(f"📅 Due: {post_time_str} | Path: `{post['image_path']}`")
                    st.text_area("Caption", value=post["caption"], height=80, disabled=True, key=f"q_cap_{post['id']}")

                with col_thumb:
                    if os.path.exists(post["image_path"]):
                        st.image(post["image_path"], width=130)
                    else:
                        st.caption("📁 Graphic ready")

                with col_actions:
                    st.write("")
                    if st.button("↩️ Move to Pending", key=f"btn_unpub_{post['id']}", use_container_width=True):
                        update_post_status(post["id"], "Pending")
                        st.info(f"Post #{post['id']} moved back to Pending.")
                        time.sleep(0.8)
                        st.rerun()

                    if st.button("🗑️ Delete", key=f"btn_qdel_{post['id']}", use_container_width=True):
                        delete_post(post["id"])
                        if os.path.exists(post["image_path"]):
                            try:
                                os.remove(post["image_path"])
                            except Exception:
                                pass
                        st.warning(f"Post #{post['id']} deleted.")
                        time.sleep(0.8)
                        st.rerun()
                st.divider()
    else:
        st.info("No posts in the scheduled queue.")

    # --------------------------------------------------------------------------
    # SECTION 3: PUBLISHED ARCHIVE
    # --------------------------------------------------------------------------
    st.markdown("### 📦 Published Archive")
    archived_posts = get_archive_posts()
    if archived_posts:
        for post in archived_posts:
            post_time_str = datetime.fromtimestamp(post["post_timestamp"]).strftime("%Y-%m-%d %H:%M:%S")
            with st.container():
                col_info, col_thumb = st.columns([4, 1])
                with col_info:
                    st.markdown(f"**#{post['id']} • {post['title']}** <span style='color:#00e676; font-weight:700;'>[PUBLISHED]</span>", unsafe_allow_html=True)
                    st.caption(f"📅 Published: {post_time_str} | Path: `{post['image_path']}`")
                    st.text_area("Caption", value=post["caption"], height=80, disabled=True, key=f"arch_{post['id']}")
                with col_thumb:
                    if os.path.exists(post["image_path"]):
                        st.image(post["image_path"], width=130)
                st.divider()
    else:
        st.info("No archived posts found.")

