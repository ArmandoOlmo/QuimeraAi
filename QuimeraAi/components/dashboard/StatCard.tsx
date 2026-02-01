
import React from 'react';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-card p-6 rounded-2xl border border-border flex items-center justify-between hover:border-primary/30 transition-colors group shadow-sm">
        <div className="flex-grow overflow-hidden">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-extrabold text-foreground tracking-tight group-hover:text-primary transition-colors">{value}</p>
        </div>
        <div className="bg-secondary p-4 rounded-xl text-primary flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
            {icon}
        </div>
    </div>
);

export default StatCard;
