
import React, { useState, useRef, useEffect } from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { GoogleGenAI, FunctionDeclaration, Type, LiveServerMessage, Modality } from '@google/genai';
import { Send, Loader2, ChevronDown, Maximize2, Minimize2, Trash2, Mic, PhoneOff, Bot, Wand2, X, User as UserIcon, Shield } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { initialData } from '../../data/initialData';
import { LeadStatus, CMSPost, Lead } from '../../types';

// --- Types ---
interface Message {
    role: 'user' | 'model';
    text: string;
    isToolOutput?: boolean;
}

// --- Tools Definition ---
const TOOLS: FunctionDeclaration[] = [
    {
        name: 'change_view',
        description: 'Navigate to a different section. Views: dashboard, websites, editor, cms, assets, navigation, superadmin, ai-assistant, leads, domains.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                viewName: {
                    type: Type.STRING,
                    enum: ["dashboard", "websites", "editor", "cms", "assets", "navigation", "superadmin", "ai-assistant", "leads", "domains"]
                }
            },
            required: ['viewName']
        }
    },
    {
        name: 'manage_cms_post',
        description: 'Manage CMS posts.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                action: { type: Type.STRING, enum: ['create', 'update', 'delete'] },
                id: { type: Type.STRING, description: 'Post ID (for update/delete).' },
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                status: { type: Type.STRING, enum: ['draft', 'published'] }
            },
            required: ['action']
        }
    },
    {
        name: 'manage_lead',
        description: 'Manage CRM leads.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                action: { type: Type.STRING, enum: ['create', 'update', 'delete'] },
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                email: { type: Type.STRING },
                status: { type: Type.STRING, enum: ['new', 'contacted', 'qualified', 'negotiation', 'won', 'lost'] },
                notes: { type: Type.STRING },
                value: { type: Type.NUMBER }
            },
            required: ['action']
        }
    },
    {
        name: 'update_chat_config',
        description: 'Update Chatbot config.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                agentName: { type: Type.STRING },
                welcomeMessage: { type: Type.STRING },
                tone: { type: Type.STRING },
                isActive: { type: Type.BOOLEAN },
                enableLiveVoice: { type: Type.BOOLEAN }
            }
        }
    },
    {
        name: 'manage_domain',
        description: 'Manage domains.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                action: { type: Type.STRING, enum: ['add', 'delete', 'verify'] },
                domainName: { type: Type.STRING },
                id: { type: Type.STRING }
            },
            required: ['action']
        }
    },
    {
        name: 'generate_image_asset',
        description: 'Generate image via AI.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                prompt: { type: Type.STRING },
                style: { type: Type.STRING, enum: ['Photorealistic', 'Cinematic', 'Anime', 'Digital Art', 'Oil Painting', '3D Render', 'Minimalist', 'Cyberpunk', 'Watercolor'] },
                aspectRatio: { type: Type.STRING, enum: ['1:1', '16:9', '9:16', '4:3', '3:4'] }
            },
            required: ['prompt']
        }
    },
    {
        name: 'navigate_admin',
        description: 'Super Admin navigation.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                adminViewName: {
                    type: Type.STRING,
                    enum: ['main', 'tenants', 'prompts', 'stats', 'billing', 'templates', 'components', 'images', 'global-assistant']
                }
            },
            required: ['adminViewName']
        }
    },
    {
        name: 'change_theme',
        description: 'Change theme mode.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                mode: {
                    type: Type.STRING,
                    enum: ['light', 'dark', 'black']
                }
            },
            required: ['mode']
        }
    },
    {
        name: 'update_site_content',
        description: 'Update site content/settings.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                path: { type: Type.STRING, description: "Dot-notation path" },
                value: { type: Type.STRING }
            },
            required: ['path', 'value']
        }
    },
    {
        name: 'load_project',
        description: 'Open project.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                identifier: { type: Type.STRING }
            },
            required: ['identifier']
        }
    },
    {
        name: 'create_website',
        description: 'Create new website.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                businessName: { type: Type.STRING },
                industry: { type: Type.STRING },
                description: { type: Type.STRING },
                tone: { type: Type.STRING }
            },
            required: ['businessName', 'industry', 'description']
        }
    }
];

const DATA_SCHEMA_HINT = `
*** PATHS GUIDE (update_site_content) ***
Theme: theme.fontFamilyHeader, theme.fontFamilyBody, theme.cardBorderRadius
Header: header.layout, header.style, header.logoText, header.colors.background
Sections: hero.headline, hero.primaryCta, pricing.tiers, footer.copyrightText, etc.
Chatbot: chatbot.welcomeMessage, chatbot.isActive
`;

const ACTION_PROTOCOL = `
*** STRICT EXECUTION PROTOCOL ***
1.  **SILENCE BEFORE ACTION:** If the user asks for an action (navigate, update, create, change theme), you MUST output the function call IMMEDIATELY.
2.  **NO CHATTER:** Do NOT generate text like "Sure, I'll do that" or "Navigating now..." before calling the tool. Be completely silent until the tool is called.
3.  **VERIFY THEN SPEAK:** Only generate a text response AFTER the tool has executed and you have received the result.
4.  **CONFIRMATION:** Once the tool returns "Done" or a result, confirm to the user that the action is complete.
`;

