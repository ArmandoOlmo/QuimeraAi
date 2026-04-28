/**
 * SubdomainConfigModal
 * Modal for agencies to configure a subdomain for a specific project.
 * Allows setting/changing the subdomain name and previewing the URL.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/core/AuthContext';
import Modal from '../../ui/Modal';
import { Project } from '../../../types';
import { Globe, CheckCircle, XCircle, Loader2, Copy, ExternalLink } from 'lucide-react';
import {
    validateUsernameFormat,
    validateUsername,
    claimSubdomain,
    getSubdomainRecord,
} from '../../../services/subdomainService';
import { toast } from 'react-hot-toast';

interface SubdomainConfigModalProps {
    project: Project;
    isOpen: boolean;
    onClose: () => void;
    onSubdomainSet?: (subdomain: string) => void;
}

export function SubdomainConfigModal({
    project,
    isOpen,
    onClose,
    onSubdomainSet,
}: SubdomainConfigModalProps) {
    const { t } = useTranslation();
    const { user } = useAuth();

    const [subdomain, setSubdomain] = useState('');
    const [error, setError] = useState('');
    const [isValid, setIsValid] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [existingSubdomain, setExistingSubdomain] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Check for existing subdomain on the project
    useEffect(() => {
        if (!isOpen || !project.id) return;

        const checkExisting = async () => {
            try {
                // Check if project already has a subdomain by looking in Firestore
                const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
                const { db } = await import('../../../firebase');
                const subdomainsRef = collection(db, 'subdomains');
                const q = query(
                    subdomainsRef,
                    where('projectId', '==', project.id),
                    where('type', '==', 'agency'),
                    limit(1)
                );
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const existingSub = snap.docs[0].id;
                    setExistingSubdomain(existingSub);
                    setSubdomain(existingSub);
                    setIsValid(true);
                }
            } catch (err) {
                console.error('[SubdomainConfigModal] Error checking existing:', err);
            }
        };

        checkExisting();
    }, [isOpen, project.id]);

    // Debounced validation
    const handleChange = useCallback((value: string) => {
        const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
        setSubdomain(normalized);
        setError('');
        setIsValid(false);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!normalized) {
            setIsChecking(false);
            return;
        }

        if (normalized === existingSubdomain) {
            setIsValid(true);
            setIsChecking(false);
            return;
        }

        const formatCheck = validateUsernameFormat(normalized);
        if (!formatCheck.valid) {
            setError(formatCheck.error || '');
            setIsChecking(false);
            return;
        }

        setIsChecking(true);
        debounceRef.current = setTimeout(async () => {
            const result = await validateUsername(normalized, user?.uid);
            setIsChecking(false);
            if (result.valid) {
                setIsValid(true);
                setError('');
            } else {
                setIsValid(false);
                setError(result.error || '');
            }
        }, 600);
    }, [user?.uid, existingSubdomain]);

    const handleSave = async () => {
        if (!user || !subdomain || !isValid) return;
        setIsSaving(true);

        try {
            const result = await claimSubdomain(subdomain, user.uid, project.id, 'agency');
            if (result.success) {
                toast.success(t('agency.subdomainSaved', 'Subdominio configurado correctamente'));
                setExistingSubdomain(subdomain);
                onSubdomainSet?.(subdomain);
                onClose();
            } else {
                setError(result.error || 'Error al configurar subdominio');
            }
        } catch (err: any) {
            setError(err.message || 'Error inesperado');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(`https://${subdomain}.quimera.ai`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
            <div className="p-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Globe size={20} className="text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-foreground">
                            {t('agency.configureSubdomain', 'Configurar Subdominio')}
                        </h2>
                        <p className="text-sm text-q-text-muted truncate max-w-[250px]">
                            {project.name}
                        </p>
                    </div>
                </div>

                {/* Input */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-foreground mb-2">
                        {t('agency.subdomainName', 'Nombre del subdominio')}
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={subdomain}
                            onChange={e => handleChange(e.target.value)}
                            placeholder="nombre-cliente"
                            maxLength={30}
                            className={`w-full px-4 py-3 pr-10 rounded-xl border outline-none transition-all text-foreground bg-secondary/30 ${
                                error
                                    ? 'border-red-500/50 focus:ring-2 focus:ring-red-500/30'
                                    : isValid && subdomain
                                        ? 'border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/30'
                                        : 'border-q-border focus:ring-2 focus:ring-primary/50'
                            }`}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {isChecking && <Loader2 size={16} className="animate-spin text-q-text-muted" />}
                            {!isChecking && isValid && subdomain && <CheckCircle size={16} className="text-emerald-500" />}
                            {!isChecking && error && <XCircle size={16} className="text-red-500" />}
                        </div>
                    </div>

                    {/* Preview */}
                    {subdomain && !error && (
                        <div className="mt-2 flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg">
                            <Globe size={12} className="text-primary flex-shrink-0" />
                            <span className="text-xs text-foreground font-medium truncate flex-1">
                                {subdomain}.quimera.ai
                            </span>
                            {existingSubdomain === subdomain && (
                                <>
                                    <button
                                        onClick={handleCopy}
                                        className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                                    >
                                        {copied ? <CheckCircle size={10} /> : <Copy size={10} />}
                                        {copied ? 'Copiado' : 'Copiar'}
                                    </button>
                                    <a
                                        href={`https://${subdomain}.quimera.ai`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-q-text-muted hover:text-foreground"
                                    >
                                        <ExternalLink size={12} />
                                    </a>
                                </>
                            )}
                        </div>
                    )}

                    {error && (
                        <p className="mt-1.5 text-xs text-red-500">{error}</p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-q-border text-foreground bg-q-bg hover:bg-secondary transition-colors"
                    >
                        {t('common.cancel', 'Cancelar')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!isValid || isSaving || subdomain === existingSubdomain}
                        className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Globe size={16} />
                        )}
                        {isSaving
                            ? t('common.saving', 'Guardando...')
                            : existingSubdomain
                                ? t('agency.updateSubdomain', 'Actualizar')
                                : t('agency.setSubdomain', 'Configurar')
                        }
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export default SubdomainConfigModal;
