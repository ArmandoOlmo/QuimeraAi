import type {
    AiAssistantConfig,
    FAQItem,
    KnowledgeDocument,
    PageData,
    PageSection,
    Project,
    SitePage,
} from '../../types';

export interface ChatCoreWebsiteContext {
    content: string;
    pageCount: number;
    sectionCount: number;
    characterCount: number;
    hasUsableContent: boolean;
}

export interface ChatCoreGuideMessage {
    role: 'user' | 'model';
    text: string;
}

export interface ChatCoreWebsiteContentDraft {
    agentName?: string;
    tone?: string;
    languages?: string;
    businessProfile: string;
    productsServices: string;
    policiesContact: string;
    specialInstructions: string;
    faqs: FAQItem[];
    knowledgeDocument?: KnowledgeDocument;
}

export interface ChatCoreWebsiteGuideResult {
    assistantReply: string;
    ready: boolean;
    draft: ChatCoreWebsiteContentDraft | null;
}

const MAX_CONTEXT_CHARACTERS = 24000;
const MAX_FIELD_CHARACTERS = 1800;
const GENERATED_WEBSITE_DOC_ID = 'chatcore-website-generated-knowledge';
const INTERNAL_KEYS = new Set([
    'id',
    'key',
    'href',
    'url',
    'src',
    'image',
    'imageurl',
    'backgroundimage',
    'backgroundimageurl',
    'videourl',
    'icon',
    'colors',
    'styles',
    'glass',
    'glasseffect',
    'animation',
    'variant',
    'layout',
    'visible',
    'enabled',
    'isvisible',
    'css',
    'class',
    'classname',
    'metadata',
    'createdat',
    'updatedat',
]);

const FIELD_LABELS: Record<string, string> = {
    title: 'Title',
    heading: 'Heading',
    headline: 'Headline',
    subtitle: 'Subtitle',
    subheading: 'Subheading',
    description: 'Description',
    text: 'Text',
    body: 'Body',
    content: 'Content',
    name: 'Name',
    label: 'Label',
    buttontext: 'Button',
    ctatext: 'CTA',
    price: 'Price',
    email: 'Email',
    phone: 'Phone',
    address: 'Address',
    city: 'City',
    state: 'State',
    country: 'Country',
    question: 'Question',
    answer: 'Answer',
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cleanText(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/\s+/g, ' ')
        .trim();
}

