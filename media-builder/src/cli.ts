import fs from "node:fs";
import path from "node:path";
import { generateAssets } from "./pipeline/assets";
import { buildManifest } from "./pipeline/manifest";
import { generateNarration } from "./pipeline/narration";
import { buildShotPlan } from "./pipeline/plan";
import { renderVideo } from "./pipeline/render";
import { loadStory } from "./pipeline/validate";
import { loadDotEnv } from "./util/env";

function parseArgs(argv: string[]): { input: string; out?: string; skipRender: boolean } {
  let input = "";
  let out: string | undefined;
  let skipRender = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--input" || argv[i] === "-i") input = argv[++i] ?? "";
    else if (argv[i] === "--out" || argv[i] === "-o") out = argv[++i];
    else if (argv[i] === "--skip-render") skipRender = true;
  }
  if (!input) {
    console.error("usage: npm run build-story -- --input examples/story.json [--out build/my-run] [--skip-render]");
    process.exit(1);
  }
  return { input, out, skipRender };
}

async function main() {
  loadDotEnv();
  const { input, out, skipRender } = parseArgs(process.argv.slice(2));
  const started = Date.now();

  console.log(`\nmedia-builder — story -> 9:16 prototype\n`);

  // 1. Load + validate
  const story = loadStory(input);
  console.log(`• story: "${story.title}" (${story.beats.length} beats, ${story.sources.length} source${story.sources.length > 1 ? "s" : ""})`);

  const outDir = out ?? path.join("build", story.id);
  fs.mkdirSync(outDir, { recursive: true });

  // 2. Shot plan
  const plan = await buildShotPlan(story);
  fs.writeFileSync(path.join(outDir, "shot-plan.json"), JSON.stringify(plan, null, 2));
  console.log(`• shot plan: ${plan.shots.length} shots (planner: ${plan.planner}) -> ${path.join(outDir, "shot-plan.json")}`);

  // 3. Visual assets
  const assets = await generateAssets(story, plan, outDir);

  // 4. Narration audio
  const audio = await generateNarration(plan, outDir);

  // 5. Captions + manifest
  const manifest = buildManifest(story, plan, assets, audio);
  fs.writeFileSync(path.join(outDir, "render-manifest.json"), JSON.stringify(manifest, null, 2));
  const totalSec = manifest.totalDurationInFrames / manifest.fps;
  console.log(`• manifest: ${manifest.shots.length} shots, ${totalSec.toFixed(1)}s total -> ${path.join(outDir, "render-manifest.json")}`);

  // 6. Render
  const outputPath = path.join(outDir, `${story.id}.mp4`);
  if (skipRender) {
    console.log("• render skipped (--skip-render)");
  } else {
    await renderVideo(manifest, outDir, outputPath);
    const sizeMb = fs.statSync(outputPath).size / (1024 * 1024);
    console.log(`\n✓ done in ${((Date.now() - started) / 1000).toFixed(0)}s`);
    console.log(`  video:    ${outputPath} (${sizeMb.toFixed(1)} MB, ${totalSec.toFixed(1)}s, 1080x1920)`);
  }
  console.log(`  plan:     ${path.join(outDir, "shot-plan.json")}`);
  console.log(`  manifest: ${path.join(outDir, "render-manifest.json")}`);
  console.log(`\n⚠ human review required before this video goes anywhere. This tool never posts.\n`);
}

main().catch((err) => {
  console.error(`\n✗ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
