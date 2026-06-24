import * as React from 'react';
import { ShoppingCart } from 'lucide-react';
import { cn } from '@/utils';
import { Button } from './Button';
import { Badge } from './Feedback';

export type ProductCardVariant = 'minimal' | 'marketplace' | 'luxury' | 'compact' | 'imageFirst' | 'quickBuy';

export interface ProductCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: ProductCardVariant;
  title: string;
  price?: string;
  imageUrl?: string;
  badge?: string;
  description?: string;
  onQuickBuy?: () => void;
}

const variantClasses: Record<ProductCardVariant, string> = {
  minimal: 'gap-3 border-border-subtle bg-q-surface',
  marketplace: 'gap-3 border-border-subtle bg-q-surface shadow-[var(--q-shadow-card)]',
  luxury: 'gap-4 border-q-accent/35 bg-q-surface-elevated shadow-[var(--q-shadow-floating-panel)]',
  compact: 'grid grid-cols-[5rem_1fr] gap-3 border-border-subtle bg-q-surface',
  imageFirst: 'gap-3 border-border-subtle bg-q-surface',
  quickBuy: 'gap-3 border-border-subtle bg-q-surface shadow-[var(--q-shadow-card)]',
};

export function ProductCard({
  variant = 'minimal',
  title,
  price,
  imageUrl,
  badge,
  description,
  onQuickBuy,
  className,
  ...props
}: ProductCardProps) {
  const isCompact = variant === 'compact';

  return (
    <div
      className={cn(
        'group overflow-hidden rounded-[var(--q-radius-xl)] border p-3 text-q-text transition-all hover:-translate-y-0.5 hover:border-q-border hover:shadow-[var(--shadow-card-hover)]',
        variantClasses[variant],
        !isCompact && 'flex flex-col',
        className,
      )}
      {...props}
    >
      <div className={cn('relative overflow-hidden rounded-[var(--q-radius-lg)] bg-q-surface-overlay', isCompact ? 'aspect-square' : 'aspect-[4/3]')}>
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-q-text-muted">No image</div>
        )}
        {badge && <Badge variant="primary" className="absolute left-2 top-2">{badge}</Badge>}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-q-text">{title}</h3>
        {description && !isCompact && <p className="mt-1 line-clamp-2 text-xs leading-5 text-q-text-muted">{description}</p>}
        <div className="mt-3 flex items-center justify-between gap-3">
          {price && <span className="text-sm font-bold text-q-text">{price}</span>}
          {(variant === 'quickBuy' || onQuickBuy) && (
            <Button size="sm" variant="secondary" onClick={onQuickBuy} leftIcon={<ShoppingCart />}>
              Buy
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
