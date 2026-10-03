# Balshi Instagram Creator Studio & Automated Publisher

A 100% local, zero-cost Content Management System (CMS) and automated background publisher built for the Instagram Creator account **Balshi**.

This architecture combines a desktop-grade Streamlit creation studio, a pixel-accurate **3-Layer Pillow compositing engine** (1170×1463 4:5 vertical), an SQLite database running in concurrent **Write-Ahead Logging (WAL)** mode, and an automated background publishing daemon powered by **pyngrok** and the **Meta Instagram Graph API v21.0**.

---

## 📁 System Architecture & Directory Structure

Place all project files on your local drive in the structure below:

```
balshi-instagram-studio/
├── balshitemplate.png        <- Master transparent overlay (Watermark, Scrim & [BREAKING] badge)
├── Roboto-Black.ttf          <- Authentic Roboto Black TrueType font
├── balshi_posts.db           <- SQLite database (auto-created on first run with WAL mode)
├── ready/                    <- Queued 1170×1463 JPEG graphics awaiting publication
├── published/                <- Successfully published graphics archived here
├── fonts/                    <- Fallback font directory (optional: fonts/Roboto-Black.ttf)
├── assets/                   <- Fallback asset directory (optional: assets/balshitemplate.png)
├── app.py                    <- Streamlit WYSIWYG Creator Studio & Queue interface
├── graphics.py               <- Pure 3-Layer Pillow compositing engine (-50 tracking)
├── database.py               <- SQLite WAL database layer (check_same_thread=False)
├── publisher.py              <- Meta Graph API v21.0 background publisher daemon
├── requirements.txt          <- Python package dependencies
└── .env                      <- Local credentials (Meta tokens, Instagram ID, Ngrok)
```

---

## 🎨 Strict 3-Layer Compositing Pipeline

The canvas rendering pipeline strictly enforces three distinct layers to guarantee exact visual identity without procedural artifacts:

1. **Layer 1 (Bottom): Background Photo**
   - User-uploaded image scaled to cover the full **1170×1463** canvas.
   - Supports interactive **Zoom** ($1.0\times$ – $3.0\times$), **Pan X** ($-600\text{px}$ to $+600\text{px}$), **Pan Y** ($-600\text{px}$ to $+600\text{px}$), and **Rotation** ($-45^\circ$ to $+45^\circ$) with high-quality bicubic resampling.
2. **Layer 2 (Middle): Master Template Overlay (`balshitemplate.png`)**
   - The single source of truth containing the top watermark, bottom dark gradient scrim, and `[BREAKING]` badge.
   - Pasted at `(0, 0)` using its own alpha mask:
     ```python
     canvas.paste(template, (0, 0), template)
     ```
3. **Layer 3 (Top): Left-Aligned Dynamic Headline**
   - Rendered using **Roboto-Black.ttf**.
   - Default Position: **Start X = 60px**, **Start Y = 1190px** (directly below badge).
   - Default Max Width: **1040px**, Max Height: **240px**.
   - Base Font Size: **45px**.
   - Photoshop **-50 Tracking**: Character-by-character layout with letter offset:
     $$\text{offset} = \left(\frac{-50}{1000}\right) \times \text{font\_size} = -2.25\text{px per char}$$
   - **Auto-Fit Safeguard**: If text wraps beyond the bounding box, font size automatically decrements by 1px steps until it fits within the boundaries.

---

## 📦 Dependencies & Installation

### 1. Python Environment (Python 3.10 - 3.12 recommended)
Open your terminal inside the project directory and create a virtual environment:

```bash
# Create virtual environment
python -m venv venv

# Activate on macOS / Linux:
source venv/bin/activate

# Activate on Windows (Command Prompt):
venv\Scripts\activate.bat

# Activate on Windows (PowerShell):
venv\Scripts\Activate.ps1
```

### 2. Install Dependencies
Run:

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

