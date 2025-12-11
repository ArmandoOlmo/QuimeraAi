/**
 * DemoDataSeeder Component
 * Componente para poblar la tienda con datos de prueba
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Sparkles,
    Package,
    FolderTree,
    Settings,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Zap,
    XCircle,
    Copy,
    ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../../../contexts/core/AuthContext';
import { useEcommerceContext } from '../EcommerceDashboard';
import {
    seedDemoStore,
    seedCategories,
    seedProducts,
    seedStoreSettings,
    DEMO_CATEGORIES,
    DEMO_PRODUCTS,
    DEMO_STORE_SETTINGS,
} from '../../../../scripts/seedDemoStore';

interface SeedStep {
    id: string;
    label: string;
    icon: React.ElementType;
    status: 'pending' | 'loading' | 'success' | 'error';
    count?: number;
}

interface DemoDataSeederProps {
    onComplete?: () => void;
    onClose?: () => void;
}

const DemoDataSeeder: React.FC<DemoDataSeederProps> = ({ onComplete, onClose }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { storeId, projectName } = useEcommerceContext();
    
    const [isSeeding, setIsSeeding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [steps, setSteps] = useState<SeedStep[]>([
        {
            id: 'categories',
            label: t('ecommerce.seedCategories', 'Crear categorías'),
            icon: FolderTree,
            status: 'pending',
            count: DEMO_CATEGORIES.length,
        },
        {
            id: 'products',
            label: t('ecommerce.seedProducts', 'Crear productos'),
            icon: Package,
            status: 'pending',
            count: DEMO_PRODUCTS.length,
        },
        {
            id: 'settings',
            label: t('ecommerce.seedSettings', 'Configurar tienda'),
            icon: Settings,
            status: 'pending',
        },
    ]);

    const updateStepStatus = (stepId: string, status: SeedStep['status']) => {
        setSteps((prev) =>
            prev.map((step) =>
                step.id === stepId ? { ...step, status } : step
            )
        );
    };

    const handleSeedStore = async () => {
        if (!user?.uid || !storeId) {
            setError('No se pudo identificar la tienda');
            return;
        }

        setIsSeeding(true);
        setError(null);

        try {
            // Step 1: Categories
            updateStepStatus('categories', 'loading');
            const categoryMap = await seedCategories(user.uid, storeId);
            updateStepStatus('categories', 'success');

            // Step 2: Products
            updateStepStatus('products', 'loading');
            await seedProducts(user.uid, storeId, DEMO_PRODUCTS, categoryMap);
            updateStepStatus('products', 'success');

            // Step 3: Settings
            updateStepStatus('settings', 'loading');
            await seedStoreSettings(user.uid, storeId);
            updateStepStatus('settings', 'success');

            // Complete
            setTimeout(() => {
                onComplete?.();
            }, 1000);

        } catch (err: any) {
            console.error('Error seeding store:', err);
            setError(err.message || 'Error desconocido');
            
            // Mark current loading step as error
            setSteps((prev) =>
                prev.map((step) =>
                    step.status === 'loading' ? { ...step, status: 'error' } : step
                )
            );
        } finally {
            setIsSeeding(false);
        }
    };

    const getStatusIcon = (status: SeedStep['status'], Icon: React.ElementType) => {
        switch (status) {
            case 'loading':
                return <Loader2 className="animate-spin text-primary" size={20} />;
            case 'success':
                return <CheckCircle2 className="text-green-500" size={20} />;
            case 'error':
                return <XCircle className="text-red-500" size={20} />;
            default:
                return <Icon className="text-muted-foreground" size={20} />;
        }
    };

    const allComplete = steps.every((step) => step.status === 'success');

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 p-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/30 rounded-xl">
                        <Sparkles className="text-primary" size={28} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">
                            {t('ecommerce.demoDataTitle', 'Datos de Demostración')}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {projectName && (
                                <span>
                                    {t('ecommerce.seedFor', 'Para')}: <strong>{projectName}</strong>
                                </span>
                            )}
                        </p>
                        {storeId && (
                            <div className="flex items-center gap-2 mt-1">
                                <code className="text-xs bg-black/20 px-2 py-0.5 rounded text-muted-foreground">
                                    ID: {storeId}
                                </code>
                                <button
                                    onClick={() => navigator.clipboard.writeText(storeId)}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                    title={t('common.copyId', 'Copiar ID')}
                                >
                                    <Copy size={12} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                <p className="text-muted-foreground mb-6">
                    {t(
                        'ecommerce.demoDataDescription',
                        'Llena tu tienda con productos de ejemplo para ver cómo funciona. Incluye categorías, productos con imágenes y configuración básica.'
                    )}
                </p>

                {/* What's included */}
                <div className="bg-muted/30 rounded-lg p-4 mb-6">
                    <p className="text-sm font-medium text-foreground mb-3">
                        {t('ecommerce.includes', 'Incluye')}:
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <FolderTree size={16} className="text-secondary" />
                            <span>{DEMO_CATEGORIES.length} categorías</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Package size={16} className="text-primary" />
                            <span>{DEMO_PRODUCTS.length} productos</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Settings size={16} className="text-orange-400" />
                            <span>Configuración completa</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Zap size={16} className="text-yellow-400" />
                            <span>Imágenes de muestra</span>
                        </div>
                    </div>
                </div>

                {/* Steps */}
                <div className="space-y-3 mb-6">
                    {steps.map((step) => {
                        const Icon = step.icon;
                        return (
                            <div
                                key={step.id}
                                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                    step.status === 'loading'
                                        ? 'border-primary bg-primary/5'
                                        : step.status === 'success'
                                        ? 'border-green-500/30 bg-green-500/5'
                                        : step.status === 'error'
                                        ? 'border-red-500/30 bg-red-500/5'
                                        : 'border-border'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    {getStatusIcon(step.status, Icon)}
                                    <span className={`text-sm font-medium ${
                                        step.status === 'success' ? 'text-green-500' :
                                        step.status === 'error' ? 'text-red-500' :
                                        step.status === 'loading' ? 'text-primary' :
                                        'text-foreground'
                                    }`}>
                                        {step.label}
                                    </span>
                                </div>
                                {step.count && (
                                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                        {step.count}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm mb-4">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                {/* Success */}
                {allComplete && (
                    <div className="space-y-3 mb-4">
                        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
                            <CheckCircle2 size={18} />
                            <span>
                                {t('ecommerce.seedComplete', '¡Tienda poblada exitosamente!')}
                            </span>
                        </div>
                        
                        {/* Store URL */}
                        <div className="p-3 bg-muted/50 rounded-lg border border-border">
                            <p className="text-xs text-muted-foreground mb-2">
                                {t('ecommerce.storeUrl', 'URL de tu tienda')}:
                            </p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 text-sm bg-background px-3 py-2 rounded border border-border text-primary truncate">
                                    {window.location.origin}/store/{storeId}
                                </code>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/store/${storeId}`);
                                    }}
                                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                                    title={t('common.copy', 'Copiar')}
                                >
                                    <Copy size={16} className="text-muted-foreground" />
                                </button>
                                <a
                                    href={`/store/${storeId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                                    title={t('common.openInNewTab', 'Abrir en nueva pestaña')}
                                >
                                    <ExternalLink size={16} className="text-muted-foreground" />
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    {!allComplete ? (
                        <>
                            <button
                                onClick={handleSeedStore}
                                disabled={isSeeding}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                {isSeeding ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        {t('ecommerce.seeding', 'Creando datos...')}
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} />
                                        {t('ecommerce.seedStore', 'Llenar Tienda')}
                                    </>
                                )}
                            </button>
                            {onClose && (
                                <button
                                    onClick={onClose}
                                    disabled={isSeeding}
                                    className="px-4 py-3 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/70 transition-colors disabled:opacity-50"
                                >
                                    {t('common.cancel', 'Cancelar')}
                                </button>
                            )}
                        </>
                    ) : (
                        <button
                            onClick={onClose || onComplete}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                        >
                            <CheckCircle2 size={18} />
                            {t('ecommerce.viewProducts', 'Ver Productos')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DemoDataSeeder;
