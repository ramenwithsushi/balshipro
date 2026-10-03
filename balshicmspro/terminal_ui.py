"""
Balshi Instagram CMS - Terminal UI & Styling Module (terminal_ui.py)
Provides ANSI styling, ASCII art branding, clean formatted dashboards, and queue visualization.
"""

import os
import sys
import time
from datetime import datetime
from typing import List, Dict, Any, Optional

# Enable UTF-8 encoding on standard streams
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Enable Windows VT100 console colors
if os.name == "nt":
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
    except Exception:
        pass

# ANSI Color Codes
CYAN = "\033[1;36m"
BLUE = "\033[1;34m"
GREEN = "\033[1;32m"
YELLOW = "\033[1;33m"
RED = "\033[1;31m"
MAGENTA = "\033[1;35m"
WHITE = "\033[1;37m"
GRAY = "\033[90m"
DARK_GRAY = "\033[38;5;240m"
BOLD = "\033[1m"
RESET = "\033[0m"

ASCII_LOGO = r"""
  ██████╗   █████╗  ██╗     ███████╗██╗  ██╗██╗
  ██╔══██╗ ██╔══██╗ ██║     ██╔════╝██║  ██║██║
  ██████╔╝ ███████║ ██║     ███████╗███████║██║
  ██╔══██╗ ██╔══██║ ██║     ╚════██║██╔══██║██║
  ██████╔╝ ██║  ██║ ███████╗███████║██║  ██║██║
  ╚═════╝  ╚═╝  ╚═╝ ╚══════╝╚══════╝╚═╝  ╚═╝╚═╝
"""

# ASCII Database Icon (stacked cylinders)
ASCII_DB_ICON = r"""
   __||__
  /______\
  \______/
   \____/
    \__/
"""


def clear_screen() -> None:
    """Clears the console screen."""
    os.system("cls" if os.name == "nt" else "clear")


def print_banner(service_name: str, extra_info: Optional[List[str]] = None, clear: bool = True) -> None:
    """Displays the Balshi ASCII art banner and startup status."""
    if clear:
        clear_screen()
    print(CYAN + ASCII_LOGO + RESET)
    print(YELLOW + "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" + RESET)
    print(BOLD + WHITE + "                   BALSHI INSTAGRAM CREATOR STUDIO                    " + RESET)
    print(GRAY + "      1170×1463 3-Layer Compositor  •  Meta Graph API v21.0           " + RESET)
    print(YELLOW + "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" + RESET)
    print(f"\n  {MAGENTA}▶ SERVICE:{RESET} {BOLD}{WHITE}{service_name}{RESET}")
    if extra_info:
        for line in extra_info:
            print(f"  {GRAY}• {line}{RESET}")
    print()


def print_status(icon: str, message: str, color: str = GREEN) -> None:
    """Prints a single clean status line."""
    time_str = datetime.now().strftime("%H:%M:%S")
    print(f"{GRAY}[{time_str}]{RESET} {color}[{icon}]{RESET} {message}")


def print_empty_queue(current_time_str: Optional[str] = None) -> None:
    """Displays a clean empty-queue heartbeat line."""
    t_str = current_time_str or datetime.now().strftime("%I:%M:%S %p")
    print(f"{GRAY}[ ☕ Queue Empty | Standing by for scheduled posts... ({t_str}) ]{RESET}")


def format_countdown(target_epoch: int, now_epoch: int) -> str:
    """Generates human-readable countdown string."""
    diff = target_epoch - now_epoch
    if diff <= 0:
        return f"{RED}{BOLD}⚡ DUE NOW{RESET}"
    elif diff < 60:
        return f"{YELLOW}in {diff}s{RESET}"
    elif diff < 3600:
        mins = diff // 60
        secs = diff % 60
        return f"{YELLOW}in {mins}m {secs}s{RESET}"
    elif diff < 86400:
        hrs = diff // 3600
        mins = (diff % 3600) // 60
        return f"{CYAN}in {hrs}h {mins}m{RESET}"
    else:
        days = diff // 86400
        hrs = (diff % 86400) // 3600
        return f"{CYAN}in {days}d {hrs}h{RESET}"


