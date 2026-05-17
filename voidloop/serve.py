#!/usr/bin/env python3
"""Simple HTTP server for local Voidloop development.

Usage:
    python3 serve.py

Then open http://localhost:8000 in your browser.
"""
import http.server
import socketserver
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get('PORT', '8000'))

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Disable caching for JS files during development
        if self.path.endswith('.js') or self.path.endswith('.html'):
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def do_POST(self):
        if self.path == '/api/lock-settings':
            content_len = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_len).decode('utf-8')
            try:
                data = __import__('json').loads(body)
                intensity = float(data.get('sunIntensity', 4.0))
                discSize = float(data.get('sunDiscSize', 0.06))
                settings_path = os.path.join(os.path.dirname(__file__), 'js', 'SettingsManager.js')
                with open(settings_path, 'r') as f:
                    text = f.read()
                import re
                text = re.sub(r'sunIntensity:\s*[\d.]+', f'sunIntensity: {intensity}', text, count=1)
                text = re.sub(r'sunDiscSize:\s*[\d.]+', f'sunDiscSize: {discSize}', text, count=1)
                with open(settings_path, 'w') as f:
                    f.write(text)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(__import__('json').dumps({'ok': True}).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(__import__('json').dumps({'ok': False, 'error': str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

os.chdir(os.path.dirname(os.path.abspath(__file__)))

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving Voidloop at http://localhost:{PORT}")
    print("Press Ctrl+C to stop")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
