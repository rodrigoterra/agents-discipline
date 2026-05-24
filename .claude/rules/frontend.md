# Frontend Rules

- Keep ALPHA2 grouped as three lanes: Narrative, Audio, and TOOLS (decision
  2026-05-24, see `docs/alpha/ALPHA2_IMPLEMENTATION_PLAN.md`). TOOLS (e.g.
  Seismograph) is an inspection lane and does NOT feed the creative chain or
  session package — keep it visually separate from the producing lanes.
- Prefer visible workflow surfaces over hidden magic: maps, report cards,
  parameter banks, render decisions, and session package summaries.
- Do not reintroduce the old right-rail PoC cards removed from Mission Control:
  `Now Playing`, `Scene Brief`, and `NASA Reference`.
- Mission Control should show mission maps and reports, not a spectrogram
  preview.
- Keep optional Spectrogram as its own lab screen.
- Use existing design language in `apps/web/src/styles.css` before adding a new
  visual system.
- Check desktop and mobile for horizontal overflow after large UI changes.
