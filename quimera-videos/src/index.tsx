import { registerRoot } from 'remotion';
import { Composition } from 'remotion';
import React from 'react';
import { ProductIntro } from './ProductIntro';
import { FeatureShowcase } from './FeatureShowcase';
import { HowItWorks } from './HowItWorks';

const FPS = 30;

export const RemotionRoot: React.FC = () => {
    return (
        <>
        <Composition
        id= "ProductIntro"
    component = { ProductIntro }
    durationInFrames = { 450}
    fps = { FPS }
    width = { 1920}
    height = { 1080}
        />
        <Composition
        id="FeatureShowcase"
    component = { FeatureShowcase }
    durationInFrames = { 900}
    fps = { FPS }
    width = { 1920}
    height = { 1080}
        />
        <Composition
        id="HowItWorks"
    component = { HowItWorks }
    durationInFrames = { 600}
    fps = { FPS }
    width = { 1920}
    height = { 1080}
        />
        </>
  );
};

registerRoot(RemotionRoot);
