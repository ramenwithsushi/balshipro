"""
Balshi Instagram CMS - Database Module (database.py)
Handles SQLite database connection, table initialization, and CRUD operations.
Configured with check_same_thread=False and WAL journal mode for multi-threaded safety.
"""

import sqlite3
import time
from typing import List, Dict, Any, Optional

DB_FILE = "balshi_posts.db"


def get_connection(db_path: str = DB_FILE) -> sqlite3.Connection:
    """
    Returns an SQLite connection configured for concurrent access.
    - check_same_thread=False allows access across Streamlit worker and publisher threads.
    - PRAGMA journal_mode=WAL enables Write-Ahead Logging for high concurrency.
    """
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    with conn:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
    return conn


def init_db(db_path: str = DB_FILE) -> None:
    """
    Initializes the balshi_posts schema if it does not already exist.
    """
    conn = get_connection(db_path)
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                image_path TEXT NOT NULL,
                caption TEXT NOT NULL,
                post_timestamp INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'Scheduled'
            );
        """)
        # Index for efficient querying by status and timestamp
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_posts_status_time 
            ON posts(status, post_timestamp);
        """)
    conn.close()
    reconcile_approved_posts(db_path)
    normalize_all_image_paths(db_path)


def add_post(
    title: str,
    image_path: str,
    caption: str,
    post_timestamp: int,
    status: str = "Pending",
    db_path: str = DB_FILE
) -> int:
    """
    Inserts a newly prepared post into the database.
    Returns the newly generated post ID.
    Strictly standardizes any 'Approved' status to 'Scheduled' and normalizes
    file paths to use forward slashes (/).
    """
    final_status = "Scheduled" if status.strip().lower() == "approved" else status.strip()
    normalized_image_path = image_path.replace("\\", "/").strip()

    conn = get_connection(db_path)
    with conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO posts (title, image_path, caption, post_timestamp, status)
            VALUES (?, ?, ?, ?, ?)
            """,
            (title.strip(), normalized_image_path, caption.strip(), int(post_timestamp), final_status)
        )
        post_id = cursor.lastrowid
    conn.close()
    return post_id


def _format_row(row: Any) -> Dict[str, Any]:
    """Helper to convert sqlite3.Row to dict and guarantee forward slashes in image_path."""
    d = dict(row)
    if "image_path" in d and isinstance(d["image_path"], str):
        d["image_path"] = d["image_path"].replace("\\", "/")
    return d


def get_due_scheduled_posts(
    current_epoch: Optional[int] = None,
    db_path: str = DB_FILE
) -> List[Dict[str, Any]]:
    """
    Retrieves all posts with status == 'Scheduled' whose post_timestamp is <= current_epoch.
    Used by the background publisher daemon.
    """
    if current_epoch is None:
        current_epoch = int(time.time())

    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, title, image_path, caption, post_timestamp, status
        FROM posts
        WHERE status = 'Scheduled' AND post_timestamp <= ?
        ORDER BY post_timestamp ASC
        """,
        (current_epoch,)
    )
    rows = [_format_row(row) for row in cursor.fetchall()]
    conn.close()
    return rows


def get_posted_records(db_path: str = DB_FILE) -> List[Dict[str, Any]]:
    """
    Retrieves historical records with status == 'Posted'.
    Used by the Archive tab in Streamlit.
    """
    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, title, image_path, caption, post_timestamp, status
        FROM posts
        WHERE status = 'Posted'
        ORDER BY post_timestamp DESC
        """
    )
    rows = [_format_row(row) for row in cursor.fetchall()]
    conn.close()
    return rows


def get_all_posts(db_path: str = DB_FILE) -> List[Dict[str, Any]]:
    """
    Retrieves all records (both Scheduled, Posted, and Failed) for overview.
    """
    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, title, image_path, caption, post_timestamp, status
        FROM posts
        ORDER BY post_timestamp DESC
        """
    )
    rows = [_format_row(row) for row in cursor.fetchall()]
    conn.close()
    return rows