*(Or manual installation)*:
```bash
pip install streamlit>=1.30.0 Pillow>=10.0.0 requests>=2.31.0 pyngrok>=7.0.0 schedule>=1.2.0 python-dotenv>=1.0.0
```

---

## 🔑 External API & Token Setup Guide

This system requires two free external integrations:
1. **Meta Graph API** (to publish directly to your Instagram Creator account).
2. **Ngrok** (to temporarily expose your local `/ready/` graphic via HTTPS so Meta's servers can fetch it).

### Part A: Meta Developer & Instagram Creator Setup

#### Step 1: Account Requirements
1. Ensure your Instagram account is converted to an **Instagram Creator** or **Instagram Business** account (Personal accounts do NOT have API publishing privileges).
2. Create or open a **Facebook Page** (even an unpublished or empty page is fine).
3. In Instagram Settings $\rightarrow$ **Creator tools and controls** $\rightarrow$ **Connect or create a Facebook Page**, link your Instagram account to that Facebook Page.

#### Step 2: Create a Meta Developer App
1. Go to the [Meta for Developers Portal](https://developers.facebook.com/) and log in with your Facebook account.
2. Click **My Apps** $\rightarrow$ **Create App**.
3. Select **Other** $\rightarrow$ Next $\rightarrow$ Select **Business** as the app type $\rightarrow$ Next.
4. Enter an App Name (e.g., `Balshi Studio Publisher`) and select your Business Account / Contact Email $\rightarrow$ Click **Create App**.

#### Step 3: Add Instagram Graph API
1. In the App Dashboard, locate **Instagram Graph API** and click **Set Up**.
2. Go to **App settings** $\rightarrow$ **Basic** to find your **App ID** and **App Secret**.

#### Step 4: Generate a User Access Token via Graph API Explorer
1. Navigate to **Tools** $\rightarrow$ [Graph API Explorer](https://developers.facebook.com/tools/explorer/).
2. In the **Meta App** dropdown, select your newly created app (`Balshi Studio Publisher`).
3. In the **User or Page** dropdown, select **User Token**.
4. In the **Permissions** search bar, add the following scopes:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
5. Click **Generate Access Token** and follow the Facebook authentication popup.

#### Step 5: Find Your Instagram Business Account ID (`IG_USER_ID`)
1. In the Graph API Explorer query bar, enter:
   ```text
   me/accounts?fields=id,name,instagram_business_account
   ```
2. Click **Submit**. In the JSON response, locate your connected page:
   ```json
   {
     "data": [
       {
         "id": "123456789012345",
         "name": "Balshi Media",
         "instagram_business_account": {
           "id": "17841400000000000"
         }
       }
     ]
   }
   ```
3. Copy the numeric `id` inside `instagram_business_account` (e.g. `17841400000000000`). This is your **`IG_USER_ID`**.

#### Step 6: Convert to a 60-Day Long-Lived Access Token
Short-lived tokens from the Explorer expire in 1-2 hours. Exchange it for a **60-day token**:
1. Open your browser or run `curl` with this URL (replace with your values):
   ```text
   https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=SHORT_LIVED_TOKEN
   ```
2. The response will return your **60-day Long-Lived Token**:
   ```json
   {
     "access_token": "EAA...",
     "token_type": "bearer",
     "expires_in": 5184000
   }
   ```
3. Copy this `access_token`. This is your **`META_ACCESS_TOKEN`**.

---

### Part B: Ngrok Free Static Domain Setup

Meta's Graph API requires a publicly reachable HTTPS image URL when creating a media container. `publisher.py` spins up a lightweight local server and tunnels it via Ngrok only during the 30-second publishing window.

1. Create a free account at [ngrok.com](https://ngrok.com/).
2. Go to **Your Authtoken** in the Ngrok Dashboard: [dashboard.ngrok.com/get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken).
   - Copy the authtoken string. This is your **`NGROK_AUTHTOKEN`**.
3. Claim your **Free Static Domain**:
   - Go to **Domains** $\rightarrow$ [dashboard.ngrok.com/cloud-edge/domains](https://dashboard.ngrok.com/cloud-edge/domains).
   - Click **Create Domain** (Ngrok provides 1 free permanent domain per account, e.g., `balshi-studio.ngrok-free.app`).
   - Copy this domain name. This is your **`NGROK_DOMAIN`**.

---

## 🔐 Environment Variables (`.env`)

Create a `.env` file in the root project directory with the following variables:

```env
# Meta Instagram Graph API Credentials
META_ACCESS_TOKEN="EAAxxxxxx..."
IG_USER_ID="17841400000000000"

# Ngrok Configuration
NGROK_AUTHTOKEN="2xxxxxx..."
NGROK_DOMAIN="balshi-studio.ngrok-free.app"

# Local Server Configuration
LOCAL_HTTP_PORT="8088"
```

---

## 🚀 Execution Guide

To operate the pipeline, run the **Streamlit UI** and the **Publisher Daemon** in two separate terminal windows simultaneously.

### Terminal 1: Streamlit Creator Studio
```bash
# In your virtual environment:
streamlit run app.py
```
- Open your browser at `http://localhost:8501`.
- Upload a high-resolution photo.
- Adjust framing with Zoom ($1.0\times$ – $3.0\times$), Pan X, Pan Y, and Rotation.
- Enter your **Headline (Renders on Graphic & Saves internally)**.
- Adjust typography if desired (Font size defaults to 45px, left margin 60px, top offset 1190px).
- Add caption, select Target Date & Time, and click **🚀 Schedule Post to Queue**.
- The graphic is rendered via the 3-layer Pillow pipeline into `/ready/` and registered in `balshi_posts.db`.

### Terminal 2: Background Publisher Daemon
```bash
# In your virtual environment:
python publisher.py
```
- The daemon starts and prints:
  ```text
  [Publisher] Balshi Instagram Graph API Publisher Daemon Started
  [Publisher] Configured Instagram User ID: 17841400000000000
  [Publisher] Configured Ngrok Domain: balshi-studio.ngrok-free.app
  ```
- Every 60 seconds, it queries `balshi_posts.db` for posts with `status == 'Scheduled'` and `post_timestamp <= current_epoch`.
- When a post is due:
  1. Starts a background local HTTP server on port 8088.
  2. Opens the Ngrok tunnel with your static domain.
  3. POSTs container creation to Meta Graph API (`/v21.0/{IG_USER_ID}/media`).
  4. Polls container status until `FINISHED` (up to 120 seconds).
  5. Publishes the container to Instagram (`/v21.0/{IG_USER_ID}/media_publish`).
  6. Disconnects Ngrok and shuts down the local HTTP server.
  7. Moves the image from `/ready/` to `/published/`.
  8. Updates SQLite record status to `Posted`.

---

## ⚠️ Architectural & Operational Considerations

1. **60-Day Meta Token Expiration**:
   - Meta long-lived tokens expire every 60 days.
   - To prevent failed scheduled posts, refresh your token before the 60 days expire via the Meta Access Token Tool or Graph API Explorer.
2. **Meta Publishing Rate Limits**:
   - Meta restricts Instagram Creator accounts to **50 posts per 24-hour rolling window**. If scheduling bursts of posts, maintain reasonable spacing between release times.
3. **Local Storage & Drive Syncing**:
   - SQLite Write-Ahead Logging (WAL) uses POSIX shared-memory files (`balshi_posts.db-shm` and `balshi_posts.db-wal`). **Do NOT place this folder inside Dropbox, Google Drive, or OneDrive**, as external file syncing can break SQLite WAL lock concurrency.
4. **Machine Sleep & Power Settings**:
   - The publisher daemon runs locally. If your computer goes into sleep or hibernate mode, the Python schedule loop pauses. Ensure your computer remains awake or schedule publication during active machine hours.
