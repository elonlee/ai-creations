Local server setup for Klondike-lite MVP (HTML5)

Overview
- Your HTML/JS project is currently using ES modules (script type="module" with files under js/).
- Opening the index.html directly via file:// can cause_MODULE/CORS issues in many browsers. Serving via a local HTTP server avoids this.

Two simple options to run locally:

Option A: Python http.server (no extra dependencies)
- Prereqs: Python 3 installed
- Commands (in project root):
  ```bash
  # Python 3
  python3 -m http.server 8000
  ```
- Open in browser: http://localhost:8000/index.html
- If port 8000 is in use, pick another port, e.g. 8080:
  ```bash
  python3 -m http.server 8080
  ```

Option B: Node http-server (requires Node, but works without Python)
- Prereqs: Node.js installed (optional: use npx)
- Commands (in project root):
  ```bash
  npx http-server -p 8000
  ```
- Open in browser: http://localhost:8000/index.html

Optional: add a start script (if you want to reuse via npm)
- Add to package.json:
  ```json
  "scripts": {
    "start": "http-server . -p 8000"
  }
  ```
- Run: npm run start

Notes
- The app uses ES modules; the server approach ensures modules are loaded with proper CORS headers.
- If you modify JS, changes should reflect on page reload because the server serves fresh files.
- If you run into firewall or port issues, try a different port or check for other servers listening on the port.
