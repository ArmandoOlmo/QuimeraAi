
import { describe, it, expect } from 'vitest';

// Function to be tested (will be moved to source later)
const cleanVoiceTranscript = (text: string): string => {
    // Remove <thought> tags and content
    let cleaned = text.replace(/<thought>[\s\S]*?<\/thought>/gi, '');

    // Remove *thinking* patterns if they exist (adjust based on actual model output)
    // cleaned = cleaned.replace(/\*thinking\*[\s\S]*?\*thinking\*/gi, '');

    return cleaned.trim();
};

describe('Voice Transcript Cleaning', () => {
    it('should remove thought tags from transcript', () => {
        const input = 'Here is the response. <thought>This is my internal thought.</thought>';
        const expected = 'Here is the response.';
        expect(cleanVoiceTranscript(input)).toBe(expected);
    });

    it('should remove thought tags when they are at the beginning', () => {
        const input = '<thought>Planning the response...</thought>Hello user.';
        const expected = 'Hello user.';
        expect(cleanVoiceTranscript(input)).toBe(expected);
    });

    it('should detailed thoughts', () => {
        const input = '<thought>\nUser asked for X.\nI should provide Y.\n</thought>\nHere is Y.';
        const expected = 'Here is Y.';
        expect(cleanVoiceTranscript(input)).toBe(expected);
    });

    it('should handle multiple thought blocks', () => {
        const input = '<thought>Thinking 1</thought>Part 1. <thought>Thinking 2</thought>Part 2.';
        const expected = 'Part 1. Part 2.';
        expect(cleanVoiceTranscript(input)).toBe(expected);
    });
});
