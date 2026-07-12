import React from "react";
import { Composition } from "remotion";
import { StoryVideo } from "./StoryVideo";
import type { RenderManifest } from "../types";

/** Tiny built-in manifest so `npm run studio` opens without a prior build. */
const demoManifest: RenderManifest = {
  storyId: "demo",
  title: "Media Builder",
  sourceLine: "Source: demo",
  palette: "moody-dark",
  fps: 30,
  width: 1080,
  height: 1920,
  showAssetTags: true,
  shots: [
    {
      id: "shot-01",
      imageSrc: null,
      audioSrc: null,
      audioDurationSec: 3,
      durationInFrames: 105,
      captions: [
        { text: "This is the demo", startSec: 0, endSec: 1.5 },
        { text: "composition.", startSec: 1.5, endSec: 3 },
      ],
      assetTag: "abstract",
      motion: { type: "kenburns-in", intensity: 0.3 },
    },
    {
      id: "shot-02",
      imageSrc: null,
      audioSrc: null,
      audioDurationSec: 3,
      durationInFrames: 105,
      captions: [
        { text: "Run build-story to", startSec: 0, endSec: 1.5 },
        { text: "render a real story.", startSec: 1.5, endSec: 3 },
      ],
      assetTag: "reconstruction",
      motion: { type: "kenburns-out", intensity: 0.3 },
    },
  ],
  totalDurationInFrames: 210,
};

export const Root: React.FC = () => {
  return (
    <Composition
      id="StoryVideo"
      component={StoryVideo}
      durationInFrames={demoManifest.totalDurationInFrames}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ manifest: demoManifest }}
      calculateMetadata={({ props }) => ({
        durationInFrames: props.manifest.totalDurationInFrames,
        fps: props.manifest.fps,
        width: props.manifest.width,
        height: props.manifest.height,
      })}
    />
  );
};
