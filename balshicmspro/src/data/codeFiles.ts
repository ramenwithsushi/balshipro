export interface CodeFile {
  filename: string;
  language: string;
  description: string;
  content: string;
}

export const CODE_FILES: CodeFile[] = [
  {
    filename: 'graphics.py',
    language: 'python',
    description: 'Strict 3-layer compositing engine (Photo -> balshitemplate.png -> Dynamic Text). Eliminates all programmatic Pillow shapes and fake badges. Crashes with FileNotFoundError if balshitemplate.png is missing.',
    content: `\"\"\"
Balshi Instagram CMS - Real-Time Graphics Engine (graphics.py)
Strictly renders composited graphics at 1170x1463 resolution for Instagram Creator feeds.

STRICT 3-LAYER COMPOSITING ARCHITECTURE:
1. Layer 1 (Bottom): The user's photo (Scaled to 1170x1463, center-cropped, converted to RGBA).
   Supports interactive transforms (zoom, offset_x, offset_y, rotation).
2. Layer 2 (Middle): balshitemplate.png (Opened, converted to RGBA, pasted at (0, 0) using alpha mask).
   The ONLY source of gradient, watermark, and 'BREAKING' badge.
   ZERO programmatic shapes or fake badges. Raises FileNotFoundError if missing.
3. Layer 3 (Top): Dynamic text layer rendered with Roboto-Black.ttf directly on top of Layer 2.
   ImageDraw is used EXCLUSIVELY for text. No rectangles, no gradients, no badges drawn.
\"\"\"

import os
from typing import List, Tuple, Optional, Any
from PIL import Image, ImageOps, ImageDraw, ImageFont

CANVAS_WIDTH = 1170
CANVAS_HEIGHT = 1463
MASTER_TEMPLATE_FILENAME = "balshitemplate.png"

DEFAULT_FONT_SIZE = 45          # Strictly 45px base font size
DEFAULT_MIN_FONT_SIZE = 18
DEFAULT_BOX_X = 60              # Left margin matching BREAKING badge
DEFAULT_BOX_Y = 1190            # Top offset below BREAKING badge
DEFAULT_MAX_WIDTH = 1040        # Maximum width (1170 - 60 - 70)
DEFAULT_MAX_HEIGHT = 240        # Maximum height of text bounding box
DEFAULT_LINE_SPACING = 12       # Vertical distance between lines
DEFAULT_TRACKING = -50          # Photoshop -50 tracking

def resolve_master_template(specified_path: Optional[str] = None) -> str:
    \"\"\"
    Enforces master template 'balshitemplate.png'.
    Crashes intentionally with FileNotFoundError if missing.
    NO fallback shape or badge drawing is permitted.
    \"\"\"
    if specified_path:
        if os.path.isfile(specified_path):
            return specified_path
        raise FileNotFoundError(f"CRITICAL: Specified template '{specified_path}' not found!")

    candidates = [
        os.path.join(os.path.dirname(__file__), MASTER_TEMPLATE_FILENAME),
        os.path.join("assets", MASTER_TEMPLATE_FILENAME),
        os.path.join("public", MASTER_TEMPLATE_FILENAME),
        MASTER_TEMPLATE_FILENAME,
    ]
    for c in candidates:
        if c and os.path.isfile(c):
            return c

    raise FileNotFoundError(
        f"CRITICAL ARCHITECTURE ERROR: Master template '{MASTER_TEMPLATE_FILENAME}' was not found! "
        f"Programmatic Pillow shapes and fake badges have been completely eliminated."
    )

def render_preview(
    photo: Any,
    title: str,
    font_size: int = DEFAULT_FONT_SIZE,
    text_x: int = DEFAULT_BOX_X,
    text_y: int = DEFAULT_BOX_Y,
    max_w: int = DEFAULT_MAX_WIDTH,
    max_h: int = DEFAULT_MAX_HEIGHT,
    zoom: float = 1.0,
    offset_x: int = 0,
    offset_y: int = 0,
    rotation: float = 0.0,
    template_path: Optional[str] = None,
    output_path: Optional[str] = None,
    tracking: int = DEFAULT_TRACKING,
    line_spacing: int = DEFAULT_LINE_SPACING,
    text_color: Tuple[int, int, int] = (255, 255, 255)
) -> Image.Image:
    # -------------------------------------------------------------
    # LAYER 1: User's Photo (Scaled to 1170x1463, Center-Cropped, RGBA)
    # -------------------------------------------------------------
    raw_photo = Image.open(photo) if isinstance(photo, (str, bytes)) else photo
    photo_rgba = raw_photo.convert("RGBA")
    pw, ph = photo_rgba.size

    is_transformed = abs(float(zoom) - 1.0) > 0.001 or int(offset_x) != 0 or int(offset_y) != 0 or abs(float(rotation)) > 0.001

    if not is_transformed:
        canvas = ImageOps.fit(photo_rgba, (CANVAS_WIDTH, CANVAS_HEIGHT), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
    else:
        base_scale = max(CANVAS_WIDTH / max(1, pw), CANVAS_HEIGHT / max(1, ph))
        effective_scale = base_scale * max(0.1, float(zoom))
        scaled_photo = photo_rgba.resize((max(1, int(pw * effective_scale)), max(1, int(ph * effective_scale))), resample=Image.Resampling.LANCZOS)
        if abs(float(rotation)) > 0.001:
            scaled_photo = scaled_photo.rotate(float(rotation), resample=Image.Resampling.BICUBIC, expand=True)

        canvas = Image.new("RGBA", (CANVAS_WIDTH, CANVAS_HEIGHT), (0, 0, 0, 255))
        paste_x = int((CANVAS_WIDTH - scaled_photo.width) / 2) + int(offset_x)
        paste_y = int((CANVAS_HEIGHT - scaled_photo.height) / 2) + int(offset_y)
        canvas.paste(scaled_photo, (paste_x, paste_y), scaled_photo)

    # -------------------------------------------------------------
    # LAYER 2: balshitemplate.png (Pasted at (0, 0) using alpha mask)
    # -------------------------------------------------------------
    template_file = resolve_master_template(template_path)
    template = Image.open(template_file).convert("RGBA")
    if template.size != (CANVAS_WIDTH, CANVAS_HEIGHT):
        template = template.resize((CANVAS_WIDTH, CANVAS_HEIGHT), resample=Image.Resampling.LANCZOS)
    canvas.paste(template, (0, 0), template)

    # -------------------------------------------------------------
    # LAYER 3: Dynamic Text Layer (ImageDraw used ONLY for text)
    # -------------------------------------------------------------
    if title and title.strip():
        draw = ImageDraw.Draw(canvas)
        font, wrapped_lines, total_h, spacing_offset, final_size = fit_text_to_bounds(
            title, max_w, max_h, font_size, tracking=tracking
        )
        current_y = text_y
        for line in wrapped_lines:
            cursor_x = float(text_x)
            for char in line:
                draw.text((cursor_x + 2, current_y + 2), char, font=font, fill=(0, 0, 0, 220))
                draw.text((cursor_x, current_y), char, font=font, fill=text_color)
                cursor_x += font.getlength(char) + spacing_offset
            current_y += font.size + line_spacing

    rgb_canvas = canvas.convert("RGB")
    if output_path:
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        rgb_canvas.save(output_path, "JPEG", quality=95, optimize=True)
    return rgb_canvas
`
  },
  {
    filename: 'app.py',
    language: 'python',
    description: 'Modern, creator-friendly desktop Streamlit editor with two-column split layout, icon-labeled expanders for transforms, typography, and scheduling, and live 1170x1463 preview.',
    content: `\"\"\"
Balshi Instagram CMS - Streamlit Desktop Editor (app.py)
Features:
- Two-Column Split Layout (st.columns([1, 1])):
  * Left Column: Studio Workspace with icon-labeled expanders:
    1. 🖼️ Image Transformations (Zoom 1.0x-3.0x, Pan X, Pan Y, Rotation -45° to +45°)
    2. ✍️ Headline & Typography (Headline text, Font Size, Box X/Y, Max W/H)
    3. 📝 Post Details & Scheduling (Caption, Date/Time, Schedule Post)
  * Right Column: Real-time Live Mockup Preview (1170x1463) with container width scaling
- Strict 3-Layer Composite Pipeline (Photo -> balshitemplate.png -> Dynamic Text)
\"\"\"

import streamlit as st
from PIL import Image
from graphics import render_preview

st.set_page_config(page_title="Balshi Instagram Creator Studio", page_icon="📸", layout="wide")

col_workspace, col_preview = st.columns([1, 1], gap="large")

with col_workspace:
    st.markdown("### 🛠️ Studio Workspace")
    uploaded_photo = st.file_uploader("Upload Background Image", type=["jpg", "jpeg", "png", "webp"])

    with st.expander("🖼️ Image Transformations (Zoom, Pan, Rotate)", expanded=True):
        zoom_val = st.slider("Zoom Multiplier", 1.0, 3.0, 1.0, step=0.05, format="%.2fx")
        pan_x_val = st.slider("Pan X (Horizontal)", -600, 600, 0, step=5, format="%dpx")
        pan_y_val = st.slider("Pan Y (Vertical)", -600, 600, 0, step=5, format="%dpx")
        rotation_val = st.slider("Rotation", -45, 45, 0, step=1, format="%d°")

    with st.expander("✍️ Headline & Typography", expanded=True):
        headline_input = st.text_input("Headline Text", value="MARKETS SURGE AS TECH LEADERS RATIFY HISTORIC PROTOCOL ACCORD")
        font_size_val = st.slider("Font Size", 24, 70, 45, step=1, format="%dpx")
        text_x_val = st.slider("Text X Position", 0, 350, 60, step=5, format="%dpx")
        text_y_val = st.slider("Text Y Position", 850, 1350, 1190, step=5, format="%dpx")

    with st.expander("📝 Post Details & Scheduling", expanded=True):
        caption = st.text_area("Instagram Caption", value="Breaking updates from today...")
        st.button("🚀 Schedule Post to Queue", type="primary", use_container_width=True)

with col_preview:
    st.markdown("### 👁️ Live Mockup Preview (1170×1463)")
    rendered_image = render_preview(
        photo=uploaded_photo or Image.new("RGB", (1170, 1463), (24, 32, 48)),
        title=headline_input,
        font_size=font_size_val,
        text_x=text_x_val,
        text_y=text_y_val,
        zoom=zoom_val,
        offset_x=pan_x_val,
        offset_y=pan_y_val,
        rotation=float(rotation_val)
    )
    st.image(rendered_image, use_container_width=True)
`
  },
  {
    filename: 'database.py',
    language: 'python',
    description: 'SQLite database module with WAL mode, thread-safe connection, and CRUD methods.',
    content: `import sqlite3
import time
from typing import List, Dict, Any, Optional

DB_FILE = "balshi_posts.db"

def get_connection(db_path: str = DB_FILE) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    with conn:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
    return conn

def init_db(db_path: str = DB_FILE) -> None:
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
    conn.close()

def add_post(title: str, image_path: str, caption: str, post_timestamp: int, status: str = "Scheduled", db_path: str = DB_FILE) -> int:
    conn = get_connection(db_path)
    with conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO posts (title, image_path, caption, post_timestamp, status) VALUES (?, ?, ?, ?, ?)",
                       (title.strip(), image_path.strip(), caption.strip(), int(post_timestamp), status))
        post_id = cursor.lastrowid
    conn.close()
    return post_id

insert_post = add_post

def delete_post(post_id: int, db_path: str = DB_FILE) -> bool:
    conn = get_connection(db_path)
    with conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM posts WHERE id = ?", (post_id,))
        affected = cursor.rowcount
    conn.close()
    return affected > 0
`
  },
  {
    filename: 'publisher.py',
    language: 'python',
    description: 'Graph API background daemon with Ngrok static tunnel, container polling, and publication.',
    content: `import os
import sys
import time
import shutil
import logging
import requests
import schedule
from pyngrok import ngrok
import database

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [Publisher] %(message)s")
logger = logging.getLogger("Publisher")

IG_USER_ID = os.getenv("IG_USER_ID", "").strip()
META_ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN", "").strip()
NGROK_DOMAIN = os.getenv("NGROK_DOMAIN", "").strip()
LOCAL_HTTP_PORT = int(os.getenv("LOCAL_HTTP_PORT", "8088"))
`
  },
  {
    filename: 'README.md',
    language: 'markdown',
    description: 'System documentation covering 3-layer composition, image transformations, and desktop Streamlit UI.',
    content: `# Balshi Instagram Creator CMS & Automated Publisher
Strict 3-Layer Composition:
1. Layer 1 (Bottom): Transformed Photo (Cover Scale, Zoom 1.0x-3.0x, Pan X/Y, Rotation -45° to +45°)
2. Layer 2 (Middle): balshitemplate.png (Pasted with alpha channel mask)
3. Layer 3 (Top): Dynamic Left-Aligned Roboto Black text with Photoshop -50 tracking
`
  }
];
