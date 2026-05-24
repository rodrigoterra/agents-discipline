# ALPHA2 Flow Rules

- Mission Control creates Narrative Setup JSON, not final dialogue.
- Dialogue creates Radio Dialogue JSON.
- Voice Archetypes happen before final dialogue where possible.
- Radio FX creates explicit render decisions.
- Utterance rendering is folded into Radio FX ("Process") + Dialogue
  ("regenerate"); there is no standalone Render screen. Dialogue edits text +
  mark audio stale (never render); FX "Process" renders the committed recipe
  + never edits text.
- Render decisions must drive processing, not only display labels. The
  processing signature must include render mode/preset plus voice/text,
  environment, and narrative context when relevant.
- Stitch/export must not guess a recipe or export stale processed clips. It
  may proceed only when every utterance is current.
- Spectrogram is optional and non-blocking.
- Three lanes: Narrative, Audio, TOOLS. The TOOLS lane (Seismograph, Relative)
  is read-only inspection — it never writes Narrative Setup JSON, Render
  Decisions, or the session package, and shares no state with the other lanes.
- Preserve the current PoC audio path while adding narrative structure.
- If Narrative, Flight, COMMS, Weather, Voice, Dialogue, render decision, or
  FX state changes, show stale/current status clearly. Use `[V]` for
  voice/raw/text, `[E]` for environment or Narrative Draft context, `[C]` for
  CAPCOM stack, and `[S]` for SHIP stack.
