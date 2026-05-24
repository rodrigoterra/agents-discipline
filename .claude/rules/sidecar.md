# Sidecar Rules

- Python sidecar lives under `src/space/`.
- Read `src/space/AGENTS.md` and `src/space/CLAUDE.md` before changing it.
- Node and Python never share a runtime.
- Communication is HTTP/WebSocket on `127.0.0.1:8765`.
- Start sidecar from `voice-radio-poc/`:

```bash
source venv/bin/activate
./scripts/run_sidecar.sh
```

- One-time setup:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-sidecar.txt
python scripts/download_natural_earth.py
```

- Smoke client:

```bash
node examples/node_client.mjs
```
