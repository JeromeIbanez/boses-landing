import type { PlannedCreative, Story } from "../../types";
import { segmentsOf } from "./segments";

const STYLE_BASE =
  "Cinematic vertical 9:16 still. Serious, atmospheric, documentary tone. " +
  "Muted desaturated palette, soft directional light, subtle film grain, restrained composition. " +
  "No text, no watermarks, no logos, no captions.";

const ABSTRACT_HINT =
  "Abstract moody backdrop: dark layered gradients, faint texture, depth, negative space.";

/**
 * Zero-dependency planner. Creative rules:
 * - hook/outro get abstract, non-depictive visuals -> tagged "abstract"
 * - beats get scene imagery derived from their visualHint; since generated
 *   imagery depicts events beyond the source material, it is always tagged
 *   "reconstruction" (per project constraints)
 * - motion alternates gently between push-in / pull-out, pan-up for the outro
 */
export function deterministicCreatives(story: Story): PlannedCreative[] {
  return segmentsOf(story).map((seg, i) => {
    const isBookend = seg.beatId === "hook" || seg.beatId === "outro";
    const hint = seg.visualHint?.trim();
    const prompt = isBookend || !hint ? `${ABSTRACT_HINT} ${STYLE_BASE}` : `${hint}. ${STYLE_BASE}`;
    return {
      beatId: seg.beatId,
      prompt,
      assetTag: isBookend || !hint ? "abstract" : "reconstruction",
      motion: {
        type: seg.beatId === "outro" ? "pan-up" : i % 2 === 0 ? "kenburns-in" : "kenburns-out",
        intensity: 0.3,
      },
    };
  });
}
