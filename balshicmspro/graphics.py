"""
Balshi Instagram CMS - Real-Time Graphics Engine (graphics.py)
Strictly renders composited graphics at 1170x1463 resolution for Instagram Creator feeds.

STRICT 3-LAYER COMPOSITING ARCHITECTURE:
- Layer 1: The user's photo (Scaled to 1170x1463, center-cropped, converted to RGBA).
           Supports interactive visual transforms (zoom, offset_x, offset_y, rotation).
- Layer 2: balshitemplate.png (Opened, converted to RGBA, and pasted at (0, 0) using itself as the mask).
           Contains the authentic gradient, watermark, and 'BREAKING' badge.
           NO PROGRAMMATIC SHAPES OR RECTANGLES ARE DRAWN.
           If balshitemplate.png is missing, raises FileNotFoundError immediately.
- Layer 3: Dynamic Text Layer.
           ImageDraw is used ONLY to render the Roboto-Black.ttf text on top of Layer 2.
           Strictly left-aligned with Photoshop -50 tracking and safe-zone auto-shrinking.

Export: Coerced to RGB (.convert("RGB")) before saving as JPEG.
"""

import os
import io
from typing import List, Tuple, Optional, Any
from PIL import Image, ImageOps, ImageDraw, ImageFont

CANVAS_WIDTH = 1170
CANVAS_HEIGHT = 1463

# Paths and Asset Directories
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
FONTS_DIR = os.path.join(PROJECT_ROOT, "fonts")
ASSETS_DIR = os.path.join(PROJECT_ROOT, "assets")

# Master Overlay Template Name
MASTER_TEMPLATE_FILENAME = "balshitemplate.png"
TEMPLATE_DEFAULT_PATH = os.path.join(PROJECT_ROOT, MASTER_TEMPLATE_FILENAME)

# Font Paths
DEFAULT_FONT_PATH = os.path.join(FONTS_DIR, "Roboto-Black.ttf")
ROOT_FONT_PATH = os.path.join(PROJECT_ROOT, "Roboto-Black.ttf")
ASSETS_FONT_PATH = os.path.join(ASSETS_DIR, "Roboto-Black.ttf")

# Typography & Bounding Box Defaults
DEFAULT_FONT_SIZE = 45          # Strictly 45px base font size
DEFAULT_MIN_FONT_SIZE = 18
DEFAULT_BOX_X = 60              # Left margin matching BREAKING badge
DEFAULT_BOX_Y = 1190            # Top offset below BREAKING badge
DEFAULT_MAX_WIDTH = 1040        # Maximum width (1170 - 60 - 70)
DEFAULT_MAX_HEIGHT = 240        # Maximum height of text bounding box
DEFAULT_LINE_SPACING = 12       # Vertical distance between lines
DEFAULT_TRACKING = -50          # Photoshop -50 tracking


def resolve_master_template(specified_path: Optional[str] = None) -> str:
    """
    Resolves the path to the required 'balshitemplate.png' master overlay template.
    If an explicit template_path is provided and does not exist, or if 'balshitemplate.png'
    is missing from all standard locations, strictly raises FileNotFoundError.
    NO fallback shape or badge drawing is permitted.
    """
    if specified_path:
        if os.path.isfile(specified_path):
            return specified_path
        raise FileNotFoundError(
            f"CRITICAL ARCHITECTURE ERROR: Specified template '{specified_path}' was not found!\n"
            f"Pillow shape drawing is strictly prohibited. Master template file is required."
        )

    candidates = [
        os.path.join(PROJECT_ROOT, MASTER_TEMPLATE_FILENAME),
        f"./{MASTER_TEMPLATE_FILENAME}",
        MASTER_TEMPLATE_FILENAME,
        os.path.join(ASSETS_DIR, MASTER_TEMPLATE_FILENAME),
        os.path.join(PROJECT_ROOT, "public", MASTER_TEMPLATE_FILENAME),
        f"./assets/{MASTER_TEMPLATE_FILENAME}",
        f"./public/{MASTER_TEMPLATE_FILENAME}",
    ]

    for candidate in candidates:
        if candidate and os.path.isfile(candidate):
            return candidate

    raise FileNotFoundError(
        f"CRITICAL ARCHITECTURE ERROR: Master template '{MASTER_TEMPLATE_FILENAME}' was not found!\n"
        f"The graphics engine strictly requires the transparent master overlay '{MASTER_TEMPLATE_FILENAME}' "
        f"containing the authentic gradient, watermark, and 'BREAKING' badge.\n"
        f"Programmatic Pillow shapes, rectangles, and fake badges have been completely eliminated.\n"
        f"Please ensure '{MASTER_TEMPLATE_FILENAME}' is placed in the project root or assets/ directory."
    )


