import React from 'react';
import { 
    Activity, 
    Server, 
    Database, 
    Wifi, 
    Cpu,
    HardDrive,
    AlertCircle,
    CheckCircle,
    Clock
} from 'lucide-react';

export interface SystemHealth {
    apiStatus: 'healthy' | 'degraded' | 'down';
    databaseStatus: 'healthy' | 'degraded' | 'down';
    serverLoad: number; // 0-100
    storageUsed: number; // 0-100
    uptime: string;
    lastCheck: string;
    activeConnections?: number;
    requestsPerMinute?: number;
}

interface SystemHealthWidgetProps {
    health: SystemHealth;
    onRefresh?: () => void;
}

/**
 * Widget que muestra el estado de salud del sistema
 * Útil para que super admins monitoreen la infraestructura
 */
const SystemHealthWidget: React.FC<SystemHealthWidgetProps> = ({ health, onRefresh }) => {
    const getStatusColor = (status: 'healthy' | 'degraded' | 'down') => {
        switch (status) {
            case 'healthy': return 'text-green-400';
            case 'degraded': return 'text-yellow-400';
            case 'down': return 'text-red-400';
        }
    };

    const getStatusIcon = (status: 'healthy' | 'degraded' | 'down') => {
        switch (status) {
            case 'healthy': return <CheckCircle className="w-4 h-4" />;
            case 'degraded': return <AlertCircle className="w-4 h-4" />;
            case 'down': return <AlertCircle className="w-4 h-4" />;
        }
    };

    const getStatusLabel = (status: 'healthy' | 'degraded' | 'down') => {
        switch (status) {
            case 'healthy': return 'Operativo';
            case 'degraded': return 'Degradado';
            case 'down': return 'Caído';
        }
    };

    const getLoadColor = (load: number) => {
        if (load < 50) return 'bg-green-500';
        if (load < 80) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const overallStatus = health.apiStatus === 'healthy' && health.databaseStatus === 'healthy' 
        ? 'healthy' 
        : health.apiStatus === 'down' || health.databaseStatus === 'down'
        ? 'down'
        : 'degraded';

    return (
        <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-editor-accent" />
                    <h2 className="text-lg font-bold text-editor-text-primary">Estado del Sistema</h2>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1 ${getStatusColor(overallStatus)}`}>
                        {getStatusIcon(overallStatus)}
                        <span className="text-sm font-medium">{getStatusLabel(overallStatus)}</span>
                    </div>
                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            className="ml-2 p-1.5 rounded hover:bg-editor-border transition-colors"
                            title="Actualizar estado"
                        >
                            <Activity className="w-4 h-4 text-editor-text-secondary" />
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-3">
                {/* API Status */}
                <div className="flex items-center justify-between p-3 bg-editor-bg rounded-lg border border-editor-border">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded ${getStatusColor(health.apiStatus)} bg-current/10`}>
                            <Wifi className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-editor-text-primary">API</p>
                            <p className="text-xs text-editor-text-secondary">
                                {health.requestsPerMinute ? `${health.requestsPerMinute} req/min` : 'Monitoreo activo'}
                            </p>
                        </div>
                    </div>
                    <div className={`flex items-center gap-1 ${getStatusColor(health.apiStatus)}`}>
                        {getStatusIcon(health.apiStatus)}
                        <span className="text-sm font-medium">{getStatusLabel(health.apiStatus)}</span>
                    </div>
                </div>

                {/* Database Status */}
                <div className="flex items-center justify-between p-3 bg-editor-bg rounded-lg border border-editor-border">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded ${getStatusColor(health.databaseStatus)} bg-current/10`}>
                            <Database className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-editor-text-primary">Base de Datos</p>
                            <p className="text-xs text-editor-text-secondary">
                                {health.activeConnections ? `${health.activeConnections} conexiones` : 'Conexión estable'}
                            </p>
                        </div>
                    </div>
                    <div className={`flex items-center gap-1 ${getStatusColor(health.databaseStatus)}`}>
                        {getStatusIcon(health.databaseStatus)}
                        <span className="text-sm font-medium">{getStatusLabel(health.databaseStatus)}</span>
                    </div>
                </div>

                {/* Server Load */}
                <div className="p-3 bg-editor-bg rounded-lg border border-editor-border">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-editor-text-secondary" />
                            <span className="text-sm font-medium text-editor-text-primary">Carga del Servidor</span>
                        </div>
                        <span className="text-sm font-bold text-editor-text-primary">{health.serverLoad}%</span>
                    </div>
                    <div className="h-2 bg-editor-border rounded-full overflow-hidden">
                        <div
                            className={`h-full ${getLoadColor(health.serverLoad)} transition-all duration-300`}
                            style={{ width: `${health.serverLoad}%` }}
                        />
                    </div>
                </div>

                {/* Storage */}
                <div className="p-3 bg-editor-bg rounded-lg border border-editor-border">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <HardDrive className="w-4 h-4 text-editor-text-secondary" />
                            <span className="text-sm font-medium text-editor-text-primary">Almacenamiento</span>
                        </div>
                        <span className="text-sm font-bold text-editor-text-primary">{health.storageUsed}%</span>
                    </div>
                    <div className="h-2 bg-editor-border rounded-full overflow-hidden">
                        <div
                            className={`h-full ${getLoadColor(health.storageUsed)} transition-all duration-300`}
                            style={{ width: `${health.storageUsed}%` }}
                        />
                    </div>
                </div>

                {/* Uptime & Last Check */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-editor-bg rounded-lg border border-editor-border">
                        <div className="flex items-center gap-2 mb-1">
                            <Server className="w-3.5 h-3.5 text-editor-text-secondary" />
                            <span className="text-xs text-editor-text-secondary">Uptime</span>
                        </div>
                        <p className="text-sm font-bold text-editor-text-primary">{health.uptime}</p>
                    </div>
                    <div className="p-3 bg-editor-bg rounded-lg border border-editor-border">
                        <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-3.5 h-3.5 text-editor-text-secondary" />
                            <span className="text-xs text-editor-text-secondary">Última revisión</span>
                        </div>
                        <p className="text-sm font-bold text-editor-text-primary">{health.lastCheck}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemHealthWidget;