const cleanJson = (text: string) => {
    let cleaned = text.replace(/```json\n?|```/g, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    return cleaned;
};

function base64ToBytes(base64: string) {
    const binaryString = atob(base64);
    const length = binaryString.length;
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function bytesToBase64(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, float32Array[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
}

const normalizeText = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

const LOGO_URL = "https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032";

const GlobalAiAssistant: React.FC = () => {
    const { 
        userDocument, setAdminView, data, setData, themeMode, setThemeMode, loadProject, activeProject,
        hasApiKey, promptForKeySelection, handleApiError, globalAssistantConfig, onSectionSelect,
        theme, setTheme, setIsOnboardingOpen, isOnboardingOpen, onboardingState, setOnboardingState,
        getPrompt, addNewProject, 
        // Added context items
        leads, addLead, updateLead, updateLeadStatus, deleteLead,
        cmsPosts, saveCMSPost, deleteCMSPost,
        aiAssistantConfig, saveAiAssistantConfig,
        domains, addDomain, deleteDomain, verifyDomain,
        generateImage,
        projects, setView, view, user
    } = useEditor();

    // State
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([{ role: 'model', text: globalAssistantConfig.greeting }]);
    const [isThinking, setIsThinking] = useState(false);
    
    // Voice State
    const [isLiveActive, setIsLiveActive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [visualizerLevels, setVisualizerLevels] = useState([1, 1, 1, 1]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Audio Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
    const sessionRef = useRef<any>(null); 
    const visualizerIntervalRef = useRef<number | null>(null);
    
    // Data Refs
    const dataRef = useRef(data);
    const themeRef = useRef(theme);
    const projectsRef = useRef(projects);
    const loadProjectRef = useRef(loadProject);
    const themeModeRef = useRef(themeMode);
    const onSectionSelectRef = useRef(onSectionSelect);
    const setViewRef = useRef(setView);
    const setAdminViewRef = useRef(setAdminView);
    const setThemeModeRef = useRef(setThemeMode);
    const setThemeRef = useRef(setTheme);
    const userDocumentRef = useRef(userDocument);
    const getPromptRef = useRef(getPrompt);
    const addNewProjectRef = useRef(addNewProject);
    const setIsOnboardingOpenRef = useRef(setIsOnboardingOpen);
    const isOnboardingOpenRef = useRef(isOnboardingOpen);
    const setOnboardingStateRef = useRef(setOnboardingState);
    const onboardingStateRef = useRef(onboardingState);
    const leadsRef = useRef(leads);
    const addLeadRef = useRef(addLead);
    const updateLeadRef = useRef(updateLead);
    const updateLeadStatusRef = useRef(updateLeadStatus);
    const deleteLeadRef = useRef(deleteLead);
    const cmsPostsRef = useRef(cmsPosts);
    const saveCMSPostRef = useRef(saveCMSPost);
    const deleteCMSPostRef = useRef(deleteCMSPost);
    const aiConfigRef = useRef(aiAssistantConfig);
    const saveAiConfigRef = useRef(saveAiAssistantConfig);
    const domainsRef = useRef(domains);
    const addDomainRef = useRef(addDomain);
    const deleteDomainRef = useRef(deleteDomain);
    const verifyDomainRef = useRef(verifyDomain);
    const generateImageRef = useRef(generateImage);
    const activeProjectRef = useRef(activeProject);
    const viewRef = useRef(view);

    // Sync Refs
    useEffect(() => { dataRef.current = data; }, [data]);
    useEffect(() => { themeRef.current = theme; }, [theme]);
    useEffect(() => { projectsRef.current = projects; }, [projects]);
    useEffect(() => { loadProjectRef.current = loadProject; }, [loadProject]);
    useEffect(() => { themeModeRef.current = themeMode; }, [themeMode]);
    useEffect(() => { onSectionSelectRef.current = onSectionSelect; }, [onSectionSelect]);
    useEffect(() => { setViewRef.current = setView; }, [setView]);
    useEffect(() => { setAdminViewRef.current = setAdminView; }, [setAdminView]);
    useEffect(() => { setThemeModeRef.current = setThemeMode; }, [setThemeMode]);
    useEffect(() => { setThemeRef.current = setTheme; }, [setTheme]);
    useEffect(() => { userDocumentRef.current = userDocument; }, [userDocument]);
    useEffect(() => { getPromptRef.current = getPrompt; }, [getPrompt]);
    useEffect(() => { addNewProjectRef.current = addNewProject; }, [addNewProject]);
    useEffect(() => { setIsOnboardingOpenRef.current = setIsOnboardingOpen; }, [setIsOnboardingOpen]);
    useEffect(() => { isOnboardingOpenRef.current = isOnboardingOpen; }, [isOnboardingOpen]);
    useEffect(() => { setOnboardingStateRef.current = setOnboardingState; }, [setOnboardingState]);
    useEffect(() => { onboardingStateRef.current = onboardingState; }, [onboardingState]);
    useEffect(() => { leadsRef.current = leads; }, [leads]);
    useEffect(() => { addLeadRef.current = addLead; }, [addLead]);
    useEffect(() => { updateLeadRef.current = updateLead; }, [updateLead]);
    useEffect(() => { updateLeadStatusRef.current = updateLeadStatus; }, [updateLeadStatus]);
    useEffect(() => { deleteLeadRef.current = deleteLead; }, [deleteLead]);
    useEffect(() => { cmsPostsRef.current = cmsPosts; }, [cmsPosts]);
    useEffect(() => { saveCMSPostRef.current = saveCMSPost; }, [saveCMSPost]);
    useEffect(() => { deleteCMSPostRef.current = deleteCMSPost; }, [deleteCMSPost]);
    useEffect(() => { aiConfigRef.current = aiAssistantConfig; }, [aiAssistantConfig]);
    useEffect(() => { saveAiConfigRef.current = saveAiAssistantConfig; }, [saveAiAssistantConfig]);
    useEffect(() => { domainsRef.current = domains; }, [domains]);
    useEffect(() => { addDomainRef.current = addDomain; }, [addDomain]);
    useEffect(() => { deleteDomainRef.current = deleteDomain; }, [deleteDomain]);
    useEffect(() => { verifyDomainRef.current = verifyDomain; }, [verifyDomain]);
    useEffect(() => { generateImageRef.current = generateImage; }, [generateImage]);
    useEffect(() => { activeProjectRef.current = activeProject; }, [activeProject]);
    useEffect(() => { viewRef.current = view; }, [view]);

    const isConnectedRef = useRef(false);

    useEffect(() => {
        if (messages.length <= 1 && messages[0].role === 'model') {
             setMessages([{ role: 'model', text: globalAssistantConfig.greeting }]);
        }
    }, [globalAssistantConfig.greeting]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isOpen, isExpanded]);
    useEffect(() => { if (isOpen && !isLiveActive) setTimeout(() => inputRef.current?.focus(), 100); }, [isOpen, isLiveActive]);

    useEffect(() => {
        if (isLiveActive) {
            visualizerIntervalRef.current = window.setInterval(() => {
                setVisualizerLevels([
                    Math.random() * 20 + 10,
                    Math.random() * 40 + 10,
                    Math.random() * 30 + 10,
                    Math.random() * 20 + 10,
                ]);
            }, 100);
        } else {
            if (visualizerIntervalRef.current) clearInterval(visualizerIntervalRef.current);
            setVisualizerLevels([4, 4, 4, 4]);
        }
        return () => { if (visualizerIntervalRef.current) clearInterval(visualizerIntervalRef.current); };
    }, [isLiveActive]);

    const performHeadlessGeneration = async (businessName: string, industry: string, description: string, tone: string) => {
        if (!process.env.API_KEY) throw new Error("API Key missing");
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const getPrompt = getPromptRef.current;

        const designPrompt = getPrompt('onboarding-design-plan');
        if (!designPrompt) throw new Error("Design prompt not found");
        
        const designResponse = await ai.models.generateContent({
            model: designPrompt.model,
            contents: designPrompt.template.replace('{{businessName}}', businessName).replace('{{industry}}', industry).replace('{{tone}}', tone || 'Professional').replace('{{goal}}', 'Generate Leads').replace('{{summary}}', description).replace('{{availableFonts}}', "Roboto, Open Sans, Lato, Montserrat, Playfair Display").replace('{{allSections}}', "hero, features, testimonials, footer, cta"),
            config: { responseMimeType: 'application/json' }
        });
        const designPlan = JSON.parse(cleanJson(designResponse.text));

        const websitePrompt = getPrompt('onboarding-website-json');
        if (!websitePrompt) throw new Error("Website generation prompt not found");

        const websiteResponse = await ai.models.generateContent({
            model: websitePrompt.model,
            contents: websitePrompt.template.replace('{{businessName}}', businessName).replace('{{industry}}', industry).replace('{{summary}}', description).replace('{{audience}}', 'General').replace('{{offerings}}', 'Services').replace('{{tone}}', tone || 'Professional').replace('{{goal}}', 'Generate Leads').replace('{{designPlanTypography}}', JSON.stringify(designPlan.typography)).replace('{{designPlanPalette}}', JSON.stringify(designPlan.palette)).replace('{{designPlanComponentOrder}}', JSON.stringify(designPlan.componentOrder)).replace('{{designPlanImageStyle}}', designPlan.imageStyleDescription),
            config: { responseMimeType: 'application/json' }
        });

        const result = JSON.parse(cleanJson(websiteResponse.text));
        let generatedData = result.pageConfig?.data || result.data;
        if (!generatedData && result.hero) generatedData = result;

        const generatedTheme = result.pageConfig?.theme || result.theme || designPlan;
        const generatedPrompts = result.imagePrompts || result.pageConfig?.imagePrompts || {};

        const safeData = JSON.parse(JSON.stringify(initialData.data));
        if (generatedData) {
            Object.keys(generatedData).forEach((sectionKey: any) => {
                if (safeData[sectionKey]) {
                    const genSection = generatedData[sectionKey];
                    const defaultColors = safeData[sectionKey].colors || {};
                    const { colors: genColors, ...otherProps } = genSection;
                    safeData[sectionKey] = { ...safeData[sectionKey], ...otherProps };
                    if (genColors) { safeData[sectionKey].colors = { ...defaultColors, ...genColors }; }
                }
            });
        }

        const newProject = {
            id: `proj_${Date.now()}`,
            name: businessName,
            thumbnailUrl: 'https://picsum.photos/seed/newproject/800/600',
            status: 'Draft' as 'Draft',
            lastUpdated: new Date().toISOString(),
            data: safeData,
            theme: {
                ...generatedTheme,
                fontFamilyHeader: (designPlan.typography?.header || 'Inter').toLowerCase().replace(/\s/g, '-'),
                fontFamilyBody: (designPlan.typography?.body || 'Inter').toLowerCase().replace(/\s/g, '-'),
                fontFamilyButton: (designPlan.typography?.button || 'Inter').toLowerCase().replace(/\s/g, '-'),
                cardBorderRadius: generatedTheme?.cardBorderRadius || 'xl',
                buttonBorderRadius: generatedTheme?.buttonBorderRadius || 'xl',
            },
            brandIdentity: { name: businessName, industry, targetAudience: 'General', toneOfVoice: tone as any, coreValues: 'Quality', language: 'English' },
            componentOrder: result.pageConfig?.componentOrder || designPlan.componentOrder || initialData.componentOrder,
            sectionVisibility: result.pageConfig?.sectionVisibility || initialData.sectionVisibility,
            imagePrompts: generatedPrompts,
        };

        await addNewProjectRef.current(newProject);
    };

    const updateDataPath = (path: string, value: any) => {
        if (!dataRef.current) {
            console.warn("Cannot update data: No project loaded.");
            return false;
        }
        
        const deepSet = (obj: any, p: string, v: any) => {
            const keys = p.split('.');
            let cur = obj;
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                if (!cur[key]) cur[key] = {};
                if (typeof cur[key] !== 'object') {
                    console.warn(`Cannot traverse path '${p}' at '${key}': value is primitive.`);
                    return;
                }
                cur = cur[key];
            }
            cur[keys[keys.length - 1]] = v;
        }

        try {
            const mutableClone = JSON.parse(JSON.stringify(dataRef.current));
            deepSet(mutableClone, path, value);
            dataRef.current = mutableClone; 
        } catch(e) { console.warn("Optimistic ref update failed", e); }

        setData(prevData => {
            if (!prevData) return null;
            const newData = JSON.parse(JSON.stringify(prevData));
            deepSet(newData, path, value); 
            return newData;
        });
        
        return true;
    };

    const executeTool = async (name: string, args: any): Promise<{ result?: string, error?: string }> => {
        console.log(`Executing Tool: ${name}`, args);
        try {
            if (name === 'change_view') {
                const newView = args['viewName'] as any;
                setViewRef.current(newView);
                return { result: `Navigated to ${newView}.` };
            }
            else if (name === 'navigate_admin') {
                const adminViewName = args['adminViewName'] as any;
                if (userDocumentRef.current?.role !== 'superadmin') return { error: "Unauthorized: Only Super Admins can access admin panels." };
                setViewRef.current('superadmin');
                setAdminViewRef.current(adminViewName);
                return { result: `Navigated to Super Admin > ${adminViewName}.` };
            }
            else if (name === 'change_theme') {
                const mode = args['mode'] as any;
                if (['light', 'dark', 'black'].includes(mode)) {
                    setThemeModeRef.current(mode);
                    return { result: `Switched theme to ${mode}.` };
                }
                return { error: 'Invalid theme mode.' };
            }
            else if (name === 'update_site_content') {
                if (!dataRef.current) return { error: "No active project loaded. Tell user to open a project first." };
                const path = args['path'] as string;
                let val: any = args['value'];
                if (val === undefined || val === null) return { error: "Value required." };
                if (typeof val === 'string') {
                    const lowerVal = val.toLowerCase().trim();
                    if (lowerVal === 'true') val = true;
                    else if (lowerVal === 'false') val = false;
                    else if (!isNaN(Number(val)) && val.trim() !== '') val = Number(val);
                    else if ((val.startsWith('[') && val.endsWith(']')) || (val.startsWith('{') && val.endsWith('}'))) {
                        try { val = JSON.parse(val); } catch(e) {}
                    }
                }
                if (path.startsWith('theme.')) {
                    const themeKey = path.split('.')[1];
                    if (themeKey && themeRef.current) {
                        setThemeRef.current(prev => ({...prev, [themeKey]: val}));
                        return { result: `Updated global theme ${themeKey}.` };
                    }
                }
                const success = updateDataPath(path, val);
                return { result: success ? `Updated ${path}.` : `Path ${path} not found.` };
            }
            else if (name === 'load_project') {
                const identifier = args['identifier'];
                const target = normalizeText(identifier);
                const project = projectsRef.current.find(p => {
                    const pName = normalizeText(p.name);
                    return p.id === identifier || pName === target || pName.includes(target) || target.includes(pName);
                });
                if (project) {
                    loadProjectRef.current(project.id);
                    activeProjectRef.current = project;
                    dataRef.current = project.data;
                    return { result: `Project '${project.name}' loaded.` };
                } else {
                    const available = projectsRef.current.slice(0, 5).map(p => p.name).join(', ');
                    return { error: `Project not found. Available: ${available}...` };
                }
            }
            else if (name === 'create_website') {
                const { businessName, industry, description, tone } = args;
                await performHeadlessGeneration(businessName, industry, description, tone);
                return { result: `Website '${businessName}' created.` };
            }
            
            // --- CONTENT MANAGER TOOLS ---
            else if (name === 'manage_cms_post') {
                const { action, id, title, content, status } = args;
                if (action === 'create') {
                    const newPost: CMSPost = {
                        id: `post_${Date.now()}`,
                        title: title || 'Untitled',
                        slug: title?.toLowerCase().replace(/\s+/g, '-') || 'untitled',
                        content: content || '',
                        excerpt: '',
                        featuredImage: '',
                        status: status || 'draft',
                        authorId: userDocumentRef.current?.id || '',
                        seoTitle: '',
                        seoDescription: '',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    };
                    await saveCMSPostRef.current(newPost);
                    return { result: `Created post "${newPost.title}".` };
                } else if (action === 'update') {
                    let targetId = id;
                    if (!targetId && title) {
                        const found = cmsPostsRef.current.find(p => normalizeText(p.title).includes(normalizeText(title)));
                        if (found) targetId = found.id;
                    }
                    if (!targetId) return { error: "Post not found." };
                    const existing = cmsPostsRef.current.find(p => p.id === targetId);
                    if (!existing) return { error: "Post not found." };
                    await saveCMSPostRef.current({ ...existing, ...args, id: targetId });
                    return { result: `Updated post "${existing.title}".` };
                } else if (action === 'delete') {
                    if (!id) return { error: "Post ID required." };
                    await deleteCMSPostRef.current(id);
                    return { result: "Post deleted." };
                }
            }

            // --- LEAD CRM TOOLS ---
            else if (name === 'manage_lead') {
                const { action, id, name: leadName, email, status, notes, value } = args;
                if (action === 'create') {
                    await addLeadRef.current({
                        name: leadName, email, company: '', value: value || 0, 
                        status: status || 'new', source: 'manual', notes: notes || ''
                    });
                    return { result: `Created lead: ${leadName}` };
                } else if (action === 'update') {
                    let targetId = id;
                    if (!targetId && leadName) {
                        const found = leadsRef.current.find(l => normalizeText(l.name).includes(normalizeText(leadName)));
                        if (found) targetId = found.id;
                    }
                    if (!targetId) return { error: "Lead not found." };
                    if (status) await updateLeadStatusRef.current(targetId, status);
                    if (notes || value || email || leadName) await updateLeadRef.current(targetId, { notes, value, email, name: leadName });
                    return { result: "Lead updated." };
                } else if (action === 'delete') {
                    if (!id) return { error: "Lead ID required." };
                    await deleteLeadRef.current(id);
                    return { result: "Lead deleted." };
                }
            }

            // --- CHATBOT CONFIG ---
            else if (name === 'update_chat_config') {
                const newConfig = { ...aiConfigRef.current, ...args };
                await saveAiConfigRef.current(newConfig);
                return { result: "Chatbot config updated." };
            }

            // --- DOMAIN MANAGEMENT ---
            else if (name === 'manage_domain') {
                const { action, domainName, id } = args;
                if (action === 'add') {
                    await addDomainRef.current({
                        id: `dom_${Date.now()}`,
                        name: domainName,
                        status: 'pending',
                        provider: 'External',
                        createdAt: new Date().toISOString()
                    });
                    return { result: `Domain ${domainName} added.` };
                } else if (action === 'delete') {
                    if (!id) return { error: "Domain ID required." };
                    await deleteDomainRef.current(id);
                    return { result: "Domain removed." };
                } else if (action === 'verify') {
                    if (!id) return { error: "Domain ID required." };
                    const success = await verifyDomainRef.current(id);
                    return { result: success ? "Verified." : "Verification failed." };
                }
            }

            // --- ASSET GENERATION ---
            else if (name === 'generate_image_asset') {
                const { prompt, style, aspectRatio } = args;
                const url = await generateImageRef.current(prompt, { style, aspectRatio, destination: 'user' });
                return { result: `Image generated: ${url}` };
            }

            return { error: `Unknown tool: ${name}` };
        } catch (err: any) {
            console.error(`Tool execution error (${name}):`, err);
            return { error: `Failed: ${err.message}` };
        }
    };

    const getEffectiveSystemInstruction = (mode: 'chat' | 'voice') => {
        const promptConfig = getPromptRef.current('global-assistant-main');
        const baseInstruction = promptConfig ? promptConfig.template : globalAssistantConfig.systemInstruction;
        
        const permissions = globalAssistantConfig.permissions || {};
        const allowedScopes = Object.keys(permissions).filter(key => permissions[key]?.[mode] === true);
        const isSuperAdmin = userDocumentRef.current?.role === 'superadmin';
        const activeProject = activeProjectRef.current;
        
        let scopeText = "";
        if (isSuperAdmin) {
            scopeText = `ACCESS: SUPER ADMIN.`;
        } else {
             if (Object.keys(permissions).length > 0) {
                 if (allowedScopes.length > 0) scopeText = `ACCESS: RESTRICTED. Allowed: ${allowedScopes.join(', ')}.`;
                 else scopeText = `ACCESS: READ ONLY.`;
             } else scopeText = "ACCESS: OWNER.";
        }

        // --- FAST CONTEXT INJECTION (Truncated for speed) ---
        const LIMIT = 20;

        const cmsContext = cmsPostsRef.current.length > 0 
            ? `Recent Posts: ${cmsPostsRef.current.slice(0, LIMIT).map(p => `"${p.title}" (ID:${p.id})`).join(', ')}.`
            : "CMS: Empty.";

        const leadsContext = leadsRef.current.length > 0
            ? `Recent Leads: ${leadsRef.current.slice(0, LIMIT).map(l => `"${l.name}" (${l.status}, ID:${l.id})`).join(', ')}.`
            : "CRM: Empty.";

        const domainsContext = domainsRef.current.length > 0
            ? `Domains: ${domainsRef.current.map(d => `"${d.name}" (ID:${d.id})`).join(', ')}.`
            : "Domains: Empty.";

        const projectList = projectsRef.current.slice(0, 15).map(p => `"${p.name}"`).join(', ');
        const projectContext = `Projects: [${projectList}].`;

        const activeContext = `STATE: Active Project: ${activeProject ? activeProject.name : "None"}. View: ${viewRef.current}.`;

        return `${baseInstruction}\n${ACTION_PROTOCOL}\n${scopeText}\n${projectContext}\n${cmsContext}\n${leadsContext}\n${domainsContext}\n${activeContext}\n${DATA_SCHEMA_HINT}`;
    };

    const stopLiveSession = () => {
        isConnectedRef.current = false;
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (processorRef.current && inputAudioContextRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (inputAudioContextRef.current) {
            inputAudioContextRef.current.close();
            inputAudioContextRef.current = null;
        }
        activeSourcesRef.current.forEach(source => source.stop());
        activeSourcesRef.current = [];
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (sessionRef.current) {
             sessionRef.current = null;
        }
        setIsLiveActive(false);
        setIsConnecting(false);
        nextStartTimeRef.current = 0;
    };

    const startLiveSession = async () => {
        if (hasApiKey === false) { await promptForKeySelection(); return; }
        if (!process.env.API_KEY) return;
        setIsConnecting(true);
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const outputCtx = new AudioContextClass({ sampleRate: 24000 });
            const inputCtx = new AudioContextClass({ sampleRate: 16000 });
            audioContextRef.current = outputCtx;
            inputAudioContextRef.current = inputCtx;
            nextStartTimeRef.current = outputCtx.currentTime;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: globalAssistantConfig.voiceName } } },
                    tools: [{ functionDeclarations: TOOLS }],
                    systemInstruction: getEffectiveSystemInstruction('voice'),
                },
                callbacks: {
                    onopen: async () => {
                        setIsConnecting(false);
                        setIsLiveActive(true);
                        isConnectedRef.current = true;
                        try {
                            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                            streamRef.current = stream;
                            const source = inputCtx.createMediaStreamSource(stream);
                            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
                            processorRef.current = processor;
                            processor.onaudioprocess = (e) => {
                                if (!isConnectedRef.current) return;
                                const inputData = e.inputBuffer.getChannelData(0);
                                const pcm16 = floatTo16BitPCM(inputData);
                                const base64Data = bytesToBase64(new Uint8Array(pcm16));
                                sessionPromise.then(session => {
                                     if (!isConnectedRef.current) return;
                                     try { session.sendRealtimeInput({ media: { mimeType: 'audio/pcm;rate=16000', data: base64Data } }); } catch (err) {}
                                });
                            };
                            source.connect(processor);
                            processor.connect(inputCtx.destination);
                        } catch (micErr) { stopLiveSession(); alert("Could not access microphone."); }
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.interrupted) {
                            activeSourcesRef.current.forEach(source => { try { source.stop(); } catch (e) {} });
                            activeSourcesRef.current = [];
                            if (audioContextRef.current) nextStartTimeRef.current = audioContextRef.current.currentTime;
                            return;
                        }
                        if (message.toolCall) {
                            const functionResponses = [];
                            for (const fc of message.toolCall.functionCalls) {
                                const { result, error } = await executeTool(fc.name, fc.args);
                                functionResponses.push({ id: fc.id, name: fc.name, response: { result: result || error || "Done" } });
                            }
                            sessionPromise.then(session => { if (isConnectedRef.current) session.sendToolResponse({ functionResponses }); });
                        }
                        const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (audioData && audioContextRef.current) {
                            const ctx = audioContextRef.current;
                            const bytes = base64ToBytes(audioData);
                            const buffer = await decodeAudioData(bytes, ctx, 24000, 1);
                            const source = ctx.createBufferSource();
                            source.buffer = buffer;
                            source.connect(ctx.destination);
                            const startTime = Math.max(nextStartTimeRef.current, ctx.currentTime);
                            source.start(startTime);
                            nextStartTimeRef.current = startTime + buffer.duration;
                            activeSourcesRef.current.push(source);
                            source.onended = () => { activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source); };
                        }
                    },
                    onclose: () => stopLiveSession(),
                    onerror: () => { if (!isConnectedRef.current) return; }
                }
            });
            sessionRef.current = sessionPromise;
        } catch (error) { setIsConnecting(false); alert("Failed to start voice session."); }
    };

    const handleTextSend = async () => {
        if (!input.trim()) return;
        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        
        if (!isLiveActive) {
            if (hasApiKey === false) { await promptForKeySelection(); return; }
            setIsThinking(true);
            try {
                 const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
                 const chat = ai.chats.create({
                    // Use gemini-2.5-flash for faster text interactions and tool use obedience
                    model: 'gemini-2.5-flash', 
                    config: { systemInstruction: getEffectiveSystemInstruction('chat'), tools: [{ functionDeclarations: TOOLS }] },
                    history: messages.filter(m => !m.isToolOutput).map(m => ({ role: m.role, parts: [{ text: m.text }] }))
                 });
                 
                 let response = await chat.sendMessage({ message: userMsg });
                 let functionCalls = response.functionCalls;
                 let turnCount = 0;
                 
                 // Loop for multi-step tool execution
                 while (functionCalls && functionCalls.length > 0 && turnCount < 5) {
                    turnCount++;
                    // Process all function calls in parallel
                    const functionResponses = [];
                    
                    // Display a placeholder if not already shown, to indicate action
                    if (turnCount === 1 && !response.text) {
                         setMessages(prev => [...prev, { role: 'model', text: "_Executing commands..._", isToolOutput: true }]);
                    }

                    for (const call of functionCalls) {
                        const { result, error } = await executeTool(call.name, call.args);
                        functionResponses.push({ id: call.id, name: call.name, response: { result: result || error || "Done" } });
                    }
                    
                    // Send results back to model
                    const toolParts = functionResponses.map(resp => ({ functionResponse: { id: resp.id, name: resp.name, response: resp.response } }));
                    response = await chat.sendMessage({ message: toolParts });
                    functionCalls = response.functionCalls;
                 }

                 // Final response from model after tools are done
                 if (response.text) {
                     setMessages(prev => [...prev, { role: 'model', text: response.text }]);
                 } else if (turnCount > 0) {
                     // If model executed tools but returned no text, confirm completion
                     setMessages(prev => [...prev, { role: 'model', text: "Done." }]);
                 }

            } catch (e) { console.error(e); setMessages(prev => [...prev, { role: 'model', text: "Error processing request." }]); } finally { setIsThinking(false); }
        }
    };

    useEffect(() => { return () => stopLiveSession(); }, []);

    if (!isOpen) return (
        <button onClick={() => setIsOpen(true)} className="fixed bottom-6 right-6 z-50 bg-primary text-primary-foreground p-3 rounded-full shadow-2xl hover:scale-110 transition-transform border-4 border-background animate-pulse-slow flex items-center justify-center group" title="Open Global Assistant">
            <img src={LOGO_URL} alt="Quimera" className="w-10 h-10 object-contain group-hover:rotate-12 transition-transform"/>
            <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
        </button>
    );

    return (
        <div className={`fixed z-[60] bg-card border border-border shadow-2xl transition-all duration-300 flex flex-col overflow-hidden ${isExpanded ? 'inset-4 rounded-2xl' : 'bottom-6 right-6 w-[400px] h-[600px] rounded-2xl'}`}>
            <div className="p-4 flex justify-between items-center bg-primary text-primary-foreground shrink-0 cursor-pointer" onDoubleClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-3">
                    <div className="relative"><img src={LOGO_URL} alt="Quimera Logo" className="w-10 h-10 object-contain bg-white/10 rounded-full p-1 border border-white/20" /><div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-primary ${isLiveActive ? 'bg-red-500 animate-pulse' : 'bg-green-400'}`}></div></div>
                    <div><h3 className="font-bold text-sm leading-tight">Quimera Assistant</h3><p className="text-[10px] opacity-90 font-medium">{isLiveActive ? 'Listening...' : 'Online (Fast Mode)'}</p></div>
                </div>
                <div className="flex gap-1 items-center">
                    <button onClick={() => { setIsOnboardingOpenRef.current(true); setIsOpen(false); }} className="p-1.5 hover:bg-white/20 rounded-md transition-colors mr-1"><Wand2 size={18} /></button>
                    <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 hover:bg-white/20 rounded-md transition-colors">{isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
                    <button onClick={() => { setIsOpen(false); stopLiveSession(); }} className="p-1.5 hover:bg-white/20 rounded-md transition-colors"><ChevronDown size={18} /></button>
                </div>
            </div>
            <div className="flex-1 flex flex-col bg-background overflow-hidden relative">
                {isLiveActive && (
                    <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center text-foreground animate-fade-in-up">
                        <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center mb-8 relative"><div className="absolute inset-0 rounded-full border border-primary/30 animate-ping opacity-30"></div><img src={LOGO_URL} alt="Quimera Logo" className="w-20 h-20 object-contain drop-shadow-[0_0_15px_rgba(var(--primary),0.5)]" /></div>
                        <div className="flex items-center gap-1.5 h-16 mb-8">{visualizerLevels.map((height, i) => <div key={i} className="w-2 bg-primary rounded-full transition-all duration-75" style={{ height: `${height}px`, opacity: 0.5 + (height/50) }} />)}</div>
                        <p className="text-lg font-medium mb-2">Listening...</p>
                        <p className="text-xs text-muted-foreground text-center max-w-xs mb-8">Ask me to change colors, manage leads, update content, or create assets.</p>
                        <button onClick={stopLiveSession} className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-full text-sm font-bold transition-colors flex items-center border border-red-500/50"><PhoneOff size={16} className="mr-2" /> End Voice Session</button>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-secondary/5">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'model' && !msg.isToolOutput && <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mr-2 shrink-0 overflow-hidden"><img src={LOGO_URL} alt="Bot" className="w-5 h-5 object-contain" /></div>}
                            <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : msg.isToolOutput ? 'bg-secondary/50 text-muted-foreground text-xs font-mono border border-dashed border-border w-full' : 'bg-card text-foreground border border-border rounded-tl-sm'}`}>
                                {msg.role === 'model' && !msg.isToolOutput ? <ReactMarkdown>{msg.text}</ReactMarkdown> : msg.text}
                            </div>
                             {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-secondary/50 border border-border flex items-center justify-center ml-2 shrink-0 overflow-hidden">{user?.photoURL ? <img src={user.photoURL} alt="User" className="w-full h-full object-cover" /> : <UserIcon size={16} className="text-muted-foreground" />}</div>}
                        </div>
                    ))}
                    {isThinking && <div className="flex justify-start"><div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mr-2 shrink-0 overflow-hidden"><img src={LOGO_URL} alt="Bot" className="w-5 h-5 object-contain" /></div><div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin text-primary" /><span>Thinking...</span></div></div>}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-4 bg-card border-t border-border shrink-0">
                    <div className="flex items-center gap-2 bg-secondary/30 p-1.5 rounded-full border border-border focus-within:ring-2 focus-within:ring-primary/50 transition-all">
                         <button onClick={() => setMessages([])} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-secondary rounded-full transition-colors" title="Clear Chat"><Trash2 size={18} /></button>
                        <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleTextSend()} placeholder="Type a message..." className="flex-1 bg-transparent px-2 text-sm outline-none text-foreground placeholder:text-muted-foreground/50" disabled={isLiveActive} />
                        {globalAssistantConfig.enableLiveVoice && <button onClick={startLiveSession} disabled={isConnecting || isLiveActive} className={`p-2 rounded-full transition-all ${isConnecting ? 'text-muted-foreground animate-spin' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'}`} title="Start Voice Mode">{isConnecting ? <Loader2 size={20} /> : <Mic size={20} />}</button>}
                        <button onClick={handleTextSend} disabled={!input.trim() || isThinking || isLiveActive} className="p-2 bg-primary text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all hover:scale-105"><Send size={18} /></button>
                    </div>
                     <div className="mt-2 flex justify-between items-center px-2">
                         <p className="text-[10px] text-muted-foreground flex items-center"><span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${activeProject ? 'bg-green-500' : 'bg-gray-400'}`}></span> {activeProject ? `Active: ${activeProject.name}` : 'Dashboard Mode'}</p>
                         <div className="flex items-center gap-2">{userDocument?.role === 'superadmin' && <Shield size={10} className="text-yellow-500" />}<p className="text-[10px] text-muted-foreground">{userDocument?.role === 'superadmin' ? 'Admin Access' : 'User Access'}</p></div>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalAiAssistant;