function isLikelyNonContentString(value: string): boolean {
    if (!value) return true;
    if (/^https?:\/\//i.test(value)) return true;
    if (/^data:/i.test(value)) return true;
    if (/^#[0-9a-f]{3,8}$/i.test(value)) return true;
    if (/^-?\d+(\.\d+)?(px|rem|em|%|vh|vw)?$/i.test(value)) return true;
    if (/^[a-z0-9_-]{14,}$/i.test(value) && !value.includes(' ')) return true;
    return false;
}

function labelForKey(key: string): string {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (FIELD_LABELS[normalized]) return FIELD_LABELS[normalized];
    return key
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
}

function collectReadableLines(
    value: unknown,
    lines: string[],
    key = '',
    depth = 0,
): void {
    if (lines.length > 220 || depth > 7 || value == null) return;

    if (typeof value === 'string') {
        const text = cleanText(value);
        if (!text || isLikelyNonContentString(text)) return;
        lines.push(`- ${key ? `${labelForKey(key)}: ` : ''}${text.slice(0, MAX_FIELD_CHARACTERS)}`);
        return;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        if (key && !INTERNAL_KEYS.has(key.toLowerCase())) {
            lines.push(`- ${labelForKey(key)}: ${value}`);
        }
        return;
    }

    if (Array.isArray(value)) {
        value.slice(0, 30).forEach(item => collectReadableLines(item, lines, key, depth + 1));
        return;
    }

    if (!isPlainRecord(value)) return;

    Object.entries(value).forEach(([entryKey, entryValue]) => {
        const normalizedKey = entryKey.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (INTERNAL_KEYS.has(normalizedKey)) return;
        collectReadableLines(entryValue, lines, entryKey, depth + 1);
    });
}

function resolvePageSections(project: Project, page?: SitePage): PageSection[] {
    if (page?.sections?.length) return page.sections;
    if (project.componentOrder?.length) return project.componentOrder;
    return Object.keys((page?.sectionData || project.data || {}) as Record<string, unknown>) as PageSection[];
}

function resolveSectionData(project: Project, section: PageSection, page?: SitePage): unknown {
    const pageData = page?.sectionData as Partial<PageData> | undefined;
    return pageData?.[section] ?? project.data?.[section];
}

function pageTitle(project: Project, page?: SitePage): string {
    if (!page) return `${project.name || 'Website'} / Home`;
    return `${page.title || page.slug || 'Page'} (${page.slug || '/'})`;
}

export function extractChatCoreWebsiteContext(project: Project): ChatCoreWebsiteContext {
    const pages = project.pages?.length ? project.pages : [undefined];
    const chunks: string[] = [
        '# Saved website context for ChatCore',
        `Project: ${project.name || 'Untitled project'}`,
        project.description ? `Project description: ${cleanText(project.description)}` : '',
        project.category ? `Category: ${cleanText(project.category)}` : '',
    ].filter(Boolean);
    let sectionCount = 0;

    pages.forEach(page => {
        const sections = resolvePageSections(project, page);
        const pageLines: string[] = [];

        sections.forEach(section => {
            const sectionData = resolveSectionData(project, section, page);
            const sectionLines: string[] = [];
            collectReadableLines(sectionData, sectionLines);
            const uniqueLines = [...new Set(sectionLines)].slice(0, 28);
            if (uniqueLines.length === 0) return;
            sectionCount += 1;
            pageLines.push(`\n### ${labelForKey(section)}`);
            pageLines.push(...uniqueLines);
        });

        if (pageLines.length > 0) {
            chunks.push(`\n## ${pageTitle(project, page)}`);
            chunks.push(...pageLines);
        }
    });

    const content = chunks.join('\n').slice(0, MAX_CONTEXT_CHARACTERS);
    return {
        content,
        pageCount: pages.length,
        sectionCount,
        characterCount: content.length,
        hasUsableContent: sectionCount > 0 && content.length > 300,
    };
}

export function buildChatCoreWebsiteSystemInstruction(): string {
    return [
        'You are a senior ChatCore setup specialist inside QuimeraAi.',
        'Your job is to help the user create the visitor-facing ChatCore content for an already saved website.',
        'Use the saved website context as the primary source. Use the conversation only to fill gaps, correct assumptions, and refine tone.',
        'Do not invent prices, policies, guarantees, availability, addresses, or legal claims that are not present in the website context or supplied by the user.',
        'If required facts are missing, ask concise follow-up questions. If there is enough context, return a complete draft.',
        'Respond in the same language as the user when possible.',
        'Always output one JSON object only. No markdown fences.',
        'Schema: {"assistantReply":"short conversational response","ready":boolean,"draft":null|{"agentName":"string","tone":"string","languages":"string","businessProfile":"string","productsServices":"string","policiesContact":"string","specialInstructions":"string","faqs":[{"question":"string","answer":"string"}],"knowledgeDocument":{"name":"string","content":"markdown string"}}}',
    ].join('\n');
}

export function buildChatCoreWebsiteUserPrompt(input: {
    project: Project;
    currentConfig: AiAssistantConfig;
    websiteContext: ChatCoreWebsiteContext;
    userMessage: string;
}): string {
    return [
        `Project name: ${input.project.name || 'Untitled project'}`,
        `Current ChatCore agent: ${input.currentConfig.agentName || 'Not configured'}`,
        `Current languages: ${input.currentConfig.languages || 'Not configured'}`,
        `Website context quality: ${input.websiteContext.hasUsableContent ? 'usable' : 'thin'} (${input.websiteContext.sectionCount} sections, ${input.websiteContext.characterCount} chars)`,
        '',
        input.websiteContext.content,
        '',
        'User message:',
        input.userMessage || 'Generate the ChatCore content from the saved website.',
        '',
        'Return only the JSON object described in the system instruction.',
    ].join('\n');
}

function parseJsonObject(text: string): Record<string, unknown> | null {
    const trimmed = text.trim();
    const candidates = [
        trimmed,
        trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, ''),
    ];

    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
        candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
    }

    for (const candidate of candidates) {
        try {
            const parsed = JSON.parse(candidate);
            if (isPlainRecord(parsed)) return parsed;
        } catch {
            // Try next candidate.
        }
    }

    return null;
}

