import { z } from "zod";

/* ------------------------------------------------------------------ */
/* story.json — the single input. Narration text lives here verbatim; */
/* nothing downstream is allowed to invent facts.                     */
/* ------------------------------------------------------------------ */

export const SourceSchema = z.object({
  name: z.string().min(1),
  url: z.string().url().optional(),
  note: z.string().optional(),
});

export const BeatSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  visualHint: z.string().optional(),
  factuality: z.enum(["fact", "context"]).default("fact"),
});

export const StoryStyleSchema = z.object({
  tone: z.string().default("serious"),
  palette: z.enum(["moody-dark", "cold-blue", "warm-dusk"]).default("moody-dark"),
});

export const StorySchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "id must be a lowercase slug"),
  title: z.string().min(1),
  language: z.string().default("en"),
  sources: z.array(SourceSchema).min(1, "at least one source is required"),
  hook: z.string().min(1),
  beats: z.array(BeatSchema).min(1),
  outro: z.string().optional(),
  style: StoryStyleSchema.default({ tone: "serious", palette: "moody-dark" }),
});

export type Story = z.infer<typeof StorySchema>;
export type StoryBeat = z.infer<typeof BeatSchema>;

/* ------------------------------------------------------------------ */
/* shot-plan.json — derived plan. narrationText is always copied      */
/* verbatim from the story; planners only control visuals/motion.     */
/* ------------------------------------------------------------------ */

export const AssetTagSchema = z.enum([
  "documentary", // real, user-supplied material (photos, footage)
  "abstract", // non-depictive visuals (gradients, texture, typography)
  "reconstruction", // generated imagery depicting events beyond the source material
]);

export const MotionSchema = z.object({
  type: z
    .enum(["kenburns-in", "kenburns-out", "pan-up", "none"])
    .default("kenburns-in"),
  intensity: z.number().min(0).max(1).default(0.35),
});

export const ShotVisualSchema = z.object({
  kind: z.enum(["generated-image", "placeholder"]),
  prompt: z.string(),
  assetTag: AssetTagSchema,
});

export const ShotSchema = z.object({
  id: z.string(),
  beatId: z.string(), // "hook", "outro", or a beat id from the story
  narrationText: z.string().min(1),
  visual: ShotVisualSchema,
  motion: MotionSchema,
  estDurationSec: z.number().positive(),
});

export const ShotPlanSchema = z.object({
  storyId: z.string(),
  planner: z.enum(["claude", "deterministic"]),
  fps: z.literal(30).default(30),
  width: z.literal(1080).default(1080),
  height: z.literal(1920).default(1920),
  shots: z.array(ShotSchema).min(1),
});

export type ShotPlan = z.infer<typeof ShotPlanSchema>;
export type Shot = z.infer<typeof ShotSchema>;
export type AssetTag = z.infer<typeof AssetTagSchema>;
export type Motion = z.infer<typeof MotionSchema>;

/* ------------------------------------------------------------------ */
/* render-manifest.json — everything Remotion needs, with real audio  */
/* durations and caption timings. Paths are relative to the run's     */
/* output directory, which is served as Remotion's public dir.        */
/* ------------------------------------------------------------------ */

export const CaptionCueSchema = z.object({
  text: z.string(),
  startSec: z.number().min(0),
  endSec: z.number().min(0),
});

export const RenderShotSchema = z.object({
  id: z.string(),
  imageSrc: z.string().nullable(), // null -> component renders a CSS fallback
  audioSrc: z.string().nullable(),
  audioDurationSec: z.number().min(0),
  durationInFrames: z.number().int().positive(),
  captions: z.array(CaptionCueSchema),
  assetTag: AssetTagSchema,
  motion: MotionSchema,
});

export const RenderManifestSchema = z.object({
  storyId: z.string(),
  title: z.string(),
  sourceLine: z.string(),
  palette: z.enum(["moody-dark", "cold-blue", "warm-dusk"]),
  fps: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  showAssetTags: z.boolean().default(true),
  shots: z.array(RenderShotSchema).min(1),
  totalDurationInFrames: z.number().int().positive(),
});

export type CaptionCue = z.infer<typeof CaptionCueSchema>;
export type RenderShot = z.infer<typeof RenderShotSchema>;
export type RenderManifest = z.infer<typeof RenderManifestSchema>;

/* Creative fields a planner is allowed to decide, per segment. */
export type PlannedCreative = {
  beatId: string;
  prompt: string;
  assetTag: AssetTag;
  motion: Motion;
};