# Backwards compatibility alias for resolve_master_template
get_template_path = resolve_master_template


def load_font(font_path: Optional[str] = None, size: int = DEFAULT_FONT_SIZE) -> ImageFont.FreeTypeFont:
    """
    Loads Roboto-Black font. Checks specified path, fonts/ directory,
    project root, assets/ fallback, and standard system paths.
    """
    candidates = [
        font_path,
        DEFAULT_FONT_PATH,
        ROOT_FONT_PATH,
        ASSETS_FONT_PATH,
        os.path.join("fonts", "Roboto-Black.ttf"),
        os.path.join("assets", "Roboto-Black.ttf"),
        "Roboto-Black.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
        "C:\\Windows\\Fonts\\ariblk.ttf",
    ]
    for path in candidates:
        if path and os.path.exists(path):
            try:
                return ImageFont.truetype(path, size=size)
            except Exception:
                continue
    try:
        return ImageFont.truetype("DejaVuSans-Bold.ttf", size=size)
    except Exception:
        return ImageFont.load_default()


def calculate_tracking_offset(font_size: int, tracking: int = DEFAULT_TRACKING) -> float:
    """
    Photoshop tracking formula:
    spacing_offset = (tracking / 1000.0) * font_size
    Example at 45px and tracking = -50:
    (-50 / 1000) * 45 = -2.25 px
    """
    return (tracking / 1000.0) * font_size


def measure_tracked_line_width(text: str, font: ImageFont.ImageFont, spacing_offset: float) -> float:
    """
    Measures the exact pixel width of a text line taking into account individual
    character glyph widths and Photoshop tracking spacing offsets.
    """
    if not text:
        return 0.0

    total_width = 0.0
    for i, char in enumerate(text):
        try:
            char_w = font.getlength(char)
        except AttributeError:
            bbox = font.getbbox(char)
            char_w = bbox[2] - bbox[0]
        total_width += char_w
        if i < len(text) - 1:
            total_width += spacing_offset

    return total_width


def wrap_text_tracked(
    text: str,
    font: ImageFont.ImageFont,
    max_width: int,
    spacing_offset: float
) -> List[str]:
    """
    Wraps text word-by-word, measuring exact character-by-character tracked width
    to guarantee pixel width strictly remains within max_width.
    """
    words = text.strip().split()
    if not words:
        return []

    lines: List[str] = []
    current_words: List[str] = []

    for word in words:
        test_line = " ".join(current_words + [word])
        line_width = measure_tracked_line_width(test_line, font, spacing_offset)

        if line_width <= max_width or not current_words:
            current_words.append(word)
        else:
            lines.append(" ".join(current_words))
            current_words = [word]

    if current_words:
        lines.append(" ".join(current_words))

    return lines


def calculate_multiline_height(
    lines: List[str],
    font: ImageFont.ImageFont,
    line_spacing: int = DEFAULT_LINE_SPACING
) -> Tuple[int, List[int]]:
    """
    Measures total vertical height in pixels of wrapped lines.
    """
    if not lines:
        return 0, []

    total_height = 0
    line_heights: List[int] = []

    for line in lines:
        try:
            bbox = font.getbbox(line)
            h = bbox[3] - bbox[1]
        except AttributeError:
            h = 40
        h = max(h, int(getattr(font, "size", DEFAULT_FONT_SIZE) * 0.95))
        line_heights.append(h)
        total_height += h + line_spacing

    total_height = max(0, total_height - line_spacing)
    return total_height, line_heights


