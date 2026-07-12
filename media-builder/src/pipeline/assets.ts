import fs from "node:fs";
import path from "node:path";
import { pickImageProvider, placeholderImages } from "../providers/images/index";
import type { ShotPlan, Story } from "../types";

export type ShotAssets = Map<string, string>; // shotId -> image relPath

/**
 * Generate one visual per shot into <outDir>/assets/. Falls back to the
 * offline placeholder provider per-shot if the real provider errors.
 */
export async function generateAssets(story: Story, plan: ShotPlan, outDir: string): Promise<ShotAssets> {
  const provider = pickImageProvider();
  console.log(`• visuals: ${provider.name}`);
  fs.mkdirSync(path.join(outDir, "assets"), { recursive: true });

  const result: ShotAssets = new Map();
  for (const [i, shot] of plan.shots.entries()) {
    let active = provider;
    let relPath = `assets/${shot.id}.${active.extension}`;
    try {
      await active.generate({
        shot,
        shotIndex: i,
        story,
        outAbsPath: path.join(outDir, relPath),
        relPath,
      });
    } catch (err) {
      console.warn(`  ! ${active.name} failed for ${shot.id} (${(err as Error).message}); using placeholder`);
      active = placeholderImages;
      relPath = `assets/${shot.id}.${active.extension}`;
      await active.generate({
        shot,
        shotIndex: i,
        story,
        outAbsPath: path.join(outDir, relPath),
        relPath,
      });
    }
    console.log(`  ✓ ${shot.id} -> ${relPath} [${shot.visual.assetTag}]`);
    result.set(shot.id, relPath);
  }
  return result;
}
