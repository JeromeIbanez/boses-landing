import type { Story } from "../../types";

export type Segment = {
  beatId: string; // "hook", "outro", or a story beat id
  text: string; // narration, copied VERBATIM from story.json
  visualHint?: string;
};

/**
 * The narration skeleton of the video. This is the fact-safety boundary:
 * every shot's narrationText comes from here, verbatim — planners (including
 * the LLM one) can only decide visuals and motion, never words.
 */
export function segmentsOf(story: Story): Segment[] {
  const segments: Segment[] = [
    { beatId: "hook", text: story.hook, visualHint: undefined },
    ...story.beats.map((b) => ({ beatId: b.id, text: b.text, visualHint: b.visualHint })),
  ];
  if (story.outro) {
    segments.push({ beatId: "outro", text: story.outro });
  }
  return segments;
}