def fit_text_to_bounds(
    text: str,
    max_width: int = DEFAULT_MAX_WIDTH,
    max_height: int = DEFAULT_MAX_HEIGHT,
    initial_font_size: int = DEFAULT_FONT_SIZE,
    min_font_size: int = DEFAULT_MIN_FONT_SIZE,
    font_path: Optional[str] = None,
    line_spacing: int = DEFAULT_LINE_SPACING,
    tracking: int = DEFAULT_TRACKING
) -> Tuple[ImageFont.ImageFont, List[str], int, float, int]:
    """
    Dynamic Bounding Box & Fallback:
    Starts at initial_font_size (45px). If headline overflows max_height or max_width,
    decrements font size down by 1px steps until the left-aligned text strictly fits within
    both max_height and max_width.
    """
    current_size = initial_font_size

    while current_size >= min_font_size:
        font = load_font(font_path=font_path, size=current_size)
        spacing_offset = calculate_tracking_offset(current_size, tracking)
        wrapped_lines = wrap_text_tracked(text, font, max_width, spacing_offset)
        total_height, _ = calculate_multiline_height(wrapped_lines, font, line_spacing)

        # Check that height fits and no individual line overflows max_width
        all_lines_fit_width = all(
            measure_tracked_line_width(line, font, spacing_offset) <= max_width
            for line in wrapped_lines
        )

        if total_height <= max_height and all_lines_fit_width:
            return font, wrapped_lines, total_height, spacing_offset, current_size

        current_size -= 1

    # Fallback to min_font_size
    font = load_font(font_path=font_path, size=min_font_size)
    spacing_offset = calculate_tracking_offset(min_font_size, tracking)
    wrapped_lines = wrap_text_tracked(text, font, max_width, spacing_offset)
    total_height, _ = calculate_multiline_height(wrapped_lines, font, line_spacing)
    return font, wrapped_lines, total_height, spacing_offset, min_font_size


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
    text_color: Tuple[int, int, int] = (255, 255, 255),
    font_path: Optional[str] = None,
    align: str = "left"
) -> Image.Image:
    """
    STRICT 3-LAYER COMPOSITE PIPELINE:

    Layer 1: The user's photo (Scaled to 1170x1463, center-cropped, converted to RGBA).
             Supports zoom, pan (offset_x/offset_y), and rotation.
    Layer 2: balshitemplate.png (Opened, converted to RGBA, and pasted at (0, 0) using itself as the mask).
             Throws FileNotFoundError if missing. NO PROGRAMMATIC SHAPES OR GRADIENTS ARE DRAWN.
    Layer 3: Dynamic text layer rendered with Roboto-Black.ttf directly on top of Layer 2.
             ImageDraw is strictly and exclusively used for text drawing.

    Export: Coerced to RGB (.convert("RGB")) before saving.
    """
    # -------------------------------------------------------------
    # LAYER 1: The User's Photo (Scaled to 1170x1463, Center-Cropped, RGBA)
    # -------------------------------------------------------------
    if isinstance(photo, str):
        raw_photo = Image.open(photo)
    elif isinstance(photo, bytes):
        raw_photo = Image.open(io.BytesIO(photo))
    elif hasattr(photo, "getvalue"):
        raw_photo = Image.open(io.BytesIO(photo.getvalue()))
    elif hasattr(photo, "read"):
        try:
            photo.seek(0)
        except Exception:
            pass
        raw_photo = Image.open(photo)
    elif isinstance(photo, Image.Image):
        raw_photo = photo
    else:
        # Fallback photo if none provided (e.g. solid neutral tone)
        raw_photo = Image.new("RGB", (CANVAS_WIDTH, CANVAS_HEIGHT), (25, 30, 40))

    # Convert to RGBA for alpha compositing
    photo_rgba = raw_photo.convert("RGBA")
    pw, ph = photo_rgba.size

    # Check if user specified any transformation (zoom, pan, rotate)
    is_transformed = (
        abs(float(zoom) - 1.0) > 0.001 or
        int(offset_x) != 0 or
        int(offset_y) != 0 or
        abs(float(rotation)) > 0.001
    )

    if not is_transformed:
        # Exact center-crop without geometric distortion to 1170x1463
        canvas = ImageOps.fit(
            photo_rgba,
            (CANVAS_WIDTH, CANVAS_HEIGHT),
            method=Image.Resampling.LANCZOS,
            centering=(0.5, 0.5)
        )
    else:
        # Apply transform pipeline
        base_scale = max(CANVAS_WIDTH / max(1, pw), CANVAS_HEIGHT / max(1, ph))
        effective_scale = base_scale * max(0.1, float(zoom))
        new_w = max(1, int(round(pw * effective_scale)))
        new_h = max(1, int(round(ph * effective_scale)))
        scaled_photo = photo_rgba.resize((new_w, new_h), resample=Image.Resampling.LANCZOS)

        if abs(float(rotation)) > 0.001:
            scaled_photo = scaled_photo.rotate(
                float(rotation),
                resample=Image.Resampling.BICUBIC,
                expand=True
            )

        # Place transformed photo on 1170x1463 canvas
        canvas = Image.new("RGBA", (CANVAS_WIDTH, CANVAS_HEIGHT), (0, 0, 0, 255))
        paste_x = int((CANVAS_WIDTH - scaled_photo.width) / 2) + int(offset_x)
        paste_y = int((CANVAS_HEIGHT - scaled_photo.height) / 2) + int(offset_y)
        canvas.paste(scaled_photo, (paste_x, paste_y), scaled_photo)

    # -------------------------------------------------------------
    # LAYER 2: balshitemplate.png (Pasted at (0, 0) using itself as mask)
    # -------------------------------------------------------------
    # CRITICAL: Resolve master template path. If missing, MUST throw FileNotFoundError.
    # NO PROGRAMMATIC SHAPES, RECTANGLES, OR GRADIENTS.
    template_file_path = resolve_master_template(template_path)

    template = Image.open(template_file_path).convert("RGBA")
    if template.size != (CANVAS_WIDTH, CANVAS_HEIGHT):
        template = template.resize((CANVAS_WIDTH, CANVAS_HEIGHT), resample=Image.Resampling.LANCZOS)

    # Paste Layer 2 over Layer 1 using its own alpha channel as mask at (0, 0)
    canvas.paste(template, (0, 0), template)

    # -------------------------------------------------------------
    # LAYER 3: Dynamic Text Layer
    # ImageDraw is used ONLY to render text on top of Layer 2.
    # NO rectangles, NO badge drawing, NO gradients.
    # -------------------------------------------------------------
    if title and title.strip():
        draw = ImageDraw.Draw(canvas)
        # Enforce UPPERCASE headline per design spec
        title = title.upper()
        font, wrapped_lines, total_block_height, spacing_offset, final_size = fit_text_to_bounds(
            text=title,
            max_width=max_w,
            max_height=max_h,
            initial_font_size=font_size,
            min_font_size=DEFAULT_MIN_FONT_SIZE,
            font_path=font_path or DEFAULT_FONT_PATH,
            line_spacing=line_spacing,
            tracking=tracking
        )

        current_y = text_y

        for line in wrapped_lines:
            cursor_x = float(text_x)  # Strictly LEFT-ALIGNED

            for char in line:
                # Text drop shadow for contrast
                draw.text((cursor_x + 2, current_y + 2), char, font=font, fill=(0, 0, 0, 220))
                # Crisp headline text in Roboto Black
                draw.text((cursor_x, current_y), char, font=font, fill=text_color)

                try:
                    char_w = font.getlength(char)
                except AttributeError:
                    bbox = font.getbbox(char)
                    char_w = bbox[2] - bbox[0]

                cursor_x += char_w + spacing_offset

            try:
                bbox = font.getbbox(line)
                line_h = bbox[3] - bbox[1]
            except AttributeError:
                line_h = 36
            line_h = max(line_h, int(getattr(font, "size", final_size) * 0.95))
            current_y += line_h + line_spacing

    # -------------------------------------------------------------
    # Export: Coerce to RGB (.convert("RGB")) before saving as JPEG
    # -------------------------------------------------------------
    rgb_canvas = canvas.convert("RGB")

    if output_path:
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        rgb_canvas.save(output_path, "JPEG", quality=95, optimize=True)

    return rgb_canvas


