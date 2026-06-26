import { describe, expect, it } from 'vitest';
import {
    isAssistantPlanCancellation,
    isAssistantPlanConfirmation,
} from '../../services/globalAssistant/globalAssistantConfirmation.ts';

describe('globalAssistantConfirmation', () => {
    it('detects explicit confirmation phrases in Spanish and English', () => {
        expect(isAssistantPlanConfirmation('confirmar')).toBe(true);
        expect(isAssistantPlanConfirmation('aplica el preview')).toBe(true);
        expect(isAssistantPlanConfirmation('yes confirm')).toBe(true);
        expect(isAssistantPlanConfirmation('apply it')).toBe(true);
    });

    it('detects cancellation before confirmation', () => {
        expect(isAssistantPlanCancellation('cancelar')).toBe(true);
        expect(isAssistantPlanCancellation('no aplicar')).toBe(true);
        expect(isAssistantPlanConfirmation('no confirmes')).toBe(false);
        expect(isAssistantPlanConfirmation('no aplicar')).toBe(false);
    });
});
