/**
 * ClientPermissionsEditor
 * Allows agencies to configure what their clients can access and do
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Shield,
    Save,
    Loader2,
    Check,
    FolderKanban,
    Users,
    FileText,
    ShoppingBag,
    Upload,
    Globe,
    BarChart3,
    CreditCard,
    Settings,
    Download,
    MessageSquare,
    AlertCircle,
} from 'lucide-react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';

interface ClientPermissions {
    canManageProjects: boolean;
    canManageLeads: boolean;
    canManageCMS: boolean;
    canManageEcommerce: boolean;
    canManageFiles: boolean;
    canManageDomains: boolean;
    canViewAnalytics: boolean;
    canManageBilling: boolean;
    canManageSettings: boolean;
    canExportData: boolean;
    canAccessChat: boolean;
    canInviteUsers: boolean;
}

interface ClientPermissionsEditorProps {
    clientTenantId: string;
    clientName: string;
    onClose?: () => void;
}

const PERMISSION_CONFIG = [
    {
        key: 'canManageProjects' as keyof ClientPermissions,
        icon: FolderKanban,
        label: 'Gestionar Proyectos',
        description: 'Crear, editar y eliminar proyectos',
        category: 'core',
    },
    {
        key: 'canManageLeads' as keyof ClientPermissions,
        icon: Users,
        label: 'Gestionar Leads',
        description: 'Ver y gestionar leads capturados',
        category: 'core',
    },
    {
        key: 'canManageCMS' as keyof ClientPermissions,
        icon: FileText,
        label: 'Gestionar CMS',
        description: 'Crear y editar contenido del sitio',
        category: 'core',
    },
    {
        key: 'canManageEcommerce' as keyof ClientPermissions,
        icon: ShoppingBag,
        label: 'E-Commerce',
        description: 'Gestionar productos y pedidos',
        category: 'extended',
    },
    {
        key: 'canManageFiles' as keyof ClientPermissions,
        icon: Upload,
        label: 'Gestionar Archivos',
        description: 'Subir y organizar archivos',
        category: 'core',
    },
    {
        key: 'canManageDomains' as keyof ClientPermissions,
        icon: Globe,
        label: 'Dominios',
        description: 'Configurar dominios personalizados',
        category: 'extended',
    },
    {
        key: 'canViewAnalytics' as keyof ClientPermissions,
        icon: BarChart3,
        label: 'Ver Analytics',
        description: 'Acceso a métricas y reportes',
        category: 'core',
    },
    {
        key: 'canManageBilling' as keyof ClientPermissions,
        icon: CreditCard,
        label: 'Facturación',
        description: 'Ver y gestionar facturación',
        category: 'admin',
    },
    {
        key: 'canManageSettings' as keyof ClientPermissions,
        icon: Settings,
        label: 'Configuración',
        description: 'Modificar configuración del workspace',
        category: 'admin',
    },
    {
        key: 'canExportData' as keyof ClientPermissions,
        icon: Download,
        label: 'Exportar Datos',
        description: 'Descargar datos y reportes',
        category: 'extended',
    },
    {
        key: 'canAccessChat' as keyof ClientPermissions,
        icon: MessageSquare,
        label: 'Chat de Soporte',
        description: 'Acceso al chat con la agencia',
        category: 'core',
    },
    {
        key: 'canInviteUsers' as keyof ClientPermissions,
        icon: Users,
        label: 'Invitar Usuarios',
        description: 'Invitar usuarios a su workspace',
        category: 'admin',
    },
];

const DEFAULT_PERMISSIONS: ClientPermissions = {
    canManageProjects: true,
    canManageLeads: true,
    canManageCMS: true,
    canManageEcommerce: true,
    canManageFiles: true,
    canManageDomains: false,
    canViewAnalytics: true,
    canManageBilling: false,
    canManageSettings: false,
    canExportData: false,
    canAccessChat: true,
    canInviteUsers: false,
};

export function ClientPermissionsEditor({ 
    clientTenantId, 
    clientName,
    onClose 
}: ClientPermissionsEditorProps) {
    const [permissions, setPermissions] = useState<ClientPermissions>(DEFAULT_PERMISSIONS);
    const [originalPermissions, setOriginalPermissions] = useState<ClientPermissions>(DEFAULT_PERMISSIONS);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    // Load current permissions
    useEffect(() => {
        async function loadPermissions() {
            setIsLoading(true);
            setError(null);

            try {
                const tenantDoc = await getDoc(doc(db, 'tenants', clientTenantId));
                
                if (tenantDoc.exists()) {
                    const data = tenantDoc.data();
                    const loadedPermissions = data.clientPermissions || DEFAULT_PERMISSIONS;
                    setPermissions(loadedPermissions);
                    setOriginalPermissions(loadedPermissions);
                }
            } catch (err) {
                console.error('Error loading permissions:', err);
                setError('Error al cargar los permisos');
            }

            setIsLoading(false);
        }

        loadPermissions();
    }, [clientTenantId]);

    const hasChanges = JSON.stringify(permissions) !== JSON.stringify(originalPermissions);

    const handleToggle = (key: keyof ClientPermissions) => {
        setPermissions((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
        setSaved(false);
    };

    const handleSelectPreset = (preset: 'minimal' | 'standard' | 'full') => {
        switch (preset) {
            case 'minimal':
                setPermissions({
                    canManageProjects: true,
                    canManageLeads: true,
                    canManageCMS: false,
                    canManageEcommerce: false,
                    canManageFiles: true,
                    canManageDomains: false,
                    canViewAnalytics: true,
                    canManageBilling: false,
                    canManageSettings: false,
                    canExportData: false,
                    canAccessChat: true,
                    canInviteUsers: false,
                });
                break;
            case 'standard':
                setPermissions(DEFAULT_PERMISSIONS);
                break;
            case 'full':
                setPermissions({
                    canManageProjects: true,
                    canManageLeads: true,
                    canManageCMS: true,
                    canManageEcommerce: true,
                    canManageFiles: true,
                    canManageDomains: true,
                    canViewAnalytics: true,
                    canManageBilling: true,
                    canManageSettings: true,
                    canExportData: true,
                    canAccessChat: true,
                    canInviteUsers: true,
                });
                break;
        }
        setSaved(false);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);

        try {
            await updateDoc(doc(db, 'tenants', clientTenantId), {
                clientPermissions: permissions,
                updatedAt: serverTimestamp(),
            });

            setOriginalPermissions(permissions);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            console.error('Error saving permissions:', err);
            setError('Error al guardar los permisos');
        }

        setIsSaving(false);
    };

    const groupedPermissions = {
        core: PERMISSION_CONFIG.filter((p) => p.category === 'core'),
        extended: PERMISSION_CONFIG.filter((p) => p.category === 'extended'),
        admin: PERMISSION_CONFIG.filter((p) => p.category === 'admin'),
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">
                                Permisos de Cliente
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {clientName}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {hasChanges && (
                            <span className="text-xs text-yellow-500">
                                • Cambios sin guardar
                            </span>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !hasChanges}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : saved ? (
                                <Check className="w-4 h-4" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {saved ? 'Guardado' : 'Guardar'}
                        </button>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="mt-4 flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}
            </div>

            {/* Presets */}
            <div className="p-4 border-b border-border bg-muted/30">
                <p className="text-sm text-muted-foreground mb-2">Presets rápidos:</p>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleSelectPreset('minimal')}
                        className="px-3 py-1.5 text-xs rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                    >
                        Mínimo
                    </button>
                    <button
                        onClick={() => handleSelectPreset('standard')}
                        className="px-3 py-1.5 text-xs rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                    >
                        Estándar
                    </button>
                    <button
                        onClick={() => handleSelectPreset('full')}
                        className="px-3 py-1.5 text-xs rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                    >
                        Completo
                    </button>
                </div>
            </div>

            {/* Permissions List */}
            <div className="p-6 space-y-6">
                {/* Core Permissions */}
                <div>
                    <h4 className="text-sm font-medium text-foreground mb-3">
                        Permisos Básicos
                    </h4>
                    <div className="space-y-2">
                        {groupedPermissions.core.map((perm) => (
                            <PermissionToggle
                                key={perm.key}
                                icon={perm.icon}
                                label={perm.label}
                                description={perm.description}
                                enabled={permissions[perm.key]}
                                onToggle={() => handleToggle(perm.key)}
                            />
                        ))}
                    </div>
                </div>

                {/* Extended Permissions */}
                <div>
                    <h4 className="text-sm font-medium text-foreground mb-3">
                        Permisos Extendidos
                    </h4>
                    <div className="space-y-2">
                        {groupedPermissions.extended.map((perm) => (
                            <PermissionToggle
                                key={perm.key}
                                icon={perm.icon}
                                label={perm.label}
                                description={perm.description}
                                enabled={permissions[perm.key]}
                                onToggle={() => handleToggle(perm.key)}
                            />
                        ))}
                    </div>
                </div>

                {/* Admin Permissions */}
                <div>
                    <h4 className="text-sm font-medium text-foreground mb-3">
                        Permisos de Administración
                    </h4>
                    <div className="space-y-2">
                        {groupedPermissions.admin.map((perm) => (
                            <PermissionToggle
                                key={perm.key}
                                icon={perm.icon}
                                label={perm.label}
                                description={perm.description}
                                enabled={permissions[perm.key]}
                                onToggle={() => handleToggle(perm.key)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Toggle component for individual permissions
interface PermissionToggleProps {
    icon: React.ElementType;
    label: string;
    description: string;
    enabled: boolean;
    onToggle: () => void;
}

function PermissionToggle({ 
    icon: Icon, 
    label, 
    description, 
    enabled, 
    onToggle 
}: PermissionToggleProps) {
    return (
        <motion.div
            whileTap={{ scale: 0.98 }}
            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                enabled
                    ? 'bg-primary/5 border border-primary/20'
                    : 'bg-secondary/50 border border-transparent hover:border-border'
            }`}
            onClick={onToggle}
        >
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    enabled ? 'bg-primary/10' : 'bg-secondary'
                }`}>
                    <Icon className={`w-4 h-4 ${
                        enabled ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                </div>
                <div>
                    <p className={`text-sm font-medium ${
                        enabled ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                        {label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {description}
                    </p>
                </div>
            </div>

            {/* Toggle switch */}
            <div className={`w-10 h-6 rounded-full p-1 transition-colors ${
                enabled ? 'bg-primary' : 'bg-muted'
            }`}>
                <motion.div
                    layout
                    className="w-4 h-4 rounded-full bg-white shadow-sm"
                    animate={{ x: enabled ? 16 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
            </div>
        </motion.div>
    );
}

export default ClientPermissionsEditor;