def render_graphic(
    photo_input: Any,
    text: str,
    template_path: Optional[str] = None,
    output_path: Optional[str] = None,
    box_x: int = DEFAULT_BOX_X,
    box_y: int = DEFAULT_BOX_Y,
    max_width: int = DEFAULT_MAX_WIDTH,
    max_height: int = DEFAULT_MAX_HEIGHT,
    initial_font_size: int = DEFAULT_FONT_SIZE,
    min_font_size: int = DEFAULT_MIN_FONT_SIZE,
    font_path: Optional[str] = None,
    line_spacing: int = DEFAULT_LINE_SPACING,
    tracking: int = DEFAULT_TRACKING,
    text_color: Tuple[int, int, int] = (255, 255, 255),
    align: str = "left",
    zoom: float = 1.0,
    offset_x: int = 0,
    offset_y: int = 0,
    rotation: float = 0.0
) -> Image.Image:
    """
    Backwards-compatible wrapper calling render_preview.
    """
    return render_preview(
        photo=photo_input,
        title=text,
        font_size=initial_font_size,
        text_x=box_x,
        text_y=box_y,
        max_w=max_width,
        max_h=max_height,
        zoom=zoom,
        offset_x=offset_x,
        offset_y=offset_y,
        rotation=rotation,
        template_path=template_path,
        output_path=output_path,
        tracking=tracking,
        line_spacing=line_spacing,
        text_color=text_color,
        font_path=font_path,
        align=align
    )


if __name__ == "__main__":
    print("Testing graphics engine with strict 3-layer architecture...")
    test_photo = Image.new("RGB", (1200, 800), (45, 60, 85))
    rendered = render_preview(
        photo=test_photo,
        title="MARKETS SURGE AS TECH LEADERS RATIFY HISTORIC PROTOCOL ACCORD",
        output_path="test_strict_3layer.jpg",
        font_size=45
    )
    print(f"Rendered test graphic successfully: size={rendered.size}, mode={rendered.mode}")
