import fs from "node:fs";
import { StorySchema, type Story } from "../types";

/** Load and validate story.json; throws with readable messages on bad input. */
export function loadStory(inputPath: string): Story {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`story file not found: ${inputPath}`);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  } catch (err) {
    throw new Error(`story file is not valid JSON: ${(err as Error).message}`);
  }
  const parsed = StorySchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`story validation failed:\n${issues}`);
  }
  const story = parsed.data;
  const ids = new Set<string>();
  for (const beat of story.beats) {
    if (beat.id === "hook" || beat.id === "outro") {
      throw new Error(`beat id "${beat.id}" is reserved`);
    }
    if (ids.has(beat.id)) {
      throw new Error(`duplicate beat id "${beat.id}"`);
    }
    ids.add(beat.id);
  }
  return story;
}
