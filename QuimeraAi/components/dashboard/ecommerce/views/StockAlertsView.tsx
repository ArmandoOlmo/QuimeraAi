/**
 * StockAlertsView
 * Vista para gestionar alertas de stock y notificaciones de clientes
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Bell,
    BellOff,
    Package,
    Search,
    Mail,
    Trash2,
    Loader2,
    AlertTriangle,
    Check,
    RefreshCw,
    Send,
    X,
} from 'lucide-react';
import { useAuth } from '../../../../contexts/core/AuthContext';
import { useProducts } from '../hooks/useProducts';
import {
    collection,
    query,
    getDocs,
    deleteDoc,
    doc,
    orderBy,
    onSnapshot,
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import { useEcommerceContext } from '../EcommerceDashboard';

interface StockNotificationSubscriber {
    id: string;
    productId: string;
    productName: string;
    productSlug: string;
    productImage?: string;
    email: string;
    notified: boolean;
    createdAt: { seconds: number };
}

const StockAlertsView: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { storeId } = useEcommerceContext();
    const { products } = useProducts(user?.uid || '', storeId);
    
    const [subscribers, setSubscribers] = useState<StockNotificationSubscriber[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterProduct, setFilterProduct] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Load subscribers
    useEffect(() => {
        if (!user?.uid) return;

        setIsLoading(true);

        const subscribersRef = collection(db, 'publicStores', storeId, 'stockNotifications');
        const q = query(subscribersRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    ...doc.data(),
                    id: doc.id,
                })) as StockNotificationSubscriber[];
                setSubscribers(data);
                setIsLoading(false);
            },
            (err) => {
                console.error('Error loading stock notifications:', err);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user?.uid, storeId]);

    // Get low stock products
    const lowStockProducts = products.filter(
        (p) => p.trackInventory && p.quantity <= (p.lowStockThreshold || 5) && p.quantity > 0
    );

    const outOfStockProducts = products.filter(
        (p) => p.trackInventory && p.quantity === 0
    );

    // Filter subscribers
    const filteredSubscribers = subscribers.filter((sub) => {
        const matchesSearch =
            !searchTerm ||
            sub.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sub.productName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesProduct = !filterProduct || sub.productId === filterProduct;
        return matchesSearch && matchesProduct;
    });

    // Group by product
    const subscribersByProduct = filteredSubscribers.reduce((acc, sub) => {
        if (!acc[sub.productId]) {
            acc[sub.productId] = {
                productName: sub.productName,
                productImage: sub.productImage,
                subscribers: [],
            };
        }
        acc[sub.productId].subscribers.push(sub);
        return acc;
    }, {} as Record<string, { productName: string; productImage?: string; subscribers: StockNotificationSubscriber[] }>);

    // Delete subscriber
    const handleDelete = async (subscriberId: string) => {
        if (!confirm(t('ecommerce.confirmDeleteSubscriber', '¿Eliminar esta suscripción?'))) return;

        setProcessingId(subscriberId);
        try {
            await deleteDoc(doc(db, 'publicStores', storeId, 'stockNotifications', subscriberId));
        } catch (err) {
            console.error('Error deleting subscriber:', err);
        }
        setProcessingId(null);
    };

    // Format date
    const formatDate = (timestamp: { seconds: number }) => {
        return new Date(timestamp.seconds * 1000).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">
                        {t('ecommerce.stockAlerts', 'Alertas de Stock')}
                    </h2>
                    <p className="text-muted-foreground">
                        {t('ecommerce.stockAlertsDesc', 'Gestiona productos con bajo stock y notificaciones de clientes')}
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-card/50 rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-500/20 rounded-lg">
                            <AlertTriangle className="text-yellow-400" size={20} />
                        </div>
                        <div>
                            <p className="text-muted-foreground text-sm">Bajo Stock</p>
                            <p className="text-2xl font-bold text-foreground">{lowStockProducts.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-card/50 rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/20 rounded-lg">
                            <Package className="text-red-400" size={20} />
                        </div>
                        <div>
                            <p className="text-muted-foreground text-sm">Agotados</p>
                            <p className="text-2xl font-bold text-foreground">{outOfStockProducts.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-card/50 rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                            <Bell className="text-primary" size={20} />
                        </div>
                        <div>
                            <p className="text-muted-foreground text-sm">Suscriptores</p>
                            <p className="text-2xl font-bold text-foreground">{subscribers.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Low Stock Products */}
            {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
                <div className="bg-card/50 rounded-xl border border-border overflow-hidden">
                    <div className="p-4 border-b border-border">
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                            <AlertTriangle className="text-yellow-400" size={18} />
                            {t('ecommerce.stockWarnings', 'Productos con Stock Bajo')}
                        </h3>
                    </div>
                    <div className="divide-y divide-border">
                        {outOfStockProducts.map((product) => (
                            <div key={product.id} className="p-4 flex items-center gap-4 bg-red-500/5">
                                <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                                    {product.images?.[0]?.url ? (
                                        <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Package className="text-muted-foreground" size={20} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-foreground truncate">{product.name}</p>
                                    <p className="text-sm text-red-500 font-medium">Agotado</p>
                                </div>
                                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded-full">
                                    0 unidades
                                </span>
                            </div>
                        ))}
                        {lowStockProducts.map((product) => (
                            <div key={product.id} className="p-4 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                                    {product.images?.[0]?.url ? (
                                        <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Package className="text-muted-foreground" size={20} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-foreground truncate">{product.name}</p>
                                    <p className="text-sm text-yellow-500">Bajo stock</p>
                                </div>
                                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full">
                                    {product.quantity} unidades
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Notification Subscribers */}
            <div className="bg-card/50 rounded-xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                            <Bell className="text-primary" size={18} />
                            {t('ecommerce.notificationSubscribers', 'Suscriptores de Notificaciones')}
                        </h3>
                        <div className="flex gap-2">
                            <div className="flex items-center gap-2 bg-editor-border/40 rounded-lg px-3 py-1.5">
                                <Search className="w-4 h-4 text-editor-text-secondary flex-shrink-0" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar..."
                                    className="flex-1 bg-transparent outline-none text-sm min-w-0"
                                />
                                {searchTerm && (
                                    <button onClick={() => setSearchTerm('')} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {subscribers.length === 0 ? (
                    <div className="p-8 text-center">
                        <BellOff className="mx-auto text-muted-foreground mb-4" size={48} />
                        <h4 className="text-lg font-medium text-foreground mb-2">
                            {t('ecommerce.noSubscribers', 'Sin suscriptores')}
                        </h4>
                        <p className="text-muted-foreground">
                            {t('ecommerce.noSubscribersDesc', 'Cuando los clientes se suscriban a notificaciones de stock, aparecerán aquí')}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {Object.entries(subscribersByProduct).map(([productId, data]) => (
                            <div key={productId} className="p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                                        {data.productImage ? (
                                            <img src={data.productImage} alt={data.productName} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Package className="text-muted-foreground" size={16} />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground">{data.productName}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {data.subscribers.length} suscriptor{data.subscribers.length !== 1 ? 'es' : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-2 pl-13">
                                    {data.subscribers.map((sub) => (
                                        <div
                                            key={sub.id}
                                            className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Mail className="text-muted-foreground" size={14} />
                                                <span className="text-sm text-foreground">{sub.email}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    · {formatDate(sub.createdAt)}
                                                </span>
                                                {sub.notified && (
                                                    <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                                                        Notificado
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleDelete(sub.id)}
                                                disabled={processingId === sub.id}
                                                className="p-1.5 text-muted-foreground hover:text-destructive rounded transition-colors disabled:opacity-50"
                                            >
                                                {processingId === sub.id ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : (
                                                    <Trash2 size={14} />
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockAlertsView;
