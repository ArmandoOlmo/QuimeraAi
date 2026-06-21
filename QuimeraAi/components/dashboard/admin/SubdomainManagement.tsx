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
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc, serverTimestamp, query, orderBy, limit } from '@/utils/compatData';
import { db } from '@/utils/compatData';
import AdminViewLayout from './AdminViewLayout';
import {
    Globe, Search, Shield, Trash2, Ban, CheckCircle,
    RefreshCw, Loader2, Plus, ExternalLink, Copy, AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { RESERVED_SUBDOMAINS } from '../../../services/subdomainService';
import { CatalogFilterBar, FilterChipRow } from '../filters';

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

    const statusCounts = useMemo(() => ({
        all: subdomains.length,
        active: subdomains.filter((s) => s.status === 'active').length,
        reserved: subdomains.filter((s) => s.status === 'reserved').length,
        suspended: subdomains.filter((s) => s.status === 'suspended').length,
    }), [subdomains]);

    const typeCounts = useMemo(() => ({
        all: subdomains.length,
        user: subdomains.filter((s) => s.type === 'user').length,
        agency: subdomains.filter((s) => s.type === 'agency').length,
        tenant: subdomains.filter((s) => s.type === 'tenant').length,
    }), [subdomains]);

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
        active: 'bg-q-success/20 text-q-success border-q-success/30',
        reserved: 'bg-q-accent/20 text-q-accent border-q-accent/30',
        suspended: 'bg-q-error/20 text-q-error border-q-error/30',
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
                    <div className="p-4 rounded-xl bg-q-surface border border-q-border">
                        <p className="text-2xl font-bold text-q-text">{subdomains.length}</p>
                        <p className="text-xs text-q-text-secondary mt-1">Total Subdominios</p>
                    </div>
                    <div className="p-4 rounded-xl bg-q-surface border border-q-border">
                        <p className="text-2xl font-bold text-q-success">
                            {subdomains.filter(s => s.status === 'active').length}
                        </p>
                        <p className="text-xs text-q-text-secondary mt-1">Activos</p>
                    </div>
                    <div className="p-4 rounded-xl bg-q-surface border border-q-border">
                        <p className="text-2xl font-bold text-q-accent">
                            {subdomains.filter(s => s.status === 'reserved').length}
                        </p>
                        <p className="text-xs text-q-text-secondary mt-1">Reservados</p>
                    </div>
                    <div className="p-4 rounded-xl bg-q-surface border border-q-border">
                        <p className="text-2xl font-bold text-q-error">
                            {subdomains.filter(s => s.status === 'suspended').length}
                        </p>
                        <p className="text-xs text-q-text-secondary mt-1">Suspendidos</p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-q-text-secondary" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Buscar por subdominio, userId o projectId..."
                            className="w-full pl-9 pr-4 py-2 text-sm bg-q-surface border border-q-border rounded-lg text-q-text placeholder:text-q-text-secondary focus:outline-none focus:ring-1 focus:ring-q-accent"
                        />
                    </div>
                    <CatalogFilterBar
                        className="mb-0"
                        filters={
                            <>
                                <FilterChipRow
                                    options={[
                                        { id: 'all', label: 'Todos los estados', count: statusCounts.all },
                                        { id: 'active', label: 'Activos', count: statusCounts.active, color: 'green' },
                                        { id: 'reserved', label: 'Reservados', count: statusCounts.reserved },
                                        { id: 'suspended', label: 'Suspendidos', count: statusCounts.suspended, color: 'gray' },
                                    ]}
                                    value={filterStatus}
                                    onChange={setFilterStatus}
                                />
                                <FilterChipRow
                                    options={[
                                        { id: 'all', label: 'Todos los tipos', count: typeCounts.all },
                                        { id: 'user', label: 'Usuario', count: typeCounts.user },
                                        { id: 'agency', label: 'Agencia', count: typeCounts.agency },
                                        { id: 'tenant', label: 'Tenant', count: typeCounts.tenant },
                                    ]}
                                    value={filterType}
                                    onChange={setFilterType}
                                />
                            </>
                        }
                    />
                    <button
                        onClick={() => setShowReserveModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-q-accent text-q-text-on-accent rounded-lg hover:opacity-90 transition-opacity"
                    >
                        <Plus size={14} />
                        Reservar
                    </button>
                    <button
                        onClick={fetchSubdomains}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-q-surface border border-q-border rounded-lg text-q-text-secondary hover:text-q-text transition-colors"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Reserved Words Info */}
                <div className="p-3 bg-q-accent/10 border border-q-accent/20 rounded-lg text-xs text-q-accent flex items-start gap-2">
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                    <div>
                        <strong>Subdominios protegidos por sistema:</strong>{' '}
                        {RESERVED_SUBDOMAINS.slice(0, 12).join(', ')}...
                        <span className="text-q-accent/70"> ({RESERVED_SUBDOMAINS.length} protegidos)</span>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={32} className="animate-spin text-q-accent" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <Globe size={40} className="mx-auto mb-3 text-q-text-secondary opacity-50" />
                        <p className="text-q-text-secondary font-medium">
                            {searchQuery ? 'No hay resultados para esta búsqueda' : 'No hay subdominios registrados'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-q-border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-q-border bg-q-surface/50">
                                    <th className="text-left px-4 py-3 font-semibold text-q-text-secondary">Subdominio</th>
                                    <th className="text-left px-4 py-3 font-semibold text-q-text-secondary">Tipo</th>
                                    <th className="text-left px-4 py-3 font-semibold text-q-text-secondary">Estado</th>
                                    <th className="text-left px-4 py-3 font-semibold text-q-text-secondary">User ID</th>
                                    <th className="text-left px-4 py-3 font-semibold text-q-text-secondary">Project ID</th>
                                    <th className="text-right px-4 py-3 font-semibold text-q-text-secondary">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(entry => (
                                    <tr
                                        key={entry.id}
                                        className="border-b border-q-border/50 hover:bg-q-surface/30 transition-colors"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Globe size={14} className="text-q-accent flex-shrink-0" />
                                                <span className="font-medium text-q-text">
                                                    {entry.id}
                                                </span>
                                                <span className="text-q-text-secondary text-xs">.quimera.ai</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs text-q-text-secondary">
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
                                            <span className="text-xs text-q-text-secondary font-mono truncate max-w-[120px] block">
                                                {entry.userId === 'system' ? '—' : entry.userId?.slice(0, 12) + '...'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs text-q-text-secondary font-mono truncate max-w-[120px] block">
                                                {entry.projectId?.slice(0, 12) + '...' || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleCopy(entry.id)}
                                                    className="p-1.5 rounded-md hover:bg-q-surface-overlay/40 text-q-text-secondary hover:text-q-text transition-colors"
                                                    title="Copiar URL"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                                <a
                                                    href={`https://${entry.id}.quimera.ai`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 rounded-md hover:bg-q-surface-overlay/40 text-q-text-secondary hover:text-q-text transition-colors"
                                                    title="Abrir"
                                                >
                                                    <ExternalLink size={14} />
                                                </a>
                                                {entry.status === 'active' ? (
                                                    <button
                                                        onClick={() => handleSuspend(entry.id)}
                                                        disabled={actionLoading === entry.id}
                                                        className="p-1.5 rounded-md hover:bg-q-error/20 text-q-text-secondary hover:text-q-error transition-colors disabled:opacity-50"
                                                        title="Suspender"
                                                    >
                                                        {actionLoading === entry.id ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                                                    </button>
                                                ) : entry.status === 'suspended' ? (
                                                    <button
                                                        onClick={() => handleReactivate(entry.id)}
                                                        disabled={actionLoading === entry.id}
                                                        className="p-1.5 rounded-md hover:bg-q-success/20 text-q-text-secondary hover:text-q-success transition-colors disabled:opacity-50"
                                                        title="Reactivar"
                                                    >
                                                        {actionLoading === entry.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                                    </button>
                                                ) : null}
                                                <button
                                                    onClick={() => handleDelete(entry.id)}
                                                    disabled={actionLoading === entry.id}
                                                    className="p-1.5 rounded-md hover:bg-q-error/20 text-q-text-secondary hover:text-q-error transition-colors disabled:opacity-50"
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
                    <div className="fixed inset-0 bg-q-text/60 z-50 flex items-center justify-center backdrop-blur-sm">
                        <div className="bg-q-surface border border-q-border rounded-xl p-6 max-w-md w-full mx-4">
                            <h3 className="font-bold text-lg text-q-text mb-4 flex items-center gap-2">
                                <Shield size={18} className="text-q-accent" />
                                Reservar Subdominio
                            </h3>
                            <input
                                type="text"
                                value={reserveName}
                                onChange={e => setReserveName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                placeholder="nombre-reservado"
                                className="w-full px-4 py-2.5 text-sm bg-q-bg border border-q-border rounded-lg text-q-text focus:outline-none focus:ring-1 focus:ring-q-accent mb-4"
                            />
                            {reserveName && (
                                <p className="text-xs text-q-text-secondary mb-4">
                                    Se reservará: <span className="text-q-accent font-medium">{reserveName}.quimera.ai</span>
                                </p>
                            )}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowReserveModal(false); setReserveName(''); }}
                                    className="flex-1 px-4 py-2 text-sm border border-q-border rounded-lg text-q-text-secondary hover:text-q-text transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleReserve}
                                    disabled={!reserveName}
                                    className="flex-1 px-4 py-2 text-sm bg-q-accent text-q-text-on-accent rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
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
