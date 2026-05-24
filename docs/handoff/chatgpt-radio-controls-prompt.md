You are helping me evolve a browser-based space radio PoC.

Current stack:
- React + TypeScript frontend
- Web Audio API for real-time preview (target direction)
- Node/Express backend for generation + TTS + export

Current limitation:
- Audio FX exists, but controls and realism need to be improved to better match space/deep-space transmission and conversation pacing.

What I need from you:
1) Propose a Web Audio first architecture for real-time transmission chain.
2) Define practical DSP node graph and parameter ranges for 3 presets:
   - earth_capcom_v2
   - ship_comm_v2
   - deep_space_degraded_v2
3) Recommend UX controls that are powerful but not overwhelming.
4) Provide TypeScript interfaces for:
   - radio preset definition
   - runtime UI state
   - deterministic seed options
5) Propose a migration plan from static server-side processing to hybrid:
   - real-time preview in browser
   - deterministic export path on backend
6) Include test strategy:
   - unit tests for control mapping
   - perceptual A/B checklist
   - regression fixtures

Constraints:
- Keep v1 backward compatible where possible.
- Prioritize intelligibility over cinematic effect.
- Keep implementation incremental (small PRs).
- Avoid adding heavy dependencies if native Web Audio can handle it.

Deliver response in this format:
A) Node graph
B) Preset table with numeric defaults
C) UI controls list and rationale
D) TypeScript interfaces
E) Step-by-step migration plan (5 phases)
F) Test plan
