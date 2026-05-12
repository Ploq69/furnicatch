#!/usr/bin/env python3
"""Simple HTTP server for local Voidloop development.

Usage:
    python3 serve.py

Then open http://localhost:8000 in your browser.
"""
import http.server
import socketserver
import os

PORT = 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Disable caching for JS files during development
        if self.path.endswith('.js') or self.path.endswith('.html'):
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

os.chdir(os.path.dirname(os.path.abspath(__file__)))

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving Voidloop at http://localhost:{PORT}")
    print("Press Ctrl+C to stop")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