def update_post_status(
    post_id: int,
    new_status: str,
    image_path: Optional[str] = None,
    db_path: str = DB_FILE
) -> bool:
    """
    Updates the status (e.g., 'Posted' or 'Failed') and optionally the new image_path.
    Coerces any 'Approved' status to 'Scheduled' and normalizes file paths with forward slashes (/).
    """
    final_status = "Scheduled" if new_status.strip().lower() == "approved" else new_status.strip()
    if image_path:
        image_path = image_path.replace("\\", "/").strip()

    conn = get_connection(db_path)
    with conn:
        cursor = conn.cursor()
        if image_path:
            cursor.execute(
                "UPDATE posts SET status = ?, image_path = ? WHERE id = ?",
                (final_status, image_path, post_id)
            )
        else:
            cursor.execute(
                "UPDATE posts SET status = ? WHERE id = ?",
                (final_status, post_id)
            )
        affected = cursor.rowcount
    conn.close()
    return affected > 0


def reconcile_approved_posts(db_path: str = DB_FILE) -> int:
    """
    Resilience Fallback: Finds any posts with status == 'Approved' (case-insensitive)
    and updates them to 'Scheduled' so they are never silently skipped.
    Returns the number of rows modified.
    """
    conn = get_connection(db_path)
    with conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE posts SET status = 'Scheduled' WHERE LOWER(status) = 'approved'")
        affected = cursor.rowcount
    conn.close()
    return affected


def normalize_all_image_paths(db_path: str = DB_FILE) -> int:
    """
    Normalizes all existing image_path records in SQLite to use forward slashes (/).
    Returns the number of rows modified.
    """
    conn = get_connection(db_path)
    updated = 0
    with conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, image_path FROM posts WHERE image_path LIKE '%\\%'")
        rows = cursor.fetchall()
        for row in rows:
            normalized = row["image_path"].replace("\\", "/")
            cursor.execute("UPDATE posts SET image_path = ? WHERE id = ?", (normalized, row["id"]))
            updated += 1
    conn.close()
    return updated


def clear_all_posts(db_path: str = DB_FILE) -> int:
    """
    Removes all post records from the posts table in the database.
    """
    conn = get_connection(db_path)
    with conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM posts")
        affected = cursor.rowcount
    conn.close()
    return affected


def delete_post(post_id: int, db_path: str = DB_FILE) -> bool:
    """
    Permanently deletes a post record from the database.
    """
    conn = get_connection(db_path)
    with conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM posts WHERE id = ?", (post_id,))
        affected = cursor.rowcount
    conn.close()
    return affected > 0


def get_scheduled_posts(db_path: str = DB_FILE) -> List[Dict[str, Any]]:
    """
    Returns all posts with status == 'Scheduled' ordered chronologically.
    """
    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, title, image_path, caption, post_timestamp, status
        FROM posts
        WHERE status = 'Scheduled'
        ORDER BY post_timestamp ASC
        """
    )
    rows = [_format_row(row) for row in cursor.fetchall()]
    conn.close()
    return rows


def get_archive_posts(db_path: str = DB_FILE) -> List[Dict[str, Any]]:
    return get_posted_records(db_path)


def get_pending_posts(db_path: str = DB_FILE) -> List[Dict[str, Any]]:
    """
    Returns all posts with status == 'Pending' ordered chronologically.
    Used by the Queue & Archive approval tab in Streamlit.
    """
    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, title, image_path, caption, post_timestamp, status
        FROM posts
        WHERE status = 'Pending'
        ORDER BY post_timestamp ASC
        """
    )
    rows = [_format_row(row) for row in cursor.fetchall()]
    conn.close()
    return rows


# Backward-compatibility aliases
insert_post = add_post
get_due_posts = get_due_scheduled_posts


# Self-test on direct execution
if __name__ == "__main__":
    init_db()
    print("Database initialized successfully with WAL journal mode.")
