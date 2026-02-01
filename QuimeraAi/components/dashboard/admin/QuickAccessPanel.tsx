import React from 'react';
import { Star, Clock, TrendingUp } from 'lucide-react';

interface QuickAccessItem {
    id: string;
    title: string;
    icon: React.ReactNode;
    description: string;
    lastAccessed?: string;
    frequency?: number;
}

interface QuickAccessPanelProps {
    items: QuickAccessItem[];
    onItemClick: (id: string) => void;
    maxItems?: number;
}

/**
 * Panel de acceso rápido que muestra las funcionalidades más usadas o favoritas
 * Útil para super admins que acceden frecuentemente a las mismas secciones
 */
const QuickAccessPanel: React.FC<QuickAccessPanelProps> = ({ 
    items, 
    onItemClick,
    maxItems = 6 
}) => {
    const displayItems = items.slice(0, maxItems);

    if (displayItems.length === 0) {
        return null;
    }

    return (
        <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-editor-accent" />
                    <h2 className="text-lg font-bold text-editor-text-primary">Acceso Rápido</h2>
                </div>
                <span className="text-xs text-editor-text-secondary">
                    Más usadas
                </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {displayItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => onItemClick(item.id)}
                        className="group flex flex-col items-center justify-center p-4 bg-editor-bg border border-editor-border rounded-lg hover:border-editor-accent hover:bg-editor-panel-bg transition-all duration-200"
                    >
                        <div className="w-10 h-10 bg-editor-accent/10 rounded-lg flex items-center justify-center text-editor-accent group-hover:bg-editor-accent group-hover:text-white transition-all mb-2">
                            {item.icon}
                        </div>
                        <span className="text-sm font-medium text-editor-text-primary text-center line-clamp-2">
                            {item.title}
                        </span>
                        {item.lastAccessed && (
                            <span className="text-xs text-editor-text-secondary mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {item.lastAccessed}
                            </span>
                        )}
                        {item.frequency && item.frequency > 10 && (
                            <span className="text-xs text-green-400 mt-1 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                Popular
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default QuickAccessPanel;































