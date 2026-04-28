import React from 'react';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-q-surface p-4 rounded-lg border border-q-border flex items-center justify-between">
        <div className="flex-grow overflow-hidden">
            <p className="text-sm text-q-text-secondary truncate">{title}</p>
            <p className="text-2xl font-bold text-q-text truncate">{value}</p>
        </div>
        <div className="bg-q-surface-overlay p-3 rounded-lg text-q-accent ml-4 flex-shrink-0">
            {icon}
        </div>
    </div>
);

export default StatCard;
