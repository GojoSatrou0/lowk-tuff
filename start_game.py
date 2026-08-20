from __future__ import annotations

import http.server
import socketserver
import threading
import webbrowser
import os
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        print("[LOCAL]", format % args)


def main():
    # Port 0 asks Windows to choose a free local port automatically.
    with socketserver.ThreadingTCPServer(("127.0.0.1", 0), QuietHandler) as server:
        server.allow_reuse_address = True
        port = server.server_address[1]
        url = f"http://127.0.0.1:{port}/"

        print()
        print("==============================================")
        print(" Open World Physics Lab - Local Game Launcher")
        print("==============================================")
        print(f"Game folder: {ROOT}")
        print(f"Opening: {url}")
        print()
        print("Keep this window open while playing.")
        print("Press Ctrl+C here when you want to stop the server.")
        print()

        threading.Timer(0.6, lambda: webbrowser.open(url)).start()

        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nStopping local game server...")


if __name__ == "__main__":
    main()
