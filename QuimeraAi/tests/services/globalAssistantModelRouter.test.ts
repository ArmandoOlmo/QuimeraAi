import { describe, expect, it } from 'vitest';
import {
    assertModelSupportsToolLoop,
    getAssistantModelConfig,
    selectModelForIntent,
} from '../../services/globalAssistant/globalAssistantModelRouter.ts';
import type { AssistantIntent } from '../../types/globalAssistant.ts';

const baseIntent: AssistantIntent = {
    intent: 'explain',
    module: 'project',
    confidence: 0.8,
    projectResolution: {
        requiresProjectSwitch: false,
        ambiguous: false,
    },
    actionCandidates: [],
    requiresClarification: false,
    safetyLevel: 'low',
};

describe('globalAssistantModelRouter', () => {
    it('keeps Gemini 3 Flash as the conversational orchestrator model', () => {
        const orchestrator = getAssistantModelConfig('orchestrator');

        expect(orchestrator.modelId).toBe('google/gemini-3-flash-preview');
        expect(assertModelSupportsToolLoop(orchestrator)).toEqual([]);
    });

    it('keeps Gemini 3 Flash as the text fallback model', () => {
        const fallback = getAssistantModelConfig('fallback');

        expect(fallback.modelId).toBe('google/gemini-3-flash-preview');
        expect(assertModelSupportsToolLoop(fallback)).toEqual([]);
    });

    it('marks fast image generation as non-tool-loop capable', () => {
        const imageFast = getAssistantModelConfig('imageFast');

        expect(imageFast.modelId).toBe('google/gemini-3.1-flash-image');
        expect(assertModelSupportsToolLoop(imageFast)).toEqual(['tools', 'tool_choice']);
    });

    it('uses Gemini 3 Flash as the fast conversational model', () => {
        const fast = getAssistantModelConfig('fast');

        expect(fast.modelId).toBe('google/gemini-3-flash-preview');
        expect(assertModelSupportsToolLoop(fast)).toEqual([]);
    });

    it('routes image intents to the image pro model', () => {
        const model = selectModelForIntent({
            ...baseIntent,
            intent: 'generate_image',
            module: 'media',
            safetyLevel: 'medium',
            actionCandidates: ['generate_image'],
        });

        expect(model.modelId).toBe('google/gemini-3-pro-image');
    });

    it('routes general requests to Gemini 3 Flash by default', () => {
        const model = selectModelForIntent({
            ...baseIntent,
            safetyLevel: 'medium',
        });

        expect(model.modelId).toBe('google/gemini-3-flash-preview');
    });
});
