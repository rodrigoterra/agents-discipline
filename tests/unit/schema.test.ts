import { describe, expect, it } from "vitest";
import { openAIScriptJsonSchema, stripNullJsonSchemaPlaceholders, validateScript } from "@voice-radio/schema";

describe("script schema", () => {
  it("validates expected seeded script shape", () => {
    const candidate = {
      project: { id: "seed-001", sample_rate: 48000, bit_depth: 24, render_mode: "preview" },
      defaults: { language: "pt-BR", voice_engine: "openai", voice_model: "gpt-4o-mini-tts", radio_preset: "ship_comm_v1", output_format: "wav" },
      utterances: [
        { id: "u001", speaker: "CAPCOM", channel: "earth_capcom", language: "pt-BR", text: "Odyssey, confirme correção de atitude.", style: { tone: "calm", speed: 0.95, urgency: 0.2, clarity_priority: 0.9 }, pronunciation_hints: [], audio_fx: { preset: "earth_capcom_v1", intensity: 0.3 } }
      ]
    };
    expect(validateScript(candidate).valid).toBe(true);
  });

  it("accepts optional per-utterance voice profiles", () => {
    const candidate = {
      project: { id: "seed-voice", sample_rate: 48000, bit_depth: 24, render_mode: "preview" },
      defaults: { language: "pt-BR", voice_engine: "openai", voice_model: "gpt-4o-mini-tts", radio_preset: "ship_comm_v1", output_format: "wav" },
      utterances: [
        {
          id: "u001",
          speaker: "CAPCOM",
          channel: "earth_capcom",
          language: "pt-BR",
          text: "Odyssey, confirme correção de atitude.",
          style: { tone: "calm", speed: 0.95, urgency: 0.2, clarity_priority: 0.9 },
          pronunciation_hints: [],
          voice: {
            voiceId: "cedar",
            speakerRole: "CAPCOM",
            speed: 0.95,
            cadencePreset: "procedural CAPCOM",
            tonePreset: "calm technical",
            pauseStyle: "procedural",
            intensity: 0.25,
            organicVariation: 0.25,
            clarityPriority: 0.95
          },
          audio_fx: { preset: "earth_capcom_v1", intensity: 0.3 }
        }
      ]
    };
    expect(validateScript(candidate).valid).toBe(true);
  });

  it("adapts optional fields for OpenAI strict structured output", () => {
    const utterance = openAIScriptJsonSchema.properties.utterances.items;
    expect(utterance.required).toContain("voice");
    expect(utterance.properties.voice.type).toContain("null");
    expect(utterance.properties.voice.required).toContain("label");
    expect(utterance.properties.voice.properties.label.type).toContain("null");
  });

  it("emits a self-contained OpenAI schema without unresolved refs", () => {
    const serialized = JSON.stringify(openAIScriptJsonSchema);
    expect(serialized).not.toContain("\"$ref\"");
    expect(serialized).not.toContain("\"definitions\"");
    expect(openAIScriptJsonSchema.properties.environment_defaults.properties.spaceWeather.properties.applyScope.enum).toContain("scene_wide");
    expect(openAIScriptJsonSchema.properties.utterances.items.properties.environment.properties.spaceWeather.properties.event.enum).toContain("solar_flare_onset");
  });

  it("strips null placeholders before local validation", () => {
    const candidate = {
      project: { id: "seed-null", sample_rate: 48000, bit_depth: 24, render_mode: "preview" },
      defaults: { language: "pt-BR", voice_engine: "openai", voice_model: "gpt-4o-mini-tts", radio_preset: "ship_comm_v1", output_format: "wav" },
      utterances: [
        { id: "u001", speaker: "CAPCOM", channel: "earth_capcom", language: "pt-BR", text: "Odyssey, confirme correção de atitude.", style: { tone: "calm", speed: 0.95, urgency: 0.2, clarity_priority: 0.9 }, pronunciation_hints: [], voice: null, audio_fx: { preset: "earth_capcom_v1", intensity: 0.3 } }
      ]
    };
    expect(validateScript(stripNullJsonSchemaPlaceholders(candidate)).valid).toBe(true);
  });

  it("accepts optional environment defaults and per-utterance environment", () => {
    const candidate = {
      project: { id: "seed-env", sample_rate: 48000, bit_depth: 24, render_mode: "preview" },
      defaults: { language: "pt-BR", voice_engine: "openai", voice_model: "gpt-4o-mini-tts", radio_preset: "ship_comm_v1", output_format: "wav" },
      environment_defaults: {
        missionGeometry: { geometry: "lunar_flyby", intensity: 0.65, applyScope: "scene_wide" },
        spaceWeather: { event: "solar_flare_onset", intensity: 0.7, durationMode: "full_utterance", envelope: "ramp_up", applyScope: "scene_wide" }
      },
      utterances: [
        {
          id: "u001",
          speaker: "CAPCOM",
          channel: "earth_capcom",
          language: "pt-BR",
          text: "Odyssey, confirme correção de atitude.",
          style: { tone: "calm", speed: 0.95, urgency: 0.2, clarity_priority: 0.9 },
          pronunciation_hints: [],
          environment: {
            missionGeometry: { geometry: "leo_pass", intensity: 0.25, applyScope: "selected_utterance" },
            spaceWeather: { event: "calm_link", intensity: 0.2, durationMode: "full_utterance", envelope: "static", applyScope: "selected_utterance" }
          },
          audio_fx: { preset: "earth_capcom_v1", intensity: 0.3 }
        }
      ]
    };
    expect(validateScript(candidate).valid).toBe(true);
  });
});
