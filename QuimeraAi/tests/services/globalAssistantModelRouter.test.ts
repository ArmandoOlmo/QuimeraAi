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
    it('keeps the orchestrator model compatible with tool loops', () => {
        const orchestrator = getAssistantModelConfig('orchestrator');

        expect(orchestrator.modelId).toBe('anthropic/claude-opus-4.7');
        expect(assertModelSupportsToolLoop(orchestrator)).toEqual([]);
    });

    it('marks fast image generation as non-tool-loop capable', () => {
        const imageFast = getAssistantModelConfig('imageFast');

        expect(imageFast.modelId).toBe('google/gemini-3.1-flash-image');
        expect(assertModelSupportsToolLoop(imageFast)).toEqual(['tools', 'tool_choice']);
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
});
