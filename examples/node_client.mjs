// Minimal Node 22 sanity client for the Python sidecar.
//
// Run the sidecar in one terminal:
//   ./scripts/run_sidecar.sh
// Then in another:
//   node examples/node_client.mjs
//
// Requires Node 22 (built-in fetch + WebSocket). No npm install needed.

const BASE = process.env.SIDECAR_URL ?? "http://127.0.0.1:8765";
const WS = BASE.replace(/^http/, "ws");

async function main() {
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
  console.log("health:", health);

  const catalog = await fetch(`${BASE}/api/satellites`).then((r) => r.json());
  console.log(`catalog: ${catalog.satellites.length} satellites`);

  const issState = await fetch(`${BASE}/api/satellites/ISS/state`).then((r) => r.json());
  console.log("ISS:", issState);

  const term = await fetch(`${BASE}/api/terminator?twilight=civil`).then((r) => r.json());
  console.log(`terminator ring points: ${term.ring.length}, subsolar=${term.subsolar}`);

  // Stream four satellites at 1 fps for ~10 seconds.
  const ws = new WebSocket(`${WS}/ws/positions?ids=ISS,CSS,HST,NOAA20&fps=1`);
  let frames = 0;
  ws.onmessage = (ev) => {
    const snap = JSON.parse(ev.data.toString());
    frames += 1;
    console.log(`frame ${frames} @ ${snap.epoch}`);
    for (const s of snap.satellites) {
      console.log(`  ${s.alias.padEnd(8)} lat=${s.lat.toFixed(2)} lon=${s.lon.toFixed(2)} alt=${s.alt_km.toFixed(1)} km`);
    }
    if (frames >= 10) ws.close();
  };
  ws.onclose = () => console.log("ws closed");
  ws.onerror = (e) => console.error("ws error", e);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
