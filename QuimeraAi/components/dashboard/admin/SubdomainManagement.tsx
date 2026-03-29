/**
 * SubdomainManagement
 * SuperAdmin panel for managing all subdomains across the platform.
 * - List all claimed subdomains
 * - Search/filter by user, project, or status
 * - Suspend/reactivate subdomains
 * - Reserve system subdomains
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../firebase';
import AdminViewLayout from './AdminViewLayout';
import {
    Globe, Search, Shield, Trash2, Ban, CheckCircle,
    RefreshCw, Loader2, Plus, ExternalLink, Copy, AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { RESERVED_SUBDOMAINS } from '../../../services/subdomainService';

interface SubdomainEntry {
    id: string; // document ID = subdomain name
    userId: string;
    projectId: string | null;
    type: 'user' | 'agency' | 'tenant';
    status: 'active' | 'reserved' | 'suspended';
    createdAt: any;
    displayName?: string;
}

interface SubdomainManagementProps {
    onBack: () => void;
}

const SubdomainManagement: React.FC<SubdomainManagementProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const [subdomains, setSubdomains] = useState<SubdomainEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterType, setFilterType] = useState<string>('all');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Reserve modal state
    const [showReserveModal, setShowReserveModal] = useState(false);
    const [reserveName, setReserveName] = useState('');

    // Fetch all subdomains
    const fetchSubdomains = async () => {
        setLoading(true);
        try {
            const subdomainsRef = collection(db, 'subdomains');
            const q = query(subdomainsRef, orderBy('createdAt', 'desc'), limit(500));
            const snap = await getDocs(q);

            const entries: SubdomainEntry[] = snap.docs.map(d => ({
                id: d.id,
                ...d.data(),
            } as SubdomainEntry));

            setSubdomains(entries);
        } catch (err) {
            console.error('[SubdomainManagement] Error fetching:', err);
            toast.error('Error al cargar subdominios');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubdomains();
    }, []);

    // Filtered results
    const filtered = useMemo(() => {
        return subdomains.filter(s => {
            const matchesSearch = searchQuery === '' ||
                s.id.includes(searchQuery.toLowerCase()) ||
                s.userId?.includes(searchQuery) ||
                s.projectId?.includes(searchQuery);
            const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
            const matchesType = filterType === 'all' || s.type === filterType;
            return matchesSearch && matchesStatus && matchesType;
        });
    }, [subdomains, searchQuery, filterStatus, filterType]);

    // Suspend a subdomain
    const handleSuspend = async (subdomain: string) => {
        setActionLoading(subdomain);
        try {
            const ref = doc(db, 'subdomains', subdomain);
            await updateDoc(ref, { status: 'suspended', updatedAt: serverTimestamp() });
            setSubdomains(prev =>
                prev.map(s => s.id === subdomain ? { ...s, status: 'suspended' } : s)
            );
            toast.success(`Subdominio '${subdomain}' suspendido`);
        } catch (err) {
            toast.error('Error al suspender');
        } finally {
            setActionLoading(null);
        }
    };

    // Reactivate a subdomain
    const handleReactivate = async (subdomain: string) => {
        setActionLoading(subdomain);
        try {
            const ref = doc(db, 'subdomains', subdomain);
            await updateDoc(ref, { status: 'active', updatedAt: serverTimestamp() });
            setSubdomains(prev =>
                prev.map(s => s.id === subdomain ? { ...s, status: 'active' } : s)
            );
            toast.success(`Subdominio '${subdomain}' reactivado`);
        } catch (err) {
            toast.error('Error al reactivar');
        } finally {
            setActionLoading(null);
        }
    };

    // Delete a subdomain
    const handleDelete = async (subdomain: string) => {
        if (!confirm(`¿Eliminar el subdominio '${subdomain}'? Esta acción no se puede deshacer.`)) return;
        setActionLoading(subdomain);
        try {
            await deleteDoc(doc(db, 'subdomains', subdomain));
            setSubdomains(prev => prev.filter(s => s.id !== subdomain));
            toast.success(`Subdominio '${subdomain}' eliminado`);
        } catch (err) {
            toast.error('Error al eliminar');
        } finally {
            setActionLoading(null);
        }
    };

    // Reserve a subdomain
    const handleReserve = async () => {
        const name = reserveName.toLowerCase().trim();
        if (!name) return;

        try {
            const ref = doc(db, 'subdomains', name);
            await setDoc(ref, {
                userId: 'system',
                projectId: null,
                type: 'user',
                status: 'reserved',
                createdAt: serverTimestamp(),
            });
            setSubdomains(prev => [{
                id: name,
                userId: 'system',
                projectId: null,
                type: 'user',
                status: 'reserved',
                createdAt: new Date(),
            }, ...prev]);
            setReserveName('');
            setShowReserveModal(false);
            toast.success(`Subdominio '${name}' reservado`);
        } catch (err) {
            toast.error('Error al reservar');
        }
    };

    const handleCopy = (subdomain: string) => {
        navigator.clipboard.writeText(`https://${subdomain}.quimera.ai`);
        toast.success('URL copiada');
    };

    const statusColors: Record<string, string> = {
        active: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30',
        reserved: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
        suspended: 'bg-red-500/20 text-red-500 border-red-500/30',
    };

    const typeLabels: Record<string, string> = {
        user: 'Usuario',
        agency: 'Agencia',
        tenant: 'Tenant',
    };

    return (
        <AdminViewLayout
            title={t('superadmin.subdomainManagement', 'Gestión de Subdominios')}
            onBack={onBack}
        >
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-editor-panel-bg border border-editor-border">
                        <p className="text-2xl font-bold text-editor-text-primary">{subdomains.length}</p>
                        <p className="text-xs text-editor-text-secondary mt-1">Total Subdominios</p>
                    </div>
                    <div className="p-4 rounded-xl bg-editor-panel-bg border border-editor-border">
                        <p className="text-2xl font-bold text-emerald-400">
                            {subdomains.filter(s => s.status === 'active').length}
                        </p>
                        <p className="text-xs text-editor-text-secondary mt-1">Activos</p>
                    </div>
                    <div className="p-4 rounded-xl bg-editor-panel-bg border border-editor-border">
                        <p className="text-2xl font-bold text-amber-400">
                            {subdomains.filter(s => s.status === 'reserved').length}
                        </p>
                        <p className="text-xs text-editor-text-secondary mt-1">Reservados</p>
                    </div>
                    <div className="p-4 rounded-xl bg-editor-panel-bg border border-editor-border">
                        <p className="text-2xl font-bold text-red-400">
                            {subdomains.filter(s => s.status === 'suspended').length}
                        </p>
                        <p className="text-xs text-editor-text-secondary mt-1">Suspendidos</p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-editor-text-secondary" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Buscar por subdominio, userId o projectId..."
                            className="w-full pl-9 pr-4 py-2 text-sm bg-editor-panel-bg border border-editor-border rounded-lg text-editor-text-primary placeholder:text-editor-text-secondary focus:outline-none focus:ring-1 focus:ring-editor-accent"
                        />
                    </div>
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="px-3 py-2 text-sm bg-editor-panel-bg border border-editor-border rounded-lg text-editor-text-primary"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="active">Activos</option>
                        <option value="reserved">Reservados</option>
                        <option value="suspended">Suspendidos</option>
                    </select>
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        className="px-3 py-2 text-sm bg-editor-panel-bg border border-editor-border rounded-lg text-editor-text-primary"
                    >
                        <option value="all">Todos los tipos</option>
                        <option value="user">Usuario</option>
                        <option value="agency">Agencia</option>
                        <option value="tenant">Tenant</option>
                    </select>
                    <button
                        onClick={() => setShowReserveModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-editor-accent text-white rounded-lg hover:opacity-90 transition-opacity"
                    >
                        <Plus size={14} />
                        Reservar
                    </button>
                    <button
                        onClick={fetchSubdomains}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-editor-panel-bg border border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Reserved Words Info */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400 flex items-start gap-2">
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                    <div>
                        <strong>Subdominios protegidos por sistema:</strong>{' '}
                        {RESERVED_SUBDOMAINS.slice(0, 12).join(', ')}...
                        <span className="text-amber-500/70"> ({RESERVED_SUBDOMAINS.length} protegidos)</span>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={32} className="animate-spin text-editor-accent" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <Globe size={40} className="mx-auto mb-3 text-editor-text-secondary opacity-50" />
                        <p className="text-editor-text-secondary font-medium">
                            {searchQuery ? 'No hay resultados para esta búsqueda' : 'No hay subdominios registrados'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-editor-border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-editor-border bg-editor-panel-bg/50">
                                    <th className="text-left px-4 py-3 font-semibold text-editor-text-secondary">Subdominio</th>
                                    <th className="text-left px-4 py-3 font-semibold text-editor-text-secondary">Tipo</th>
                                    <th className="text-left px-4 py-3 font-semibold text-editor-text-secondary">Estado</th>
                                    <th className="text-left px-4 py-3 font-semibold text-editor-text-secondary">User ID</th>
                                    <th className="text-left px-4 py-3 font-semibold text-editor-text-secondary">Project ID</th>
                                    <th className="text-right px-4 py-3 font-semibold text-editor-text-secondary">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(entry => (
                                    <tr
                                        key={entry.id}
                                        className="border-b border-editor-border/50 hover:bg-editor-panel-bg/30 transition-colors"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Globe size={14} className="text-editor-accent flex-shrink-0" />
                                                <span className="font-medium text-editor-text-primary">
                                                    {entry.id}
                                                </span>
                                                <span className="text-editor-text-secondary text-xs">.quimera.ai</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs text-editor-text-secondary">
                                                {typeLabels[entry.type] || entry.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusColors[entry.status] || ''}`}>
                                                {entry.status === 'active' && <CheckCircle size={10} />}
                                                {entry.status === 'reserved' && <Shield size={10} />}
                                                {entry.status === 'suspended' && <Ban size={10} />}
                                                {entry.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs text-editor-text-secondary font-mono truncate max-w-[120px] block">
                                                {entry.userId === 'system' ? '—' : entry.userId?.slice(0, 12) + '...'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs text-editor-text-secondary font-mono truncate max-w-[120px] block">
                                                {entry.projectId?.slice(0, 12) + '...' || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleCopy(entry.id)}
                                                    className="p-1.5 rounded-md hover:bg-editor-border/40 text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                                                    title="Copiar URL"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                                <a
                                                    href={`https://${entry.id}.quimera.ai`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 rounded-md hover:bg-editor-border/40 text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                                                    title="Abrir"
                                                >
                                                    <ExternalLink size={14} />
                                                </a>
                                                {entry.status === 'active' ? (
                                                    <button
                                                        onClick={() => handleSuspend(entry.id)}
                                                        disabled={actionLoading === entry.id}
                                                        className="p-1.5 rounded-md hover:bg-red-500/20 text-editor-text-secondary hover:text-red-500 transition-colors disabled:opacity-50"
                                                        title="Suspender"
                                                    >
                                                        {actionLoading === entry.id ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                                                    </button>
                                                ) : entry.status === 'suspended' ? (
                                                    <button
                                                        onClick={() => handleReactivate(entry.id)}
                                                        disabled={actionLoading === entry.id}
                                                        className="p-1.5 rounded-md hover:bg-emerald-500/20 text-editor-text-secondary hover:text-emerald-500 transition-colors disabled:opacity-50"
                                                        title="Reactivar"
                                                    >
                                                        {actionLoading === entry.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                                    </button>
                                                ) : null}
                                                <button
                                                    onClick={() => handleDelete(entry.id)}
                                                    disabled={actionLoading === entry.id}
                                                    className="p-1.5 rounded-md hover:bg-red-500/20 text-editor-text-secondary hover:text-red-500 transition-colors disabled:opacity-50"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Reserve Modal */}
                {showReserveModal && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm">
                        <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-6 max-w-md w-full mx-4">
                            <h3 className="font-bold text-lg text-editor-text-primary mb-4 flex items-center gap-2">
                                <Shield size={18} className="text-editor-accent" />
                                Reservar Subdominio
                            </h3>
                            <input
                                type="text"
                                value={reserveName}
                                onChange={e => setReserveName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                placeholder="nombre-reservado"
                                className="w-full px-4 py-2.5 text-sm bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent mb-4"
                            />
                            {reserveName && (
                                <p className="text-xs text-editor-text-secondary mb-4">
                                    Se reservará: <span className="text-editor-accent font-medium">{reserveName}.quimera.ai</span>
                                </p>
                            )}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowReserveModal(false); setReserveName(''); }}
                                    className="flex-1 px-4 py-2 text-sm border border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleReserve}
                                    disabled={!reserveName}
                                    className="flex-1 px-4 py-2 text-sm bg-editor-accent text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    Reservar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminViewLayout>
    );
};

export default SubdomainManagement;
