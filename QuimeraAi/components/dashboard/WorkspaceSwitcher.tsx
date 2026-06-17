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
    const emptyCreateButtonClasses = [
        'flex items-center gap-2 w-full p-2 rounded-lg',
        'bg-q-accent/10 border border-q-accent/30 border-dashed',
        'text-q-accent hover:bg-q-accent/20 transition-colors',
        className,
    ].filter(Boolean).join(' ');
    const loadingClasses = ['flex items-center gap-2 p-2', className].filter(Boolean).join(' ');
    const loadingIconClasses = 'w-8 h-8 rounded-lg bg-q-surface-overlay animate-pulse';
    const loadingTextWrapClasses = 'flex-1 space-y-1';
    const singleTenantClasses = ['flex items-center gap-2 p-2', className].filter(Boolean).join(' ');
    const tenantAvatarClasses = 'w-8 h-8 rounded-lg bg-gradient-to-br from-q-accent/80 to-q-accent flex items-center justify-center text-white text-xs font-bold shadow-sm';
    const triggerClasses = [
        'flex items-center gap-2 w-full p-2 rounded-lg',
        'bg-q-surface hover:bg-q-surface-elevated/50 border border-q-border',
        'transition-all duration-200',
        isOpen ? 'ring-2 ring-q-accent/50' : '',
        isLoading ? 'opacity-50 cursor-wait' : '',
    ].filter(Boolean).join(' ');
    const triggerAvatarClasses = `${tenantAvatarClasses} flex-shrink-0`;
    const triggerTextWrapClasses = 'flex-1 min-w-0 text-left';
    const tenantTextWrapClasses = 'flex-1 min-w-0';
    const triggerTitleClasses = 'text-sm font-semibold text-q-text truncate';
    const roleWrapClasses = 'flex items-center gap-1';
    const roleTextClasses = 'text-xs text-q-text-muted';
    const chevronClasses = [
        'text-q-text-muted transition-transform duration-200 flex-shrink-0',
        isOpen ? 'rotate-180' : '',
    ].filter(Boolean).join(' ');
    const dropdownClasses = [
        'absolute z-50 mt-2 py-1',
        'bg-q-surface-elevated border border-q-border rounded-xl shadow-xl',
        'animate-in fade-in-0 zoom-in-95 duration-200',
        collapsed ? 'left-full ml-2 top-0' : 'left-0 right-0',
        collapsed ? 'w-64' : 'w-full',
    ].join(' ');
    const dropdownHeaderClasses = 'px-3 py-2 border-b border-q-border';
    const dropdownHeaderTitleClasses = 'text-xs font-semibold text-q-text-muted uppercase tracking-wider';
    const listClasses = 'max-h-64 overflow-y-auto py-1';
    const workspaceItemClasses = (isActive: boolean) => [
        'flex items-center gap-3 w-full px-3 py-2.5',
        'hover:bg-q-surface-overlay/50 transition-colors',
        isActive ? 'bg-q-accent/10' : '',
    ].filter(Boolean).join(' ');
    const workspaceItemAvatarClasses = (isActive: boolean) => [
        'w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0',
        isActive
            ? 'bg-gradient-to-br from-q-accent to-q-accent/80 shadow-md shadow-q-accent/30'
            : 'bg-gradient-to-br from-q-text-muted/60 to-q-text-muted/40',
    ].join(' ');
    const workspaceItemTextClasses = 'flex-1 min-w-0 text-left';
    const workspaceItemTitleClasses = (isActive: boolean) => [
        'text-sm font-medium truncate',
        isActive ? 'text-q-accent' : 'text-q-text',
    ].join(' ');
    const workspaceMetaClasses = 'flex items-center gap-1.5';
    const clientBadgeClasses = 'text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500';
    const activeIndicatorClasses = 'text-q-accent flex-shrink-0';
    const dividerClasses = 'border-t border-q-border my-1';
    const actionButtonClasses = 'flex items-center gap-2 w-full px-3 py-2.5 text-q-accent hover:bg-q-accent/10 transition-colors';
    const actionLabelClasses = 'text-sm font-medium';

    // If no tenants at all, show a create workspace button
    if (!isLoadingTenant && userTenants.length === 0) {
        return (
            <button
                onClick={handleCreateWorkspace}
                className={emptyCreateButtonClasses}
            >
                <Plus size={18} />
                {!collapsed && (
                    <span className={actionLabelClasses}>
                        {t('workspace.create', 'Crear Workspace')}
                    </span>
                )}
            </button>
        );
    }

    // Loading state
    if (isLoadingTenant) {
        return (
            <div className={loadingClasses}>
                <div className={loadingIconClasses} />
                {!collapsed && (
                    <div className={loadingTextWrapClasses}>
                        <div className="h-4 w-20 bg-q-surface-overlay rounded animate-pulse" />
                        <div className="h-3 w-12 bg-q-surface-overlay rounded animate-pulse" />
                    </div>
                )}
            </div>
        );
    }

    // Single tenant - no switcher needed, just show current
    if (userTenants.length === 1) {
        return (
            <div className={singleTenantClasses}>
                {/* Tenant avatar */}
                <div className={tenantAvatarClasses}>
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
                    <div className={tenantTextWrapClasses}>
                        <p className={triggerTitleClasses}>
                            {currentTenant?.name}
                        </p>
                        <div className={roleWrapClasses}>
                            {currentRole && getRoleIcon(currentRole)}
                            <span className={roleTextClasses}>
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
                className={triggerClasses}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                {/* Tenant avatar */}
                <div className={triggerAvatarClasses}>
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
                        <div className={triggerTextWrapClasses}>
                            <p className={triggerTitleClasses}>
                                {currentTenant?.name}
                            </p>
                            <div className={roleWrapClasses}>
                                {currentRole && getRoleIcon(currentRole)}
                                <span className={roleTextClasses}>
                                    {currentRole ? AGENCY_ROLE_LABELS[currentRole] : ''}
                                </span>
                            </div>
                        </div>
                        <ChevronDown
                            size={16}
                            className={chevronClasses}
                        />
                    </>
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className={dropdownClasses}
                    role="listbox"
                >
                    {/* Header */}
                    <div className={dropdownHeaderClasses}>
                        <p className={dropdownHeaderTitleClasses}>
                            {t('workspace.selectWorkspace', 'Seleccionar Workspace')}
                        </p>
                    </div>

                    {/* Tenant List */}
                    <div className={listClasses}>
                        {userTenants.map((membership) => {
                            const tenant = membership.tenant;
                            const isActive = tenant?.id === currentTenant?.id;

                            return (
                                <button
                                    key={membership.id}
                                    onClick={() => tenant && handleSwitchTenant(tenant.id)}
                                    className={workspaceItemClasses(isActive)}
                                    role="option"
                                    aria-selected={isActive}
                                >
                                    {/* Tenant avatar */}
                                    <div className={workspaceItemAvatarClasses(isActive)}>
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
                                    <div className={workspaceItemTextClasses}>
                                        <p className={workspaceItemTitleClasses(isActive)}>
                                            {tenant?.name}
                                        </p>
                                        <div className={workspaceMetaClasses}>
                                            {getRoleIcon(membership.role)}
                                            <span className={roleTextClasses}>
                                                {AGENCY_ROLE_LABELS[membership.role]}
                                            </span>
                                            {tenant?.type === 'agency_client' && (
                                                <span className={clientBadgeClasses}>
                                                    Cliente
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Active indicator */}
                                    {isActive && (
                                        <Check size={16} className={activeIndicatorClasses} />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Create new workspace */}
                    {onCreateWorkspace && (
                        <>
                            <div className={dividerClasses} />
                            <button
                                onClick={handleCreateWorkspace}
                                className={actionButtonClasses}
                            >
                                <Plus size={18} />
                                <span className={actionLabelClasses}>
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





