import { buildCaptions } from "./captions";
import type { ShotAssets } from "./assets";
import type { ShotAudio } from "./narration";
import { RenderManifestSchema, type RenderManifest, type ShotPlan, type Story } from "../types";

const TAIL_PAD_SEC = 0.45; // breathing room after each narration line
const MIN_SHOT_SEC = 2.2;

/** Combine plan + real asset/audio results into the render manifest. */
export function buildManifest(
  story: Story,
  plan: ShotPlan,
  assets: ShotAssets,
  audio: ShotAudio
): RenderManifest {
  const shots = plan.shots.map((shot) => {
    const a = audio.get(shot.id);
    const audioDurationSec = a?.durationSec ?? shot.estDurationSec;
    const shotSec = Math.max(MIN_SHOT_SEC, audioDurationSec + TAIL_PAD_SEC);
    return {
      id: shot.id,
      imageSrc: assets.get(shot.id) ?? null,
      audioSrc: a?.relPath ?? null,
      audioDurationSec,
      durationInFrames: Math.round(shotSec * plan.fps),
      captions: buildCaptions(shot.narrationText, audioDurationSec),
      assetTag: shot.visual.assetTag,
      motion: shot.motion,
    };
  });

  return RenderManifestSchema.parse({
    storyId: story.id,
    title: story.title,
    sourceLine: `Source: ${story.sources.map((s) => s.name).join(" · ")}`,
    palette: story.style.palette,
    fps: plan.fps,
    width: plan.width,
    height: plan.height,
    showAssetTags: process.env.MEDIA_BUILDER_HIDE_TAGS !== "1",
    shots,
    totalDurationInFrames: shots.reduce((sum, s) => sum + s.durationInFrames, 0),
  });
}
