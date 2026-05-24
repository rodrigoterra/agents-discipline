import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { builtInVoiceIds, cadencePresets, deliveryPresets, tonePresets } from "@voice-radio/voice-core";
import {
  missionGeometryDefinitions,
  spaceWeatherEventDefinitions,
  type MissionGeometry,
  type SpaceWeatherEvent
} from "@voice-radio/audio-core";

const speakerSchema = z.enum(["CAPCOM", "SHIP"]);

const styleSchema = z.object({
  tone: z.string().min(3),
  speed: z.number().min(0.7).max(1.2),
  urgency: z.number().min(0).max(1),
  clarity_priority: z.number().min(0).max(1)
}).strict();

const audioFxSchema = z.object({
  preset: z.enum(["earth_capcom_v1", "ship_comm_v1", "deep_space_degraded_v1"]),
  intensity: z.number().min(0).max(1)
}).strict();

const speakerRoleSchema = z.enum([
  "CAPCOM",
  "SHIP",
  "MISSION_SPECIALIST",
  "COMMANDER",
  "FLIGHT_DIRECTOR",
  "AI_SYSTEM",
  "DISTRESS_SIGNAL",
  "UNKNOWN_TRANSMISSION"
]);

const applyScopeSchema = z.enum(["selected_utterance", "scene_wide"]);
const missionGeometryIds = missionGeometryDefinitions.map((item) => item.id) as [MissionGeometry, ...MissionGeometry[]];
const spaceWeatherEventIds = spaceWeatherEventDefinitions.map((item) => item.id) as [SpaceWeatherEvent, ...SpaceWeatherEvent[]];

const missionGeometrySchema = z.object({
  geometry: z.enum(missionGeometryIds),
  intensity: z.number().min(0).max(1),
  applyScope: applyScopeSchema
}).strict();

const spaceWeatherSchema = z.object({
  event: z.enum(spaceWeatherEventIds),
  intensity: z.number().min(0).max(1),
  durationMode: z.enum(["instant", "short", "medium", "full_utterance", "scene_wide"]),
  envelope: z.enum(["static", "ramp_up", "ramp_down", "bell", "pulse_train", "collapse_then_recover"]),
  applyScope: applyScopeSchema
}).strict();

const environmentSchema = z.object({
  missionGeometry: missionGeometrySchema.optional(),
  spaceWeather: spaceWeatherSchema.optional()
}).strict();

const voiceSchema = z.object({
  voiceId: z.enum(builtInVoiceIds),
  label: z.string().min(1).optional(),
  speakerRole: speakerRoleSchema.optional(),
  genderPresentation: z.enum(["masculine-coded", "feminine-coded", "neutral-or-flexible"]).optional(),
  perceivedRange: z.string().optional(),
  speed: z.number().min(0.25).max(4).optional(),
  cadencePreset: z.enum(cadencePresets).optional(),
  tonePreset: z.enum(tonePresets).optional(),
  deliveryPreset: z.enum(deliveryPresets).optional(),
  pauseStyle: z.enum(["clipped", "natural", "procedural", "urgent", "breathy", "fragmented"]).optional(),
  intensity: z.number().min(0).max(1).optional(),
  organicVariation: z.number().min(0).max(1).optional(),
  clarityPriority: z.number().min(0).max(1).optional(),
  accentInstruction: z.string().max(240).optional(),
  toneInstruction: z.string().max(240).optional(),
  emotionInstruction: z.string().max(240).optional(),
  cadenceInstruction: z.string().max(240).optional(),
  deliveryInstruction: z.string().max(240).optional(),
  radioDisciplineInstruction: z.string().max(240).optional(),
  extraInstruction: z.string().max(280).optional()
}).strict();

export const utteranceSchema = z.object({
  id: z.string().regex(/^u\d{3}$/),
  speaker: speakerSchema,
  channel: z.enum(["earth_capcom", "ship_internal"]),
  language: z.string().min(2),
  text: z.string().min(3).max(280),
  style: styleSchema,
  pronunciation_hints: z.array(z.string()),
  voice: voiceSchema.optional(),
  environment: environmentSchema.optional(),
  audio_fx: audioFxSchema
}).strict().superRefine((u, ctx) => {
  if (u.speaker === "CAPCOM" && u.channel !== "earth_capcom") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CAPCOM must use earth_capcom channel", path: ["channel"] });
  }
  if (u.speaker === "SHIP" && u.channel !== "ship_internal") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "SHIP must use ship_internal channel", path: ["channel"] });
  }
});

