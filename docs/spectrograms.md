# Spectrograms

The PoC can generate deterministic PNG spectrograms with FFmpeg `showspectrumpic` so raw TTS, processed radio audio, and local NASA Artemis reference clips can be compared visually.

## Requirement

Install FFmpeg and make sure `ffmpeg` is available on `PATH`.

```bash
ffmpeg -version
```

If FFmpeg is missing, `/api/spectrogram/*` routes return:

```text
FFmpeg is required to generate spectrograms. Install FFmpeg and retry.
```

## Save Locations

Runtime artifacts are written under `artifacts/`:

```text
artifacts/
  audio/
    raw/{sessionId}/{utteranceId}.wav
    processed/{sessionId}/{utteranceId}.wav
    final/{sessionId}.raw.wav
    final/{sessionId}.processed.wav
    nasa-reference/{filename}.wav
  spectrograms/
    utterances/{sessionId}/{utteranceId}.raw.png
    utterances/{sessionId}/{utteranceId}.processed.png
    utterances/{sessionId}/{utteranceId}.comparison.json
    nasa-reference/{nasaSlug}.png
    nasa-reference/{nasaSlug}.metadata.json
    final/{sessionId}.final.raw.png
    final/{sessionId}.final.processed.png
```

The existing `/generated/*` audio preview/export flow is unchanged. The server mirrors session audio into `artifacts/audio/*` when the frontend sends `sessionId` and `utteranceId`.

## Frontend Workflow

1. Generate utterance audio.
2. Process the same utterance through radio FX.
3. Open the Spectrogram Generator panel at the bottom.
4. Click **Generate Selected Utterance Spectrograms** to create raw and processed PNGs.
5. Use **Generate Batch Spectrograms** after multiple utterances have both raw and processed WAV artifacts.
6. Use **Generate Final WAV Spectrograms** after stitching the final WAV.

## NASA Reference Workflow

Do not scrape NASA audio in v1.

1. Download the Artemis reference audio yourself, following NASA media usage guidelines.
2. Place the file in `artifacts/audio/nasa-reference/`.
3. Enter a slug and optional local filename in the frontend panel.
4. Click **Generate NASA Reference Spectrogram**.
5. Compare the NASA PNG beside raw and processed utterance PNGs.

## Manual Command

The backend uses this filter shape:

```bash
ffmpeg -y -i INPUT_AUDIO \
  -lavfi "showspectrumpic=s=1600x900:mode=combined:color=viridis:scale=log:fscale=lin:legend=1:drange=100" \
  OUTPUT_PNG
```

## Reading The Images

Raw spectrograms show the OpenAI TTS output before radio processing. Processed spectrograms show the post-FX audio, useful for checking whether bandpass energy is concentrated around the radio voice range, Quindar tones appear as stable horizontal lines near 2525 Hz and 2475 Hz, and packet loss or dropouts create visible time gaps. NASA reference spectrograms are visual references only; v1 does not claim automatic perceptual matching.