function stringValue(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeFaqs(value: unknown): FAQItem[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((item, index) => {
            if (!isPlainRecord(item)) return null;
            const question = stringValue(item.question);
            const answer = stringValue(item.answer);
            if (!question || !answer) return null;
            return {
                id: stringValue(item.id) || `chatcore-website-faq-${index + 1}`,
                question,
                answer,
            };
        })
        .filter((item): item is FAQItem => Boolean(item))
        .slice(0, 12);
}

function buildKnowledgeDocument(projectName: string, value: unknown, fallbackContent: string): KnowledgeDocument | undefined {
    const record = isPlainRecord(value) ? value : {};
    const content = stringValue(record.content) || fallbackContent;
    if (!content) return undefined;
    const name = stringValue(record.name) || `${projectName || 'Project'} - ChatCore website knowledge`;
    return {
        id: GENERATED_WEBSITE_DOC_ID,
        name,
        content,
        extractedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
        fileType: 'text/markdown',
        size: content.length,
    };
}

function normalizeDraft(value: unknown, projectName: string): ChatCoreWebsiteContentDraft | null {
    if (!isPlainRecord(value)) return null;
    const businessProfile = stringValue(value.businessProfile);
    const productsServices = stringValue(value.productsServices);
    const policiesContact = stringValue(value.policiesContact);
    const specialInstructions = stringValue(value.specialInstructions);
    const faqs = normalizeFaqs(value.faqs);

    if (!businessProfile && !productsServices && !policiesContact && !specialInstructions && faqs.length === 0) {
        return null;
    }

    const fallbackKnowledge = [
        `# ChatCore website knowledge`,
        businessProfile ? `\n## Business profile\n${businessProfile}` : '',
        productsServices ? `\n## Products and services\n${productsServices}` : '',
        policiesContact ? `\n## Policies and contact\n${policiesContact}` : '',
        faqs.length ? `\n## FAQs\n${faqs.map((faq, index) => `Q${index + 1}: ${faq.question}\nA${index + 1}: ${faq.answer}`).join('\n\n')}` : '',
        specialInstructions ? `\n## Operating instructions\n${specialInstructions}` : '',
    ].filter(Boolean).join('\n');

    return {
        agentName: stringValue(value.agentName) || undefined,
        tone: stringValue(value.tone) || undefined,
        languages: stringValue(value.languages) || undefined,
        businessProfile,
        productsServices,
        policiesContact,
        specialInstructions,
        faqs,
        knowledgeDocument: buildKnowledgeDocument(projectName, value.knowledgeDocument, fallbackKnowledge),
    };
}

export function parseChatCoreWebsiteGuideResult(text: string, projectName: string): ChatCoreWebsiteGuideResult {
    const parsed = parseJsonObject(text);
    if (!parsed) {
        return {
            assistantReply: text.trim() || 'No pude generar un borrador válido todavía.',
            ready: false,
            draft: null,
        };
    }

    const draft = normalizeDraft(parsed.draft, projectName);
    return {
        assistantReply: stringValue(parsed.assistantReply) || stringValue(parsed.message) || '',
        ready: Boolean(parsed.ready && draft),
        draft,
    };
}

export function mergeChatCoreWebsiteDraft(
    currentConfig: AiAssistantConfig,
    draft: ChatCoreWebsiteContentDraft,
): AiAssistantConfig {
    const existingDocuments = Array.isArray(currentConfig.knowledgeDocuments)
        ? currentConfig.knowledgeDocuments.filter(doc => doc?.id !== GENERATED_WEBSITE_DOC_ID)
        : [];
    const knowledgeDocuments = draft.knowledgeDocument
        ? [draft.knowledgeDocument, ...existingDocuments]
        : existingDocuments;

    return {
        ...currentConfig,
        agentName: draft.agentName || currentConfig.agentName,
        tone: draft.tone || currentConfig.tone,
        languages: draft.languages || currentConfig.languages,
        businessProfile: draft.businessProfile || currentConfig.businessProfile,
        productsServices: draft.productsServices || currentConfig.productsServices,
        policiesContact: draft.policiesContact || currentConfig.policiesContact,
        specialInstructions: draft.specialInstructions || currentConfig.specialInstructions,
        faqs: draft.faqs.length ? draft.faqs : currentConfig.faqs,
        knowledgeDocuments,
        isActive: currentConfig.isActive,
    };
}
