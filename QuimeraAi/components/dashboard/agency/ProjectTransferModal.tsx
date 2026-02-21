/**
 * ProjectTransferModal
 * Modal to transfer a project to a sub-client
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    X,
    Send,
    Building2,
    CheckCircle2,
    AlertCircle,
    Loader2,
    FolderOutput,
    Globe,
} from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAgency } from '../../../contexts/agency/AgencyContext';
import { useTenant } from '../../../contexts/tenant';
import { Project } from '../../../types';
import { Tenant } from '../../../types/multiTenant';
import { toast } from 'react-hot-toast';

// ============================================================================
// TYPES
// ============================================================================

interface ProjectTransferModalProps {
    project: Project;
    isOpen: boolean;
    onClose: () => void;
    onTransferComplete?: (newProjectId: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProjectTransferModal({
    project,
    isOpen,
    onClose,
    onTransferComplete,
}: ProjectTransferModalProps) {
    const { t } = useTranslation();
    const { subClients, loadingClients } = useAgency();
    const { currentTenant } = useTenant();
    const functions = getFunctions();

    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [isTransferring, setIsTransferring] = useState(false);
    const [transferResult, setTransferResult] = useState<{
        success: boolean;
        newProjectId?: string;
        message?: string;
    } | null>(null);

    if (!isOpen) return null;

    const handleTransfer = async () => {
        if (!selectedClientId || !currentTenant) return;

        setIsTransferring(true);
        setTransferResult(null);

        try {
            const transferProject = httpsCallable(functions, 'agencyOnboarding-transferProject');

            const result = await transferProject({
                projectId: project.id,
                sourceTenantId: currentTenant.id,
                targetClientTenantId: selectedClientId,
            });

            const response = result.data as any;

            if (response.success) {
                setTransferResult({
                    success: true,
                    newProjectId: response.newProjectId,
                    message: response.message,
                });
                toast.success(
                    t('agency.transferSuccess', 'Proyecto transferido exitosamente')
                );
                onTransferComplete?.(response.newProjectId);
            }
        } catch (error: any) {
            console.error('Error transferring project:', error);
            setTransferResult({
                success: false,
                message: error.message || t('agency.transferError', 'Error al transferir el proyecto'),
            });
            toast.error(error.message || t('agency.transferError', 'Error al transferir el proyecto'));
        } finally {
            setIsTransferring(false);
        }
    };

    const handleClose = () => {
        setSelectedClientId(null);
        setTransferResult(null);
        setIsTransferring(false);
        onClose();
    };

    const selectedClient = subClients?.find((c: Tenant) => c.id === selectedClientId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <FolderOutput className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">
                                {t('agency.transferProject', 'Transferir Proyecto')}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {project.name}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {/* Transfer Result */}
                    {transferResult && (
                        <div className={`mb-6 p-4 rounded-xl border ${transferResult.success
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-red-500/10 border-red-500/30 text-red-400'
                            }`}>
                            <div className="flex items-center gap-2">
                                {transferResult.success ? (
                                    <CheckCircle2 size={18} />
                                ) : (
                                    <AlertCircle size={18} />
                                )}
                                <span className="text-sm font-medium">
                                    {transferResult.message}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Project Preview */}
                    <div className="mb-6 p-4 rounded-xl bg-secondary/30 border border-border/50">
                        <div className="flex items-center gap-3">
                            {project.thumbnailUrl ? (
                                <img
                                    src={project.thumbnailUrl}
                                    alt={project.name}
                                    className="h-12 w-16 rounded-lg object-cover border border-border/50"
                                />
                            ) : (
                                <div className="h-12 w-16 rounded-lg bg-secondary flex items-center justify-center border border-border/50">
                                    <Globe size={20} className="text-muted-foreground" />
                                </div>
                            )}
                            <div>
                                <p className="font-medium text-foreground">{project.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {project.status === 'Published' ? '🟢 Publicado' : '📝 Borrador'}
                                    {' · '}
                                    {project.pages && project.pages.length > 0
                                        ? `${project.pages.length} páginas`
                                        : '1 página'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Client Selection */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-3">
                            {t('agency.selectClient', 'Selecciona un cliente')}
                        </label>

                        {loadingClients ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : subClients && subClients.length > 0 ? (
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {subClients.map((client: Tenant) => (
                                    <button
                                        key={client.id}
                                        onClick={() => !transferResult?.success && setSelectedClientId(client.id)}
                                        disabled={isTransferring || transferResult?.success}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${selectedClientId === client.id
                                                ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                                                : 'border-border/50 hover:border-border hover:bg-secondary/30'
                                            } ${(isTransferring || transferResult?.success) ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    >
                                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${selectedClientId === client.id
                                                ? 'bg-primary/20 text-primary'
                                                : 'bg-secondary text-muted-foreground'
                                            }`}>
                                            <Building2 size={16} />
                                        </div>
                                        <div className="text-left flex-1 min-w-0">
                                            <p className="font-medium text-foreground text-sm truncate">
                                                {client.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {client.branding?.companyName || client.slug}
                                            </p>
                                        </div>
                                        {selectedClientId === client.id && (
                                            <CheckCircle2 size={18} className="text-primary shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <Building2 size={24} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">
                                    {t('agency.noClients', 'No tienes clientes registrados')}
                                </p>
                                <p className="text-xs mt-1">
                                    {t('agency.createClientFirst', 'Crea un cliente primero desde la pestaña "Nuevo Cliente"')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-secondary/20">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-secondary/50"
                    >
                        {transferResult?.success
                            ? t('common.close', 'Cerrar')
                            : t('common.cancel', 'Cancelar')
                        }
                    </button>
                    {!transferResult?.success && (
                        <button
                            onClick={handleTransfer}
                            disabled={!selectedClientId || isTransferring}
                            className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isTransferring ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    {t('agency.transferring', 'Transfiriendo...')}
                                </>
                            ) : (
                                <>
                                    <Send size={16} />
                                    {t('agency.transferToClient', 'Transferir a Cliente')}
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