export const scriptSchema = z.object({
  project: z.object({
    id: z.string().min(3),
    sample_rate: z.literal(48000),
    bit_depth: z.literal(24),
    render_mode: z.enum(["preview", "final"])
  }).strict(),
  defaults: z.object({
    language: z.string(),
    voice_engine: z.literal("openai"),
    voice_model: z.literal("gpt-4o-mini-tts"),
    radio_preset: z.enum(["earth_capcom_v1", "ship_comm_v1", "deep_space_degraded_v1"]),
    output_format: z.literal("wav")
  }).strict(),
  environment_defaults: environmentSchema.optional(),
  utterances: z.array(utteranceSchema).min(1).max(32)
}).strict().superRefine((script, ctx) => {
  script.utterances.forEach((u, i) => {
    const expected = `u${String(i + 1).padStart(3, "0")}`;
    if (u.id !== expected) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Utterance id must be sequential (${expected})`, path: ["utterances", i, "id"] });
    }
  });
});

export type RadioScript = z.infer<typeof scriptSchema>;
export type Utterance = z.infer<typeof utteranceSchema>;

export const scriptJsonSchema = zodToJsonSchema(scriptSchema, "radio_script");

type JsonSchema = Record<string, any>;

function resolveJsonPointer(root: JsonSchema, pointer: string): JsonSchema {
  if (!pointer.startsWith("#/")) {
    throw new Error(`Only local JSON schema refs are supported: ${pointer}`);
  }
  return pointer
    .slice(2)
    .split("/")
    .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"))
    .reduce((current: any, part) => {
      if (!current || typeof current !== "object" || !(part in current)) {
        throw new Error(`Unresolved JSON schema ref: ${pointer}`);
      }
      return current[part];
    }, root);
}

export function inlineLocalJsonSchemaRefs(schema: JsonSchema, root: JsonSchema = schema, seen = new Set<string>()): JsonSchema {
  if (Array.isArray(schema)) {
    return schema.map((item) => inlineLocalJsonSchemaRefs(item, root, seen)) as unknown as JsonSchema;
  }
  if (!schema || typeof schema !== "object") return schema;

  if (typeof schema.$ref === "string") {
    if (seen.has(schema.$ref)) {
      throw new Error(`Circular JSON schema ref: ${schema.$ref}`);
    }
    const nextSeen = new Set(seen);
    nextSeen.add(schema.$ref);
    const resolved = inlineLocalJsonSchemaRefs(resolveJsonPointer(root, schema.$ref), root, nextSeen);
    const siblings = Object.fromEntries(Object.entries(schema).filter(([key]) => key !== "$ref"));
    return inlineLocalJsonSchemaRefs({ ...resolved, ...siblings }, root, seen);
  }

  return Object.fromEntries(
    Object.entries(schema)
      .filter(([key]) => key !== "definitions" && key !== "$schema")
      .map(([key, value]) => [key, inlineLocalJsonSchemaRefs(value as JsonSchema, root, seen)])
  );
}

function nullableSchema(schema: JsonSchema): JsonSchema {
  const next = { ...schema };
  if (Array.isArray(next.enum) && !next.enum.includes(null)) {
    next.enum = [...next.enum, null];
  }
  if (Array.isArray(next.type)) {
    next.type = next.type.includes("null") ? next.type : [...next.type, "null"];
  } else if (next.type) {
    next.type = [next.type, "null"];
  } else if (Array.isArray(next.enum) && next.enum.some((value) => typeof value === "string")) {
    next.type = ["string", "null"];
  } else if (next.anyOf) {
    next.anyOf = [...next.anyOf, { type: "null" }];
  } else if (next.oneOf) {
    next.oneOf = [...next.oneOf, { type: "null" }];
  } else {
    next.anyOf = [{ ...schema }, { type: "null" }];
  }
  return next;
}

export function makeOpenAIStrictJsonSchema(schema: JsonSchema, optional = false): JsonSchema {
  const next: JsonSchema = Array.isArray(schema) ? [...schema] : { ...schema };
  if (next.properties && typeof next.properties === "object") {
    const originalRequired = new Set<string>(Array.isArray(next.required) ? next.required : []);
    const properties = Object.fromEntries(
      Object.entries(next.properties).map(([key, value]) => [
        key,
        makeOpenAIStrictJsonSchema(value as JsonSchema, !originalRequired.has(key))
      ])
    );
    next.properties = properties;
    next.required = Object.keys(properties);
    next.additionalProperties = false;
  }
  if (next.items && typeof next.items === "object" && !Array.isArray(next.items)) {
    next.items = makeOpenAIStrictJsonSchema(next.items as JsonSchema);
  }
  if (next.definitions && typeof next.definitions === "object") {
    next.definitions = Object.fromEntries(
      Object.entries(next.definitions).map(([key, value]) => [key, makeOpenAIStrictJsonSchema(value as JsonSchema)])
    );
  }
  if (next.anyOf) {
    next.anyOf = next.anyOf.map((item: JsonSchema) => makeOpenAIStrictJsonSchema(item));
  }
  if (next.oneOf) {
    next.oneOf = next.oneOf.map((item: JsonSchema) => makeOpenAIStrictJsonSchema(item));
  }
  return optional ? nullableSchema(next) : next;
}

export function stripNullJsonSchemaPlaceholders<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((item) => stripNullJsonSchemaPlaceholders(item)) as T;
  }
  if (input && typeof input === "object") {
    return Object.fromEntries(
      Object.entries(input as Record<string, unknown>)
        .filter(([, value]) => value !== null)
        .map(([key, value]) => [key, stripNullJsonSchemaPlaceholders(value)])
    ) as T;
  }
  return input;
}

export const openAIScriptJsonSchema = makeOpenAIStrictJsonSchema(
  inlineLocalJsonSchemaRefs(scriptJsonSchema.definitions?.radio_script ?? scriptJsonSchema, scriptJsonSchema)
);

export function validateScript(input: unknown) {
  const parsed = scriptSchema.safeParse(input);
  if (parsed.success) {
    return { valid: true as const, data: parsed.data, errors: [] as string[] };
  }
  return {
    valid: false as const,
    data: null,
    errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
  };
}
