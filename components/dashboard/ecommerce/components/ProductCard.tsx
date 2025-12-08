/**
 * ProductCard
 * Tarjeta de producto para mostrar en la grilla
 * Usa clases de Tailwind del tema (bg-primary, text-primary, etc.)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Edit,
    Trash2,
    Eye,
    EyeOff,
    AlertTriangle,
    Image as ImageIcon,
} from 'lucide-react';
import { Product } from '../../../../types/ecommerce';

interface ProductCardProps {
    product: Product;
    categoryName: string;
    onEdit: () => void;
    onDelete: () => void;
    onToggleStatus: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
    product,
    categoryName,
    onEdit,
    onDelete,
    onToggleStatus,
}) => {
    const { t } = useTranslation();

    const isLowStock = product.trackInventory && product.quantity <= (product.lowStockThreshold || 5);
    const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
    const discountPercentage = hasDiscount
        ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)
        : 0;

    return (
        <div className="bg-card/50 rounded-xl border border-border overflow-hidden hover:border-primary/50 transition-colors group">
            {/* Image */}
            <div className="relative aspect-square">
                {product.images && product.images.length > 0 ? (
                    <img
                        src={product.images[0].url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                        <ImageIcon className="text-muted-foreground" size={48} />
                    </div>
                )}

                {/* Status Badge */}
                {product.status !== 'active' && (
                    <div className="absolute top-2 left-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            product.status === 'draft'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-muted text-muted-foreground'
                        }`}>
                            {product.status === 'draft' ? 'Borrador' : 'Archivado'}
                        </span>
                    </div>
                )}

                {/* Discount Badge */}
                {hasDiscount && (
                    <div className="absolute top-2 right-2">
                        <span className="px-2 py-1 bg-destructive text-destructive-foreground rounded-full text-xs font-bold">
                            -{discountPercentage}%
                        </span>
                    </div>
                )}

                {/* Low Stock Warning */}
                {isLowStock && (
                    <div className="absolute bottom-2 left-2">
                        <span className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs">
                            <AlertTriangle size={12} />
                            {product.quantity} en stock
                        </span>
                    </div>
                )}

                {/* Quick Actions Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                        onClick={onEdit}
                        className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
                    >
                        <Edit size={18} />
                    </button>
                    <button
                        onClick={onToggleStatus}
                        className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
                    >
                        {product.status === 'active' ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-2 bg-white/20 hover:bg-destructive/50 text-white rounded-full transition-colors"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="text-foreground font-medium truncate" title={product.name}>
                    {product.name}
                </h3>

                <p className="text-muted-foreground text-sm mb-2">{categoryName}</p>

                <div className="flex items-center justify-between">
                    <div>
                        <span className="font-bold text-primary">
                            ${product.price.toFixed(2)}
                        </span>
                        {hasDiscount && (
                            <span className="text-muted-foreground text-sm line-through ml-2">
                                ${product.compareAtPrice!.toFixed(2)}
                            </span>
                        )}
                    </div>

                    {product.trackInventory && (
                        <span className={`text-sm ${isLowStock ? 'text-orange-400' : 'text-muted-foreground'}`}>
                            {product.quantity} uds
                        </span>
                    )}
                </div>

                {product.sku && (
                    <p className="text-muted-foreground text-xs mt-2">SKU: {product.sku}</p>
                )}
            </div>
        </div>
    );
};

export default ProductCard;
