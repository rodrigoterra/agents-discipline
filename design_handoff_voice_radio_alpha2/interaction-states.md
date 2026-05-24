# Interaction states · ALPHA2

How every interactive surface behaves at idle, hover, active, disabled, loading, error, stale, and live-vs-static. Documents only ALPHA2 additions on top of ALPHA's `interaction-states.md`. If a component isn't listed, use the ALPHA contract.

---

## 1. Lane nav (`<A2NavBtn>`)

| state | visual |
|---|---|
| idle (non-active) | transparent background · muted sigil + label · pointer cursor |
| hover | sigil opacity 1 + faint copper text |
| active | `rgba(224,122,60,0.12)` bg · copper border · 2 px copper left tab · sigil at full color with drop-shadow |
| muted (Meta lane defaults) | dim color, 70% opacity |
| disabled | dim 50%, pointer cursor disabled |

Lane labels use HaxrCorp4089, never change color when scrolled past.

## 2. Page tab (Weather Earth ↔ Space)

| state | visual |
|---|---|
| idle | transparent · muted label · sigil at 70% opacity |
| active | page-color fill · dark text · sigil full opacity |
| hover | sigil opacity → 1 |

Switching pages preserves all per-page state (layer, event, satellite mode).

## 3. Vector / Satellite switch

| state | visual |
|---|---|
| vector active | green segment filled · dark text · "VECTOR" |
| satellite active | green segment filled · dark text · "SATELLITE" + 4-button provider picker appears below |
| provider selected (when satellite) | green border + green text · others muted |
| tile load failed | tile cell stays empty (no error UI — graceful by design) |
| live land geojson | corner badge reads "NE · SIDECAR · {PROVIDER}" |
| static fallback | corner badge reads "NE · NE110m · {PROVIDER}" |

Switching to satellite mode reduces vector land fill to none (just stroke at 90% opacity) so the photo dominates.

## 4. QuakeLegend tier filter

| state | visual |
|---|---|
| idle row | small dot (tier color, glowing) + muted label |
| active row | tier-color border · `${color}22` background · tier-color label |
| hover | (no explicit hover style — click is the only affordance) |

Selecting a row sets `minMag` on the parent (`<EarthDsnMap>` or `<ScreenSeismograph>`). Clicking "ALL" resets to 0. The focused event survives filtering even if it falls below the threshold.

## 5. `<EarthquakeLayer>` quake dots

| state | visual |
|---|---|
| base (any mag) | filled circle · color from `magColor(mag)` · radius from `magRadius(mag)` |
| shallow (<35 km) | adds a 1 px vertical depth stem above the dot |
| M5+ | adds an SVG `<animate>` ring expanding from r → 4.5r over 2.4–1.6 s (faster as mag climbs), fading 0.7 → 0 |
| M6+ | adds a second offset ring on a 1.8 s loop with 0.6 s delay |
| focused | overrides: white stroke + crosshair + readout label "M{mag} · {depth}km" |
| hover | (no hover state — click is the affordance) |

Pulse animation uses SVG SMIL. Reduced motion is **not yet** honored — TODO: respect `prefers-reduced-motion`.

## 6. `<SatelliteTrackLayer>`

| state | visual |
|---|---|
| sub-satellite point | filled colored circle + animated `r` ping ring |
| ground track | dashed polyline (2 4), color = `colorForSat(alias)` |
| footprint | translucent fill at 12% alpha + colored 0.55-alpha stroke |
| dim mode (used inside `<LiveOrbitMap>` for non-selected catalog) | opacity 0.55 |

## 7. `<EarthDsnMap>` station marker

| state | visual |
|---|---|
| standby | open square + open ring · amber |
| uplink | filled square + ring · green |
| active | filled square · copper, pulsing concentric ring (3 s, r 14→34, opacity 0.55→0) |
| hover | label expands to show station name above |
| focus card | bottom-left detail card with state-colored left border |

When `earthquakes` is on, the station markers stay clickable but the bottom-left card swaps to the focused quake (if any).

## 8. Role stack edit / view

