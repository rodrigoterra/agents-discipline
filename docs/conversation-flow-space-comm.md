# Conversation Flow Design for Space Communications (PoC+)

## Why this matters
Even realistic audio FX sounds fake if dialogue pacing and radio discipline are unrealistic.

## Dialogue behavior rules
- Short, operational utterances
- Explicit handoffs ("CAPCOM out", "Odyssey copy")
- Avoid long monologues
- Preserve role/channel consistency
- Add controlled latency behavior for deep-space modes

## Timing model
- Micro pause between turns: 180–350ms
- Acknowledgment delay: 300–900ms (local orbit), 1.5–4s (deep-space simulation)
- Optional jitter: +/-120ms

## Suggested conversation controls in UI
- Turn gap slider
- Ack delay slider
- Latency preset selector (LEO / Lunar / Deep-space simulated)
- Transmission overlap protection toggle

## Failure patterns for realism (optional)
- Partial clipping on first syllable (PTT timing)
- Occasional repeat requests ("say again")
- Error correction cues ("correction", "stand by")
