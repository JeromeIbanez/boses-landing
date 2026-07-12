import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { AssetTagSchema, MotionSchema, type PlannedCreative, type Story } from "../../types";
import { deterministicCreatives } from "./deterministic";
import { segmentsOf } from "./segments";

const CreativeListSchema = z.array(
  z.object({
    beatId: z.string(),
    prompt: z.string().min(1),
    assetTag: AssetTagSchema,
    motion: MotionSchema,
  })
);

/**
 * LLM planner via the Claude Agent SDK. It only proposes image prompts,
 * asset tags, and motion per segment — narration text is never sent through
 * the model into the output, so no facts can be invented. Any failure or
 * missing segment falls back to the deterministic planner's choice.
 */
export async function claudeCreatives(story: Story): Promise<PlannedCreative[]> {
  const segments = segmentsOf(story);
  const fallback = deterministicCreatives(story);

  const prompt = `You are the shot-planning module of a short-form documentary video pipeline.

Creative direction: serious, atmospheric, credible, modern and moody, restrained motion. Avoid generic AI-slop aesthetics: no oversaturated colors, no fantasy lighting, no uncanny faces (prefer silhouettes, environments, objects, wide shots).

For each narration segment below, propose:
- "prompt": an image-generation prompt for one cinematic vertical 9:16 still (always append "No text, no watermarks, no logos.")
- "assetTag": "abstract" if the visual is non-depictive (gradients/texture/typography backdrop), or "reconstruction" if it depicts a scene, person, or event (generated imagery of real events is ALWAYS "reconstruction", never "documentary")
- "motion": {"type": one of "kenburns-in" | "kenburns-out" | "pan-up" | "none", "intensity": 0..1 (keep <= 0.4, motion must stay restrained)}

Segments (id + narration + optional visual hint):
${JSON.stringify(
    segments.map((s) => ({ beatId: s.beatId, narration: s.text, visualHint: s.visualHint ?? null })),
    null,
    2
  )}

Respond with ONLY a JSON array of {"beatId", "prompt", "assetTag", "motion"} objects, one per segment, in order. No prose, no code fences.`;

  const { query } = await import("@anthropic-ai/claude-agent-sdk");
  let text = "";
  for await (const message of query({
    prompt,
    options: { maxTurns: 1, allowedTools: [], persistSession: false },
  })) {
    if (message.type === "result" && message.subtype === "success") {
      text = message.result;
    }
  }

  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const proposed = CreativeListSchema.parse(JSON.parse(cleaned));
  const byBeat = new Map(proposed.map((p) => [p.beatId, p]));

  // Merge: LLM choice per segment when present and sane, deterministic otherwise.
  return segments.map((seg, i) => {
    const p = byBeat.get(seg.beatId);
    if (!p) return fallback[i];
    // Safety: generated depictions of real events may not claim "documentary".
    const assetTag = p.assetTag === "documentary" ? "reconstruction" : p.assetTag;
    return { beatId: seg.beatId, prompt: p.prompt, assetTag, motion: p.motion };
  });
}

export function claudePlannerAvailable(): boolean {
  if (process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_CODE_OAUTH_TOKEN) return true;
  // The Agent SDK can also use an authenticated Claude Code install
  // (e.g. `claude login` on a Mac), no API key required.
  return fs.existsSync(path.join(os.homedir(), ".claude", ".credentials.json"));
}