| state | visual |
|---|---|
| EDITING | full opacity · stack border in role color · `0 0 0 1px ${role}33` glow · interactive |
| VIEW · LOCKED | opacity 0.78 · neutral border · centered "⌬ VIEW MODE · CLICK MAKE EDITABLE TO MODIFY" overlay (`pointer-events: none`) · "⌥ Make editable" button appears |
| tile bypassed | diagonal hatch background + opacity 0.55 · "BYP" tag · sliders disabled |
| tile expanded | full-width within stack · group-color border + glow · all sliders visible · "EXPANDED" tag |

Switching `editRole` flips the EDITING/VIEW on both stacks atomically.

## 9. `<NarrativeDraftWithControls>`

| state | visual |
|---|---|
| draft (default) | copper tag "DRAFT" · all 3 action buttons ghost |
| used | green tag "USED" · "Use draft" button → primary fill |
| rejected | red tag "REJECTED" · "Reject" button → danger variant |

Used and Rejected are mutually exclusive. Clicking the active state again returns to draft.

## 10. `<DawTimeline>` clip

| state | visual |
|---|---|
| ready | lane-color gradient fill · dark text · id + text snippet visible |
| stale | transparent fill + red border · pulse animation (`alpha-stale-pulse` keyframe) · compact `<AStaleChip>` top-right |
| FX bed | full-width on FX lane · 33%-alpha lane-color fill · longer text snippet |
| QD marker | 2%-wide clip on QD lane · amber · marks intro/outro |

Clip widths are derived from start + duration estimates; not draggable in canvas.

## 11. `<DialogueTree>` tile

| state | visual |
|---|---|
| idle | role-color border, dark fill, role-colored id + duration |
| selected | role-color fill · dark text · 2 px border |
| stale connector | line from spine renders dashed (`3 3`) instead of solid |
| hover | (no hover style) |

## 12. Sidecar / network status

| signal | source | UI |
|---|---|---|
| sidecar reachable | `useSidecarHealth()` | top-right HUD chip in `<LiveOrbitMap>` reads "SIDECAR" with green dot |
| sidecar unreachable | same | reads "STATIC" with muted dot |
| Natural Earth geojson loaded from sidecar | `useNaturalEarth().live` | map corner badge reads "NE · SIDECAR" |
| Natural Earth fallback | same | reads "NE · NE110m" |
| USGS feed loaded | `useUsgsQuakes().live` | quake legend reads "LIVE", earth-weather ground-corridor terminal block colors `state` green |
| USGS fallback | same | reads "STATIC" |

No errors are surfaced to the operator UI — the system silently degrades. Console reports the network error if you need to debug.

## 13. Stale chip

Same as ALPHA. Reasons are `[V][E][C][S]`:
- V — voice / audition changed
- E — environment changed (CME, magnetic, ionosphere)
- C — CAPCOM FX stack changed
- S — SHIP FX stack changed

Multi-reason chips show every letter; ordering is V → E → C → S.

## 14. Live / Render mode (top bar `<AModeToggle>`)

Unchanged from ALPHA. Render mode is the default in every artboard; Live mode adds the Monitoring card to the right rail and replaces the bottom transport's progress bar with a real-time meter (future work).

## 15. Reduced motion

**Not yet implemented across the board.** TODO list:
- Stale-clip `alpha-stale-pulse` keyframe should freeze at 50% intensity.
- Quake-ring SMIL `<animate>` elements should be removed (radius pinned to base).
- Active-DSN concentric coverage ring should freeze at r=14.
- Sat-subpoint ping ring should disappear.

For now the canvas always animates.

## 16. Keyboard

**Not yet wired.** Planned (from Seismograph proposal CR-10):
- `1`–`5` → filter quake layer to tier 1–5
- `/` → focus search (cross-screen)
- `?` → keyboard cheatsheet overlay
- `g g` → Mission Control jump (Gmail-style)
- `Esc` → close any open overlay

## 17. Accessibility

- All maps include `aria-label` describing their data layer ("Live orbit view…", "USGS earthquake layer", etc.).
- Sigils + glyph art use `aria-hidden` when there's text adjacent that conveys the same meaning; otherwise they ship with a sibling `<span class="sr-only">` describing them.
- Pixel fonts at small sizes pair `letter-spacing` with `WebkitFontSmoothing: none` so screen readers still read the underlying string correctly.
- TODO: focus-visible rings on all interactive map markers.