def print_queue_table(posts: List[Dict[str, Any]], current_epoch: Optional[int] = None) -> None:
    """Renders a clean, compact terminal table showing scheduled posts."""
    if not posts:
        print_empty_queue()
        return

    if current_epoch is None:
        current_epoch = int(time.time())

    time_str = datetime.now().strftime("%I:%M:%S %p")
    print(f"\n{BOLD}{CYAN}📋 SCHEDULED QUEUE DASHBOARD {GRAY}(Updated: {time_str}){RESET}")
    print(f"{CYAN}┌────┬──────────────────────────────────────────┬─────────────────────┬──────────────────┐{RESET}")
    print(f"{CYAN}│{BOLD}{WHITE} ID {RESET}{CYAN}│{BOLD}{WHITE} Headline Summary                          {RESET}{CYAN}│{BOLD}{WHITE} Scheduled (Local)   {RESET}{CYAN}│{BOLD}{WHITE} Due Status       {RESET}{CYAN}│{RESET}")
    print(f"{CYAN}├────┼──────────────────────────────────────────┼─────────────────────┼──────────────────┤{RESET}")

    for post in posts:
        post_id = str(post.get("id", ""))[:3].center(4)
        headline = (post.get("title", "") or "Untitled").strip().replace("\n", " ")
        if len(headline) > 40:
            headline = headline[:37] + "..."
        headline_padded = headline.ljust(40)

        ts = post.get("post_timestamp", 0)
        dt_local = datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M")
        dt_padded = dt_local.center(19)

        countdown = format_countdown(ts, current_epoch)
        # Strip ANSI for length padding
        plain_countdown = countdown
        for c in [RED, YELLOW, CYAN, BOLD, RESET]:
            plain_countdown = plain_countdown.replace(c, "")
        pad_len = max(0, 16 - len(plain_countdown))
        countdown_padded = countdown + (" " * pad_len)

        print(f"{CYAN}│{RESET} {post_id} {CYAN}│{RESET} {headline_padded} {CYAN}│{RESET} {dt_padded} {CYAN}│{RESET} {countdown_padded} {CYAN}│{RESET}")

    print(f"{CYAN}└────┴──────────────────────────────────────────┴─────────────────────┴──────────────────┘{RESET}\n")


def print_publishing_header(post_id: int, headline: str) -> None:
    """Displays an eye-catching publishing card."""
    print(f"\n{YELLOW}╔══════════════════════════════════════════════════════════════════════════════╗{RESET}")
    print(f"{YELLOW}║{BOLD}{WHITE}  🚀 PUBLISHING POST #{post_id:<56}{RESET}{YELLOW}║{RESET}")
    summary = headline.replace("\n", " ").strip()
    if len(summary) > 68:
        summary = summary[:65] + "..."
    print(f"{YELLOW}║{GRAY}  Headline: {summary:<63}{RESET}{YELLOW}║{RESET}")
    print(f"{YELLOW}╚══════════════════════════════════════════════════════════════════════════════╝{RESET}")


def print_error_box(title: str, message: str, troubleshooting: Optional[str] = None) -> None:
    """Renders a bold, clean red warning box without raw system jargon."""
    print(f"\n{RED}┌──────────────────────────────────────────────────────────────────────────────┐{RESET}")
    print(f"{RED}│{BOLD}{WHITE} ⚠️  ERROR: {title:<65}{RESET}{RED}│{RESET}")
    print(f"{RED}├──────────────────────────────────────────────────────────────────────────────┤{RESET}")
    for line in message.split("\n"):
        print(f"{RED}│{WHITE}  {line:<74}{RESET}{RED}│{RESET}")
    if troubleshooting:
        print(f"{RED}├──────────────────────────────────────────────────────────────────────────────┤{RESET}")
        print(f"{RED}│{YELLOW}  💡 Troubleshooting Advice:                                                  {RESET}{RED}│{RESET}")
        for line in troubleshooting.split("\n"):
            print(f"{RED}│{GRAY}  {line:<74}{RESET}{RED}│{RESET}")
    print(f"{RED}└──────────────────────────────────────────────────────────────────────────────┘{RESET}\n")


def print_success_box(title: str, details: Optional[str] = None) -> None:
    """Renders a clean green success box."""
    print(f"\n{GREEN}┌──────────────────────────────────────────────────────────────────────────────┐{RESET}")
    print(f"{GREEN}│{BOLD}{WHITE} [✓] {title:<70}{RESET}{GREEN}│{RESET}")
    if details:
        print(f"{GREEN}├──────────────────────────────────────────────────────────────────────────────┤{RESET}")
        for line in details.split("\n"):
            print(f"{GREEN}│{WHITE}  {line:<74}{RESET}{GREEN}│{RESET}")
    print(f"{GREEN}└──────────────────────────────────────────────────────────────────────────────┘{RESET}\n")

