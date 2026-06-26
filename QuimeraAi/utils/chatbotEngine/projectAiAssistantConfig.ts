export type ProjectAiAssistantConfigSource = {
    ai_assistant_config?: Record<string, any> | null;
    data?: Record<string, any> | null;
};

const LANGUAGE_LABELS: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    pt: 'Portuguese',
};

function nonEmptyRecord(value: unknown): Record<string, any> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, any>;
    return Object.keys(record).length > 0 ? record : null;
}

function stringValue(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function stringList(value: unknown): string[] {
    return Array.isArray(value)
        ? value.map(item => stringValue(item)).filter(Boolean)
        : [];
}

function arrayValue<T = any>(value: unknown): T[] {
    return Array.isArray(value) ? value as T[] : [];
}

function mergeRecords(fallback: unknown, override: unknown): Record<string, any> | undefined {
    const fallbackRecord = nonEmptyRecord(fallback);
    const overrideRecord = nonEmptyRecord(override);
    if (!fallbackRecord && !overrideRecord) return undefined;
    return {
        ...(fallbackRecord || {}),
        ...(overrideRecord || {}),
    };
}

function mergeDocuments(primary: unknown, fallback: unknown): Record<string, any>[] {
    const primaryDocuments = arrayValue<Record<string, any>>(primary)
        .filter(document => document && typeof document === 'object' && !Array.isArray(document));
    const fallbackDocuments = arrayValue<Record<string, any>>(fallback)
        .filter(document => document && typeof document === 'object' && !Array.isArray(document));
    const documents = [...primaryDocuments];

    fallbackDocuments.forEach(document => {
        const id = stringValue(document.id);
        const alreadyExists = id
            ? documents.some(existing => stringValue(existing.id) === id)
            : documents.some(existing => stringValue(existing.content) === stringValue(document.content));
        if (!alreadyExists) documents.push(document);
    });

    return documents;
}

function getBusinessBlueprint(data: Record<string, any> | null): Record<string, any> | null {
    return (
        nonEmptyRecord(data?.businessBlueprint) ||
        nonEmptyRecord(data?.data?.businessBlueprint)
    );
}

function getBrandPrimaryColor(blueprint: Record<string, any> | null): string {
    const colors = nonEmptyRecord(blueprint?.brandProfile?.colors);
    return (
        stringValue(colors?.primary) ||
        stringValue(colors?.primaryColor) ||
        stringValue(colors?.accent) ||
        '#111827'
    );
}

function labelLanguages(languages: string[]): string {
    const labels = languages
        .map(language => LANGUAGE_LABELS[language.toLowerCase()] || language)
        .filter(Boolean);
    const unique = [...new Set(labels.length ? labels : ['Spanish', 'English'])];
    if (!unique.includes('Spanish')) unique.push('Spanish');
    if (!unique.includes('English')) unique.push('English');
    return unique.join(', ');
}

function formatServices(services: unknown): string {
    if (!Array.isArray(services)) return '';
    return services
        .map(service => {
            if (!service || typeof service !== 'object' || Array.isArray(service)) return '';
            const record = service as Record<string, unknown>;
            const name = stringValue(record.name);
            const description = stringValue(record.description);
            if (!name && !description) return '';
            return [name, description].filter(Boolean).join(': ');
        })
        .filter(Boolean)
        .join('\n');
}

function formatContactInfo(contactInfo: unknown): string {
    const record = nonEmptyRecord(contactInfo);
    if (!record) return '';
    const lines = [
        ['Email', record.email],
        ['Phone', record.phone],
        ['Address', [record.address, record.city, record.state, record.country].map(stringValue).filter(Boolean).join(', ')],
    ]
        .map(([label, value]) => {
            const text = stringValue(value);
            return text ? `${label}: ${text}` : '';
        })
        .filter(Boolean);
    return lines.join('\n');
}

function buildBlueprintKnowledgeDocument(
    blueprint: Record<string, any>,
    chatbotBlueprint: Record<string, any>,
): Record<string, any> {
    const businessProfile = nonEmptyRecord(blueprint.businessProfile);
    const agentProfile = nonEmptyRecord(chatbotBlueprint.agentProfile);
    const metadata = nonEmptyRecord(chatbotBlueprint.metadata);
    const sourceTimestamp =
        stringValue(metadata?.generatedAt) ||
        stringValue(metadata?.updatedAt) ||
        stringValue(blueprint.generatedAt) ||
        stringValue(blueprint.updatedAt) ||
        '1970-01-01T00:00:00.000Z';
    const parsedTimestamp = Date.parse(sourceTimestamp);
    const businessName = stringValue(businessProfile?.businessName) || 'Project';
    const sections = [
        '# ChatCore project knowledge',
        `Business / Negocio: ${businessName}`,
        stringValue(businessProfile?.industry) ? `Industry / Industria: ${stringValue(businessProfile?.industry)}` : '',
        stringValue(businessProfile?.description) ? `Description / Descripcion: ${stringValue(businessProfile?.description)}` : '',
        stringValue(businessProfile?.tagline) ? `Tagline: ${stringValue(businessProfile?.tagline)}` : '',
        formatServices(businessProfile?.services) ? `\n## Products and services / Productos y servicios\n${formatServices(businessProfile?.services)}` : '',
        formatContactInfo(businessProfile?.contactInfo) ? `\n## Contact / Contacto\n${formatContactInfo(businessProfile?.contactInfo)}` : '',
        stringList(chatbotBlueprint.businessKnowledge).length
            ? `\n## BusinessBlueprint knowledge / Conocimiento BusinessBlueprint\n${stringList(chatbotBlueprint.businessKnowledge).map(item => `- ${item}`).join('\n')}`
            : '',
        stringList(chatbotBlueprint.productKnowledge).length
            ? `\n## Product knowledge / Conocimiento de productos\n${stringList(chatbotBlueprint.productKnowledge).map(item => `- ${item}`).join('\n')}`
            : '',
        stringList(chatbotBlueprint.policyKnowledge).length
            ? `\n## Policy knowledge / Conocimiento de politicas\n${stringList(chatbotBlueprint.policyKnowledge).map(item => `- ${item}`).join('\n')}`
            : '',
        stringValue(agentProfile?.fallbackMessage) ? `\n## Safe fallback / Respuesta segura\n${stringValue(agentProfile?.fallbackMessage)}` : '',
        '\n## Source / Origen\nGenerated from BusinessBlueprint.chatbotBlueprint when AI Studio did not persist the legacy aiAssistantConfig. Review before using as final policy, pricing, availability, or legal source.',
    ].filter(Boolean);
    const content = sections.join('\n');

    return {
        id: 'ai-studio-chatcore-project-knowledge',
        name: `${businessName} - ChatCore project knowledge`,
        content,
        extractedAt: { seconds: Number.isFinite(parsedTimestamp) ? parsedTimestamp / 1000 : 0, nanoseconds: 0 },
        fileType: 'text/markdown',
        size: content.length,
        source: 'businessBlueprint.chatbotBlueprint',
    };
}

function deriveConfigFromChatbotBlueprint(data: Record<string, any> | null): Record<string, any> | null {
    const blueprint = getBusinessBlueprint(data);
    const chatbotBlueprint = nonEmptyRecord(blueprint?.chatbotBlueprint);
    if (!blueprint || !chatbotBlueprint) return null;
    if (chatbotBlueprint.enabled === false || chatbotBlueprint.status === 'disabled') return null;

    const agentProfile = nonEmptyRecord(chatbotBlueprint.agentProfile);
    const businessProfile = nonEmptyRecord(blueprint.businessProfile);
    const leadCapture = nonEmptyRecord(chatbotBlueprint.leadCapture);
    const voiceSettings = nonEmptyRecord(chatbotBlueprint.deployment?.voiceSettings);
    const businessName = stringValue(businessProfile?.businessName) || 'Project';
    const supportedLanguages = stringList(agentProfile?.supportedLanguages);
    const productsServices = [
        formatServices(businessProfile?.services),
        ...stringList(chatbotBlueprint.productKnowledge),
    ].filter(Boolean).join('\n');
    const policiesContact = [
        formatContactInfo(businessProfile?.contactInfo),
        ...stringList(chatbotBlueprint.policyKnowledge),
    ].filter(Boolean).join('\n');
    const specialInstructions = [
        stringValue(agentProfile?.role) || 'AI Business Agent',
        stringValue(agentProfile?.personality),
        stringValue(agentProfile?.brandVoice),
        stringValue(agentProfile?.fallbackMessage),
        stringValue(agentProfile?.escalationMessage),
    ].filter(Boolean).join('\n\n');

    return {
        agentName: stringValue(agentProfile?.agentName) || `${businessName} AI Agent`,
        tone: stringValue(agentProfile?.tone) || 'Professional',
        languages: labelLanguages(supportedLanguages),
        businessProfile: [
            stringValue(businessProfile?.description),
            ...stringList(chatbotBlueprint.businessKnowledge),
        ].filter(Boolean).join('\n'),
        productsServices,
        policiesContact,
        specialInstructions,
        faqs: [],
        knowledgeDocuments: [
            buildBlueprintKnowledgeDocument(blueprint, chatbotBlueprint),
        ],
        knowledgeLinks: [],
        widgetColor: getBrandPrimaryColor(blueprint),
        isActive: true,
        leadCaptureEnabled: leadCapture?.enabled !== false,
        leadCaptureConfig: {
            enabled: leadCapture?.enabled !== false,
            preChatForm: leadCapture?.mode === 'pre_chat',
            triggerAfterMessages: typeof leadCapture?.triggerAfterMessages === 'number'
                ? leadCapture.triggerAfterMessages
                : 3,
            requireEmailForAdvancedInfo: true,
            exitIntentEnabled: leadCapture?.mode === 'exit_intent' || leadCapture?.mode === 'hybrid',
            progressiveProfilingEnabled: true,
            conversationalMode: leadCapture?.mode !== 'pre_chat',
        },
        appearance: {
            colors: {
                primaryColor: getBrandPrimaryColor(blueprint),
            },
            messages: {
                welcomeMessage: stringValue(agentProfile?.welcomeMessage),
                inputPlaceholder: 'Escribe tu mensaje... / Type your message...',
            },
        },
        enableLiveVoice: voiceSettings?.enabled === true,
        voiceName: 'Zephyr',
        cmsArticleIds: [],
        source: 'businessBlueprint.chatbotBlueprint',
    };
}

function hydrateLegacyConfigWithBlueprint(
    legacyConfig: Record<string, any>,
    blueprintConfig: Record<string, any> | null,
): Record<string, any> {
    if (!blueprintConfig) return legacyConfig;

    const legacyFaqs = arrayValue(legacyConfig.faqs);
    const legacyKnowledgeLinks = arrayValue(legacyConfig.knowledgeLinks);
    const knowledgeDocuments = mergeDocuments(legacyConfig.knowledgeDocuments, blueprintConfig.knowledgeDocuments);
    const leadCaptureConfig = mergeRecords(blueprintConfig.leadCaptureConfig, legacyConfig.leadCaptureConfig);
    const appearance = mergeRecords(blueprintConfig.appearance, legacyConfig.appearance);

    return {
        ...blueprintConfig,
        ...legacyConfig,
        agentName: stringValue(legacyConfig.agentName) || blueprintConfig.agentName,
        tone: stringValue(legacyConfig.tone) || blueprintConfig.tone,
        languages: stringValue(legacyConfig.languages) || blueprintConfig.languages,
        businessProfile: stringValue(legacyConfig.businessProfile) || blueprintConfig.businessProfile,
        productsServices: stringValue(legacyConfig.productsServices) || blueprintConfig.productsServices,
        policiesContact: stringValue(legacyConfig.policiesContact) || blueprintConfig.policiesContact,
        specialInstructions: stringValue(legacyConfig.specialInstructions) || blueprintConfig.specialInstructions,
        faqs: legacyFaqs.length ? legacyFaqs : arrayValue(blueprintConfig.faqs),
        knowledgeDocuments,
        knowledgeLinks: legacyKnowledgeLinks.length ? legacyKnowledgeLinks : arrayValue(blueprintConfig.knowledgeLinks),
        widgetColor: stringValue(legacyConfig.widgetColor) || blueprintConfig.widgetColor,
        isActive: legacyConfig.isActive === false ? false : legacyConfig.isActive ?? blueprintConfig.isActive,
        leadCaptureEnabled: legacyConfig.leadCaptureEnabled ?? blueprintConfig.leadCaptureEnabled,
        ...(leadCaptureConfig ? { leadCaptureConfig } : {}),
        ...(appearance ? { appearance } : {}),
        enableLiveVoice: legacyConfig.enableLiveVoice ?? blueprintConfig.enableLiveVoice,
        voiceName: stringValue(legacyConfig.voiceName) || blueprintConfig.voiceName,
        cmsArticleIds: arrayValue(legacyConfig.cmsArticleIds).length
            ? arrayValue(legacyConfig.cmsArticleIds)
            : arrayValue(blueprintConfig.cmsArticleIds),
        source: stringValue(legacyConfig.source) || 'aiAssistantConfig+businessBlueprint.chatbotBlueprint',
    };
}

export function resolveProjectAiAssistantConfig(project: ProjectAiAssistantConfigSource): Record<string, any> | null {
    const data = nonEmptyRecord(project.data);
    const nestedData = nonEmptyRecord(data?.data);
    const blueprintConfig = deriveConfigFromChatbotBlueprint(data);
    const legacyConfig = (
        nonEmptyRecord(project.ai_assistant_config) ||
        nonEmptyRecord(data?.aiAssistantConfig) ||
        nonEmptyRecord(data?.ai_assistant_config) ||
        nonEmptyRecord(data?.aiAssistant) ||
        nonEmptyRecord(nestedData?.aiAssistantConfig) ||
        nonEmptyRecord(nestedData?.ai_assistant_config) ||
        nonEmptyRecord(nestedData?.aiAssistant)
    );

    if (legacyConfig) {
        return hydrateLegacyConfigWithBlueprint(legacyConfig, blueprintConfig);
    }

    return blueprintConfig;
}
