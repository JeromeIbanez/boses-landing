# media-builder

One-agent MVP: take a single `story.json` and output one watchable 9:16 prototype video.

No scouting, no verification agents, no publishing, no account automation. One input, one mp4, human review mandatory.

```
npm install
npm run build-story -- --input examples/story.json
# -> build/earhart-final-flight/earhart-final-flight.mp4
```

It runs end-to-end with **zero API keys and zero local tools installed** — every integration has an offline fallback (placeholder visuals, silent narration sized to speech-length estimates). Add keys/tools in `.env` and the same command upgrades itself.

## Repo structure

```
media-builder/
├── examples/story.json          # sample input (Earhart's final flight)
├── schemas/                     # JSON Schema docs for the two contracts
│   ├── story.schema.json
│   └── shot-plan.schema.json
├── src/
│   ├── cli.ts                   # entry point: npm run build-story
│   ├── types.ts                 # zod schemas — runtime source of truth
│   ├── pipeline/                # the 6 steps, in order
│   │   ├── validate.ts          #   1. load + validate story.json
│   │   ├── plan.ts              #   2. story -> shot-plan.json
│   │   ├── assets.ts            #   3. one visual per shot
│   │   ├── narration.ts         #   4. one narration wav per shot
│   │   ├── captions.ts          #   5. caption cues timed to audio
│   │   ├── manifest.ts          #      assemble render-manifest.json
│   │   └── render.ts            #   6. Remotion bundle + h264 render
│   ├── providers/               # swappable integrations, one interface each
│   │   ├── images/              # openai (gpt-image-1) | placeholder (offline SVG)
│   │   ├── tts/                 # piper | macOS say | silence
│   │   └── planner/             # claude (Agent SDK) | deterministic
│   ├── remotion/                # the 1080x1920 composition
│   │   ├── Root.tsx
│   │   └── StoryVideo.tsx
│   └── util/                    # .env loader, wav read/write, estimates
├── remotion.config.ts           # for `npm run studio`
└── .env.example
```

## Pipeline

```
story.json ──validate──> Story
           ──plan──────> shot-plan.json      (narration verbatim + visual prompts/motion)
           ──assets────> assets/shot-NN.png|svg
           ──narration─> audio/shot-NN.wav
           ──captions──> cues timed to real audio duration
           ──manifest──> render-manifest.json
           ──remotion──> <storyId>.mp4       (1080x1920, 30fps, h264)
```

Every intermediate artifact is written to `build/<storyId>/` so each step is inspectable and re-runnable. `--skip-render` stops before the (slow) render step; `--out` overrides the output dir.

## The two contracts

### story.json (input — see `schemas/story.schema.json`)

```jsonc
{
  "id": "earhart-final-flight",        // slug, drives output paths
  "title": "The Last Transmission",
  "language": "en",
  "sources": [{ "name": "...", "url": "...", "note": "..." }],  // >= 1 required
  "hook": "Opening line, spoken verbatim.",
  "beats": [
    {
      "id": "takeoff",
      "text": "One narration line. Spoken verbatim — the fact boundary.",
      "visualHint": "Optional scene description for image generation.",
      "factuality": "fact"             // "fact" | "context"
    }
  ],
  "outro": "Optional closing line.",
  "style": { "tone": "serious", "palette": "moody-dark" }  // moody-dark | cold-blue | warm-dusk
}
```

### shot-plan.json (derived — see `schemas/shot-plan.schema.json`)

```jsonc
{
  "storyId": "earhart-final-flight",
  "planner": "deterministic",          // or "claude"
  "fps": 30, "width": 1080, "height": 1920,
  "shots": [
    {
      "id": "shot-01",
      "beatId": "hook",                // "hook" | "outro" | a beat id
      "narrationText": "…verbatim from story.json, never model output…",
      "visual": {
        "kind": "generated-image",
        "prompt": "image-generation prompt",
        "assetTag": "reconstruction"   // documentary | abstract | reconstruction
      },
      "motion": { "type": "kenburns-in", "intensity": 0.3 },
      "estDurationSec": 6.7            // replaced by real audio length in the manifest
    }
  ]
}
```

## Fact-safety model

- **Narration is copied verbatim** from `story.json` into every shot. The LLM planner only proposes image prompts, motion, and asset tags — its output cannot change a single spoken word. No invented facts, structurally.
- **Every generated image that depicts a scene or event is tagged `reconstruction`** in the shot plan and manifest. The planner is forbidden from tagging generated imagery `documentary` (that tag is reserved for real, user-supplied material later). Non-depictive backdrops are `abstract`.
- Reconstruction shots carry a small on-screen `RECONSTRUCTION` tag by default so the human reviewer sees provenance; set `MEDIA_BUILDER_HIDE_TAGS=1` to hide it.
- Sources are required in the input and rendered as attribution on the final shot.
- **This tool never posts anywhere.** Output is a local mp4; review is on you.

## Providers (all swappable, all with fallbacks)

| Role | Real provider | Fallback chain | Selection |
|---|---|---|---|
| Shot planning | Claude Agent SDK (`ANTHROPIC_API_KEY`) | deterministic planner | `MEDIA_BUILDER_PLANNER` |
| Visuals | OpenAI `gpt-image-1` (`OPENAI_API_KEY`) | offline atmospheric SVG placeholders | `MEDIA_BUILDER_IMAGES` |
| Narration | Piper (`PIPER_VOICE=/path/to/voice.onnx`) | macOS `say` → silence (timed) | `MEDIA_BUILDER_TTS` |
| Captions | — | proportional chunk timing (swap for forced alignment later) | — |
| Render | Remotion + Chromium | — | `REMOTION_BROWSER_EXECUTABLE` |

Each provider is a small module implementing one interface (`src/providers/*/types.ts`); adding a new one means one file plus one line in the picker. Failures degrade per-shot with a console warning instead of killing the run.

### Mac setup for the full experience

```bash
brew install piper-tts             # or: pip install piper-tts
# download a voice, e.g. en_US-lessac-medium.onnx (+ .json) from the piper voices repo
cp .env.example .env               # set PIPER_VOICE, OPENAI_API_KEY, ANTHROPIC_API_KEY
npm run build-story -- --input examples/story.json
```

Without Piper, on a Mac the pipeline automatically uses the built-in `say` command so you still get real narration. `npm run studio` opens the composition in Remotion Studio for visual iteration.

## Creative direction (baked into the composition + prompts)

Serious, atmospheric, credible. Dark palettes, restrained Ken Burns motion (≤ ~8% scale over a shot), clean typographic captions on a legibility gradient, quiet uppercase title kicker, source attribution on the final frame. Image prompts append "no text, no watermarks" and steer away from oversaturated AI-slop looks.

## What this deliberately is not (yet)

Multi-agent orchestration, story scouting, claim verification, music/SFX, forced-alignment captions, publishing. The seams for those are the provider interfaces and the `build/<storyId>/` artifacts — nothing else assumes their existence.
