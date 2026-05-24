# Claude Hooks

This directory is reserved for deterministic Claude Code hooks.

Shared hook scripts here should be safe, local-first, and documented before
they are enabled in any local `settings.local.json`.

Recommended checks before push:

```bash
npm run test
npm run build
git diff --check
```

Sidecar smoke when Python surface changes:

```bash
source venv/bin/activate
./scripts/run_sidecar.sh
node examples/node_client.mjs
```

Do not make hooks depend on network, API keys, or GUI apps.
