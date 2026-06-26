export type ProjectAiAssistantConfigSource = {
    ai_assistant_config?: Record<string, any> | null;
    data?: Record<string, any> | null;
};

function nonEmptyRecord(value: unknown): Record<string, any> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, any>;
    return Object.keys(record).length > 0 ? record : null;
}

export function resolveProjectAiAssistantConfig(project: ProjectAiAssistantConfigSource): Record<string, any> | null {
    const columnConfig = nonEmptyRecord(project.ai_assistant_config);
    if (columnConfig) return columnConfig;

    const data = nonEmptyRecord(project.data);
    const nestedData = nonEmptyRecord(data?.data);
    return (
        nonEmptyRecord(data?.aiAssistantConfig) ||
        nonEmptyRecord(data?.ai_assistant_config) ||
        nonEmptyRecord(data?.aiAssistant) ||
        nonEmptyRecord(nestedData?.aiAssistantConfig) ||
        nonEmptyRecord(nestedData?.ai_assistant_config) ||
        nonEmptyRecord(nestedData?.aiAssistant)
    );
}
