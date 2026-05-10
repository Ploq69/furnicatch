#!/usr/bin/env python3
import http.server
import os
import socketserver
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request
from pathlib import Path
from audit_common import REPO, ok, fail

CHROME = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")


def serve(port):
    handler = http.server.SimpleHTTPRequestHandler
    httpd = socketserver.TCPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd


def chrome_capture(url, out_png, dump_html=None):
    profile = tempfile.mkdtemp(prefix="tlm-chrome-")
    cmd = [
        str(CHROME),
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--hide-scrollbars",
        "--window-size=1600,1000",
        "--virtual-time-budget=5000",
        f"--user-data-dir={profile}",
        f"--screenshot={out_png}",
        url,
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=30)
    if result.returncode:
        raise RuntimeError(result.stderr or result.stdout)
    if dump_html:
        dom = subprocess.run([
            str(CHROME),
            "--headless=new",
            "--disable-gpu",
            "--no-first-run",
            "--virtual-time-budget=5000",
            f"--user-data-dir={profile}",
            "--dump-dom",
            url,
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=30)
        dump_html.write_text(dom.stdout, encoding="utf-8")


def png_nonblank(path):
    data = Path(path).read_bytes()
    return len(data) > 12000 and len(set(data[-4096:])) > 8


def main():
    print("BROWSER VISUAL")
    errors = 0
    if not CHROME.exists():
        fail("Google Chrome is required for browser visual audit")
        sys.exit(1)
    port = 8891
    os.chdir(REPO)
    httpd = serve(port)
    try:
        for _ in range(20):
            try:
                urllib.request.urlopen(f"http://127.0.0.1:{port}/thai-letter-miner/index.html", timeout=0.5)
                break
            except Exception:
                time.sleep(0.1)
        tmp = Path(tempfile.mkdtemp(prefix="tlm-audit-"))
        quiz_png = tmp / "quiz.png"
        quiz_html = tmp / "quiz.html"
        chrome_capture(f"http://127.0.0.1:{port}/thai-letter-miner/index.html?auditQuiz=consonant_01_ko_kai", quiz_png, quiz_html)
        html = quiz_html.read_text(encoding="utf-8", errors="ignore")
        if "thai-model-preview-canvas" in html and "data-thai-model-preview" in html:
            ok("forced quiz DOM contains 3D Thai model preview canvases")
        else:
            fail("forced quiz DOM did not expose Thai 3D preview canvases")
            errors += 1
        if png_nonblank(quiz_png):
            ok("forced quiz screenshot is nonblank")
        else:
            fail("forced quiz screenshot appears blank/tiny")
            errors += 1
        pet_png = tmp / "pet.png"
        chrome_capture(f"http://127.0.0.1:{port}/thai-letter-miner/index.html?auditPet=consonant_01_ko_kai", pet_png)
        if png_nonblank(pet_png):
            ok("forced pet screenshot is nonblank")
        else:
            fail("forced pet screenshot appears blank/tiny")
            errors += 1
    finally:
        httpd.shutdown()
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
