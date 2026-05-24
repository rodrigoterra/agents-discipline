import { describe, expect, it } from "vitest";
import { composeScript } from "@voice-radio/script-composer";

describe("script composer", () => {
  it("returns a useful error when the primary model emits malformed JSON", async () => {
    const client = { responses: { create: async () => ({ output_text: "{not-json" }) } };

    await expect(composeScript(client, "brief", { model: "test-model" })).rejects.toThrow(
      "primary model returned invalid JSON"
    );
  });

  it("returns a useful error when fallback repair emits malformed JSON", async () => {
    let call = 0;
    const client = {
      responses: {
        create: async () => {
          call += 1;
          return { output_text: call === 1 ? "{}" : "{still-not-json" };
        }
      }
    };

    await expect(composeScript(client, "brief", { model: "test-model", fallbackModel: "fallback-model" })).rejects.toThrow(
      "fallback model returned invalid JSON"
    );
  });
});
