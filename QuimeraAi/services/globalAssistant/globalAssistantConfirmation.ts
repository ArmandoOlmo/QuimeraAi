const normalize = (value: string): string =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

const CONFIRMATION_PHRASES = new Set([
    'confirm',
    'confirmar',
    'confirmo',
    'aplicar',
    'aplica',
    'ejecutar',
    'ejecuta',
    'proceed',
    'apply',
    'apply it',
    'run it',
    'yes apply',
    'yes confirm',
    'si',
    'si aplica',
    'si confirmar',
    'dale',
]);

const CANCELLATION_PHRASES = new Set([
    'cancel',
    'cancelar',
    'cancela',
    'no',
    'no aplicar',
    'no confirmes',
    'descartar',
    'discard',
    'stop',
]);

export function isAssistantPlanCancellation(value: string): boolean {
    const text = normalize(value);
    if (!text) return false;
    if (CANCELLATION_PHRASES.has(text)) return true;
    return text.startsWith('cancel ') || text.startsWith('cancela ') || text.startsWith('no aplicar');
}

export function isAssistantPlanConfirmation(value: string): boolean {
    const text = normalize(value);
    if (!text || isAssistantPlanCancellation(text)) return false;
    if (CONFIRMATION_PHRASES.has(text)) return true;
    return text.startsWith('confirmar ') || text.startsWith('aplicar ') || text.startsWith('aplica ') || text.startsWith('ejecuta ') || text.startsWith('apply ');
}
