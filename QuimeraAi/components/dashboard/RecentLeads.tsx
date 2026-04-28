/**
 * RecentLeads
 * Shows the most recent leads across all user projects on the Dashboard.
 * Rectangular cards with lead name, source, message snippet, and project name.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/core/AuthContext';
import { useProject } from '../../contexts/project';
import { useRouter } from '../../hooks/useRouter';
import { ROUTES } from '../../routes/config';
import {
    db,
    collection,
    getDocs,
    query,
    orderBy,
    limit,
} from '../../firebase';
import { Lead } from '../../types';
import {
    Users,
    ExternalLink,
    Loader2,
    MessageSquare,
    Phone,
    Mail,
    Globe,
    Bot,
    FileText,
    UserPlus,
    Linkedin,
    PhoneCall,
    Upload,
} from 'lucide-react';

interface RecentLeadsProps {
    maxItems?: number;
}

// Source display config
const SOURCE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    'chatbot': { label: 'Chatbot', icon: Bot, color: 'text-purple-400 bg-purple-500/10' },
    'chatbot-widget': { label: 'Widget', icon: MessageSquare, color: 'text-blue-400 bg-blue-500/10' },
    'contact-form': { label: 'Formulario', icon: FileText, color: 'text-green-400 bg-green-500/10' },
    'form': { label: 'Formulario', icon: FileText, color: 'text-green-400 bg-green-500/10' },
    'manual': { label: 'Manual', icon: UserPlus, color: 'text-gray-400 bg-gray-500/10' },
    'referral': { label: 'Referido', icon: Users, color: 'text-yellow-400 bg-yellow-500/10' },
    'linkedin': { label: 'LinkedIn', icon: Linkedin, color: 'text-blue-500 bg-blue-500/10' },
    'cold_call': { label: 'Llamada', icon: PhoneCall, color: 'text-orange-400 bg-orange-500/10' },
    'voice-call': { label: 'Llamada', icon: Phone, color: 'text-orange-400 bg-orange-500/10' },
    'quimera-chat': { label: 'Quimera Chat', icon: Bot, color: 'text-yellow-400 bg-yellow-500/10' },
    'import-csv': { label: 'CSV Import', icon: Upload, color: 'text-teal-400 bg-teal-500/10' },
    'import-excel': { label: 'Excel Import', icon: Upload, color: 'text-teal-400 bg-teal-500/10' },
};

interface DashboardLead extends Lead {
    projectName?: string;
}

const RecentLeads: React.FC<RecentLeadsProps> = ({ maxItems = 6 }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { projects, loadProject } = useProject();
    const { navigate } = useRouter();

    const [recentLeads, setRecentLeads] = useState<DashboardLead[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Get user projects (non-templates)
    const userProjects = useMemo(
        () => projects.filter(p => p.status !== 'Template'),
        [projects]
    );

    // Fetch recent leads across all projects
    useEffect(() => {
        if (!user || userProjects.length === 0) {
            setRecentLeads([]);
            setIsLoading(false);
            return;
        }

        let cancelled = false;
        const fetchLeads = async () => {
            setIsLoading(true);
            try {
                const allLeads: DashboardLead[] = [];

                // Fetch up to 5 recent leads per project (in parallel)
                const promises = userProjects.map(async (project) => {
                    try {
                        const leadsPath = `users/${user.uid}/projects/${project.id}/leads`;
                        const q = query(
                            collection(db, leadsPath),
                            orderBy('createdAt', 'desc'),
                            limit(5)
                        );
                        const snapshot = await getDocs(q);
                        return snapshot.docs.map(doc => ({
                            id: doc.id,
                            projectId: project.id,
                            projectName: project.name,
                            ...doc.data(),
                        } as DashboardLead));
                    } catch {
                        return [];
                    }
                });

                const results = await Promise.all(promises);
                results.forEach(leads => allLeads.push(...leads));

                // Sort all by createdAt descending and take top N
                allLeads.sort((a, b) => {
                    const aTime = a.createdAt?.seconds || 0;
                    const bTime = b.createdAt?.seconds || 0;
                    return bTime - aTime;
                });

                if (!cancelled) {
                    setRecentLeads(allLeads.slice(0, maxItems));
                    setIsLoading(false);
                }
            } catch (error) {
                console.error('[RecentLeads] Error fetching leads:', error);
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        fetchLeads();
        return () => { cancelled = true; };
    }, [user, userProjects, maxItems]);

    // Navigate to leads view for a specific project
    const handleOpenLeads = async (projectId: string, leadId: string) => {
        await loadProject(projectId, false, false);
        navigate(`${ROUTES.LEADS}?leadId=${leadId}`);
    };

    // Format date
    const formatDate = (timestamp: { seconds: number; nanoseconds: number } | undefined) => {
        if (!timestamp?.seconds) return '';
        const date = new Date(timestamp.seconds * 1000);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return t('common.justNow', 'Justo ahora');
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        return date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
    };

    // Get source config
    const getSource = (source: string) => {
        return SOURCE_CONFIG[source] || { label: source, icon: Globe, color: 'text-q-text-muted bg-secondary/50' };
    };

    // Status badge color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'contacted': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'qualified': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'negotiation': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'won': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'lost': return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-secondary/50 text-q-text-muted border-q-border';
        }
    };

    const statusLabel = (status: string) => {
        const labels: Record<string, string> = {
            'new': t('leads.status.new', 'Nuevo'),
            'contacted': t('leads.status.contacted', 'Contactado'),
            'qualified': t('leads.status.qualified', 'Calificado'),
            'negotiation': t('leads.status.negotiation', 'Negociación'),
            'won': t('leads.status.won', 'Ganado'),
            'lost': t('leads.status.lost', 'Perdido'),
        };
        return labels[status] || status;
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-primary" size={28} />
            </div>
        );
    }

    // Empty state
    if (recentLeads.length === 0) {
        return (
            <div className="text-center py-10 bg-q-surface/50 rounded-2xl border border-q-border">
                <Users className="mx-auto text-q-text-muted mb-3" size={36} />
                <p className="text-q-text-muted text-sm">
                    {t('dashboard.leads.empty', 'No hay leads recientes')}
                </p>
                <p className="text-q-text-muted/60 text-xs mt-1">
                    {t('dashboard.leads.emptyDesc', 'Los leads aparecerán aquí cuando los recibas')}
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentLeads.map(lead => {
                const sourceConfig = getSource(lead.source);
                const SourceIcon = sourceConfig.icon;

                return (
                    <div
                        key={`${lead.projectId}-${lead.id}`}
                        onClick={() => handleOpenLeads(lead.projectId, lead.id)}
                        className="group relative bg-q-surface/60 hover:bg-q-surface border border-q-border/50 hover:border-primary/30 rounded-xl p-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
                    >
                        {/* Top row: Name + Time */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                {/* Avatar circle */}
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-bold text-primary">
                                        {(lead.name || lead.email || '?')[0].toUpperCase()}
                                    </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-semibold text-foreground truncate">
                                        {lead.name || lead.email || t('leads.anonymous', 'Anónimo')}
                                    </h4>
                                    {lead.email && lead.name && (
                                        <p className="text-xs text-q-text-muted truncate flex items-center gap-1">
                                            <Mail size={10} className="flex-shrink-0" />
                                            {lead.email}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <span className="text-[10px] text-q-text-muted/70 flex-shrink-0 mt-1">
                                {formatDate(lead.createdAt)}
                            </span>
                        </div>

                        {/* Message / Notes snippet */}
                        {(lead.message || lead.notes) && (
                            <p className="text-xs text-q-text-muted line-clamp-2 mb-2.5 leading-relaxed">
                                {lead.message || lead.notes}
                            </p>
                        )}

                        {/* Bottom row: Source + Status + Project */}
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                                {/* Source badge */}
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${sourceConfig.color}`}>
                                    <SourceIcon size={10} />
                                    {sourceConfig.label}
                                </span>
                                {/* Status badge */}
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getStatusColor(lead.status)}`}>
                                    {statusLabel(lead.status)}
                                </span>
                            </div>
                            {/* Project name */}
                            <span className="text-[10px] text-q-text-muted/60 truncate max-w-[100px]" title={lead.projectName}>
                                {lead.projectName}
                            </span>
                        </div>

                        {/* Hover arrow */}
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ExternalLink size={14} className="text-primary" />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default RecentLeads;
