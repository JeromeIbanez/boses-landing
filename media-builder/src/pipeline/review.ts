import fs from "node:fs";
import path from "node:path";
import type { RenderManifest, ShotPlan, Story } from "../types";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Write a self-contained review page next to the render so the mandatory
 * human review has everything in one place: the video, and per shot the
 * visual, narration, prompt, provenance tag, motion, and timing.
 * All asset references are relative — open build/<id>/review.html directly.
 */
export function writeReviewPage(
  story: Story,
  plan: ShotPlan,
  manifest: RenderManifest,
  outDir: string,
  videoFileName: string
): string {
  const planShots = new Map(plan.shots.map((s) => [s.id, s]));
  const totalSec = (manifest.totalDurationInFrames / manifest.fps).toFixed(1);

  const shotRows = manifest.shots
    .map((shot, i) => {
      const p = planShots.get(shot.id);
      const dur = (shot.durationInFrames / manifest.fps).toFixed(1);
      const cues = shot.captions
        .map((c) => `<span class="cue">${c.startSec.toFixed(1)}–${c.endSec.toFixed(1)}s&ensp;${esc(c.text)}</span>`)
        .join("");
      return `
    <section class="shot">
      <div class="media">
        ${shot.imageSrc ? `<img src="${esc(shot.imageSrc)}" alt="${esc(shot.id)}" loading="lazy" />` : `<div class="noimg">no image</div>`}
      </div>
      <div class="meta">
        <h2>${String(i + 1).padStart(2, "0")} <span class="beat">${esc(p?.beatId ?? "")}</span>
          <span class="tag tag-${shot.assetTag}">${shot.assetTag}</span>
        </h2>
        <p class="narration">&ldquo;${esc(p?.narrationText ?? "")}&rdquo;</p>
        <dl>
          <dt>prompt</dt><dd>${esc(p?.visual.prompt ?? "")}</dd>
          <dt>motion</dt><dd>${esc(shot.motion.type)} · intensity ${shot.motion.intensity}</dd>
          <dt>timing</dt><dd>${dur}s (${shot.durationInFrames} frames, audio ${shot.audioDurationSec.toFixed(2)}s)</dd>
          <dt>captions</dt><dd class="cues">${cues}</dd>
          <dt>audio</dt><dd>${shot.audioSrc ? `<audio controls preload="none" src="${esc(shot.audioSrc)}"></audio>` : "none"}</dd>
        </dl>
      </div>
    </section>`;
    })
    .join("\n");

  const sources = story.sources
    .map((s) => (s.url ? `<a href="${esc(s.url)}">${esc(s.name)}</a>` : esc(s.name)) + (s.note ? ` <em>— ${esc(s.note)}</em>` : ""))
    .join("<br/>");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Review · ${esc(story.title)}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #0b0e12; color: #e8e8e6; font: 15px/1.55 -apple-system, 'Helvetica Neue', 'Segoe UI', sans-serif; }
  .wrap { max-width: 1100px; margin: 0 auto; padding: 40px 24px 100px; }
  header h1 { font-size: 22px; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 600; margin: 0 0 4px; }
  header p { color: #9aa2ab; margin: 2px 0; }
  .banner { margin: 20px 0 32px; padding: 12px 16px; border: 1px solid #3a2f28; border-radius: 6px; color: #d8c9b8; background: #16120e; }
  video { width: 100%; max-width: 380px; border-radius: 10px; display: block; margin: 24px 0; background: #000; }
  .shot { display: grid; grid-template-columns: 180px 1fr; gap: 20px; padding: 24px 0; border-top: 1px solid #1d232b; }
  .shot .media img { width: 180px; aspect-ratio: 9/16; object-fit: cover; border-radius: 8px; display: block; }
  .noimg { width: 180px; aspect-ratio: 9/16; border-radius: 8px; background: #12161c; display: grid; place-items: center; color: #566; }
  h2 { font-size: 16px; margin: 0 0 8px; font-weight: 600; }
  .beat { color: #9aa2ab; font-weight: 400; }
  .tag { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; padding: 3px 8px; border-radius: 4px; margin-left: 8px; vertical-align: 2px; }
  .tag-reconstruction { background: #3a2416; color: #e0a875; }
  .tag-abstract { background: #16242e; color: #7fb0cf; }
  .tag-documentary { background: #16301c; color: #86c996; }
  .narration { font-size: 17px; color: #f2f2f0; margin: 0 0 14px; }
  dl { display: grid; grid-template-columns: 84px 1fr; gap: 6px 14px; margin: 0; }
  dt { color: #7a828c; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; padding-top: 2px; }
  dd { margin: 0; color: #c4c9cf; }
  .cues .cue { display: inline-block; background: #12161c; border-radius: 4px; padding: 2px 8px; margin: 0 6px 6px 0; font-size: 13px; color: #9fb0c0; }
  audio { height: 32px; }
  footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #1d232b; color: #9aa2ab; }
  @media (max-width: 640px) { .shot { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>${esc(story.title)}</h1>
    <p>${esc(story.id)} · ${manifest.shots.length} shots · ${totalSec}s · planner: ${esc(plan.planner)}</p>
  </header>
  <div class="banner">⚠ Mandatory human review. Check every narration line against the sources below, and every visual for misleading detail. This build is not published anywhere.</div>
  <video src="${esc(videoFileName)}" controls preload="metadata"></video>
${shotRows}
  <footer>
    <strong>Sources</strong><br/>${sources}
  </footer>
</div>
</body>
</html>
`;
  const outPath = path.join(outDir, "review.html");
  fs.writeFileSync(outPath, html);
  return outPath;
}
