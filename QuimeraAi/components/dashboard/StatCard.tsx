
import React from 'react';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-card p-3 md:p-6 rounded-xl md:rounded-2xl border border-border flex items-center justify-between hover:border-primary/30 transition-colors group shadow-sm">
        <div className="flex-grow overflow-hidden">
            <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground mb-0.5 md:mb-1">{title}</p>
            <p className="text-xl md:text-3xl font-extrabold text-foreground tracking-tight group-hover:text-primary transition-colors">{value}</p>
        </div>
        <div className="bg-secondary p-2.5 md:p-4 rounded-lg md:rounded-xl text-primary flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
            {icon}
        </div>
    </div>
);

export default StatCard;
