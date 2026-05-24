import fs from "node:fs";
import path from "node:path";
import { openAIScriptJsonSchema, stripNullJsonSchemaPlaceholders, validateScript, type RadioScript } from "@voice-radio/schema";

const prompt = fs.readFileSync(path.resolve(path.dirname(new URL(import.meta.url).pathname), "../prompt.md"), "utf-8");

export type ComposeOptions = {
  model: string;
  fallbackModel?: string;
  language?: string;
  radioPreset?: "earth_capcom_v1" | "ship_comm_v1" | "deep_space_degraded_v1";
};

type ResponsesClient = { responses: { create: (args: any) => Promise<any> } };

function parseModelJson(raw: string, phase: "primary" | "fallback") {
  try {
    return JSON.parse(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown parse error";
    throw new Error(`Script generation ${phase} model returned invalid JSON: ${detail}`);
  }
}

export async function composeScript(client: ResponsesClient, sceneBrief: string, opts: ComposeOptions): Promise<RadioScript> {
  const input = `Scene brief:\n${sceneBrief}\n\nDefaults:\nlanguage=${opts.language ?? "pt-BR"}\nradio_preset=${opts.radioPreset ?? "ship_comm_v1"}`;
  const first = await client.responses.create({
    model: opts.model,
    instructions: prompt,
    input,
    text: {
      format: {
        type: "json_schema",
        name: "radio_script",
        strict: true,
        schema: openAIScriptJsonSchema
      }
    }
  });

  const raw = first.output_text;
  const parsed = stripNullJsonSchemaPlaceholders(parseModelJson(raw, "primary"));
  const validated = validateScript(parsed);
  if (validated.valid) return validated.data;

  if (!opts.fallbackModel) {
    throw new Error(`Script generation failed validation: ${validated.errors.join("; ")}`);
  }

  const retry = await client.responses.create({
    model: opts.fallbackModel,
    instructions: `${prompt}\n\nRepair validation issues and keep same intent.`,
    input: `${input}\n\nValidation errors:\n${validated.errors.join("\n")}`,
    text: {
      format: {
        type: "json_schema",
        name: "radio_script",
        strict: true,
        schema: openAIScriptJsonSchema
      }
    }
  });
  const retryParsed = validateScript(stripNullJsonSchemaPlaceholders(parseModelJson(retry.output_text, "fallback")));
  if (!retryParsed.valid) {
    throw new Error(`Fallback generation failed: ${retryParsed.errors.join("; ")}`);
  }
  return retryParsed.data;
}
