
import React from 'react';
import { MotionCard } from '../ui/primitives/Card';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <MotionCard hoverMotion className="bg-q-surface p-4 md:p-6 rounded-[var(--radius-card)] border border-border-subtle flex items-center justify-between hover:border-q-border transition-colors group shadow-[var(--shadow-card)]">
        <div className="flex-grow overflow-hidden">
            <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-q-text-muted mb-0.5 md:mb-1">{title}</p>
            <p className="text-xl md:text-3xl font-extrabold text-foreground tracking-tight group-hover:text-q-text transition-colors">{value}</p>
        </div>
        <div className="bg-q-surface-overlay p-2.5 md:p-3 rounded-[var(--radius-card-compact)] text-q-accent flex-shrink-0 transition-colors duration-300 [&_svg]:h-[var(--icon-lg)] [&_svg]:w-[var(--icon-lg)]">
            {icon}
        </div>
    </MotionCard>
);

export default StatCard;
