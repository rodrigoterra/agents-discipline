# Component contracts

All components are typed below as a TS-flavored signature. Match the reference (`reference/components/v3-system.jsx`) for exact visuals.

```ts
// Card — every panel surface in the app
type CardProps = {
  title?: string;             // tag-style uppercase, copper if accent
  sub?: string;               // mono muted, prefixed " / "
  action?: ReactNode;         // right side of header
  children: ReactNode;
  pad?: number;               // default 14, 10 dense, 0 to opt out
  dense?: boolean;            // tighter header padding
  accent?: boolean;           // copper border + glow
};
```

```ts
type BtnProps = {
  variant?: "primary" | "secondary" | "ghost" | "danger";  // default ghost
  size?: "sm" | "md" | "lg";                                // default md
  active?: boolean;                                          // overrides variant → copper
  full?: boolean;                                            // 100% width
  icon?: ReactNode;
  onClick?(): void;
  children: ReactNode;
};
// Sizes: sm h24 / px8 / fs10, md h30 / px12 / fs11, lg h38 / px16 / fs12
```

```ts
type TagProps = {
  color?: "muted" | "copper" | "green" | "red" | "amber" | "blue";
  filled?: boolean;
  children: ReactNode;
};
// 9px/700/0.18em uppercase. Filled = solid bg + near-black text.
// Outline = transparent bg, color@33% border, color text.
```

```ts
type DropProps = {
  label: string;       // tag-style left
  value: string;       // mono right
  hot?: boolean;       // copper accent (current selection)
  full?: boolean;
  w?: number | string;
};
// Panel-lo bg, hair border, 5px 9px padding, 28px tall.
```

```ts
type SliderProps = {
  label: string;
  value: number;
  min?: number;        // 0
  max?: number;        // 1
  unit?: "ms" | "Hz" | string;
  accent?: "copper" | "amber" | "green" | "red" | "blue";  // default copper
  onChange?(v: number): void;
};
// Track 4px tall. Fill is gradient accent88 → accent.
// At pct >= 0.98: fill becomes solid + glow, value text turns accent color (PEAK state).
```

```ts
type KnobProps = {
  value: number;          // 0..1
  size?: number;          // default 44
  label?: string;
  accent?: string;        // default copper
  onChange?(v: number): void;
};
// 270° sweep, -135° to +135°. 11 ticks. 2px copper indicator with copper glow.
```

```ts
type ReadoutProps = {
  label?: string;
  value: ReactNode;
  w?: number;        // min-width
  mono?: boolean;    // default true
  accent?: string;   // value color override
};
```

```ts
type LEDProps = {
  on?: boolean;                      // default true
  color?: "green" | "red" | "amber" | "blue" | "copper" | string;
  size?: number;                     // default 6
  blink?: boolean;                   // 600ms square-wave
};
```

```ts
type SpeakerProps = {
  name: "CAPCOM" | "SHIP" | string;  // amber / green / muted
  sub?: string;                       // mono muted
};
```

```ts
type WaveProps = {
  height?: number;        // default 36
  seed?: number;          // deterministic shape
  color?: string;         // default copper
  dense?: boolean;        // 80 bars vs 56
};
```

```ts
type ChannelStripProps = {
  label: string;          // U1 / U2 / BUS
  speaker?: "CAPCOM" | "SHIP" | "—";
  voice: string;
  level: number;          // 0..1
  pan: number;            // -1..1
  fxScene: string;
  mute: boolean;
  solo: boolean;
  active?: boolean;
  master?: boolean;
  processed?: boolean;
  stale?: boolean;
  onLevelChange?(v: number): void;
  onMuteToggle?(): void;
  onSoloToggle?(): void;
};
```

```ts
type SpectrogramProps = {
  bins: number[][];       // [freq][time] energy 0..1
  playheadPct: number;    // 0..1
  height?: number;        // default 180
};
```

```ts
type TimelineLaneProps = {
  laneId: "capcom" | "ship" | "qd" | "fx";
  laneName: string;
  laneColor: string;
  utterances: Utterance[];           // global; lane filters its own
  totalMs: number;
  playheadMs: number;
  onUtteranceClick?(id: string): void;
};
```

```ts
// ALPHA2 Radio FX role stack
type RoleDspStackProps = {
  roleId: string;                     // CAPCOM, SHIP, or future story role id
  roleLabel: string;
  roleColor: string;                  // CAPCOM amber, SHIP green, future roles semantic
  voiceSummary: string;
  assignmentMode: "live" | "assigned";
  editable: boolean;                  // active role stack only
  processedCue?: { id: string; label: string };
  dspGroups: DspGroupSpec[];          // Quindar, Voice Band, Hiss, Scintillation, Granular
  staleState: "current" | "stale" | "needs_render";
  onFocusRole?(roleId: string): void;
  onSaveCurrentToRole?(roleId: string): void;
  onClearRoleFx?(roleId: string): void;
};
```

```ts
// ALPHA2 Stitch DAW strip
type DawTimelineProps = {
  clips: Array<{
    id: string;
    roleId: string;                   // CAPCOM, SHIP, etc.
    text: string;
    startSeconds: number;
    durationSeconds: number;
    status: "current" | "stale" | "needs_render";
  }>;
  lanes: Array<{
    id: "CAPCOM" | "SHIP" | "QD" | "FX" | string;
    label: string;
    color: string;
  }>;
  quindarMarkers: Array<{ utteranceId: string; startSeconds: number; intro: boolean; outro: boolean }>;
  environmentBedLabel: string;
  totalSeconds: number;
  staleReasons: Array<{ code: "V" | "E" | "C" | "S" | string; label: string }>;
  onClipSelect?(utteranceId: string): void;
};
```

```ts
type AppShellProps = {
  active: "console" | "voice" | "fx" | "stitch";
  hideRight?: boolean;
  hideBottom?: boolean;
  children: ReactNode;
};
```
