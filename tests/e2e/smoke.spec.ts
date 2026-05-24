import { test, expect } from "@playwright/test";

test("happy path ui state renders", async ({ page }) => {
  const processBodies: any[] = [];
  const silentWav = Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x2c, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
    0x66, 0x6d, 0x74, 0x20, 0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
    0x40, 0x1f, 0x00, 0x00, 0x80, 0x3e, 0x00, 0x00, 0x02, 0x00, 0x10, 0x00,
    0x64, 0x61, 0x74, 0x61, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00
  ]);
  await page.route("**/api/script/generate", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        script: {
          project: { id: "p1", sample_rate: 48000, bit_depth: 24, render_mode: "preview" },
          defaults: { language: "pt-BR", voice_engine: "openai", voice_model: "gpt-4o-mini-tts", radio_preset: "ship_comm_v1", output_format: "wav" },
          utterances: [
            { id: "u001", speaker: "CAPCOM", channel: "earth_capcom", language: "pt-BR", text: "Teste um.", style: { tone: "calm", speed: 0.95, urgency: 0.2, clarity_priority: 0.9 }, pronunciation_hints: [], audio_fx: { preset: "earth_capcom_v1", intensity: 0.3 } },
            { id: "u002", speaker: "SHIP", channel: "ship_comm", language: "pt-BR", text: "Teste dois.", style: { tone: "focused", speed: 1, urgency: 0.35, clarity_priority: 0.85 }, pronunciation_hints: [], audio_fx: { preset: "ship_comm_v1", intensity: 0.35 } }
          ]
        }
      })
    });
  });

  await page.route("**/api/script/validate", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ valid: true, errors: [] }) });
  });

  await page.route("**/api/tts/batch", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: [
          { path: "/generated/tts/u001.wav", meta: { id: "u001" } },
          { path: "/generated/tts/u002.wav", meta: { id: "u002" } }
        ],
        failed: []
      })
    });
  });

  await page.route("**/api/audio/process", async (route) => {
    const body = route.request().postDataJSON();
    const id = /\/(u\d+)\.wav$/.exec(String(body.rawPath ?? body.path ?? ""))?.[1] ?? "u001";
    processBodies.push(body);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        path: `/generated/processed/${id}.wav`,
        processedPath: `/generated/processed/${id}.wav`,
        resolvedEnvironment: {
          baseProfile: "throttled_s_band_lunar",
          missionGeometry: "lunar_flyby",
          missionGeometryIntensity: 0.65,
          spaceWeather: "solar_flare_onset",
          spaceWeatherIntensity: 0.7
        },
        resolvedMacro: { channelProfile: "throttled_s_band_lunar", signalQuality: 0.44, degradationMode: "nominal", telemetryEnabled: true, telemetryStyle: "quindar", telemetryLevel: 0.24, telemetryOffsetMs: 0, quindarMode: "both", packetLossDynamics: 0.32 }
      })
    });
  });

  await page.route("**/generated/**/*.wav", async (route) => {
    await route.fulfill({ contentType: "audio/wav", body: silentWav });
  });

  await page.route("**/api/spectrogram/utterance", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        publicUrls: {
          rawSpectrogram: "/artifacts/spectrograms/utterances/session-test/u001.raw.png",
          processedSpectrogram: "/artifacts/spectrograms/utterances/session-test/u001.processed.png"
        }
      })
    });
  });

  await page.route("**/artifacts/spectrograms/**", async (route) => {
    await route.fulfill({
      contentType: "image/png",
      body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64")
    });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Mission Console" })).toBeVisible();
  await expect(page.getByText("Mission Setup", { exact: true })).toBeVisible();
  await expect(page.getByText("Draft setup · 4 utterances · pt-BR · CAPCOM ↔ SHIP")).toBeVisible();
  await expect(page.getByText("No script has been generated yet.")).toBeVisible();
  await page.getByRole("button", { name: "Storm '65" }).click();
  await expect(page.getByRole("textbox", { name: "Describe the mission moment," })).toHaveValue(/tempestade solar inspirada em 1965/);
  await page.getByRole("button", { name: "Generate Structured Script JSON" }).click();
  await page.getByRole("button", { name: "Validate JSON" }).click();
  await expect(page.getByText("Validation: valid")).toBeVisible();

  await page.getByRole("button", { name: /Voice/ }).click();
  await expect(page.getByRole("heading", { name: "Voice Generation" })).toBeVisible();
  await expect(page.getByTestId("voice-selector")).toBeVisible();
  await expect(page.getByRole("option", { name: "Cedar (masculine-coded)" })).toBeAttached();
  await expect(page.getByRole("option", { name: "Marin (feminine-coded)" })).toBeAttached();
  await expect(page.getByRole("option", { name: "Alloy (neutral-or-flexible)" })).toBeAttached();
  await page.getByTestId("voice-speed").fill("1.2");
  await expect(page.locator(".instruction-preview p")).toContainText("Use speech speed 1.20x.");
  await expect(page.getByText("Casting Map", { exact: true })).toBeVisible();
  await expect(page.getByText("TTS Scratchpad", { exact: true })).toBeVisible();

  await page.locator(".left-rail").getByRole("button", { name: /FX/ }).click();
  await expect(page.getByRole("heading", { name: "FX Lab · Enhanced" })).toBeVisible();
  await expect(page.getByRole("button", { name: "FX 1 · Role + Channel" })).toBeVisible();
  await expect(page.getByRole("button", { name: "FX 2 · Environment" })).toBeVisible();
  await expect(page.getByRole("button", { name: "FX 3 · Fine DSP" })).toBeVisible();
  await expect(page.getByText("Selected Utterance Test Bench")).toBeVisible();
  await expect(page.locator(".fx-nav-display").first()).toBeVisible();
  await expect(page.locator(".v3-signal-meter")).toContainText("78%");
  await expect(page.getByText("Radio Link Render Console")).toBeVisible();
  await expect(page.getByText("Quindar tones")).toBeVisible();
  await expect(page.getByRole("button", { name: "Intro" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Outro" })).toBeVisible();
  await expect(page.getByText("Add Influence")).toBeVisible();
  await expect(page.getByRole("button", { name: "Environment Simulation · OFF" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Fine DSP Parameters · OFF" })).toBeVisible();
  await page.getByRole("button", { name: "Environment Simulation · OFF" }).click();
  await expect(page.getByText("Environment Influence ON")).toBeVisible();
  await expect(page.locator(".environment-rack-zone")).toContainText("Environment Simulator");
  await expect(page.getByRole("button", { name: "Lunar Flyby", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Solar Flare Onset", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Lunar Flyby Under Solar Activity" }).click();
  await expect(page.getByText("Environment Commit Station")).toBeVisible();
  await expect(page.getByText("Applied mission scenario: Bandwidth-constrained lunar signal with growing hiss and packet stress.")).toBeVisible();
  await expect(page.getByText("FX Stack Tracker")).toBeVisible();
  await page.getByRole("button", { name: "FX 1 · Role + Channel" }).click();
  await expect(page.getByText("CAPCOM FX assignment")).toBeVisible();
  await expect(page.getByText("TTS Scratchpad Source")).toBeVisible();
  await page.getByRole("button", { name: "Save Current FX to CAPCOM" }).click();
  await expect(page.getByText(/CAPCOM FX ·/)).toBeVisible();
  await expect(page.getByText("Working role: CAPCOM · saved role recipe")).toBeVisible();
  await expect(page.getByText("Button status")).toBeVisible();
  await expect(page.getByRole("button", { name: "1 Render RAW Source" })).toBeVisible();
  await expect(page.getByRole("button", { name: "2 Process FX Stack" })).toBeVisible();
  await page.getByRole("button", { name: "Fine DSP Parameters · OFF" }).click();
  await expect(page.getByText("Fine DSP Parameter Rack")).toBeVisible();
  await expect(page.getByText("Fine DSP Parameters ON")).toBeVisible();
  await expect(page.getByText("Live DSP checkpoint")).toBeVisible();
  await expect(page.getByRole("button", { name: "Preview FX" })).toHaveCount(1);
  await page.getByRole("button", { name: "Preview FX" }).first().click();
  await page.getByRole("button", { name: "FX 1 · Role + Channel" }).click();
  await page.getByRole("button", { name: "collapse" }).click();
  await expect(page.locator(".v3-signal-meter")).toContainText("30%");

  await page.getByRole("button", { name: /Stitch/ }).first().click();
  await expect(page.getByText("Silence after")).toBeVisible();
  await page.getByLabel("Silence after").fill("0.35");
  await page.getByRole("button", { name: "Batch Generate Audio" }).click();
  await page.getByRole("button", { name: "Process Raw → FX" }).first().click();
  expect(processBodies.at(-1)?.environment?.missionGeometry?.geometry).toBe("lunar_flyby");
  expect(processBodies.at(-1)?.environment?.spaceWeather?.event).toBe("solar_flare_onset");
  await expect(page.getByText(/FX assignment: CAPCOM FX ·/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Select u001 CAPCOM" })).toBeVisible();
  await page.getByRole("button", { name: "Select u001 CAPCOM" }).click();
  await expect(page.locator(".utterance-card strong").filter({ hasText: "u001 CAPCOM" })).toBeVisible();
  await page.getByRole("button", { name: /Spectro/ }).click();
  await expect(page.getByText("Spectrogram Generator")).toBeVisible();
  await page.getByRole("button", { name: "Generate Selected Utterance Spectrograms" }).click();
  await expect(page.getByAltText("Raw utterance spectrogram")).toBeVisible();
  await expect(page.getByAltText("Processed utterance spectrogram")).toBeVisible();
});
