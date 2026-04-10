/**
 * AdminEmailHub
 * 
 * Super Admin Email Marketing Hub — Comprehensive email management system
 * with cross-tenant data, Klaviyo-inspired automations, and AI Email Studio.
 * 
 * Features:
 * - Overview: Cross-tenant KPIs, recent activity, quick actions
 * - Campaigns: All campaigns across all projects with filters
 * - Audiences: All audience segments from all projects
 * - Analytics: Advanced cross-tenant analytics with charts
 * - Automations: Flow templates Gallery + custom creation
 * - AI Studio: Conversational AI for email campaign creation
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import {
    ArrowLeft, Mail, Send, Eye, MousePointer, AlertCircle, TrendingUp,
    BarChart3, Users, UserPlus, Search, Filter, Plus, MoreVertical,
    Zap, Clock, Calendar, Target, ShoppingCart, Heart, Gift, Star,
    Play, Pause, Trash2, Copy, Edit2, ChevronDown, ChevronRight,
    Sparkles, Bot, Mic, MicOff, Volume2, VolumeX, X, Loader2,
    RefreshCcw, CheckCircle, XCircle, ArrowRight, Settings2,
    Building2, Globe, Tag, Layers, PhoneOff, FileText, Upload, Download,
    TrendingDown, Activity, AlertTriangle,
} from 'lucide-react';
import { LiveServerMessage, Modality } from '@google/genai';
import { getGoogleGenAI } from '../../../utils/genAiClient';
import DashboardSidebar from '../DashboardSidebar';
import { useAdmin } from '../../../contexts/admin/AdminContext';
import { useAuth } from '../../../contexts/core/AuthContext';
import {
    db, collection, getDocs, query, orderBy, doc, addDoc,
    updateDoc, deleteDoc, setDoc, onSnapshot,
} from '../../../firebase';
import { serverTimestamp } from 'firebase/firestore';
import {
    generateChatContentViaProxy,
    extractTextFromResponse,
    type ChatMessage,
} from '../../../utils/geminiProxyClient';
import { logApiCall } from '../../../services/apiLoggingService';
import type { Tenant } from '../../../types';
import type {
    EmailCampaign, CampaignStatus, EmailAudience,
    EmailAutomation, AutomationType, AutomationStatus,
    EmailBlockType,
} from '../../../types/email';
import { DEFAULT_EMAIL_GLOBAL_STYLES, DEFAULT_BLOCK_CONTENT, DEFAULT_BLOCK_STYLES } from '../../../types/email';
import type { EmailDocument } from '../../../types/email';
import AdminEmailEditorWrapper from './AdminEmailEditorWrapper';
import EmailTemplateGallery from '../email/editor/EmailTemplateGallery';
import { generateEmailHtml } from '../../../utils/emailHtmlGenerator';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// AUDIO UTILITIES (mirrored from AIContentStudio for Live API)
// =============================================================================

function base64ToBytes(base64: string) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
}

function bytesToBase64(bytes: Uint8Array) {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

async function decodeAudioData(
    data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
}

function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0, offset = 0; i < float32Array.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
}

// =============================================================================
// TYPES
// =============================================================================

type AdminEmailTab = 'overview' | 'campaigns' | 'audiences' | 'analytics' | 'automations' | 'ai-studio';

interface CrossTenantCampaign extends EmailCampaign {
    tenantId: string;
    tenantName: string;
    userId: string;
    projectId: string;
}

interface CrossTenantAudience {
    id: string;
    name: string;
    description?: string;
    estimatedCount: number;
    tenantId: string;
    tenantName: string;
    userId: string;
    projectId: string;
    createdAt: any;
    filters?: any[];
    tags?: string[];
    acceptsMarketing?: boolean;
    hasOrdered?: boolean;
    staticMemberCount?: number;
}

interface CrossTenantLog {
    id: string;
    status: string;
    sentAt: any;
    opened?: boolean;
    clicked?: boolean;
    recipientEmail?: string;
    subject?: string;
    type?: string;
    tenantId: string;
    tenantName: string;
}

interface AutomationTemplate {
    id: string;
    name: string;
    description: string;
    type: AutomationType;
    icon: React.ReactNode;
    color: string;
    defaultDelay: number;
    triggerEvent: string;
    category: 'engagement' | 'retention' | 'conversion' | 'lifecycle';
}

interface DisplayMessage {
    role: 'user' | 'model';
    text: string;
    isVoice?: boolean;
    timestamp: number;
}

interface AICreatedItem {
    type: 'campaign' | 'audience' | 'automation';
    name: string;
    id: string;
    timestamp: number;
}

interface AdminEmailHubProps {
    onBack: () => void;
}

const MODEL_TEXT = 'gemini-3-flash-preview';
const MODEL_VOICE = 'gemini-3.1-flash-live-preview';

// =============================================================================
// AUTOMATION TEMPLATES
// =============================================================================

const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
    {
        id: 'welcome-series',
        name: 'Serie de Bienvenida',
        description: 'Envía automáticamente una secuencia de emails de bienvenida a nuevos suscriptores',
        type: 'welcome',
        icon: <Heart size={24} />,
        color: 'text-pink-400 bg-pink-500/10',
        defaultDelay: 0,
        triggerEvent: 'customer.created',
        category: 'lifecycle',
    },
    {
        id: 'abandoned-cart',
        name: 'Carrito Abandonado',
        description: 'Recupera ventas perdidas enviando recordatorios a quienes dejaron productos en el carrito',
        type: 'abandoned-cart',
        icon: <ShoppingCart size={24} />,
        color: 'text-amber-400 bg-amber-500/10',
        defaultDelay: 60,
        triggerEvent: 'cart.abandoned',
        category: 'conversion',
    },
    {
        id: 'post-purchase',
        name: 'Post-Compra',
        description: 'Solicita reseñas y ofrece productos relacionados después de una compra',
        type: 'post-purchase',
        icon: <Star size={24} />,
        color: 'text-yellow-400 bg-yellow-500/10',
        defaultDelay: 4320,
        triggerEvent: 'order.delivered',
        category: 'engagement',
    },
    {
        id: 'win-back',
        name: 'Re-Engagement',
        description: 'Recupera clientes inactivos con ofertas especiales y contenido personalizado',
        type: 'win-back',
        icon: <RefreshCcw size={24} />,
        color: 'text-blue-400 bg-blue-500/10',
        defaultDelay: 43200,
        triggerEvent: 'customer.inactive',
        category: 'retention',
    },
    {
        id: 'birthday',
        name: 'Felicitación de Cumpleaños',
        description: 'Envía felicitaciones y descuentos especiales en el cumpleaños del cliente',
        type: 'birthday',
        icon: <Gift size={24} />,
        color: 'text-purple-400 bg-purple-500/10',
        defaultDelay: 0,
        triggerEvent: 'customer.birthday',
        category: 'lifecycle',
    },
];

// =============================================================================
// COMPONENT
// =============================================================================

const AdminEmailHub: React.FC<AdminEmailHubProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const { tenants, fetchTenants, allUsers, fetchAllUsers } = useAdmin();
    const { user } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<AdminEmailTab>('overview');

    // Cross-tenant data state
    const [campaigns, setCampaigns] = useState<CrossTenantCampaign[]>([]);
    const [audiences, setAudiences] = useState<CrossTenantAudience[]>([]);
    const [emailLogs, setEmailLogs] = useState<CrossTenantLog[]>([]);
    const [automations, setAutomations] = useState<EmailAutomation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [campaignSearch, setCampaignSearch] = useState('');
    const [campaignStatusFilter, setCampaignStatusFilter] = useState<CampaignStatus | 'all'>('all');
    const [campaignTenantFilter, setCampaignTenantFilter] = useState<string>('all');
    const [audienceSearch, setAudienceSearch] = useState('');
    const [analyticsTimeRange, setAnalyticsTimeRange] = useState<'7d' | '30d' | '90d' | '12m'>('30d');

    // Campaign editor state
    const [selectedCampaign, setSelectedCampaign] = useState<CrossTenantCampaign | null>(null);
    const [editingCampaign, setEditingCampaign] = useState<{
        name: string; subject: string; previewText: string; type: string; htmlContent: string; status: CampaignStatus;
    } | null>(null);
    const [isSavingCampaign, setIsSavingCampaign] = useState(false);

    // Visual email editor state
    const [showEmailEditor, setShowEmailEditor] = useState(false);
    const [showTemplateGallery, setShowTemplateGallery] = useState(false);
    const [emailDocument, setEmailDocument] = useState<Partial<EmailDocument> | null>(null);
    const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
    const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
    const [newCampaignForm, setNewCampaignForm] = useState({ name: '', subject: '', previewText: '', type: 'newsletter' });

    // AI Studio state
    const [showAIStudio, setShowAIStudio] = useState(false);
    const [aiMessages, setAiMessages] = useState<DisplayMessage[]>([]);
    const [aiInput, setAiInput] = useState('');
    const [aiThinking, setAiThinking] = useState(false);
    const [aiCreatedItems, setAiCreatedItems] = useState<AICreatedItem[]>([]);
    const [aiCreating, setAiCreating] = useState<string | null>(null); // 'campaign' | 'audience' | 'automation' | null
    const aiHistoryRef = useRef<ChatMessage[]>([]);
    const aiChatRef = useRef<HTMLDivElement>(null);

    // Voice state
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [isVoiceConnecting, setIsVoiceConnecting] = useState(false);
    const [liveUserTranscript, setLiveUserTranscript] = useState('');
    const [liveModelTranscript, setLiveModelTranscript] = useState('');

    // Voice refs
    const sessionRef = useRef<any>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const isConnectedRef = useRef(false);
    const nextStartTimeRef = useRef(0);
    const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
    const currentModelResponseRef = useRef<string>('');
    const currentUserTranscriptRef = useRef<string>('');

    // Automation creation state
    const [showCreateAutomation, setShowCreateAutomation] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<AutomationTemplate | null>(null);
    const [newAutomation, setNewAutomation] = useState({
        name: '',
        subject: '',
        delayMinutes: 60,
        status: 'draft' as AutomationStatus,
    });

    // Audience management state (Admin-owned — not project-scoped)
    const [showCreateAudience, setShowCreateAudience] = useState(false);
    const [newAudienceForm, setNewAudienceForm] = useState({ name: '', description: '' });
    const [showImportCSV, setShowImportCSV] = useState(false);
    const [showAddUsers, setShowAddUsers] = useState(false);
    const [selectedAudienceId, setSelectedAudienceId] = useState<string | null>(null);
    const [manualEmail, setManualEmail] = useState('');
    const [csvUploading, setCsvUploading] = useState(false);
    const [audienceMembers, setAudienceMembers] = useState<Record<string, { email: string; name?: string }[]>>({});
    const [addUserSearch, setAddUserSearch] = useState('');
    const [addUserSelectedIds, setAddUserSelectedIds] = useState<string[]>([]);

    // Confirmation modal state (replaces native browser confirm())
    const [confirmModal, setConfirmModal] = useState<{
        show: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ show: false, title: '', message: '', onConfirm: () => {} });

    // =============================================================================
    // DATA LOADING — ADMIN-ONLY (no cross-tenant crawling)
    // =============================================================================
    // The Admin Email Hub only manages admin-level campaigns, audiences, and logs.
    // User/project-level email data stays in their own dashboards.

    useEffect(() => {
        // Load users list for audience management (add registered users feature)
        fetchAllUsers().catch(() => {});
    }, []);

    // =========================================================================
    // REALTIME: Admin Campaigns
    // =========================================================================
    useEffect(() => {
        setIsLoading(true);
        const adminCampaignsRef = collection(db, 'adminEmailCampaigns');
        const q = query(adminCampaignsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const adminCampaigns: CrossTenantCampaign[] = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
                tenantId: 'admin',
                tenantName: 'Super Admin',
                userId: d.data().createdBy || 'admin',
                projectId: 'admin',
            } as CrossTenantCampaign));

            setCampaigns(adminCampaigns);
            setIsLoading(false);
        }, (err) => {
            console.warn('[AdminEmailHub] Admin campaigns snapshot error:', err);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // =========================================================================
    // REALTIME: Admin Audiences
    // =========================================================================
    useEffect(() => {
        const adminAudiencesRef = collection(db, 'adminEmailAudiences');
        const q = query(adminAudiencesRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const adminAudiences: CrossTenantAudience[] = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
                tenantId: 'admin',
                tenantName: 'Super Admin',
                userId: d.data().createdBy || 'admin',
                projectId: 'admin',
            } as CrossTenantAudience));

            setAudiences(adminAudiences);
        }, (err) => {
            console.warn('[AdminEmailHub] Admin audiences snapshot error:', err);
        });

        return () => unsubscribe();
    }, []);

    // =========================================================================
    // REALTIME: Admin Email Logs
    // =========================================================================
    useEffect(() => {
        const adminLogsRef = collection(db, 'adminEmailLogs');
        const q = query(adminLogsRef, orderBy('sentAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const adminLogs: CrossTenantLog[] = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
                tenantId: 'admin',
                tenantName: 'Super Admin',
            } as CrossTenantLog));

            setEmailLogs(adminLogs);
        }, (err) => {
            // Collection may not exist yet — that's fine
            console.warn('[AdminEmailHub] Admin logs snapshot error:', err);
        });

        return () => unsubscribe();
    }, []);

    // Load platform-level automations from Firestore
    useEffect(() => {
        const automationsRef = collection(db, 'adminEmailAutomations');
        const q = query(automationsRef, orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const automationsData = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
            })) as EmailAutomation[];
            setAutomations(automationsData);
        }, (err) => {
            console.warn('[AdminEmailHub] Automations listener error:', err);
        });

        return () => unsubscribe();
    }, []);

    // =============================================================================
    // COMPUTED STATS
    // =============================================================================

    const stats = useMemo(() => {
        const totalSent = emailLogs.length;
        const delivered = emailLogs.filter(l => ['delivered', 'sent', 'opened', 'clicked'].includes(l.status)).length;
        const opened = emailLogs.filter(l => l.status === 'opened' || l.opened).length;
        const clicked = emailLogs.filter(l => l.status === 'clicked' || l.clicked).length;
        const bounced = emailLogs.filter(l => l.status === 'bounced').length;
        const activeCampaigns = campaigns.filter(c => c.status === 'sending' || c.status === 'scheduled').length;
        const totalContacts = audiences.reduce((sum, a) => sum + (a.estimatedCount || a.staticMemberCount || 0), 0);

        return {
            totalSent,
            delivered,
            opened,
            clicked,
            bounced,
            activeCampaigns,
            totalContacts,
            totalCampaigns: campaigns.length,
            totalAudiences: audiences.length,
            openRate: delivered > 0 ? ((opened / delivered) * 100).toFixed(1) : '0.0',
            clickRate: opened > 0 ? ((clicked / opened) * 100).toFixed(1) : '0.0',
            deliveryRate: totalSent > 0 ? ((delivered / totalSent) * 100).toFixed(1) : '0.0',
            bounceRate: totalSent > 0 ? ((bounced / totalSent) * 100).toFixed(1) : '0.0',
        };
    }, [emailLogs, campaigns, audiences]);

    // Filtered campaigns
    const filteredCampaigns = useMemo(() => {
        return campaigns.filter(c => {
            const matchesSearch = campaignSearch === '' ||
                c.name?.toLowerCase().includes(campaignSearch.toLowerCase()) ||
                c.subject?.toLowerCase().includes(campaignSearch.toLowerCase());
            const matchesStatus = campaignStatusFilter === 'all' || c.status === campaignStatusFilter;
            const matchesTenant = campaignTenantFilter === 'all' || c.tenantId === campaignTenantFilter;
            return matchesSearch && matchesStatus && matchesTenant;
        });
    }, [campaigns, campaignSearch, campaignStatusFilter, campaignTenantFilter]);

    // Filtered audiences
    const filteredAudiences = useMemo(() => {
        return audiences.filter(a => {
            return audienceSearch === '' ||
                a.name?.toLowerCase().includes(audienceSearch.toLowerCase()) ||
                a.tenantName?.toLowerCase().includes(audienceSearch.toLowerCase());
        });
    }, [audiences, audienceSearch]);

    // Analytics monthly data
    const monthlyData = useMemo(() => {
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const monthMap = new Map<string, { sent: number; opened: number; clicked: number }>();
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            monthMap.set(`${date.getFullYear()}-${date.getMonth()}`, { sent: 0, opened: 0, clicked: 0 });
        }
        emailLogs.forEach(log => {
            if (!log.sentAt) return;
            const logDate = log.sentAt.seconds
                ? new Date(log.sentAt.seconds * 1000)
                : new Date(log.sentAt);
            const key = `${logDate.getFullYear()}-${logDate.getMonth()}`;
            const existing = monthMap.get(key);
            if (existing) {
                existing.sent++;
                if (log.status === 'opened' || log.opened) existing.opened++;
                if (log.status === 'clicked' || log.clicked) existing.clicked++;
            }
        });
        return Array.from(monthMap.entries()).map(([key, data]) => {
            const [, month] = key.split('-').map(Number);
            return { month: monthNames[month], ...data };
        }).slice(-6);
    }, [emailLogs]);

    // Top performing tenants for analytics
    const tenantPerformance = useMemo(() => {
        const perf = new Map<string, { name: string; sent: number; opened: number; clicked: number; campaigns: number }>();
        campaigns.forEach(c => {
            const existing = perf.get(c.tenantId) || { name: c.tenantName, sent: 0, opened: 0, clicked: 0, campaigns: 0 };
            existing.campaigns++;
            existing.sent += c.stats?.sent || 0;
            existing.opened += c.stats?.uniqueOpens || 0;
            existing.clicked += c.stats?.uniqueClicks || 0;
            perf.set(c.tenantId, existing);
        });
        return Array.from(perf.values()).sort((a, b) => b.sent - a.sent).slice(0, 5);
    }, [campaigns]);

    // =============================================================================
    // AUTOMATION ACTIONS
    // =============================================================================

    const createAutomation = async () => {
        if (!selectedTemplate || !newAutomation.name) return;

        try {
            const automationData = {
                name: newAutomation.name,
                type: selectedTemplate.type,
                status: newAutomation.status,
                triggerConfig: {
                    type: 'event' as const,
                    event: selectedTemplate.triggerEvent,
                },
                templateId: '',
                subject: newAutomation.subject || `${selectedTemplate.name} — Auto`,
                delayMinutes: newAutomation.delayMinutes,
                stats: { triggered: 0, sent: 0, opened: 0, clicked: 0, converted: 0 },
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            await addDoc(collection(db, 'adminEmailAutomations'), automationData);
            setShowCreateAutomation(false);
            setSelectedTemplate(null);
            setNewAutomation({ name: '', subject: '', delayMinutes: 60, status: 'draft' });
        } catch (err) {
            console.error('[AdminEmailHub] Error creating automation:', err);
        }
    };

    const toggleAutomationStatus = async (automation: EmailAutomation) => {
        const newStatus: AutomationStatus = automation.status === 'active' ? 'paused' : 'active';
        try {
            await updateDoc(doc(db, 'adminEmailAutomations', automation.id), {
                status: newStatus,
                updatedAt: serverTimestamp(),
            });
        } catch (err) {
            console.error('[AdminEmailHub] Error toggling automation:', err);
        }
    };

    const deleteAutomation = async (automationId: string) => {
        try {
            await deleteDoc(doc(db, 'adminEmailAutomations', automationId));
        } catch (err) {
            console.error('[AdminEmailHub] Error deleting automation:', err);
        }
    };

    // =============================================================================
    // AI EMAIL STUDIO
    // =============================================================================

    const buildEmailStudioSystemPrompt = useCallback(() => {
        return `Eres un experto en Email Marketing para la plataforma Quimera.ai.
Tienes acceso a datos reales del sistema:
- ${tenants.length} tenants activos
- ${stats.totalCampaigns} campañas creadas
- ${stats.totalContacts.toLocaleString()} contactos en audiencias
- ${stats.totalSent.toLocaleString()} emails enviados históricamente
- Tasa de apertura promedio: ${stats.openRate}%
- Tasa de click promedio: ${stats.clickRate}%
- Top tenants por volumen: ${tenantPerformance.map(t => t.name).join(', ')}

Tu rol es ayudar al Super Administrador a:
1. Planificar y crear campañas de email efectivas
2. Optimizar subject lines para máximo open rate
3. Segmentar audiencias de manera inteligente
4. Diseñar flujos de automatización
5. Analizar métricas y proponer mejoras
6. Diseñar emails profesionales usando bloques del editor visual

EDITOR VISUAL DE EMAIL:
El sistema usa un editor visual basado en bloques. Los tipos de bloques disponibles son:
- Hero: Sección principal con título, subtítulo, imagen de fondo y botón CTA
- Texto: Bloque de texto libre con formato
- Imagen: Bloque de imagen con dimensiones ajustables
- Botón: Botón CTA independiente con colores personalizables
- Divisor: Línea horizontal separadora
- Espaciador: Espacio en blanco vertical
- Columnas: Layout multi-columna (2 o 3 columnas)
- Productos: Catálogo de productos con precios y botones
- Redes Sociales: Íconos de redes sociales
- Pie de Email: Footer con datos legales y enlace de cancelar suscripción

Cuando crees campañas, cada bloque será individualmente editable, reordenable y personalizable en el editor visual.

IMPORTANTE: El administrador puede pedirte que CREES campañas, audiencias o automatizaciones directamente.
Cuando te pida crear algo, genera la respuesta normal conversacional describiendo lo que crearás.
El usuario usará los botones de acción en la interfaz para materializar la creación.

Responde siempre en español. Sé conciso pero informativo. Usa formato markdown.`;
    }, [stats, tenants, tenantPerformance]);


    const initAIStudio = useCallback(() => {
        const welcomeText = `¡Hola! 👋 Soy tu **Asistente AI de Email Marketing** para Quimera.ai.

Puedo ayudarte a:

- 📧 **Planificar** campañas de email completas
- ✍️ **Generar** subject lines, preview text y contenido HTML
- 🎯 **Recomendar** audiencias y segmentos óptimos
- ⏰ **Sugerir** horarios de envío basados en mejores prácticas
- 📊 **Analizar** el rendimiento de campañas anteriores
- 🤖 **Crear** flujos de automatización inteligentes
- 🎤 **Habla conmigo** usando el modo de voz

**Datos actuales del sistema:**
- ${stats.totalCampaigns} campañas totales
- ${stats.totalContacts.toLocaleString()} contactos en audiencias
- ${stats.totalSent.toLocaleString()} emails enviados
- ${stats.openRate}% tasa de apertura promedio

💡 **Usa los botones de acción** para crear campañas, audiencias y automatizaciones directamente desde esta conversación.

¿Qué tipo de campaña o estrategia de email necesitas crear hoy?`;

        const welcomeMsg: DisplayMessage = { role: 'model', text: welcomeText, timestamp: Date.now() };
        setAiMessages([welcomeMsg]);
        setAiCreatedItems([]);

        const systemContext = buildEmailStudioSystemPrompt();

        aiHistoryRef.current = [
            { role: 'user', text: `[CONTEXT] ${systemContext}` },
            { role: 'model', text: welcomeText },
        ];
    }, [stats, tenants, tenantPerformance, buildEmailStudioSystemPrompt]);

    useEffect(() => {
        if (activeTab === 'ai-studio' && aiMessages.length === 0) {
            initAIStudio();
        }
    }, [activeTab, initAIStudio]);

    // Auto-scroll AI chat
    useEffect(() => {
        if (aiChatRef.current) {
            aiChatRef.current.scrollTop = aiChatRef.current.scrollHeight;
        }
    }, [aiMessages, aiThinking, liveUserTranscript, liveModelTranscript]);

    const sendAIMessage = useCallback(async (text: string) => {
        if (!text.trim() || aiThinking) return;

        const userMsg: DisplayMessage = { role: 'user', text: text.trim(), timestamp: Date.now() };
        setAiMessages(prev => [...prev, userMsg]);
        setAiInput('');
        setAiThinking(true);

        aiHistoryRef.current.push({ role: 'user', text: text.trim() });

        try {
            const systemPrompt = buildEmailStudioSystemPrompt();
            const conversationContext = aiHistoryRef.current
                .slice(1).slice(0, -1)
                .map(m => `${m.role === 'user' ? 'Usuario' : 'AI'}: ${m.text}`)
                .join('\n\n');

            const enrichedPrompt = `${systemPrompt}\n\n${conversationContext ? `--- CONVERSACIÓN PREVIA ---\n${conversationContext}\n--- FIN ---\n\n` : ''}Usuario: ${text.trim()}`;

            const response = await generateChatContentViaProxy(
                'ai-email-studio',
                [],
                enrichedPrompt,
                systemPrompt,
                MODEL_TEXT,
                { temperature: 1.0, thinkingLevel: 'medium', maxOutputTokens: 4096 },
                user?.uid
            );

            const responseText = extractTextFromResponse(response);
            if (responseText) {
                const aiMsg: DisplayMessage = { role: 'model', text: responseText, timestamp: Date.now() };
                setAiMessages(prev => [...prev, aiMsg]);
                aiHistoryRef.current.push({ role: 'model', text: responseText });
            }

            logApiCall({
                userId: user?.uid || '',
                projectId: 'ai-email-studio',
                model: MODEL_TEXT,
                feature: 'email-studio-chat',
                success: true,
            });
        } catch (error) {
            console.error('[AIEmailStudio] Chat error:', error);
            const errorMsg: DisplayMessage = {
                role: 'model',
                text: '⚠️ Hubo un error al procesar tu mensaje. Por favor intenta de nuevo.',
                timestamp: Date.now(),
            };
            setAiMessages(prev => [...prev, errorMsg]);

            logApiCall({
                userId: user?.uid || '',
                projectId: 'ai-email-studio',
                model: MODEL_TEXT,
                feature: 'email-studio-chat',
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown',
            });
        } finally {
            setAiThinking(false);
        }
    }, [aiThinking, user, buildEmailStudioSystemPrompt]);

    // =============================================================================
    // VOICE MODE — GEMINI LIVE API
    // =============================================================================

    const startVoiceSession = async () => {
        setIsVoiceConnecting(true);

        try {
            const ai = await getGoogleGenAI();
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            const outputCtx = new AudioCtx({ sampleRate: 24000 });
            const inputCtx = new AudioCtx({ sampleRate: 16000 });
            audioContextRef.current = outputCtx;
            inputAudioContextRef.current = inputCtx;
            nextStartTimeRef.current = outputCtx.currentTime;

            // Build system instruction WITH full conversation history so the
            // voice AI knows everything that was discussed in the text chat
            const baseSystemPrompt = buildEmailStudioSystemPrompt();
            const conversationHistory = aiHistoryRef.current
                .filter(m => !m.text.startsWith('[CONTEXT]'))
                .map(m => `${m.role === 'user' ? 'Admin' : 'AI'}: ${m.text}`)
                .join('\n\n');

            const systemPromptWithHistory = conversationHistory
                ? `${baseSystemPrompt}\n\n--- HISTORIAL DE CONVERSACIÓN PREVIA (el usuario ya habló contigo por texto, recuerda todo esto) ---\n${conversationHistory}\n--- FIN DEL HISTORIAL ---\n\nIMPORTANTE: Continúa la conversación naturalmente. El usuario ahora te habla por voz. Recuerda todo lo anterior y responde en contexto.`
                : baseSystemPrompt;

            // Store resolved session for direct access
            let resolvedSession: any = null;
            let audioSendCount = 0;

            const session = await ai.live.connect({
                model: MODEL_VOICE,
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
                    },
                    systemInstruction: systemPromptWithHistory,
                    contextWindowCompression: { slidingWindow: {} },
                    sessionResumption: {},
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => {
                        console.log('[EmailVoice] ✅ Session opened');
                        setIsVoiceConnecting(false);
                        setIsVoiceActive(true);
                        isConnectedRef.current = true;
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const msg = message as any;

                        // Debug: log message structure (throttled)
                        const msgKeys = Object.keys(msg);
                        if (!msgKeys.includes('sessionResumptionUpdate')) {
                            console.log('[EmailVoice] 📩 Message:', msgKeys, JSON.stringify(msg).substring(0, 300));
                        }

                        if (message.serverContent?.interrupted) {
                            activeSourcesRef.current.forEach(s => { try { s.stop(); } catch (_e) { } });
                            activeSourcesRef.current = [];
                            if (audioContextRef.current) nextStartTimeRef.current = audioContextRef.current.currentTime;
                            return;
                        }

                        // Accumulate transcriptions — the Live API sends:
                        // serverContent.inputTranscription.text (user speech)
                        // serverContent.outputTranscription.text (model speech)
                        // serverContent.inputTranscript (legacy/alternative)
                        // serverContent.outputTranscript (legacy/alternative)
                        const inputTranscript = msg.serverContent?.inputTranscription?.text
                            || msg.serverContent?.inputTranscript
                            || msg.inputTranscript;
                        const outputTranscript = msg.serverContent?.outputTranscription?.text
                            || msg.serverContent?.outputTranscript
                            || msg.outputTranscript;

                        if (inputTranscript) {
                            console.log('[EmailVoice] 🎤 User:', inputTranscript);
                            currentUserTranscriptRef.current += inputTranscript;
                            setLiveUserTranscript(currentUserTranscriptRef.current);
                        }
                        if (outputTranscript) {
                            console.log('[EmailVoice] 🔊 AI:', outputTranscript);
                            currentModelResponseRef.current += outputTranscript;
                            setLiveModelTranscript(currentModelResponseRef.current);
                        }

                        // On turn/generation complete, commit as permanent messages
                        const turnComplete = msg.serverContent?.turnComplete 
                            || msg.serverContent?.generationComplete
                            || msg.turnComplete;
                        if (turnComplete) {
                            console.log('[EmailVoice] ✅ Turn complete');
                            if (currentUserTranscriptRef.current.trim()) {
                                const userText = currentUserTranscriptRef.current.trim();
                                setAiMessages(prev => [...prev, { role: 'user', text: userText, isVoice: true, timestamp: Date.now() }]);
                                aiHistoryRef.current.push({ role: 'user', text: userText });
                                currentUserTranscriptRef.current = '';
                                setLiveUserTranscript('');
                            }
                            if (currentModelResponseRef.current.trim()) {
                                const modelText = currentModelResponseRef.current.trim();
                                setAiMessages(prev => [...prev, { role: 'model', text: modelText, isVoice: true, timestamp: Date.now() }]);
                                aiHistoryRef.current.push({ role: 'model', text: modelText });
                                currentModelResponseRef.current = '';
                                setLiveModelTranscript('');
                            }
                        }

                        // Handle audio output
                        const modelParts = message.serverContent?.modelTurn?.parts;
                        const audioData = modelParts?.[0]?.inlineData?.data;
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
                    onclose: () => stopVoiceSession(),
                    onerror: (e: any) => { console.error('[EmailVoice] ❌ Error:', e); }
                }
            });

            // Store the resolved session
            resolvedSession = session;
            sessionRef.current = session;
            console.log('[EmailVoice] 🔗 Session resolved, setting up microphone...');

            // Set up microphone AFTER session is resolved
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream;
                console.log('[EmailVoice] 🎙️ Microphone access granted');

                const source = inputCtx.createMediaStreamSource(stream);
                const processor = inputCtx.createScriptProcessor(4096, 1, 1);
                processorRef.current = processor;

                processor.onaudioprocess = (e) => {
                    if (!isConnectedRef.current || !resolvedSession) return;
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcm16 = floatTo16BitPCM(inputData);
                    const base64Data = bytesToBase64(new Uint8Array(pcm16));
                    try {
                        resolvedSession.sendRealtimeInput({
                            audio: { mimeType: 'audio/pcm;rate=16000', data: base64Data }
                        });
                        audioSendCount++;
                        if (audioSendCount % 50 === 0) {
                            console.log(`[EmailVoice] 📤 Audio chunks sent: ${audioSendCount}`);
                        }
                    } catch (err) {
                        console.warn('[EmailVoice] Audio send error:', err);
                    }
                };

                source.connect(processor);
                processor.connect(inputCtx.destination);
                console.log('[EmailVoice] ✅ Audio pipeline ready — speak now!');
            } catch (micErr) {
                console.error('[EmailVoice] 🎙️ Microphone error:', micErr);
                stopVoiceSession();
            }
        } catch (error) {
            console.error('[EmailVoice] Voice session error:', error);
            setIsVoiceConnecting(false);
        }
    };

    const stopVoiceSession = () => {
        isConnectedRef.current = false;
        if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
        if (audioContextRef.current) { audioContextRef.current.close().catch(() => { }); audioContextRef.current = null; }
        if (inputAudioContextRef.current) { inputAudioContextRef.current.close().catch(() => { }); inputAudioContextRef.current = null; }
        activeSourcesRef.current.forEach(s => { try { s.stop(); } catch (_e) { } });
        activeSourcesRef.current = [];
        if (sessionRef.current) {
            try { sessionRef.current.close?.(); } catch (_e) { }
            sessionRef.current = null;
        }
        // Flush any pending transcript into the conversation history before clearing
        if (currentUserTranscriptRef.current.trim()) {
            const leftover = currentUserTranscriptRef.current.trim();
            setAiMessages(prev => [...prev, { role: 'user', text: leftover, isVoice: true, timestamp: Date.now() }]);
            aiHistoryRef.current.push({ role: 'user', text: leftover });
        }
        if (currentModelResponseRef.current.trim()) {
            const leftover = currentModelResponseRef.current.trim();
            setAiMessages(prev => [...prev, { role: 'model', text: leftover, isVoice: true, timestamp: Date.now() }]);
            aiHistoryRef.current.push({ role: 'model', text: leftover });
        }
        // Clear live transcript state
        setLiveUserTranscript('');
        setLiveModelTranscript('');
        currentUserTranscriptRef.current = '';
        currentModelResponseRef.current = '';
        setIsVoiceActive(false);
        setIsVoiceConnecting(false);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => { stopVoiceSession(); };
    }, []);

    // =============================================================================
    // AI ACTIONS — CREATE CAMPAIGNS, AUDIENCES, AUTOMATIONS FROM CONVERSATION
    // =============================================================================

    const aiCreateCampaign = async () => {
        setAiCreating('campaign');
        console.log('[AIEmailStudio] 🚀 Starting campaign creation with structured blocks...');

        try {
            // Build conversation summary for AI context
            const conversationSummary = aiHistoryRef.current
                .filter(m => m.text.indexOf('[CONTEXT]') === -1)
                .map(m => `${m.role === 'user' ? 'Admin' : 'AI'}: ${m.text}`)
                .join('\n');

            // ─────────────────────────────────────────────────────────────────
            // Prompt: Ask the AI to return structured BLOCKS, not raw HTML
            // Each block maps 1-to-1 with the visual editor block types.
            // ─────────────────────────────────────────────────────────────────
            const prompt = `Basándote en TODA la conversación anterior, genera los datos para crear una campaña de email marketing con bloques visuales editables.

INSTRUCCIONES ESTRICTAS:
1. Devuelve ÚNICAMENTE un objeto JSON válido.
2. NO uses markdown, NO uses backticks, NO uses \`\`\`json.
3. El JSON debe contener estos campos de nivel superior:

{
  "name": "nombre de la campaña",
  "subject": "línea de asunto del email",
  "previewText": "texto de preview",
  "type": "newsletter",
  "blocks": [ ... ]
}

4. El campo "blocks" es un ARRAY de objetos de bloque. Cada bloque debe tener:
   { "type": "...", "content": { ... }, "styles": { ... } }

TIPOS DE BLOQUES DISPONIBLES:

a) "hero" — Sección principal con imagen de fondo, título, subtítulo y botón CTA.
   content: { "headline": "...", "subheadline": "...", "buttonText": "...", "buttonUrl": "#", "showButton": true, "imageUrl": "" }
   styles: { "backgroundColor": "#4f46e5", "textColor": "#ffffff", "headingColor": "#ffffff", "buttonColor": "#ffffff", "buttonTextColor": "#4f46e5", "padding": "lg", "alignment": "center" }

b) "text" — Bloque de texto libre (puede ser HTML con etiquetas <b>, <i>, <a>, <br>, <ul>, <li>).
   content: { "text": "Tu texto aquí...", "isHtml": false }
   styles: { "backgroundColor": "transparent", "textColor": "#52525b", "padding": "md", "alignment": "left", "fontSize": "md" }
   Nota: fontSize puede ser "xs", "sm", "md", "lg", "xl", "2xl", "3xl"

c) "image" — Bloque de imagen.
   content: { "src": "https://placehold.co/600x300/4f46e5/white?text=Tu+Imagen", "alt": "Descripción", "width": 100 }
   styles: { "padding": "sm", "alignment": "center", "borderRadius": "md" }

d) "button" — Botón CTA independiente.
   content: { "text": "Click Aquí", "url": "#", "fullWidth": false }
   styles: { "buttonColor": "#4f46e5", "buttonTextColor": "#ffffff", "padding": "md", "alignment": "center", "borderRadius": "md" }

e) "divider" — Línea horizontal separadora.
   content: { "style": "solid", "thickness": 1, "width": 100 }
   styles: { "borderColor": "#e4e4e7", "padding": "sm" }

f) "spacer" — Espacio en blanco vertical.
   content: { "height": 32 }
   styles: { "padding": "none" }

g) "social" — Íconos de redes sociales.
   content: { "links": { "facebook": "", "instagram": "", "twitter": "", "linkedin": "" }, "iconStyle": "color", "iconSize": "md" }
   styles: { "padding": "md", "alignment": "center" }

h) "footer" — Pie de email con datos legales y link de unsuscribe.
   content: { "companyName": "Tu Empresa", "address": "", "showUnsubscribe": true, "unsubscribeText": "Cancelar suscripción", "showSocialLinks": false, "copyrightText": "© 2025 Todos los derechos reservados" }
   styles: { "backgroundColor": "#f4f4f5", "textColor": "#71717a", "padding": "lg", "alignment": "center", "fontSize": "xs" }

EJEMPLO DE CAMPAÑA COMPLETA:
{
  "name": "Newsletter Mayo",
  "subject": "🚀 Las novedades de mayo están aquí",
  "previewText": "Descubre todo lo nuevo este mes",
  "type": "newsletter",
  "blocks": [
    { "type": "hero", "content": { "headline": "Bienvenido a Mayo", "subheadline": "Las mejores novedades del mes", "buttonText": "Ver Más", "buttonUrl": "#", "showButton": true }, "styles": { "backgroundColor": "#4f46e5", "headingColor": "#ffffff", "textColor": "#ffffff", "buttonColor": "#ffffff", "buttonTextColor": "#4f46e5", "padding": "lg", "alignment": "center" } },
    { "type": "text", "content": { "text": "Hola! Te traemos las últimas actualizaciones...", "isHtml": false }, "styles": { "padding": "md", "textColor": "#374151", "alignment": "left", "fontSize": "md" } },
    { "type": "divider", "content": { "style": "solid", "thickness": 1, "width": 80 }, "styles": { "borderColor": "#e5e7eb", "padding": "sm" } },
    { "type": "button", "content": { "text": "Explora Ahora", "url": "#", "fullWidth": false }, "styles": { "buttonColor": "#4f46e5", "buttonTextColor": "#ffffff", "padding": "md", "alignment": "center", "borderRadius": "md" } },
    { "type": "footer", "content": { "companyName": "Quimera.ai", "showUnsubscribe": true, "unsubscribeText": "Cancelar suscripción", "copyrightText": "© 2025 Quimera.ai" }, "styles": { "backgroundColor": "#f9fafb", "textColor": "#9ca3af", "padding": "lg", "alignment": "center", "fontSize": "xs" } }
  ]
}

REGLAS IMPORTANTES:
- Usa MÚLTIPLES bloques — un email profesional tiene mínimo 4-6 bloques.
- Empieza siempre con un bloque "hero" atractivo.
- Termina siempre con un bloque "footer" con unsubscribe.
- Usa colores coherentes y profesionales.
- El contenido debe reflejar lo que se discutió en la conversación.
- NO generes HTML crudo, genera la estructura de bloques.

CONVERSACIÓN PREVIA:
${conversationSummary}

RESPONDE SOLO CON EL JSON:`;

            console.log('[AIEmailStudio] 📤 Sending structured block prompt to proxy...');
            const response = await generateChatContentViaProxy(
                'ai-email-studio',
                [],
                prompt,
                'Eres un generador de JSON para bloques de email. Devuelve SOLO un objeto JSON válido con la estructura de bloques especificada. Sin markdown, sin explicaciones, sin backticks. Solo el JSON puro.',
                MODEL_TEXT,
                { temperature: 0.4, maxOutputTokens: 8192 },
                user?.uid
            );

            let responseText = extractTextFromResponse(response) || '';
            console.log('[AIEmailStudio] 📝 Raw response:', responseText.substring(0, 500));

            // Clean markdown code fences if present
            responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            
            // Try to extract JSON from the response even if there's surrounding text
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                responseText = jsonMatch[0];
            }

            let campaignData: any;
            try {
                campaignData = JSON.parse(responseText);
                console.log('[AIEmailStudio] ✅ JSON parsed:', campaignData.name, '— blocks:', campaignData.blocks?.length);
            } catch (parseError) {
                console.warn('[AIEmailStudio] ⚠️ JSON parse failed, using fallback:', parseError);
                const lastUserMsg = aiHistoryRef.current.filter(m => m.role === 'user').pop()?.text || 'Campaña AI';
                campaignData = {
                    name: `Campaña — ${lastUserMsg.substring(0, 50)}`,
                    subject: lastUserMsg.substring(0, 100),
                    previewText: '',
                    type: 'newsletter',
                    blocks: [
                        { type: 'hero', content: { headline: lastUserMsg.substring(0, 80), subheadline: 'Campaña generada por AI Email Studio', buttonText: 'Ver más', buttonUrl: '#', showButton: true }, styles: { backgroundColor: '#4f46e5', headingColor: '#ffffff', textColor: '#ffffff', buttonColor: '#ffffff', buttonTextColor: '#4f46e5', padding: 'lg', alignment: 'center' } },
                        { type: 'text', content: { text: 'Personaliza el contenido de esta campaña desde el editor visual. Puedes arrastrar, reordenar y editar cada bloque individualmente.', isHtml: false }, styles: { padding: 'md', textColor: '#52525b', alignment: 'left', fontSize: 'md' } },
                        { type: 'footer', content: { companyName: 'Quimera.ai', showUnsubscribe: true, unsubscribeText: 'Cancelar suscripción', copyrightText: '© 2025 Quimera.ai' }, styles: { backgroundColor: '#f4f4f5', textColor: '#71717a', padding: 'lg', alignment: 'center', fontSize: 'xs' } },
                    ],
                };
            }

            // ─────────────────────────────────────────────────────────────────
            // Convert AI blocks into proper EmailBlock[] with IDs and defaults
            // ─────────────────────────────────────────────────────────────────
            const VALID_BLOCK_TYPES = new Set(['hero', 'text', 'image', 'button', 'divider', 'spacer', 'columns', 'products', 'social', 'footer']);
            const aiBlocks: any[] = Array.isArray(campaignData.blocks) ? campaignData.blocks : [];

            const emailBlocks = aiBlocks
                .filter((b: any) => b && VALID_BLOCK_TYPES.has(b.type))
                .map((b: any) => ({
                    id: uuidv4(),
                    type: b.type as EmailBlockType,
                    visible: true,
                    content: { ...(DEFAULT_BLOCK_CONTENT[b.type as EmailBlockType] || {}), ...(b.content || {}) },
                    styles: { ...(DEFAULT_BLOCK_STYLES[b.type as EmailBlockType] || {}), ...(b.styles || {}) },
                }));

            // Ensure we always have at least one block
            if (emailBlocks.length === 0) {
                emailBlocks.push({
                    id: uuidv4(),
                    type: 'text' as EmailBlockType,
                    visible: true,
                    content: { text: 'Campaña generada por AI Email Studio. Edita este bloque o añade más bloques desde el editor.', isHtml: false },
                    styles: { ...DEFAULT_BLOCK_STYLES.text },
                });
            }

            console.log('[AIEmailStudio] 🧱 Built', emailBlocks.length, 'editor blocks:', emailBlocks.map((b: any) => b.type));

            const aiEmailDocument = {
                id: uuidv4(),
                name: campaignData.name || 'Campaña AI',
                subject: campaignData.subject || 'Sin asunto',
                previewText: campaignData.previewText || '',
                blocks: emailBlocks,
                globalStyles: DEFAULT_EMAIL_GLOBAL_STYLES,
            };

            // Generate HTML from the structured blocks for the htmlContent field
            const generatedHtml = generateEmailHtml(aiEmailDocument as EmailDocument);

            const newCampaign = {
                name: campaignData.name || 'Campaña AI',
                subject: campaignData.subject || 'Sin asunto',
                previewText: campaignData.previewText || '',
                type: campaignData.type || 'newsletter',
                htmlContent: generatedHtml,
                emailDocument: aiEmailDocument,
                audienceType: 'all' as const,
                status: 'draft' as CampaignStatus,
                stats: { totalRecipients: 0, sent: 0, delivered: 0, opened: 0, uniqueOpens: 0, clicked: 0, uniqueClicks: 0, bounced: 0, complained: 0, unsubscribed: 0 },
                tags: ['ai-generated'],
                createdBy: user?.uid || 'ai-studio',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            console.log('[AIEmailStudio] 💾 Saving to Firestore...');
            const docRef = await addDoc(collection(db, 'adminEmailCampaigns'), newCampaign);
            console.log('[AIEmailStudio] ✅ Saved! Doc ID:', docRef.id);

            // Inject into local state immediately so it appears in the Campaigns tab
            setCampaigns(prev => [{
                id: docRef.id,
                ...newCampaign,
                tenantId: 'admin',
                tenantName: 'Super Admin',
                userId: user?.uid || 'admin',
                projectId: 'admin',
                createdAt: new Date(),
                updatedAt: new Date(),
            } as CrossTenantCampaign, ...prev]);

            setAiCreatedItems(prev => [...prev, { type: 'campaign', name: campaignData.name, id: docRef.id, timestamp: Date.now() }]);

            // Build a nice summary of blocks created
            const blockSummary = emailBlocks.map((b: any) => {
                const labels: Record<string, string> = { hero: 'Hero', text: 'Texto', image: 'Imagen', button: 'Botón', divider: 'Divisor', spacer: 'Espaciador', social: 'Redes Sociales', footer: 'Pie de Email', columns: 'Columnas', products: 'Productos' };
                return `  - 🧱 ${labels[b.type] || b.type}`;
            }).join('\n');

            const confirmMsg: DisplayMessage = {
                role: 'model',
                text: `✅ **Campaña creada exitosamente!**\n\n- **Nombre:** ${campaignData.name}\n- **Asunto:** ${campaignData.subject}\n- **Tipo:** ${campaignData.type}\n- **Estado:** Borrador\n- **Bloques del editor:** ${emailBlocks.length}\n${blockSummary}\n- **ID:** \`${docRef.id}\`\n\n📝 La campaña ya aparece en la pestaña de **Campañas**. Al abrirla en el editor visual, cada bloque será **individualmente editable** — puedes arrastrar, reordenar, duplicar o eliminar bloques.`,
                timestamp: Date.now(),
            };
            setAiMessages(prev => [...prev, confirmMsg]);
            aiHistoryRef.current.push({ role: 'model', text: confirmMsg.text });

        } catch (error) {
            console.error('[AIEmailStudio] ❌ Campaign creation error:', error);
            const errorDetail = error instanceof Error ? error.message : String(error);
            setAiMessages(prev => [...prev, {
                role: 'model',
                text: `⚠️ **Error al crear la campaña:**\n\n\`${errorDetail}\`\n\nPor favor intenta de nuevo. Si el problema persiste, verifica la consola del navegador para más detalles.`,
                timestamp: Date.now(),
            }]);
        } finally {
            setAiCreating(null);
        }
    };

    const aiCreateAudience = async () => {
        setAiCreating('audience');
        try {
            const conversationSummary = aiHistoryRef.current
                .filter(m => m.text.indexOf('[CONTEXT]') === -1)
                .map(m => `${m.role === 'user' ? 'Admin' : 'AI'}: ${m.text}`)
                .join('\n');

            const prompt = `Basándote en la conversación anterior, genera los datos para crear un segmento de audiencia.
Devuelve SOLO un JSON válido con esta estructura exacta (sin markdown, sin backticks):
{"name":"...","description":"...","acceptsMarketing":true,"hasOrdered":false,"tags":[],"estimatedCount":0}

Conversación:\n${conversationSummary}`;

            const response = await generateChatContentViaProxy(
                'ai-email-studio', [], prompt,
                'Devuelve SOLO JSON válido.', MODEL_TEXT,
                { temperature: 0.3, maxOutputTokens: 2048 },
                user?.uid
            );

            let responseText = extractTextFromResponse(response) || '';
            responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) responseText = jsonMatch[0];

            let audienceData: any;
            try {
                audienceData = JSON.parse(responseText);
            } catch {
                const lastUserMsg = aiHistoryRef.current.filter(m => m.role === 'user').pop()?.text || 'Audiencia AI';
                audienceData = {
                    name: `Audiencia — ${lastUserMsg.substring(0, 50)}`,
                    description: lastUserMsg.substring(0, 200),
                    acceptsMarketing: true,
                    tags: ['ai-generated'],
                    estimatedCount: 0,
                };
            }

            const newAudience = {
                name: audienceData.name || 'Audiencia AI',
                description: audienceData.description || '',
                filters: [],
                acceptsMarketing: audienceData.acceptsMarketing ?? true,
                hasOrdered: audienceData.hasOrdered ?? false,
                tags: audienceData.tags || ['ai-generated'],
                estimatedCount: audienceData.estimatedCount || 0,
                isDefault: false,
                createdBy: user?.uid || 'ai-studio',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            const docRef = await addDoc(collection(db, 'adminEmailAudiences'), newAudience);

            // Inject into local state
            setAudiences(prev => [{
                id: docRef.id,
                ...newAudience,
                tenantId: 'admin',
                tenantName: 'Super Admin',
                userId: user?.uid || 'admin',
                projectId: 'admin',
                createdAt: new Date(),
                updatedAt: new Date(),
            } as CrossTenantAudience, ...prev]);

            setAiCreatedItems(prev => [...prev, { type: 'audience', name: audienceData.name, id: docRef.id, timestamp: Date.now() }]);

            const confirmMsg: DisplayMessage = {
                role: 'model',
                text: `✅ **Audiencia creada exitosamente!**\n\n- **Nombre:** ${audienceData.name}\n- **Descripción:** ${audienceData.description}\n- **Acepta marketing:** ${audienceData.acceptsMarketing ? 'Sí' : 'No'}\n- **ID:** \`${docRef.id}\`\n\nEl segmento ya aparece en la pestaña de **Audiencias**.`,
                timestamp: Date.now(),
            };
            setAiMessages(prev => [...prev, confirmMsg]);
            aiHistoryRef.current.push({ role: 'model', text: confirmMsg.text });

        } catch (error) {
            console.error('[AIEmailStudio] ❌ Audience creation error:', error);
            const errorDetail = error instanceof Error ? error.message : String(error);
            setAiMessages(prev => [...prev, {
                role: 'model',
                text: `⚠️ **Error al crear la audiencia:**\n\n\`${errorDetail}\`\n\nIntenta de nuevo.`,
                timestamp: Date.now(),
            }]);
        } finally {
            setAiCreating(null);
        }
    };

    const aiCreateAutomation = async () => {
        setAiCreating('automation');
        try {
            const conversationSummary = aiHistoryRef.current
                .filter(m => m.text.indexOf('[CONTEXT]') === -1)
                .map(m => `${m.role === 'user' ? 'Admin' : 'AI'}: ${m.text}`)
                .join('\n');

            const prompt = `Basándote en la conversación anterior, genera los datos para crear una automatización de email.
Devuelve SOLO un JSON válido con esta estructura exacta (sin markdown, sin backticks):
{"name":"...","type":"welcome|abandoned-cart|post-purchase|win-back|birthday","subject":"...","triggerEvent":"customer.created|cart.abandoned|order.delivered|customer.inactive|customer.birthday","delayMinutes":60,"status":"draft"}

Conversación:\n${conversationSummary}`;

            const response = await generateChatContentViaProxy(
                'ai-email-studio', [], prompt,
                'Devuelve SOLO JSON válido.', MODEL_TEXT,
                { temperature: 0.3, maxOutputTokens: 2048 },
                user?.uid
            );

            let responseText = extractTextFromResponse(response) || '';
            responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            let autoData: any;
            try {
                autoData = JSON.parse(responseText);
            } catch {
                autoData = {
                    name: `Automatización AI — ${new Date().toLocaleDateString('es-ES')}`,
                    type: 'welcome',
                    subject: 'Automatización generada por AI',
                    triggerEvent: 'customer.created',
                    delayMinutes: 60,
                    status: 'draft',
                };
            }

            const newAutomationData = {
                name: autoData.name || 'Automatización AI',
                type: autoData.type || 'welcome',
                status: autoData.status || 'draft',
                triggerConfig: {
                    type: 'event' as const,
                    event: autoData.triggerEvent || 'customer.created',
                },
                templateId: '',
                subject: autoData.subject || '',
                delayMinutes: autoData.delayMinutes || 60,
                stats: { triggered: 0, sent: 0, opened: 0, clicked: 0, converted: 0 },
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            const docRef = await addDoc(collection(db, 'adminEmailAutomations'), newAutomationData);
            setAiCreatedItems(prev => [...prev, { type: 'automation', name: autoData.name, id: docRef.id, timestamp: Date.now() }]);

            const confirmMsg: DisplayMessage = {
                role: 'model',
                text: `✅ **Automatización creada exitosamente!**\n\n- **Nombre:** ${autoData.name}\n- **Tipo:** ${autoData.type}\n- **Trigger:** ${autoData.triggerEvent}\n- **Delay:** ${formatDelay(autoData.delayMinutes)}\n- **Estado:** ${autoData.status}\n- **ID:** \`${docRef.id}\`\n\nLa automatización está lista. Puedes gestionarla desde la pestaña de Automatizaciones.`,
                timestamp: Date.now(),
            };
            setAiMessages(prev => [...prev, confirmMsg]);
            aiHistoryRef.current.push({ role: 'model', text: confirmMsg.text });

        } catch (error) {
            console.error('[AIEmailStudio] Automation creation error:', error);
            setAiMessages(prev => [...prev, { role: 'model', text: '⚠️ Error al crear la automatización. Intenta de nuevo.', timestamp: Date.now() }]);
        } finally {
            setAiCreating(null);
        }
    };

    // =============================================================================
    // HELPERS
    // =============================================================================

    const formatDate = (dateVal: any): string => {
        if (!dateVal) return '—';
        const date = dateVal.seconds ? new Date(dateVal.seconds * 1000) : new Date(dateVal);
        return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'sent': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'draft': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
            case 'scheduled': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'sending': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            case 'paused': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'sent': return <CheckCircle size={14} />;
            case 'draft': return <Edit2 size={14} />;
            case 'scheduled': return <Clock size={14} />;
            case 'sending': return <Send size={14} />;
            case 'paused': return <Pause size={14} />;
            case 'cancelled': return <XCircle size={14} />;
            case 'active': return <Play size={14} />;
            default: return <Clock size={14} />;
        }
    };

    const formatDelay = (minutes: number): string => {
        if (minutes < 60) return `${minutes} min`;
        if (minutes < 1440) return `${Math.round(minutes / 60)} horas`;
        return `${Math.round(minutes / 1440)} días`;
    };

    // =============================================================================
    // TAB DEFINITIONS
    // =============================================================================

    const tabs: { id: AdminEmailTab; label: string; icon: React.ReactNode; count?: number }[] = [
        { id: 'overview', label: 'Overview', icon: <BarChart3 size={18} /> },
        { id: 'campaigns', label: 'Campañas', icon: <Send size={18} />, count: campaigns.length },
        { id: 'audiences', label: 'Audiencias', icon: <Users size={18} />, count: audiences.length },
        { id: 'analytics', label: 'Analíticas', icon: <TrendingUp size={18} /> },
        { id: 'automations', label: 'Automatizaciones', icon: <Zap size={18} />, count: automations.length },
        { id: 'ai-studio', label: 'AI Studio', icon: <Sparkles size={18} /> },
    ];

    // =============================================================================
    // RENDER: OVERVIEW
    // =============================================================================

    const renderOverview = () => (
        <div className="space-y-6">
            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                    { label: 'Emails Enviados', value: stats.totalSent.toLocaleString(), icon: <Send size={20} />, color: 'text-blue-400 bg-blue-500/10' },
                    { label: 'Tasa de Apertura', value: `${stats.openRate}%`, icon: <Eye size={20} />, color: 'text-purple-400 bg-purple-500/10' },
                    { label: 'Tasa de Click', value: `${stats.clickRate}%`, icon: <MousePointer size={20} />, color: 'text-amber-400 bg-amber-500/10' },
                    { label: 'Campañas Activas', value: stats.activeCampaigns.toString(), icon: <Target size={20} />, color: 'text-green-400 bg-green-500/10' },
                    { label: 'Total Contactos', value: stats.totalContacts.toLocaleString(), icon: <Users size={20} />, color: 'text-pink-400 bg-pink-500/10' },
                    { label: 'Tasa de Entrega', value: `${stats.deliveryRate}%`, icon: <CheckCircle size={20} />, color: 'text-emerald-400 bg-emerald-500/10' },
                ].map((kpi, i) => (
                    <div key={i} className="bg-editor-panel-bg border border-editor-border rounded-xl p-4 hover:border-editor-accent/30 transition-all">
                        <div className={`p-2 rounded-lg ${kpi.color} w-fit mb-3`}>{kpi.icon}</div>
                        <p className="text-2xl font-bold text-editor-text-primary">{kpi.value}</p>
                        <p className="text-xs text-editor-text-secondary mt-1">{kpi.label}</p>
                    </div>
                ))}
            </div>

            {/* Recent Campaigns + Quick Actions */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Recent Campaigns */}
                <div className="lg:col-span-2 bg-editor-panel-bg border border-editor-border rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-editor-text-primary">Campañas Recientes</h3>
                        <button
                            onClick={() => setActiveTab('campaigns')}
                            className="text-sm text-editor-accent hover:text-editor-accent/80 transition-colors"
                        >
                            Ver todas →
                        </button>
                    </div>
                    {campaigns.length > 0 ? (
                        <div className="space-y-3">
                            {campaigns.slice(0, 5).map(campaign => (
                                <div key={`${campaign.userId}-${campaign.projectId}-${campaign.id}`} className="flex items-center justify-between p-3 bg-editor-bg/50 rounded-lg hover:bg-editor-bg transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-editor-text-primary truncate">{campaign.name}</p>
                                        <p className="text-xs text-editor-text-secondary flex items-center gap-2 mt-1">
                                            <Building2 size={12} />
                                            {campaign.tenantName}
                                            <span className="mx-1">•</span>
                                            {formatDate(campaign.createdAt)}
                                        </p>
                                    </div>
                                    <span className={`px-2 py-0.5 text-xs rounded-full border flex items-center gap-1 ${getStatusColor(campaign.status)}`}>
                                        {getStatusIcon(campaign.status)}
                                        {campaign.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-editor-text-secondary">
                            <Mail size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No hay campañas aún</p>
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-editor-text-primary mb-4">Acciones Rápidas</h3>
                    <div className="space-y-3">
                        <button
                            onClick={() => { setActiveTab('ai-studio'); setShowAIStudio(true); }}
                            className="w-full flex items-center gap-3 p-3 bg-editor-accent/10 border border-editor-accent/30 rounded-lg text-editor-accent hover:bg-editor-accent/20 transition-colors text-left"
                        >
                            <Sparkles size={20} />
                            <div>
                                <p className="text-sm font-medium">Crear con AI</p>
                                <p className="text-xs opacity-70">Genera campañas con IA</p>
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('automations')}
                            className="w-full flex items-center gap-3 p-3 bg-editor-bg/50 border border-editor-border rounded-lg text-editor-text-primary hover:border-editor-accent/30 transition-colors text-left"
                        >
                            <Zap size={20} className="text-amber-400" />
                            <div>
                                <p className="text-sm font-medium">Automatizaciones</p>
                                <p className="text-xs text-editor-text-secondary">Configura flujos automáticos</p>
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('analytics')}
                            className="w-full flex items-center gap-3 p-3 bg-editor-bg/50 border border-editor-border rounded-lg text-editor-text-primary hover:border-editor-accent/30 transition-colors text-left"
                        >
                            <BarChart3 size={20} className="text-purple-400" />
                            <div>
                                <p className="text-sm font-medium">Ver Analíticas</p>
                                <p className="text-xs text-editor-text-secondary">Métricas cross-tenant</p>
                            </div>
                        </button>
                    </div>

                    {/* Top Tenants */}
                    {tenantPerformance.length > 0 && (
                        <div className="mt-6">
                            <h4 className="text-sm font-medium text-editor-text-secondary mb-3">Top Tenants por Envíos</h4>
                            <div className="space-y-2">
                                {tenantPerformance.slice(0, 3).map((tp, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm">
                                        <span className="text-editor-text-primary truncate">{tp.name}</span>
                                        <span className="text-editor-text-secondary">{tp.sent.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    // =============================================================================
    // VISUAL EDITOR HANDLERS
    // =============================================================================

    /** Open the visual editor for an existing campaign */
    const handleEditCampaignVisual = (campaign: CrossTenantCampaign) => {
        const existingDoc: Partial<EmailDocument> = (campaign as any).emailDocument || {
            name: campaign.name,
            subject: campaign.subject,
            previewText: campaign.previewText || '',
            blocks: campaign.htmlContent ? [{
                id: uuidv4(),
                type: 'text' as const,
                visible: true,
                styles: { padding: 'md', backgroundColor: 'transparent', fontSize: 'md', alignment: 'left', textColor: '#000000' },
                content: { text: campaign.htmlContent, isHtml: true },
            }] : [],
            globalStyles: DEFAULT_EMAIL_GLOBAL_STYLES,
        };
        setEmailDocument(existingDoc);
        setEditingCampaignId(campaign.id);
        setSelectedCampaign(campaign);
        setShowEmailEditor(true);
    };

    /** Open template gallery for a new campaign */
    const handleOpenTemplateGallery = () => {
        setShowNewCampaignModal(false);
        setShowTemplateGallery(true);
    };

    /** Handle template selection from gallery */
    const handleSelectTemplate = (document: EmailDocument) => {
        setEmailDocument({
            ...document,
            name: newCampaignForm.name || document.name,
            subject: newCampaignForm.subject || document.subject,
            previewText: newCampaignForm.previewText || document.previewText,
        });
        setEditingCampaignId(null);
        setShowTemplateGallery(false);
        setShowEmailEditor(true);
    };

    /** Start with a blank template */
    const handleStartBlank = () => {
        setEmailDocument({
            name: newCampaignForm.name || 'Nueva campaña',
            subject: newCampaignForm.subject || '',
            previewText: newCampaignForm.previewText || '',
            blocks: [],
            globalStyles: DEFAULT_EMAIL_GLOBAL_STYLES,
        });
        setEditingCampaignId(null);
        setShowTemplateGallery(false);
        setShowEmailEditor(true);
    };

    /** Save from the visual editor — creates or updates in Firestore */
    const handleSaveFromEditor = async (document: EmailDocument) => {
        try {
            const htmlContent = generateEmailHtml(document);

            if (editingCampaignId && selectedCampaign) {
                // Update existing campaign
                const collectionPath = selectedCampaign.tenantId === 'admin'
                    ? 'adminEmailCampaigns'
                    : `users/${selectedCampaign.userId}/projects/${selectedCampaign.projectId}/emailCampaigns`;
                await updateDoc(doc(db, collectionPath, editingCampaignId), {
                    name: document.name,
                    subject: document.subject,
                    previewText: document.previewText,
                    htmlContent,
                    emailDocument: document,
                    updatedAt: serverTimestamp(),
                });
                // Update local state
                setCampaigns(prev => prev.map(c =>
                    c.id === editingCampaignId
                        ? { ...c, name: document.name, subject: document.subject, previewText: document.previewText, htmlContent, emailDocument: document, updatedAt: new Date() } as any
                        : c
                ));
            } else {
                // Create new campaign
                const newCampaign = {
                    name: document.name,
                    subject: document.subject,
                    previewText: document.previewText,
                    type: newCampaignForm.type || 'newsletter',
                    htmlContent,
                    emailDocument: document,
                    audienceType: 'all' as const,
                    status: 'draft' as CampaignStatus,
                    stats: { totalRecipients: 0, sent: 0, delivered: 0, opened: 0, uniqueOpens: 0, clicked: 0, uniqueClicks: 0, bounced: 0, complained: 0, unsubscribed: 0 },
                    tags: ['visual-editor'],
                    createdBy: user?.uid || 'admin',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                };
                const docRef = await addDoc(collection(db, 'adminEmailCampaigns'), newCampaign);
                setCampaigns(prev => [{
                    id: docRef.id, ...newCampaign,
                    tenantId: 'admin', tenantName: 'Super Admin',
                    userId: user?.uid || 'admin', projectId: 'admin',
                    createdAt: new Date(), updatedAt: new Date(),
                } as CrossTenantCampaign, ...prev]);
            }

            // Clean up
            setShowEmailEditor(false);
            setEmailDocument(null);
            setEditingCampaignId(null);
            setSelectedCampaign(null);
            setNewCampaignForm({ name: '', subject: '', previewText: '', type: 'newsletter' });
        } catch (err) {
            console.error('Save from visual editor error:', err);
            alert('Error al guardar: ' + (err instanceof Error ? err.message : 'Error desconocido'));
        }
    };

    /** Close the visual editor */
    const handleCloseEditor = () => {
        setShowEmailEditor(false);
        setEmailDocument(null);
        setEditingCampaignId(null);
    };

    /** Delete a campaign with confirmation */
    const handleDeleteCampaign = async (campaign: CrossTenantCampaign) => {
        setConfirmModal({
            show: true,
            title: 'Eliminar Campaña',
            message: `¿Estás seguro de eliminar la campaña "${campaign.name}"? Esta acción no se puede deshacer.`,
            onConfirm: async () => {
                try {
                    const collectionPath = campaign.tenantId === 'admin'
                        ? 'adminEmailCampaigns'
                        : `users/${campaign.userId}/projects/${campaign.projectId}/emailCampaigns`;
                    await deleteDoc(doc(db, collectionPath, campaign.id));
                    setCampaigns(prev => prev.filter(c => !(c.id === campaign.id && c.tenantId === campaign.tenantId)));
                } catch (err) {
                    console.error('Delete error:', err);
                }
                setConfirmModal(prev => ({ ...prev, show: false }));
            },
        });
    };

    /** Duplicate a campaign */
    const handleDuplicateCampaign = async (campaign: CrossTenantCampaign) => {
        try {
            const dupData = {
                name: `${campaign.name} (Copia)`,
                subject: campaign.subject,
                previewText: campaign.previewText || '',
                type: campaign.type || 'newsletter',
                htmlContent: campaign.htmlContent || '',
                emailDocument: (campaign as any).emailDocument || null,
                audienceType: 'all' as const,
                status: 'draft' as CampaignStatus,
                stats: { totalRecipients: 0, sent: 0, delivered: 0, opened: 0, uniqueOpens: 0, clicked: 0, uniqueClicks: 0, bounced: 0, complained: 0, unsubscribed: 0 },
                tags: ['duplicate'],
                createdBy: user?.uid || 'admin',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            const docRef = await addDoc(collection(db, 'adminEmailCampaigns'), dupData);
            setCampaigns(prev => [{
                id: docRef.id, ...dupData,
                tenantId: 'admin', tenantName: 'Super Admin',
                userId: user?.uid || 'admin', projectId: 'admin',
                createdAt: new Date(), updatedAt: new Date(),
            } as CrossTenantCampaign, ...prev]);
        } catch (err) {
            console.error('Duplicate error:', err);
        }
    };

    // =============================================================================
    // RENDER: CAMPAIGNS
    // =============================================================================

    const renderCampaigns = () => (
        <div className="space-y-6">
            {/* Header + New Campaign Button */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-editor-text-primary">Campañas</h2>
                    <p className="text-sm text-editor-text-secondary">{campaigns.length} campañas totales</p>
                </div>
                <button
                    onClick={() => setShowNewCampaignModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-purple-500/20 transition-all"
                >
                    <Plus size={16} />
                    Nueva Campaña
                </button>
            </div>

            {/* Filters */}
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1 flex items-center gap-2 bg-editor-bg/50 rounded-lg px-3 py-2">
                        <Search size={16} className="text-editor-text-secondary flex-shrink-0" />
                        <input
                            type="text"
                            placeholder="Buscar campañas..."
                            value={campaignSearch}
                            onChange={e => setCampaignSearch(e.target.value)}
                            className="flex-1 bg-transparent outline-none text-sm text-editor-text-primary placeholder:text-editor-text-secondary"
                        />
                        {campaignSearch && (
                            <button onClick={() => setCampaignSearch('')} className="text-editor-text-secondary hover:text-editor-text-primary">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <select
                        value={campaignStatusFilter}
                        onChange={e => setCampaignStatusFilter(e.target.value as CampaignStatus | 'all')}
                        className="px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="draft">Borrador</option>
                        <option value="scheduled">Programada</option>
                        <option value="sending">Enviando</option>
                        <option value="sent">Enviada</option>
                        <option value="paused">Pausada</option>
                        <option value="cancelled">Cancelada</option>
                    </select>
                    <select
                        value={campaignTenantFilter}
                        onChange={e => setCampaignTenantFilter(e.target.value)}
                        className="px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                    >
                        <option value="all">Todos los tenants</option>
                        {tenants.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Campaigns Table */}
            {filteredCampaigns.length > 0 ? (
                <div className="bg-editor-panel-bg border border-editor-border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-editor-border">
                                    <th className="text-left px-4 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">Campaña</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">Tenant</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">Estado</th>
                                    <th className="text-right px-4 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">Enviados</th>
                                    <th className="text-right px-4 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">Apertura</th>
                                    <th className="text-right px-4 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">Clicks</th>
                                    <th className="text-right px-4 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-editor-border">
                                {filteredCampaigns.map(campaign => (
                                    <tr
                                        key={`${campaign.userId}-${campaign.projectId}-${campaign.id}`}
                                        className="hover:bg-editor-bg/50 transition-colors group"
                                    >
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-medium text-editor-text-primary truncate max-w-[200px]">{campaign.name}</p>
                                            <p className="text-xs text-editor-text-secondary truncate max-w-[200px]">{campaign.subject}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs text-editor-text-secondary flex items-center gap-1">
                                                <Building2 size={12} />
                                                {campaign.tenantName}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border ${getStatusColor(campaign.status)}`}>
                                                {getStatusIcon(campaign.status)}
                                                {campaign.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm text-editor-text-primary">
                                            {(campaign.stats?.sent || 0).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm text-editor-text-primary">
                                            {campaign.stats?.sent > 0
                                                ? `${((campaign.stats.uniqueOpens || 0) / campaign.stats.sent * 100).toFixed(1)}%`
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm text-editor-text-primary">
                                            {campaign.stats?.uniqueOpens > 0
                                                ? `${((campaign.stats.uniqueClicks || 0) / campaign.stats.uniqueOpens * 100).toFixed(1)}%`
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                {/* Edit — opens visual editor */}
                                                <button
                                                    onClick={() => handleEditCampaignVisual(campaign)}
                                                    className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Editar en editor visual"
                                                >
                                                    <Edit2 size={15} className="text-purple-400" />
                                                </button>
                                                {/* Duplicate */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDuplicateCampaign(campaign); }}
                                                    className="p-2 hover:bg-editor-border/40 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Duplicar"
                                                >
                                                    <Copy size={15} className="text-editor-text-secondary" />
                                                </button>
                                                {/* Delete */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteCampaign(campaign); }}
                                                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={15} className="text-red-400" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 bg-editor-panel-bg border border-editor-border rounded-xl">
                    <Send size={48} className="mx-auto text-editor-text-secondary mb-4 opacity-50" />
                    <h3 className="text-lg font-medium text-editor-text-primary mb-2">No hay campañas</h3>
                    <p className="text-editor-text-secondary text-sm mb-4">
                        {campaignSearch || campaignStatusFilter !== 'all' || campaignTenantFilter !== 'all'
                            ? 'Ajusta los filtros para ver más resultados'
                            : 'Crea tu primera campaña para empezar'}
                    </p>
                    <button
                        onClick={() => setShowNewCampaignModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-purple-500/20 transition-all"
                    >
                        <Plus size={16} />
                        Nueva Campaña
                    </button>
                </div>
            )}

            {/* ===== NEW CAMPAIGN MODAL ===== */}
            {showNewCampaignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowNewCampaignModal(false)}>
                    <div className="bg-editor-bg border border-editor-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="p-5 border-b border-editor-border flex items-center justify-between bg-gradient-to-r from-purple-500/10 via-blue-500/5 to-transparent">
                            <div className="flex items-center gap-3">
                                <div className="bg-gradient-to-br from-purple-500 to-blue-500 p-2.5 rounded-xl shadow-lg shadow-purple-500/20">
                                    <Mail className="text-white w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-editor-text-primary">Nueva Campaña</h2>
                                    <p className="text-xs text-editor-text-secondary">Configura los detalles básicos</p>
                                </div>
                            </div>
                            <button onClick={() => setShowNewCampaignModal(false)} className="p-2 hover:bg-editor-border/40 rounded-lg transition-colors">
                                <X size={18} className="text-editor-text-secondary" />
                            </button>
                        </div>

                        {/* Form */}
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">Nombre</label>
                                <input
                                    type="text"
                                    value={newCampaignForm.name}
                                    onChange={e => setNewCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full bg-editor-panel-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    placeholder="Ej: Newsletter Mayo 2025"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">Asunto</label>
                                <input
                                    type="text"
                                    value={newCampaignForm.subject}
                                    onChange={e => setNewCampaignForm(prev => ({ ...prev, subject: e.target.value }))}
                                    className="w-full bg-editor-panel-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    placeholder="Línea de asunto del email"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">Preview Text</label>
                                <input
                                    type="text"
                                    value={newCampaignForm.previewText}
                                    onChange={e => setNewCampaignForm(prev => ({ ...prev, previewText: e.target.value }))}
                                    className="w-full bg-editor-panel-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    placeholder="Texto de preview que se ve en la bandeja"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">Tipo</label>
                                <select
                                    value={newCampaignForm.type}
                                    onChange={e => setNewCampaignForm(prev => ({ ...prev, type: e.target.value }))}
                                    className="w-full bg-editor-panel-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                >
                                    <option value="newsletter">Newsletter</option>
                                    <option value="promotion">Promoción</option>
                                    <option value="announcement">Anuncio</option>
                                    <option value="welcome">Bienvenida</option>
                                    <option value="transactional">Transaccional</option>
                                </select>
                            </div>
                        </div>

                        {/* Footer — choose how to create */}
                        <div className="p-5 border-t border-editor-border bg-editor-panel-bg/50">
                            <p className="text-xs text-editor-text-secondary mb-3 text-center">¿Cómo quieres diseñar tu email?</p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={handleOpenTemplateGallery}
                                    className="flex flex-col items-center gap-2 p-4 bg-editor-bg border border-editor-border rounded-xl hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group"
                                >
                                    <Sparkles size={24} className="text-purple-400 group-hover:text-purple-300" />
                                    <span className="text-sm font-medium text-editor-text-primary">Usar Template</span>
                                    <span className="text-[10px] text-editor-text-secondary">Templates prediseñados</span>
                                </button>
                                <button
                                    onClick={handleStartBlank}
                                    className="flex flex-col items-center gap-2 p-4 bg-editor-bg border border-editor-border rounded-xl hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group"
                                >
                                    <FileText size={24} className="text-blue-400 group-hover:text-blue-300" />
                                    <span className="text-sm font-medium text-editor-text-primary">En Blanco</span>
                                    <span className="text-[10px] text-editor-text-secondary">Diseña desde cero</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== TEMPLATE GALLERY ===== */}
            {showTemplateGallery && (
                <EmailTemplateGallery
                    onSelect={handleSelectTemplate}
                    onClose={() => setShowTemplateGallery(false)}
                    onStartBlank={handleStartBlank}
                />
            )}

            {/* ===== VISUAL EMAIL EDITOR — Full Screen ===== */}
            {showEmailEditor && emailDocument && (
                <div className="fixed inset-0 z-[100] bg-editor-bg">
                    <AdminEmailEditorWrapper
                        initialDocument={emailDocument}
                        onSave={handleSaveFromEditor}
                        onClose={handleCloseEditor}
                        campaignId={editingCampaignId || undefined}
                        campaignName={editingCampaignId
                            ? campaigns.find(c => c.id === editingCampaignId)?.name
                            : newCampaignForm.name || undefined
                        }
                    />
                </div>
            )}

            {/* ===== CONFIRMATION MODAL ===== */}
            {confirmModal.show && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
                    onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                >
                    <div
                        className="bg-editor-bg border border-editor-border rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Warning Icon */}
                        <div className="flex items-center justify-center mb-4">
                            <div className="p-3 bg-red-500/10 rounded-full">
                                <AlertTriangle size={28} className="text-red-400" />
                            </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-lg font-bold text-editor-text-primary text-center mb-2">
                            {confirmModal.title}
                        </h3>

                        {/* Message */}
                        <p className="text-sm text-editor-text-secondary text-center mb-6 leading-relaxed">
                            {confirmModal.message}
                        </p>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                                className="flex-1 px-4 py-2.5 text-sm font-medium text-editor-text-secondary bg-editor-panel-bg border border-editor-border rounded-xl hover:bg-editor-border hover:text-editor-text-primary transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <Trash2 size={14} /> Eliminar
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // =============================================================================
    // RENDER: AUDIENCES
    // =============================================================================

    // --- Audience handler functions ---
    const handleCreateAudience = async () => {
        if (!newAudienceForm.name.trim()) return;
        try {
            const docRef = await addDoc(collection(db, 'adminEmailAudiences'), {
                name: newAudienceForm.name.trim(),
                description: newAudienceForm.description.trim(),
                members: [],
                staticMemberCount: 0,
                estimatedCount: 0,
                tags: [],
                acceptsMarketing: true,
                source: 'manual',
                createdBy: user?.uid || 'admin',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            setAudiences(prev => [{
                id: docRef.id,
                name: newAudienceForm.name.trim(),
                description: newAudienceForm.description.trim(),
                members: [],
                staticMemberCount: 0,
                estimatedCount: 0,
                tags: [],
                acceptsMarketing: true,
                source: 'manual',
                createdBy: user?.uid || 'admin',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                tenantId: 'admin',
                tenantName: 'Super Admin',
                userId: user?.uid || 'admin',
                projectId: 'admin',
            } as CrossTenantAudience, ...prev]);
            setNewAudienceForm({ name: '', description: '' });
            setShowCreateAudience(false);
        } catch (err) {
            console.error('[AdminEmailHub] Error creating audience:', err);
        }
    };

    const handleAddRegisteredUsers = async (audienceId: string, selectedUserIds: string[]) => {
        try {
            const selectedUsers = allUsers.filter(u => selectedUserIds.includes(u.id));
            const newMembers = selectedUsers.map(u => ({
                email: u.email,
                name: u.displayName || u.name || '',
                userId: u.id,
                source: 'registered' as const,
            }));

            const audienceRef = doc(db, 'adminEmailAudiences', audienceId);
            const audience = audiences.find(a => a.id === audienceId);
            const existingMembers: any[] = (audience as any)?.members || [];
            const existingEmails = new Set(existingMembers.map((m: any) => m.email?.toLowerCase()));
            const uniqueNewMembers = newMembers.filter(m => !existingEmails.has(m.email.toLowerCase()));
            const updatedMembers = [...existingMembers, ...uniqueNewMembers];

            await updateDoc(audienceRef, {
                members: updatedMembers,
                staticMemberCount: updatedMembers.length,
                estimatedCount: updatedMembers.length,
                updatedAt: serverTimestamp(),
            });

            setAudiences(prev => prev.map(a => a.id === audienceId ? {
                ...a,
                members: updatedMembers,
                staticMemberCount: updatedMembers.length,
                estimatedCount: updatedMembers.length,
            } as CrossTenantAudience : a));

            setAudienceMembers(prev => ({ ...prev, [audienceId]: updatedMembers }));
            setShowAddUsers(false);
        } catch (err) {
            console.error('[AdminEmailHub] Error adding users:', err);
        }
    };

    const handleCSVUpload = async (audienceId: string, file: File) => {
        setCsvUploading(true);
        try {
            const text = await file.text();
            const lines = text.split(/\r?\n/).filter(l => l.trim());
            // Support CSV with headers: email,name or just email per line
            const newMembers: { email: string; name?: string; source: string }[] = [];
            const headerLine = lines[0]?.toLowerCase() || '';
            const hasHeader = headerLine.includes('email') || headerLine.includes('nombre') || headerLine.includes('name');
            const startIdx = hasHeader ? 1 : 0;

            for (let i = startIdx; i < lines.length; i++) {
                const parts = lines[i].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
                const email = parts[0];
                const name = parts[1] || '';
                if (email && email.includes('@')) {
                    newMembers.push({ email, name, source: 'csv-import' });
                }
            }

            if (newMembers.length === 0) {
                setCsvUploading(false);
                return;
            }

            const audienceRef = doc(db, 'adminEmailAudiences', audienceId);
            const audience = audiences.find(a => a.id === audienceId);
            const existingMembers: any[] = (audience as any)?.members || [];
            const existingEmails = new Set(existingMembers.map((m: any) => m.email?.toLowerCase()));
            const uniqueNewMembers = newMembers.filter(m => !existingEmails.has(m.email.toLowerCase()));
            const updatedMembers = [...existingMembers, ...uniqueNewMembers];

            await updateDoc(audienceRef, {
                members: updatedMembers,
                staticMemberCount: updatedMembers.length,
                estimatedCount: updatedMembers.length,
                updatedAt: serverTimestamp(),
            });

            setAudiences(prev => prev.map(a => a.id === audienceId ? {
                ...a,
                members: updatedMembers,
                staticMemberCount: updatedMembers.length,
                estimatedCount: updatedMembers.length,
            } as CrossTenantAudience : a));

            setAudienceMembers(prev => ({ ...prev, [audienceId]: updatedMembers }));
            setShowImportCSV(false);
        } catch (err) {
            console.error('[AdminEmailHub] Error importing CSV:', err);
        }
        setCsvUploading(false);
    };

    const handleAddManualEmail = async (audienceId: string) => {
        if (!manualEmail.trim() || !manualEmail.includes('@')) return;
        try {
            const audienceRef = doc(db, 'adminEmailAudiences', audienceId);
            const audience = audiences.find(a => a.id === audienceId);
            const existingMembers: any[] = (audience as any)?.members || [];
            const exists = existingMembers.some((m: any) => m.email?.toLowerCase() === manualEmail.trim().toLowerCase());
            if (exists) { setManualEmail(''); return; }

            const updatedMembers = [...existingMembers, { email: manualEmail.trim(), source: 'manual' }];
            await updateDoc(audienceRef, {
                members: updatedMembers,
                staticMemberCount: updatedMembers.length,
                estimatedCount: updatedMembers.length,
                updatedAt: serverTimestamp(),
            });

            setAudiences(prev => prev.map(a => a.id === audienceId ? {
                ...a,
                members: updatedMembers,
                staticMemberCount: updatedMembers.length,
                estimatedCount: updatedMembers.length,
            } as CrossTenantAudience : a));

            setAudienceMembers(prev => ({ ...prev, [audienceId]: updatedMembers }));
            setManualEmail('');
        } catch (err) {
            console.error('[AdminEmailHub] Error adding email:', err);
        }
    };

    const handleDeleteAudience = async (audienceId: string) => {
        const audience = audiences.find(a => a.id === audienceId);
        setConfirmModal({
            show: true,
            title: 'Eliminar Audiencia',
            message: `¿Estás seguro de eliminar la audiencia "${audience?.name || ''}"? Se perderán todos los contactos asociados.`,
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, 'adminEmailAudiences', audienceId));
                    setAudiences(prev => prev.filter(a => a.id !== audienceId));
                } catch (err) {
                    console.error('[AdminEmailHub] Error deleting audience:', err);
                }
                setConfirmModal(prev => ({ ...prev, show: false }));
            },
        });
    };

    const handleRemoveMember = async (audienceId: string, memberEmail: string) => {
        try {
            const audienceRef = doc(db, 'adminEmailAudiences', audienceId);
            const audience = audiences.find(a => a.id === audienceId);
            const existingMembers: any[] = (audience as any)?.members || [];
            const updatedMembers = existingMembers.filter((m: any) => m.email?.toLowerCase() !== memberEmail.toLowerCase());

            await updateDoc(audienceRef, {
                members: updatedMembers,
                staticMemberCount: updatedMembers.length,
                estimatedCount: updatedMembers.length,
                updatedAt: serverTimestamp(),
            });

            setAudiences(prev => prev.map(a => a.id === audienceId ? {
                ...a,
                members: updatedMembers,
                staticMemberCount: updatedMembers.length,
                estimatedCount: updatedMembers.length,
            } as CrossTenantAudience : a));

            setAudienceMembers(prev => ({ ...prev, [audienceId]: updatedMembers }));
        } catch (err) {
            console.error('[AdminEmailHub] Error removing member:', err);
        }
    };

    // Filter audiences to admin-only
    const adminAudiences = useMemo(() =>
        filteredAudiences.filter(a => a.tenantId === 'admin'),
        [filteredAudiences]
    );

    const renderAudiences = () => (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 bg-editor-panel-bg border border-editor-border rounded-xl px-4 py-3 flex-1 max-w-md">
                    <Search size={16} className="text-editor-text-secondary" />
                    <input
                        type="text"
                        placeholder="Buscar audiencias..."
                        value={audienceSearch}
                        onChange={e => setAudienceSearch(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-sm text-editor-text-primary placeholder:text-editor-text-secondary"
                    />
                </div>
                <button
                    onClick={() => setShowCreateAudience(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/20"
                >
                    <Plus size={16} /> Nueva Audiencia
                </button>
            </div>

            {/* Registered Users Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Users size={18} className="text-blue-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-editor-text-primary">{allUsers.length}</p>
                            <p className="text-xs text-editor-text-secondary">Usuarios Registrados</p>
                        </div>
                    </div>
                </div>
                <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Layers size={18} className="text-purple-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-editor-text-primary">{adminAudiences.length}</p>
                            <p className="text-xs text-editor-text-secondary">Audiencias Creadas</p>
                        </div>
                    </div>
                </div>
                <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                            <Mail size={18} className="text-green-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-editor-text-primary">
                                {adminAudiences.reduce((sum, a) => sum + (a.estimatedCount || a.staticMemberCount || 0), 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-editor-text-secondary">Total Contactos</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Audiences Grid */}
            {adminAudiences.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {adminAudiences.map(audience => (
                        <div key={audience.id}
                            className="bg-editor-panel-bg border border-editor-border rounded-xl p-5 hover:border-editor-accent/30 transition-all group"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <Users size={20} className="text-purple-400" />
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {/* Manage members */}
                                    <button
                                        onClick={() => {
                                            setSelectedAudienceId(audience.id);
                                            const members = (audience as any)?.members || [];
                                            setAudienceMembers(prev => ({ ...prev, [audience.id]: members }));
                                        }}
                                        className="p-1.5 rounded-lg hover:bg-editor-accent/10 text-editor-text-secondary hover:text-editor-accent transition-colors"
                                        title="Ver miembros"
                                    >
                                        <Eye size={14} />
                                    </button>
                                    {/* Add registered users */}
                                    <button
                                        onClick={() => {
                                            setSelectedAudienceId(audience.id);
                                            setShowAddUsers(true);
                                            if (allUsers.length === 0) fetchAllUsers();
                                        }}
                                        className="p-1.5 rounded-lg hover:bg-blue-500/10 text-editor-text-secondary hover:text-blue-400 transition-colors"
                                        title="Agregar usuarios registrados"
                                    >
                                        <UserPlus size={14} />
                                    </button>
                                    {/* Import CSV */}
                                    <button
                                        onClick={() => {
                                            setSelectedAudienceId(audience.id);
                                            setShowImportCSV(true);
                                        }}
                                        className="p-1.5 rounded-lg hover:bg-green-500/10 text-editor-text-secondary hover:text-green-400 transition-colors"
                                        title="Importar CSV"
                                    >
                                        <Upload size={14} />
                                    </button>
                                    {/* Delete */}
                                    <button
                                        onClick={() => handleDeleteAudience(audience.id)}
                                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-editor-text-secondary hover:text-red-400 transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <h4 className="text-sm font-semibold text-editor-text-primary mb-1 truncate">{audience.name}</h4>
                            {audience.description && (
                                <p className="text-xs text-editor-text-secondary mb-3 line-clamp-2">{audience.description}</p>
                            )}
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-editor-border">
                                <div className="flex items-center gap-1 text-editor-text-primary">
                                    <UserPlus size={14} />
                                    <span className="text-sm font-medium">
                                        {(audience.estimatedCount || audience.staticMemberCount || 0).toLocaleString()}
                                    </span>
                                    <span className="text-xs text-editor-text-secondary ml-1">contactos</span>
                                </div>
                                <span className="text-xs text-editor-text-secondary">{formatDate(audience.createdAt)}</span>
                            </div>

                            {/* Inline member list (expanded view) */}
                            {selectedAudienceId === audience.id && !showAddUsers && !showImportCSV && (
                                <div className="mt-3 pt-3 border-t border-editor-border">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Miembros</p>
                                        <button onClick={() => setSelectedAudienceId(null)} className="text-xs text-editor-text-secondary hover:text-editor-text-primary">
                                            <X size={12} />
                                        </button>
                                    </div>
                                    {/* Add manual email */}
                                    <div className="flex gap-1 mb-2">
                                        <input
                                            type="email"
                                            placeholder="email@ejemplo.com"
                                            value={manualEmail}
                                            onChange={e => setManualEmail(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleAddManualEmail(audience.id)}
                                            className="flex-1 bg-editor-bg border border-editor-border rounded-lg px-2 py-1.5 text-xs text-editor-text-primary placeholder:text-editor-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-editor-accent"
                                        />
                                        <button
                                            onClick={() => handleAddManualEmail(audience.id)}
                                            className="px-2 py-1.5 bg-editor-accent text-white rounded-lg text-xs font-medium hover:bg-editor-accent-hover transition-colors"
                                        >
                                            <Plus size={12} />
                                        </button>
                                    </div>
                                    <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
                                        {(audienceMembers[audience.id] || (audience as any)?.members || []).length > 0 ? (
                                            (audienceMembers[audience.id] || (audience as any)?.members || []).map((member: any, idx: number) => (
                                                <div key={idx} className="flex items-center justify-between px-2 py-1 bg-editor-bg/50 rounded text-xs group/member">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <Mail size={10} className="text-editor-text-secondary flex-shrink-0" />
                                                        <span className="text-editor-text-primary truncate">{member.email}</span>
                                                        {member.name && <span className="text-editor-text-secondary truncate">({member.name})</span>}
                                                        {member.source === 'registered' && (
                                                            <span className="text-[9px] px-1 py-0.5 bg-blue-500/10 text-blue-400 rounded">registrado</span>
                                                        )}
                                                        {member.source === 'csv-import' && (
                                                            <span className="text-[9px] px-1 py-0.5 bg-green-500/10 text-green-400 rounded">CSV</span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveMember(audience.id, member.email)}
                                                        className="opacity-0 group-hover/member:opacity-100 p-0.5 text-red-400 hover:text-red-500 transition-all"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-editor-text-secondary text-center py-3">Sin miembros aún</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-editor-panel-bg border border-editor-border rounded-xl">
                    <Users size={48} className="mx-auto text-editor-text-secondary mb-4 opacity-50" />
                    <h3 className="text-lg font-medium text-editor-text-primary mb-2">No hay audiencias</h3>
                    <p className="text-editor-text-secondary text-sm mb-4">Crea una audiencia para enviar campañas a tus usuarios y contactos</p>
                    <button
                        onClick={() => setShowCreateAudience(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all"
                    >
                        <Plus size={16} /> Crear Primera Audiencia
                    </button>
                </div>
            )}

            {/* ===== CREATE AUDIENCE MODAL ===== */}
            {showCreateAudience && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreateAudience(false)}>
                    <div className="bg-editor-bg border border-editor-border rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-editor-text-primary flex items-center gap-2">
                                <Users size={20} className="text-purple-400" /> Nueva Audiencia
                            </h3>
                            <button onClick={() => setShowCreateAudience(false)} className="p-1 rounded-full hover:bg-editor-border">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider mb-1">Nombre</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Todos los usuarios, VIP, Newsletter..."
                                    value={newAudienceForm.name}
                                    onChange={e => setNewAudienceForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full bg-editor-panel-bg border border-editor-border rounded-lg px-3 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider mb-1">Descripción (opcional)</label>
                                <textarea
                                    placeholder="Describe esta audiencia..."
                                    value={newAudienceForm.description}
                                    onChange={e => setNewAudienceForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full bg-editor-panel-bg border border-editor-border rounded-lg px-3 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent resize-none h-20"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowCreateAudience(false)} className="px-4 py-2 text-sm text-editor-text-secondary hover:text-editor-text-primary rounded-lg hover:bg-editor-border transition-colors">
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateAudience}
                                disabled={!newAudienceForm.name.trim()}
                                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm font-semibold hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Crear Audiencia
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== ADD REGISTERED USERS MODAL ===== */}
            {showAddUsers && selectedAudienceId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddUsers(false)}>
                    <div className="bg-editor-bg border border-editor-border rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-editor-text-primary flex items-center gap-2">
                                <UserPlus size={20} className="text-blue-400" /> Agregar Usuarios Registrados
                            </h3>
                            <button onClick={() => setShowAddUsers(false)} className="p-1 rounded-full hover:bg-editor-border">
                                <X size={18} />
                            </button>
                        </div>
                        <p className="text-sm text-editor-text-secondary mb-4">
                            Selecciona los usuarios de la plataforma para agregar a esta audiencia.
                        </p>
                        <div className="flex items-center gap-2 bg-editor-panel-bg border border-editor-border rounded-lg px-3 py-2 mb-3">
                            <Search size={14} className="text-editor-text-secondary" />
                            <input
                                type="text"
                                placeholder="Buscar por email o nombre..."
                                value={addUserSearch}
                                onChange={e => setAddUserSearch(e.target.value)}
                                className="flex-1 bg-transparent outline-none text-sm text-editor-text-primary placeholder:text-editor-text-secondary"
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar mb-4 min-h-0">
                            {allUsers.filter(u =>
                                (u.email?.toLowerCase().includes(addUserSearch.toLowerCase()) ||
                                 (u.displayName || u.name || '').toLowerCase().includes(addUserSearch.toLowerCase()))
                            ).map(u => (
                                <label key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-editor-panel-bg cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={addUserSelectedIds.includes(u.id)}
                                        onChange={() => setAddUserSelectedIds(prev =>
                                            prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]
                                        )}
                                        className="accent-editor-accent"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm text-editor-text-primary truncate">{u.displayName || u.name || 'Sin nombre'}</p>
                                        <p className="text-xs text-editor-text-secondary truncate">{u.email}</p>
                                    </div>
                                    <span className="text-[10px] px-1.5 py-0.5 bg-editor-accent/10 text-editor-accent rounded capitalize">{u.role || 'user'}</span>
                                </label>
                            ))}
                            {allUsers.filter(u =>
                                (u.email?.toLowerCase().includes(addUserSearch.toLowerCase()) ||
                                 (u.displayName || u.name || '').toLowerCase().includes(addUserSearch.toLowerCase()))
                            ).length === 0 && (
                                <p className="text-center py-6 text-sm text-editor-text-secondary">No se encontraron usuarios</p>
                            )}
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-editor-border">
                            <span className="text-xs text-editor-text-secondary">
                                {addUserSelectedIds.length} seleccionados de {allUsers.length} usuarios
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setAddUserSelectedIds(allUsers.filter(u =>
                                        (u.email?.toLowerCase().includes(addUserSearch.toLowerCase()) ||
                                         (u.displayName || u.name || '').toLowerCase().includes(addUserSearch.toLowerCase()))
                                    ).map(u => u.id))}
                                    className="px-3 py-1.5 text-xs text-editor-accent hover:bg-editor-accent/10 rounded-lg transition-colors"
                                >
                                    Seleccionar todos
                                </button>
                                <button
                                    onClick={() => {
                                        handleAddRegisteredUsers(selectedAudienceId!, addUserSelectedIds);
                                        setAddUserSelectedIds([]);
                                        setAddUserSearch('');
                                    }}
                                    disabled={addUserSelectedIds.length === 0}
                                    className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Agregar {addUserSelectedIds.length > 0 ? `(${addUserSelectedIds.length})` : ''}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== IMPORT CSV MODAL ===== */}
            {showImportCSV && selectedAudienceId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowImportCSV(false)}>
                    <div className="bg-editor-bg border border-editor-border rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-editor-text-primary flex items-center gap-2">
                                <Upload size={20} className="text-green-400" /> Importar Mailing List (CSV)
                            </h3>
                            <button onClick={() => setShowImportCSV(false)} className="p-1 rounded-full hover:bg-editor-border">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-editor-border rounded-xl p-8 text-center hover:border-editor-accent/50 transition-colors">
                                <Upload size={32} className="mx-auto text-editor-text-secondary mb-3 opacity-50" />
                                <p className="text-sm text-editor-text-primary mb-1">Arrastra un archivo CSV o haz click para seleccionar</p>
                                <p className="text-xs text-editor-text-secondary mb-4">Formato: email, nombre (una fila por contacto)</p>
                                <input
                                    type="file"
                                    accept=".csv,.txt"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleCSVUpload(selectedAudienceId, file);
                                    }}
                                    className="hidden"
                                    id="csv-upload-input"
                                />
                                <label
                                    htmlFor="csv-upload-input"
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors ${
                                        csvUploading
                                            ? 'bg-editor-border text-editor-text-secondary cursor-not-allowed'
                                            : 'bg-green-600 text-white hover:bg-green-700'
                                    }`}
                                >
                                    {csvUploading ? (
                                        <><Loader2 size={14} className="animate-spin" /> Importando...</>
                                    ) : (
                                        <><Upload size={14} /> Seleccionar CSV</>
                                    )}
                                </label>
                            </div>
                            <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-3">
                                <p className="text-xs font-semibold text-editor-text-secondary uppercase tracking-wider mb-2">Ejemplo de formato CSV:</p>
                                <pre className="text-xs text-editor-text-primary font-mono bg-editor-bg rounded p-2">
{`email,nombre
juan@ejemplo.com,Juan Pérez
maria@ejemplo.com,María López
pedro@ejemplo.com,Pedro García`}
                                </pre>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // =============================================================================
    // RENDER: ANALYTICS
    // =============================================================================

    const renderAnalytics = () => (
        <div className="space-y-6">
            {/* Main KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Emails Enviados', value: stats.totalSent.toLocaleString(), icon: <Send size={20} className="text-blue-400" />, bg: 'bg-blue-500/10' },
                    { label: 'Tasa de Apertura', value: `${stats.openRate}%`, icon: <Eye size={20} className="text-purple-400" />, bg: 'bg-purple-500/10', sub: `${stats.opened.toLocaleString()} abiertos` },
                    { label: 'Tasa de Click', value: `${stats.clickRate}%`, icon: <MousePointer size={20} className="text-amber-400" />, bg: 'bg-amber-500/10', sub: `${stats.clicked.toLocaleString()} clicks` },
                    { label: 'Tasa de Rebote', value: `${stats.bounceRate}%`, icon: <AlertCircle size={20} className="text-red-400" />, bg: 'bg-red-500/10', sub: `${stats.bounced.toLocaleString()} rebotados` },
                ].map((metric, i) => (
                    <div key={i} className="bg-editor-panel-bg border border-editor-border rounded-xl p-5">
                        <div className={`p-2 ${metric.bg} rounded-lg w-fit mb-3`}>{metric.icon}</div>
                        <p className="text-2xl font-bold text-editor-text-primary">{metric.value}</p>
                        <p className="text-sm text-editor-text-secondary">{metric.label}</p>
                        {metric.sub && <p className="text-xs text-editor-text-secondary mt-1">{metric.sub}</p>}
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Bar Chart */}
                <div className="lg:col-span-2 bg-editor-panel-bg border border-editor-border rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-editor-text-primary mb-4">Rendimiento Mensual</h3>
                    {monthlyData.some(d => d.sent > 0) ? (
                        <>
                            <div className="h-48 flex items-end gap-4 justify-between px-2">
                                {monthlyData.map((data, i) => {
                                    const maxSent = Math.max(...monthlyData.map(d => d.sent), 1);
                                    const height = (data.sent / maxSent) * 100;
                                    const openedHeight = data.sent > 0 ? (data.opened / data.sent) * height : 0;
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                            <div className="w-full flex flex-col gap-0.5 min-h-[4px]">
                                                <div className="w-full bg-editor-accent/80 rounded-t transition-all" style={{ height: `${Math.max(height * 1.5, data.sent > 0 ? 4 : 0)}px` }} />
                                                <div className="w-full bg-purple-500/60 rounded transition-all" style={{ height: `${Math.max(openedHeight * 1.5, data.opened > 0 ? 2 : 0)}px` }} />
                                            </div>
                                            <span className="text-xs text-editor-text-secondary">{data.month}</span>
                                            <span className="text-xs font-medium text-editor-text-primary">{data.sent}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex items-center justify-center gap-6 mt-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-editor-accent/80 rounded" />
                                    <span className="text-sm text-editor-text-secondary">Enviados</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-purple-500/60 rounded" />
                                    <span className="text-sm text-editor-text-secondary">Abiertos</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-editor-text-secondary">
                            <div className="text-center">
                                <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Sin datos para mostrar</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tenant Performance */}
                <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-editor-text-primary mb-4">Rendimiento por Tenant</h3>
                    {tenantPerformance.length > 0 ? (
                        <div className="space-y-4">
                            {tenantPerformance.map((tp, i) => (
                                <div key={i} className="p-3 bg-editor-bg/50 rounded-lg">
                                    <p className="text-sm font-medium text-editor-text-primary mb-2 truncate">{tp.name}</p>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div>
                                            <p className="text-editor-text-secondary">Envíos</p>
                                            <p className="text-editor-text-primary font-semibold">{tp.sent.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-editor-text-secondary">Aperturas</p>
                                            <p className="text-editor-text-primary font-semibold">{tp.opened.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-editor-text-secondary">Campañas</p>
                                            <p className="text-editor-text-primary font-semibold">{tp.campaigns}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-editor-text-secondary">
                            <Building2 size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Sin datos de tenants</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Additional Stats */}
            <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="text-green-500" size={20} />
                        <span className="text-editor-text-secondary text-sm">Tasa de Entrega</span>
                    </div>
                    <p className="text-2xl font-bold text-editor-text-primary">{stats.deliveryRate}%</p>
                    <p className="text-editor-text-secondary text-xs mt-1">
                        {stats.delivered.toLocaleString()} de {stats.totalSent.toLocaleString()} enviados
                    </p>
                </div>
                <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <AlertCircle className="text-amber-500" size={20} />
                        <span className="text-editor-text-secondary text-sm">Rebotes</span>
                    </div>
                    <p className="text-2xl font-bold text-editor-text-primary">{stats.bounced.toLocaleString()}</p>
                    <p className="text-editor-text-secondary text-xs mt-1">{stats.bounceRate}% del total</p>
                </div>
                <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <Layers className="text-indigo-500" size={20} />
                        <span className="text-editor-text-secondary text-sm">Total Campañas</span>
                    </div>
                    <p className="text-2xl font-bold text-editor-text-primary">{stats.totalCampaigns}</p>
                    <p className="text-editor-text-secondary text-xs mt-1">En {tenants.length} tenants</p>
                </div>
            </div>
        </div>
    );

    // =============================================================================
    // RENDER: AUTOMATIONS
    // =============================================================================

    const renderAutomations = () => (
        <div className="space-y-6">
            {/* Active Automations */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-editor-text-primary">Automatizaciones</h3>
                <button
                    onClick={() => setShowCreateAutomation(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-editor-accent text-white rounded-lg hover:bg-editor-accent/90 transition-colors text-sm font-medium"
                >
                    <Plus size={16} />
                    Nueva Automatización
                </button>
            </div>

            {automations.length > 0 && (
                <div className="space-y-3">
                    {automations.map(auto => {
                        const template = AUTOMATION_TEMPLATES.find(t => t.type === auto.type);
                        return (
                            <div key={auto.id} className="bg-editor-panel-bg border border-editor-border rounded-xl p-5 hover:border-editor-accent/30 transition-all">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-lg ${template?.color || 'text-gray-400 bg-gray-500/10'}`}>
                                            {template?.icon || <Zap size={24} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-editor-text-primary">{auto.name}</h4>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border ${getStatusColor(auto.status)}`}>
                                                    {getStatusIcon(auto.status)}
                                                    {auto.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-editor-text-secondary mt-1">
                                                Trigger: {auto.triggerConfig?.event || 'N/A'} • Delay: {formatDelay(auto.delayMinutes)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {/* Stats */}
                                        <div className="hidden md:flex items-center gap-4 text-xs text-editor-text-secondary mr-4">
                                            <div className="text-center">
                                                <p className="font-semibold text-editor-text-primary">{(auto.stats?.triggered || 0).toLocaleString()}</p>
                                                <p>Triggers</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="font-semibold text-editor-text-primary">{(auto.stats?.sent || 0).toLocaleString()}</p>
                                                <p>Enviados</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="font-semibold text-editor-text-primary">{(auto.stats?.opened || 0).toLocaleString()}</p>
                                                <p>Abiertos</p>
                                            </div>
                                        </div>
                                        {/* Actions */}
                                        <button
                                            onClick={() => toggleAutomationStatus(auto)}
                                            className={`p-2 rounded-lg transition-colors ${auto.status === 'active' ? 'text-yellow-400 hover:bg-yellow-500/10' : 'text-green-400 hover:bg-green-500/10'}`}
                                            title={auto.status === 'active' ? 'Pausar' : 'Activar'}
                                        >
                                            {auto.status === 'active' ? <Pause size={18} /> : <Play size={18} />}
                                        </button>
                                        <button
                                            onClick={() => deleteAutomation(auto.id)}
                                            className="p-2 text-editor-text-secondary hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Template Gallery */}
            <div>
                <h3 className="text-lg font-semibold text-editor-text-primary mb-4">Galería de Templates</h3>
                <p className="text-sm text-editor-text-secondary mb-4">
                    Crea automatizaciones pre-configuradas con un clic o personalízalas según tus necesidades.
                </p>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {AUTOMATION_TEMPLATES.map(template => (
                        <div
                            key={template.id}
                            className="bg-editor-panel-bg border border-editor-border rounded-xl p-5 hover:border-editor-accent/30 transition-all cursor-pointer group"
                            onClick={() => {
                                setSelectedTemplate(template);
                                setNewAutomation({
                                    name: template.name,
                                    subject: `${template.name} — Auto`,
                                    delayMinutes: template.defaultDelay,
                                    status: 'draft',
                                });
                                setShowCreateAutomation(true);
                            }}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className={`p-3 rounded-lg ${template.color}`}>
                                    {template.icon}
                                </div>
                                <span className={`px-2 py-0.5 text-[10px] rounded-full ${
                                    template.category === 'conversion' ? 'bg-green-500/20 text-green-400' :
                                    template.category === 'retention' ? 'bg-blue-500/20 text-blue-400' :
                                    template.category === 'engagement' ? 'bg-purple-500/20 text-purple-400' :
                                    'bg-pink-500/20 text-pink-400'
                                }`}>
                                    {template.category}
                                </span>
                            </div>
                            <h4 className="font-semibold text-editor-text-primary mb-1 group-hover:text-editor-accent transition-colors">
                                {template.name}
                            </h4>
                            <p className="text-xs text-editor-text-secondary line-clamp-2 mb-3">{template.description}</p>
                            <div className="flex items-center justify-between text-xs text-editor-text-secondary">
                                <span className="flex items-center gap-1">
                                    <Clock size={12} />
                                    Delay: {formatDelay(template.defaultDelay)}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Zap size={12} />
                                    {template.triggerEvent}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Create/Edit Automation Modal */}
            {showCreateAutomation && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-6 max-w-lg w-full shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                {selectedTemplate && (
                                    <div className={`p-2 rounded-lg ${selectedTemplate.color}`}>
                                        {selectedTemplate.icon}
                                    </div>
                                )}
                                <h2 className="text-xl font-bold text-editor-text-primary">
                                    {selectedTemplate ? `Crear: ${selectedTemplate.name}` : 'Nueva Automatización'}
                                </h2>
                            </div>
                            <button
                                onClick={() => { setShowCreateAutomation(false); setSelectedTemplate(null); }}
                                className="p-2 text-editor-text-secondary hover:text-editor-text-primary rounded-lg hover:bg-editor-bg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {selectedTemplate && (
                            <p className="text-sm text-editor-text-secondary mb-4">{selectedTemplate.description}</p>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-editor-text-secondary block mb-1.5 font-medium">Nombre</label>
                                <input
                                    type="text"
                                    value={newAutomation.name}
                                    onChange={e => setNewAutomation(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                    placeholder="Nombre de la automatización"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-editor-text-secondary block mb-1.5 font-medium">Asunto del Email</label>
                                <input
                                    type="text"
                                    value={newAutomation.subject}
                                    onChange={e => setNewAutomation(prev => ({ ...prev, subject: e.target.value }))}
                                    className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                    placeholder="Asunto del email"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-editor-text-secondary block mb-1.5 font-medium">
                                    Delay de Envío ({formatDelay(newAutomation.delayMinutes)})
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="86400"
                                    step="60"
                                    value={newAutomation.delayMinutes}
                                    onChange={e => setNewAutomation(prev => ({ ...prev, delayMinutes: parseInt(e.target.value) }))}
                                    className="w-full accent-editor-accent"
                                />
                                <div className="flex justify-between text-xs text-editor-text-secondary mt-1">
                                    <span>Inmediato</span>
                                    <span>60 días</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-editor-text-secondary block mb-1.5 font-medium">Estado Inicial</label>
                                <select
                                    value={newAutomation.status}
                                    onChange={e => setNewAutomation(prev => ({ ...prev, status: e.target.value as AutomationStatus }))}
                                    className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                >
                                    <option value="draft">Borrador</option>
                                    <option value="active">Activo</option>
                                    <option value="paused">Pausado</option>
                                </select>
                            </div>
                            {selectedTemplate && (
                                <div className="p-3 bg-editor-bg/50 rounded-lg border border-editor-border">
                                    <p className="text-xs text-editor-text-secondary">
                                        <span className="font-medium text-editor-text-primary">Trigger:</span> {selectedTemplate.triggerEvent}
                                    </p>
                                    <p className="text-xs text-editor-text-secondary mt-1">
                                        <span className="font-medium text-editor-text-primary">Categoría:</span> {selectedTemplate.category}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => { setShowCreateAutomation(false); setSelectedTemplate(null); }}
                                className="flex-1 px-4 py-2 text-editor-text-secondary hover:text-editor-text-primary transition-colors rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={createAutomation}
                                disabled={!newAutomation.name}
                                className="flex-1 px-4 py-2 bg-editor-accent text-white rounded-lg hover:bg-editor-accent/90 transition-colors disabled:opacity-50"
                            >
                                Crear Automatización
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // =============================================================================
    // RENDER: AI STUDIO
    // =============================================================================

    const renderAIStudio = () => (
        <div className="h-[calc(100vh-200px)] flex flex-col bg-editor-bg border border-editor-border rounded-2xl shadow-2xl overflow-hidden">

            {/* ===== HEADER ===== */}
            <div className="p-4 border-b border-editor-border flex items-center justify-between bg-gradient-to-r from-purple-500/10 via-blue-500/5 to-transparent">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="bg-gradient-to-br from-purple-500 to-blue-500 p-2.5 rounded-xl shadow-lg shadow-purple-500/20">
                            <Sparkles className="text-white w-5 h-5" />
                        </div>
                        {isVoiceActive && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-editor-bg animate-pulse" />
                        )}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-editor-text-primary flex items-center gap-2">
                            AI Email Studio
                            <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                                {isVoiceActive ? MODEL_VOICE.split('-').slice(-2).join('-') : MODEL_TEXT.split('-').slice(-2).join('-')}
                            </span>
                        </h2>
                        <p className="text-xs text-editor-text-secondary">
                            {isVoiceActive
                                ? '🎤 Sesión de voz activa — habla naturalmente'
                                : 'Planifica y crea campañas de email con IA'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            stopVoiceSession();
                            setAiMessages([]);
                            aiHistoryRef.current = [];
                            initAIStudio();
                        }}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 transition-colors"
                        title="Reiniciar conversación"
                    >
                        <RefreshCcw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ===== BODY ===== */}
            <div className="flex-1 flex overflow-hidden">

                {/* ===== LEFT: CONVERSATION PANEL ===== */}
                <div className="flex-1 flex flex-col min-w-0">

                    {/* Messages */}
                    <div ref={aiChatRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {aiMessages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white rounded-br-md'
                                    : 'bg-[#1e1b2e] border border-purple-500/15 text-gray-100 rounded-bl-md'
                                    }`}>
                                    {msg.isVoice && (
                                        <span className="inline-flex items-center gap-1 text-[10px] opacity-60 mb-1">
                                            <Volume2 className="w-3 h-3" /> Voz
                                        </span>
                                    )}
                                    <ReactMarkdown
                                        components={{
                                            p: ({ children }) => <p className="mb-2 last:mb-0 text-gray-100">{children}</p>,
                                            strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                                            ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1 text-gray-200">{children}</ul>,
                                            ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1 text-gray-200">{children}</ol>,
                                            li: ({ children }) => <li className="leading-relaxed text-gray-200">{children}</li>,
                                        }}
                                    >
                                        {msg.text}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        ))}

                        {aiThinking && (
                            <div className="flex justify-start">
                                <div className="bg-editor-panel-bg border border-editor-border rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2 text-sm text-editor-text-secondary">
                                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                                    Pensando...
                                </div>
                            </div>
                        )}

                        {aiCreating && (
                            <div className="flex justify-start">
                                <div className="bg-editor-panel-bg border border-green-500/30 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2 text-sm text-green-400">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creando {aiCreating === 'campaign' ? 'campaña' : aiCreating === 'audience' ? 'audiencia' : 'automatización'}...
                                </div>
                            </div>
                        )}

                        {/* Live Voice Transcription */}
                        {isVoiceActive && liveUserTranscript && (
                            <div className="flex justify-end animate-pulse">
                                <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed bg-purple-500/20 border border-purple-500/30 text-purple-200">
                                    <span className="inline-flex items-center gap-1.5 text-[10px] text-purple-400 mb-1">
                                        <Mic className="w-3 h-3" /> Hablando...
                                    </span>
                                    <p className="text-gray-100">{liveUserTranscript}</p>
                                </div>
                            </div>
                        )}
                        {isVoiceActive && liveModelTranscript && (
                            <div className="flex justify-start">
                                <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed bg-[#1e1b2e] border border-blue-500/20 text-gray-100">
                                    <span className="inline-flex items-center gap-1.5 text-[10px] text-blue-400 mb-1">
                                        <Volume2 className="w-3 h-3" /> Respondiendo...
                                    </span>
                                    <p className="text-gray-100">{liveModelTranscript}</p>
                                </div>
                            </div>
                        )}

                        {/* Created Items Log */}
                        {aiCreatedItems.length > 0 && (
                            <div className="border-t border-editor-border pt-4 mt-4">
                                <p className="text-xs text-editor-text-secondary font-medium mb-2">Recursos creados en esta sesión:</p>
                                <div className="space-y-1.5">
                                    {aiCreatedItems.map((item, i) => (
                                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-green-500/5 border border-green-500/20 rounded-lg">
                                            <CheckCircle size={12} className="text-green-400 flex-shrink-0" />
                                            <span className="text-xs text-editor-text-primary">
                                                {item.type === 'campaign' ? '📧' : item.type === 'audience' ? '👥' : '⚡'}
                                                {' '}{item.name}
                                            </span>
                                            <span className="text-[10px] text-editor-text-secondary ml-auto">{item.type}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Bar */}
                    <div className="p-3 border-t border-editor-border bg-editor-panel-bg/50">
                        <div className="flex items-end gap-2">
                            {/* Voice Toggle */}
                            {isVoiceActive ? (
                                <button
                                    onClick={stopVoiceSession}
                                    className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                                    title="Detener voz"
                                >
                                    <PhoneOff className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={startVoiceSession}
                                    disabled={isVoiceConnecting}
                                    className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-editor-border/40 text-editor-text-secondary hover:text-purple-400 hover:bg-purple-500/10 transition-all disabled:opacity-50"
                                    title="Iniciar voz (Gemini Live)"
                                >
                                    {isVoiceConnecting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Mic className="w-4 h-4" />
                                    )}
                                </button>
                            )}

                            {/* Text Input */}
                            <textarea
                                value={aiInput}
                                onChange={e => setAiInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        sendAIMessage(aiInput);
                                    }
                                }}
                                placeholder={isVoiceActive
                                    ? 'Sesión de voz activa — habla o escribe...'
                                    : 'Describe la campaña, audiencia o automatización que necesitas...'}
                                className="flex-1 bg-editor-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none min-h-[40px] max-h-[120px] text-editor-text-primary placeholder:text-editor-text-secondary/50"
                                rows={1}
                                disabled={!!aiCreating}
                            />

                            {/* Send */}
                            <button
                                onClick={() => sendAIMessage(aiInput)}
                                disabled={!aiInput.trim() || aiThinking || !!aiCreating}
                                className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 text-white hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-30 disabled:hover:shadow-none"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Voice Active Indicator */}
                        {isVoiceActive && (
                            <div className="mt-2 flex items-center justify-center gap-2 text-xs text-green-400">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                    Escuchando...
                                </span>
                                <span className="text-editor-text-secondary">•</span>
                                <span className="text-editor-text-secondary font-mono">
                                    {MODEL_VOICE.split('-').slice(1).join('-')}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ===== RIGHT: ACTION PANEL ===== */}
                <div className="w-72 border-l border-editor-border bg-editor-panel-bg/30 p-4 overflow-y-auto hidden lg:flex flex-col gap-4 custom-scrollbar">

                    {/* Quick Actions */}
                    <div>
                        <h4 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3">Acciones Rápidas</h4>
                        <div className="space-y-2">
                            <button
                                onClick={aiCreateCampaign}
                                disabled={!!aiCreating || aiMessages.length < 3}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {aiCreating === 'campaign' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                <div className="text-left">
                                    <div className="font-medium">Crear Campaña</div>
                                    <div className="text-[10px] text-blue-400/60">Genera desde la conversación</div>
                                </div>
                            </button>
                            <button
                                onClick={aiCreateAudience}
                                disabled={!!aiCreating || aiMessages.length < 3}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl hover:bg-purple-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {aiCreating === 'audience' ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                                <div className="text-left">
                                    <div className="font-medium">Crear Audiencia</div>
                                    <div className="text-[10px] text-purple-400/60">Segmento de contactos</div>
                                </div>
                            </button>
                            <button
                                onClick={aiCreateAutomation}
                                disabled={!!aiCreating || aiMessages.length < 3}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl hover:bg-amber-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {aiCreating === 'automation' ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                                <div className="text-left">
                                    <div className="font-medium">Crear Automatización</div>
                                    <div className="text-[10px] text-amber-400/60">Flujo de email automático</div>
                                </div>
                            </button>
                        </div>
                        {aiMessages.length < 3 && (
                            <p className="text-[10px] text-editor-text-secondary mt-2 text-center">
                                💬 Conversa primero para habilitar acciones
                            </p>
                        )}
                    </div>

                    {/* Session Stats */}
                    {aiCreatedItems.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Sesión</h4>
                            <div className="bg-green-500/5 border border-green-500/15 rounded-xl p-3">
                                <div className="flex items-center gap-2 text-green-400 text-sm font-medium mb-1">
                                    <CheckCircle size={14} />
                                    {aiCreatedItems.length} recurso{aiCreatedItems.length > 1 ? 's' : ''} creado{aiCreatedItems.length > 1 ? 's' : ''}
                                </div>
                                <div className="space-y-1 mt-2">
                                    {aiCreatedItems.map((item, i) => (
                                        <div key={i} className="text-[10px] text-editor-text-secondary flex items-center gap-1.5">
                                            <span>{item.type === 'campaign' ? '📧' : item.type === 'audience' ? '👥' : '⚡'}</span>
                                            <span className="truncate">{item.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tips */}
                    <div className="mt-auto">
                        <h4 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Sugerencias</h4>
                        <div className="space-y-1.5 text-[10px] text-editor-text-secondary">
                            <p>💡 "Crea una campaña de Black Friday con 20% de descuento"</p>
                            <p>💡 "Necesito una audiencia de clientes VIP"</p>
                            <p>💡 "Configura un flujo de bienvenida automático"</p>
                            <p>💡 Usa el 🎤 para hablar directamente con la IA</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // =============================================================================
    // MAIN RENDER
    // =============================================================================

    return (
        <div className="flex h-screen bg-editor-bg text-editor-text-primary">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-14 bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary md:hidden transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <Mail className="text-editor-accent w-5 h-5" />
                        <h1 className="text-lg font-semibold text-editor-text-primary">Email Marketing Hub</h1>
                        <span className="hidden sm:inline-flex px-2 py-0.5 text-xs font-semibold bg-green-500/20 text-green-400 rounded-full">
                            {tenants.length} tenants
                        </span>
                    </div>
                    <button
                        onClick={onBack}
                        className="hidden md:flex items-center gap-1.5 h-9 px-3 text-sm font-medium text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver
                    </button>
                </header>

                {/* Tab Navigation */}
                <div className="bg-editor-bg border-b border-editor-border px-4 sm:px-6 overflow-x-auto flex-shrink-0">
                    <div className="flex items-center gap-1 min-w-max">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'border-editor-accent text-editor-accent'
                                        : 'border-transparent text-editor-text-secondary hover:text-editor-text-primary'
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                                {tab.count !== undefined && tab.count > 0 && (
                                    <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                                        activeTab === tab.id
                                            ? 'bg-editor-accent/20 text-editor-accent'
                                            : 'bg-editor-border/50 text-editor-text-secondary'
                                    }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-24">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="w-8 h-8 text-editor-accent animate-spin" />
                                <span className="text-sm text-editor-text-secondary">Cargando datos de email de todos los tenants...</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'overview' && renderOverview()}
                            {activeTab === 'campaigns' && renderCampaigns()}
                            {activeTab === 'audiences' && renderAudiences()}
                            {activeTab === 'analytics' && renderAnalytics()}
                            {activeTab === 'automations' && renderAutomations()}
                            {activeTab === 'ai-studio' && renderAIStudio()}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
};

export default AdminEmailHub;
