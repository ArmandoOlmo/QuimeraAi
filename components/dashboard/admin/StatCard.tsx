import React from 'react';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-editor-panel-bg p-4 rounded-lg border border-editor-border flex items-center justify-between">
        <div className="flex-grow overflow-hidden">
            <p className="text-sm text-editor-text-secondary truncate">{title}</p>
            <p className="text-2xl font-bold text-editor-text-primary truncate">{value}</p>
        </div>
        <div className="bg-editor-border p-3 rounded-lg text-editor-accent ml-4 flex-shrink-0">
            {icon}
        </div>
    </div>
);

export default StatCard;
