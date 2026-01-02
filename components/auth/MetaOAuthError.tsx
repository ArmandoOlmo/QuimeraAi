/**
 * Meta OAuth Error Page
 * Displays error information when Meta OAuth fails
 */

import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, RefreshCw, HelpCircle, Facebook, ExternalLink } from 'lucide-react';

interface OAuthError {
    code: string;
    description?: string;
}

const ERROR_MESSAGES: Record<string, { title: string; description: string; solution: string }> = {
    'access_denied': {
        title: 'Acceso Denegado',
        description: 'No se otorgaron los permisos necesarios para conectar tu cuenta.',
        solution: 'Intenta nuevamente y asegúrate de aceptar todos los permisos solicitados.'
    },
    'invalid_state': {
        title: 'Sesión Inválida',
        description: 'La sesión de autenticación expiró o es inválida.',
        solution: 'Regresa al dashboard e intenta conectar nuevamente.'
    },
    'state_expired': {
        title: 'Sesión Expirada',
        description: 'La solicitud de conexión ha expirado.',
        solution: 'Por seguridad, las solicitudes expiran después de 10 minutos. Intenta nuevamente.'
    },
    'token_exchange': {
        title: 'Error de Autenticación',
        description: 'No se pudo completar la autenticación con Meta.',
        solution: 'Verifica que tu cuenta de Meta tenga los permisos necesarios e intenta nuevamente.'
    },
    'profile_fetch': {
        title: 'Error al Obtener Perfil',
        description: 'No se pudo obtener la información de tu cuenta de Meta.',
        solution: 'Verifica los permisos de tu cuenta e intenta nuevamente.'
    },
    'missing_params': {
        title: 'Parámetros Faltantes',
        description: 'La respuesta de Meta no incluyó toda la información necesaria.',
        solution: 'Intenta el proceso de conexión nuevamente.'
    },
    'server_error': {
        title: 'Error del Servidor',
        description: 'Ocurrió un error interno al procesar la conexión.',
        solution: 'Si el problema persiste, contacta a soporte.'
    },
    'default': {
        title: 'Error de Conexión',
        description: 'Ocurrió un error al conectar tu cuenta de Meta.',
        solution: 'Intenta nuevamente o contacta a soporte si el problema persiste.'
    }
};

const MetaOAuthError: React.FC = () => {
    const [error, setError] = useState<OAuthError>({ code: 'default' });

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const errorCode = params.get('error') || 'default';
        const errorDescription = params.get('description');

        setError({
            code: errorCode,
            description: errorDescription || undefined
        });
    }, []);

    const errorInfo = ERROR_MESSAGES[error.code] || ERROR_MESSAGES['default'];

    const handleRetry = () => {
        // Navigate back to AI Assistant dashboard
        window.location.href = '/ai-assistant';
    };

    const handleBack = () => {
        window.location.href = '/dashboard';
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Error Card */}
                <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-lg">
                    {/* Icon */}
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
                        <AlertTriangle size={32} className="text-red-500" />
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-foreground mb-2">
                        {errorInfo.title}
                    </h1>

                    {/* Description */}
                    <p className="text-muted-foreground mb-4">
                        {errorInfo.description}
                    </p>

                    {/* Custom error description from Meta */}
                    {error.description && (
                        <div className="p-3 bg-secondary/50 rounded-lg mb-4 text-sm text-left">
                            <p className="text-muted-foreground">
                                <strong>Detalle:</strong> {error.description}
                            </p>
                        </div>
                    )}

                    {/* Solution */}
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-6">
                        <div className="flex items-start gap-3">
                            <HelpCircle size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-blue-600 text-left">
                                {errorInfo.solution}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <button
                            onClick={handleRetry}
                            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={18} />
                            Intentar Nuevamente
                        </button>

                        <button
                            onClick={handleBack}
                            className="w-full py-3 px-4 border border-border hover:bg-secondary text-foreground font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            <ArrowLeft size={18} />
                            Volver al Dashboard
                        </button>
                    </div>
                </div>

                {/* Help Links */}
                <div className="mt-6 text-center space-y-2">
                    <a
                        href="https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Facebook size={14} />
                        Documentación de Meta
                        <ExternalLink size={12} />
                    </a>
                </div>

                {/* Error Code (for debugging) */}
                <p className="mt-4 text-center text-xs text-muted-foreground">
                    Código de error: <code className="px-1 py-0.5 bg-secondary rounded">{error.code}</code>
                </p>
            </div>
        </div>
    );
};

export default MetaOAuthError;








