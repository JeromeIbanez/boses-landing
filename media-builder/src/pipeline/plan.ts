import { claudeCreatives, claudePlannerAvailable } from "../providers/planner/claude";
import { deterministicCreatives } from "../providers/planner/deterministic";
import { segmentsOf } from "../providers/planner/segments";
import { ShotPlanSchema, type ShotPlan, type Story } from "../types";
import { estimateSpeechSeconds } from "../util/env";

/**
 * Build the shot plan: verbatim narration segments + creative fields from a
 * planner. MEDIA_BUILDER_PLANNER=claude|deterministic forces one; otherwise
 * Claude is used when ANTHROPIC_API_KEY is set, with deterministic fallback.
 */
export async function buildShotPlan(story: Story): Promise<ShotPlan> {
  const forced = process.env.MEDIA_BUILDER_PLANNER;
  let planner: "claude" | "deterministic" =
    forced === "claude" || forced === "deterministic"
      ? forced
      : claudePlannerAvailable()
        ? "claude"
        : "deterministic";

  let creatives;
  if (planner === "claude") {
    try {
      creatives = await claudeCreatives(story);
    } catch (err) {
      console.warn(`  ! claude planner failed (${(err as Error).message}); using deterministic planner`);
      planner = "deterministic";
    }
  }
  creatives ??= deterministicCreatives(story);

  const segments = segmentsOf(story);
  const shots = segments.map((seg, i) => ({
    id: `shot-${String(i + 1).padStart(2, "0")}`,
    beatId: seg.beatId,
    narrationText: seg.text, // verbatim from story.json — never model output
    visual: {
      kind: "generated-image" as const,
      prompt: creatives[i].prompt,
      assetTag: creatives[i].assetTag,
    },
    motion: creatives[i].motion,
    estDurationSec: estimateSpeechSeconds(seg.text),
  }));

  return ShotPlanSchema.parse({
    storyId: story.id,
    planner,
    fps: 30,
    width: 1080,
    height: 1920,
    shots,
  });
}
