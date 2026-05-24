import { useMemo, useState } from "react";
import { LiveOrbitView } from "../../space/LiveOrbitView";
import { useSatelliteCatalog, useSidecarHealth } from "../../space/sidecar";
import "./SpaceScreen.css";

export function SpaceScreen() {
  const catalog = useSatelliteCatalog();
  const health = useSidecarHealth(5000);
  const healthy = health.data?.ok ?? false;
  const satellites = catalog.data?.satellites ?? [];

  /**
   * Visibility map. Sparse: only contains entries the user has explicitly
   * toggled off. Default state for any catalog entry is "visible".
   */
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const allAliases = useMemo(() => satellites.map((s) => s.alias), [satellites]);
  const visibleAliases = useMemo(
    () => allAliases.filter((alias) => !hidden.has(alias)),
    [allAliases, hidden]
  );

  function toggle(alias: string) {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(alias)) next.delete(alias);
      else next.add(alias);
      return next;
    });
  }

  function setAllVisible(visible: boolean) {
    setHidden(visible ? new Set() : new Set(allAliases));
  }

  return (
    <div className="screen-stack space-screen">
      <header className="space-screen__head">
        <div>
          <h1>Space · Orbital Tracking</h1>
          <p>
            Real-time satellite positions, day/night terminator, and Natural
            Earth coastlines from the local Skyfield sidecar (FastAPI on{" "}
            <code>127.0.0.1:8765</code>). Click any satellite on the map to
            draw its ground track and visibility footprint. Toggle individual
            satellites with the checkboxes below.
          </p>
        </div>
        <div className="space-screen__status">
          <span className={`space-status-pill ${healthy ? "ok" : "off"}`}>
            <i />
            {healthy ? "Sidecar online" : "Sidecar offline"}
          </span>
          <span className="space-status-pill">
            {visibleAliases.length} / {satellites.length} visible
          </span>
        </div>
      </header>

      <section className="space-screen__map">
        <LiveOrbitView fps={1} ids={visibleAliases} catalogOrder={allAliases} />
      </section>

      {satellites.length > 0 && (
        <section className="space-screen__catalog">
          <header>
            <strong>Default catalog</strong>
            <em>
              {satellites.length} satellites, NORAD IDs hardcoded in{" "}
              <code>src/space/config.py</code>
            </em>
            <div className="catalog-bulk">
              <button type="button" onClick={() => setAllVisible(true)}>
                Show all
              </button>
              <button type="button" onClick={() => setAllVisible(false)}>
                Hide all
              </button>
            </div>
          </header>
          <ul>
            {satellites.map((sat) => {
              const isVisible = !hidden.has(sat.alias);
              return (
                <li key={sat.alias} className={isVisible ? "" : "is-hidden"}>
                  <label>
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={() => toggle(sat.alias)}
                      aria-label={`Show ${sat.name} on map`}
                    />
                    <b>{sat.alias}</b>
                    <span title={sat.name}>{sat.name}</span>
                    <code>NORAD {sat.norad_id}</code>
                    {sat.note && <em>{sat.note}</em>}
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!healthy && (
        <section className="space-screen__offline">
          <strong>Sidecar not reachable on {health.data ? "/api/health" : "127.0.0.1:8765"}</strong>
          <p>Start it in a separate terminal from <code>voice-radio-poc/</code>:</p>
          <pre>{"source venv/bin/activate\n./scripts/run_sidecar.sh"}</pre>
          <p>
            First-time setup (run once):{" "}
            <code>python3 -m venv venv && pip install -r requirements-sidecar.txt && python scripts/download_natural_earth.py</code>
          </p>
        </section>
      )}
    </div>
  );
}
