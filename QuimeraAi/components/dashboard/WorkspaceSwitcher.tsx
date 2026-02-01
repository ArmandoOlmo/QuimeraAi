/**
 * WorkspaceSwitcher
 * Component for switching between tenant workspaces
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Building2,
    ChevronDown,
    Check,
    Plus,
    Users,
    Crown,
    Shield,
    User,
} from 'lucide-react';
import { useTenant } from '../../contexts/tenant';
import {
    Tenant,
    TenantMembership,
    AgencyRole,
    AGENCY_ROLE_LABELS,
    AGENCY_ROLE_COLORS,
    TENANT_STATUS_COLORS,
} from '../../types/multiTenant';

interface WorkspaceSwitcherProps {
    collapsed?: boolean;
    className?: string;
    onCreateWorkspace?: () => void;
}

const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
    collapsed = false,
    className = '',
    onCreateWorkspace,
}) => {
    const { t } = useTranslation();
    const {
        currentTenant,
        userTenants,
        isLoadingTenant,
        switchTenant,
        currentRole,
    } = useTenant();

    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close dropdown on escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    const handleSwitchTenant = async (tenantId: string) => {
        if (tenantId === currentTenant?.id) {
            setIsOpen(false);
            return;
        }

        setIsLoading(true);
        try {
            await switchTenant(tenantId);
            setIsOpen(false);
        } catch (error) {
            console.error('Error switching tenant:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateWorkspace = () => {
        setIsOpen(false);
        onCreateWorkspace?.();
    };

    const getRoleIcon = (role: AgencyRole) => {
        switch (role) {
            case 'agency_owner':
                return <Crown size={12} className="text-yellow-500" />;
            case 'agency_admin':
                return <Shield size={12} className="text-purple-500" />;
            case 'agency_member':
                return <Users size={12} className="text-blue-500" />;
            case 'client':
                return <User size={12} className="text-green-500" />;
            default:
                return null;
        }
    };

    const getTenantInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // If no tenants at all, show a create workspace button
    if (!isLoadingTenant && userTenants.length === 0) {
        return (
            <button
                onClick={handleCreateWorkspace}
                className={`
                    flex items-center gap-2 w-full p-2 rounded-lg
                    bg-primary/10 border border-primary/30 border-dashed
                    text-primary hover:bg-primary/20 transition-colors
                    ${className}
                `}
            >
                <Plus size={18} />
                {!collapsed && (
                    <span className="text-sm font-medium">
                        {t('workspace.create', 'Crear Workspace')}
                    </span>
                )}
            </button>
        );
    }

    // Loading state
    if (isLoadingTenant) {
        return (
            <div className={`flex items-center gap-2 p-2 ${className}`}>
                <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
                {!collapsed && (
                    <div className="flex-1 space-y-1">
                        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                        <div className="h-3 w-12 bg-muted rounded animate-pulse" />
                    </div>
                )}
            </div>
        );
    }

    // Single tenant - no switcher needed, just show current
    if (userTenants.length === 1) {
        return (
            <div className={`flex items-center gap-2 p-2 ${className}`}>
                {/* Tenant avatar */}
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {currentTenant?.branding?.logoUrl ? (
                        <img
                            src={currentTenant.branding.logoUrl}
                            alt={currentTenant.name}
                            className="w-full h-full object-cover rounded-lg"
                        />
                    ) : (
                        getTenantInitials(currentTenant?.name || 'WS')
                    )}
                </div>
                {!collapsed && (
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                            {currentTenant?.name}
                        </p>
                        <div className="flex items-center gap-1">
                            {currentRole && getRoleIcon(currentRole)}
                            <span className="text-xs text-muted-foreground">
                                {currentRole ? AGENCY_ROLE_LABELS[currentRole] : ''}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Multiple tenants - show switcher
    return (
        <div ref={dropdownRef} className={`relative ${className}`}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isLoading}
                className={`
                    flex items-center gap-2 w-full p-2 rounded-lg
                    bg-card hover:bg-secondary/50 border border-border
                    transition-all duration-200
                    ${isOpen ? 'ring-2 ring-primary/50' : ''}
                    ${isLoading ? 'opacity-50 cursor-wait' : ''}
                `}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                {/* Tenant avatar */}
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0">
                    {currentTenant?.branding?.logoUrl ? (
                        <img
                            src={currentTenant.branding.logoUrl}
                            alt={currentTenant.name}
                            className="w-full h-full object-cover rounded-lg"
                        />
                    ) : (
                        getTenantInitials(currentTenant?.name || 'WS')
                    )}
                </div>

                {!collapsed && (
                    <>
                        <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm font-semibold text-foreground truncate">
                                {currentTenant?.name}
                            </p>
                            <div className="flex items-center gap-1">
                                {currentRole && getRoleIcon(currentRole)}
                                <span className="text-xs text-muted-foreground">
                                    {currentRole ? AGENCY_ROLE_LABELS[currentRole] : ''}
                                </span>
                            </div>
                        </div>
                        <ChevronDown
                            size={16}
                            className={`text-muted-foreground transition-transform duration-200 flex-shrink-0 ${
                                isOpen ? 'rotate-180' : ''
                            }`}
                        />
                    </>
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className={`
                        absolute z-50 mt-2 py-1
                        bg-popover border border-border rounded-xl shadow-xl
                        animate-in fade-in-0 zoom-in-95 duration-200
                        ${collapsed ? 'left-full ml-2 top-0' : 'left-0 right-0'}
                        ${collapsed ? 'w-64' : 'w-full'}
                    `}
                    role="listbox"
                >
                    {/* Header */}
                    <div className="px-3 py-2 border-b border-border">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t('workspace.selectWorkspace', 'Seleccionar Workspace')}
                        </p>
                    </div>

                    {/* Tenant List */}
                    <div className="max-h-64 overflow-y-auto py-1">
                        {userTenants.map((membership) => {
                            const tenant = membership.tenant;
                            const isActive = tenant?.id === currentTenant?.id;

                            return (
                                <button
                                    key={membership.id}
                                    onClick={() => tenant && handleSwitchTenant(tenant.id)}
                                    className={`
                                        flex items-center gap-3 w-full px-3 py-2.5
                                        hover:bg-secondary/50 transition-colors
                                        ${isActive ? 'bg-primary/10' : ''}
                                    `}
                                    role="option"
                                    aria-selected={isActive}
                                >
                                    {/* Tenant avatar */}
                                    <div className={`
                                        w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0
                                        ${isActive
                                            ? 'bg-gradient-to-br from-primary to-primary/80 shadow-md shadow-primary/30'
                                            : 'bg-gradient-to-br from-muted-foreground/60 to-muted-foreground/40'
                                        }
                                    `}>
                                        {tenant?.branding?.logoUrl ? (
                                            <img
                                                src={tenant.branding.logoUrl}
                                                alt={tenant.name}
                                                className="w-full h-full object-cover rounded-lg"
                                            />
                                        ) : (
                                            getTenantInitials(tenant?.name || 'WS')
                                        )}
                                    </div>

                                    {/* Tenant info */}
                                    <div className="flex-1 min-w-0 text-left">
                                        <p className={`text-sm font-medium truncate ${
                                            isActive ? 'text-primary' : 'text-foreground'
                                        }`}>
                                            {tenant?.name}
                                        </p>
                                        <div className="flex items-center gap-1.5">
                                            {getRoleIcon(membership.role)}
                                            <span className="text-xs text-muted-foreground">
                                                {AGENCY_ROLE_LABELS[membership.role]}
                                            </span>
                                            {tenant?.type === 'agency_client' && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
                                                    Cliente
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Active indicator */}
                                    {isActive && (
                                        <Check size={16} className="text-primary flex-shrink-0" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Create new workspace */}
                    {onCreateWorkspace && (
                        <>
                            <div className="border-t border-border my-1" />
                            <button
                                onClick={handleCreateWorkspace}
                                className="flex items-center gap-2 w-full px-3 py-2.5 text-primary hover:bg-primary/10 transition-colors"
                            >
                                <Plus size={18} />
                                <span className="text-sm font-medium">
                                    {t('workspace.createNew', 'Crear nuevo workspace')}
                                </span>
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default WorkspaceSwitcher;






