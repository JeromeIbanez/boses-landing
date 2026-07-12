import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { RenderManifest, RenderShot } from "../types";

const FONT_STACK = "'Inter', 'Helvetica Neue', -apple-system, 'Segoe UI', sans-serif";

const PALETTE_BG: Record<string, string> = {
  "moody-dark": "#0b0e12",
  "cold-blue": "#0a1018",
  "warm-dusk": "#120e0b",
};

const FALLBACK_GRADIENTS: Record<string, string> = {
  "moody-dark": "radial-gradient(120% 80% at 30% 20%, #22303f 0%, transparent 60%), radial-gradient(120% 90% at 70% 80%, #3a2f28 0%, transparent 65%)",
  "cold-blue": "radial-gradient(120% 80% at 30% 20%, #16304a 0%, transparent 60%), radial-gradient(120% 90% at 70% 80%, #1d3a3f 0%, transparent 65%)",
  "warm-dusk": "radial-gradient(120% 80% at 30% 20%, #41301f 0%, transparent 60%), radial-gradient(120% 90% at 70% 80%, #2f1d22 0%, transparent 65%)",
};

const ShotView: React.FC<{
  shot: RenderShot;
  isFirst: boolean;
  isLast: boolean;
  manifest: RenderManifest;
}> = ({ shot, isFirst, isLast, manifest }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = shot.durationInFrames;

  // Restrained Ken Burns: max ~8% scale / 4% travel over the whole shot.
  const k = 0.04 + shot.motion.intensity * 0.1;
  const progress = interpolate(frame, [0, dur], [0, 1]);
  let transform = "none";
  if (shot.motion.type === "kenburns-in") {
    transform = `scale(${1 + k * progress})`;
  } else if (shot.motion.type === "kenburns-out") {
    transform = `scale(${1 + k * (1 - progress)})`;
  } else if (shot.motion.type === "pan-up") {
    transform = `scale(${1 + k}) translateY(${-k * 50 * progress}%)`;
  }

  const fadeIn = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [dur - 8, dur], [1, 0], { extrapolateLeft: "clamp" });
  const opacity = Math.min(fadeIn, fadeOut);

  const tSec = frame / fps;
  const cue = shot.captions.find((c) => tSec >= c.startSec && tSec < c.endSec);
  const cueLocalFrame = cue ? frame - Math.round(cue.startSec * fps) : 0;
  const cueOpacity = cue ? interpolate(cueLocalFrame, [0, 5], [0, 1], { extrapolateRight: "clamp" }) : 0;
  const cueRise = cue ? interpolate(cueLocalFrame, [0, 5], [10, 0], { extrapolateRight: "clamp" }) : 0;

  const bg = PALETTE_BG[manifest.palette] ?? "#0b0e12";

  return (
    <AbsoluteFill style={{ backgroundColor: bg, opacity }}>
      {/* Visual layer */}
      <AbsoluteFill style={{ transform, transformOrigin: "center 45%" }}>
        {shot.imageSrc ? (
          <Img
            src={staticFile(shot.imageSrc)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <AbsoluteFill style={{ backgroundImage: FALLBACK_GRADIENTS[manifest.palette] }} />
        )}
      </AbsoluteFill>

      {/* Legibility gradient behind captions */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to top, rgba(4,6,9,0.82) 0%, rgba(4,6,9,0.45) 22%, transparent 45%)," +
            "linear-gradient(to bottom, rgba(4,6,9,0.5) 0%, transparent 18%)",
        }}
      />

      {/* Title kicker on the opening shot */}
      {isFirst && (
        <div
          style={{
            position: "absolute",
            top: 128,
            left: 90,
            right: 90,
            textAlign: "center",
            fontFamily: FONT_STACK,
            fontSize: 30,
            fontWeight: 500,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "rgba(240,240,238,0.62)",
          }}
        >
          {manifest.title}
        </div>
      )}

      {/* Internal provenance tag — kept visible for human review */}
      {manifest.showAssetTags && shot.assetTag === "reconstruction" && (
        <div
          style={{
            position: "absolute",
            top: 210,
            right: 64,
            fontFamily: FONT_STACK,
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "rgba(240,240,238,0.4)",
          }}
        >
          Reconstruction
        </div>
      )}

      {/* Captions */}
      {cue && (
        <div
          style={{
            position: "absolute",
            bottom: 360,
            left: 96,
            right: 96,
            textAlign: "center",
            fontFamily: FONT_STACK,
            fontSize: 58,
            fontWeight: 600,
            lineHeight: 1.28,
            color: "#f2f2f0",
            textShadow: "0 2px 24px rgba(0,0,0,0.55)",
            opacity: cueOpacity,
            transform: `translateY(${cueRise}px)`,
          }}
        >
          {cue.text}
        </div>
      )}

      {/* Source attribution on the final shot */}
      {isLast && (
        <div
          style={{
            position: "absolute",
            bottom: 150,
            left: 96,
            right: 96,
            textAlign: "center",
            fontFamily: FONT_STACK,
            fontSize: 26,
            fontWeight: 400,
            letterSpacing: "0.04em",
            color: "rgba(240,240,238,0.5)",
          }}
        >
          {manifest.sourceLine}
        </div>
      )}

      {shot.audioSrc && <Audio src={staticFile(shot.audioSrc)} />}
    </AbsoluteFill>
  );
};

export const StoryVideo: React.FC<{ manifest: RenderManifest }> = ({ manifest }) => {
  let from = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#04060a" }}>
      {manifest.shots.map((shot, i) => {
        const seq = (
          <Sequence key={shot.id} from={from} durationInFrames={shot.durationInFrames} name={shot.id}>
            <ShotView
              shot={shot}
              isFirst={i === 0}
              isLast={i === manifest.shots.length - 1}
              manifest={manifest}
            />
          </Sequence>
        );
        from += shot.durationInFrames;
        return seq;
      })}
    </AbsoluteFill>
  );
};
