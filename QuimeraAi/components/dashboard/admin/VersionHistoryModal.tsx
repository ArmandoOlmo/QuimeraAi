import React, { useState } from 'react';
import { X, Clock, RotateCcw, GitBranch, User, Calendar, FileText, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { CustomComponent, ComponentVersion } from '../../../types';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  component: CustomComponent;
  onRevert: (versionNumber: number) => Promise<void>;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  component,
  onRevert,
}) => {
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);
  const [isReverting, setIsReverting] = useState(false);
  const [revertSuccess, setRevertSuccess] = useState(false);

  if (!isOpen) return null;

  const versions = component.versions || [];
  const currentVersion = component.currentVersion || 1;

  const handleRevert = async (versionNumber: number) => {
    if (versionNumber === currentVersion) {
      alert("Ya estás en esta versión");
      return;
    }

    const confirmed = window.confirm(
      `¿Revertir a la versión ${versionNumber}? Esto creará una nueva versión con los estilos de la versión ${versionNumber}.`
    );

    if (!confirmed) return;

    setIsReverting(true);
    try {
      await onRevert(versionNumber);
      setRevertSuccess(true);
      setTimeout(() => {
        setRevertSuccess(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error reverting:", error);
      alert("Error al revertir. Intenta de nuevo.");
    } finally {
      setIsReverting(false);
    }
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'Fecha desconocida';
    
    // Handle Firestore Timestamp
    if (timestamp?.toDate) {
      return timestamp.toDate().toLocaleString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // Handle ISO string or Date
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Fecha inválida';
    
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleExpanded = (versionNumber: number) => {
    setExpandedVersion(expandedVersion === versionNumber ? null : versionNumber);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Historial de Versiones</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {component.name} · {versions.length} versión{versions.length !== 1 ? 'es' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isReverting}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Success Message */}
        {revertSuccess && (
          <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800 font-medium">
              ¡Versión restaurada exitosamente!
            </p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {versions.length === 0 ? (
            <div className="text-center py-12">
              <GitBranch className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No hay versiones disponibles</p>
              <p className="text-gray-400 text-sm mt-2">
                Las versiones se crearán automáticamente al guardar cambios
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Sort by version number descending */}
              {[...versions].sort((a, b) => b.version - a.version).map((version) => {
                const isCurrentVersion = version.version === currentVersion;
                const isExpanded = expandedVersion === version.version;
                
                return (
                  <div
                    key={version.version}
                    className={`border rounded-xl transition-all ${
                      isCurrentVersion
                        ? 'border-purple-300 bg-purple-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    } ${isExpanded ? 'shadow-md' : 'shadow-sm'}`}
                  >
                    {/* Version Header */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          {/* Version Badge */}
                          <div
                            className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                              isCurrentVersion
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            v{version.version}
                          </div>

                          {/* Version Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-gray-900">
                                Versión {version.version}
                              </h3>
                              {isCurrentVersion && (
                                <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-medium rounded-full">
                                  Actual
                                </span>
                              )}
                            </div>

                            {/* Metadata */}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDate(version.createdAt)}</span>
                              </div>
                              {version.createdBy && (
                                <div className="flex items-center gap-1.5">
                                  <User className="w-4 h-4" />
                                  <span>{version.createdBy}</span>
                                </div>
                              )}
                            </div>

                            {/* Notes Preview */}
                            {version.notes && !isExpanded && (
                              <p className="mt-2 text-sm text-gray-600 line-clamp-1">
                                {version.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleExpanded(version.version)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title={isExpanded ? "Ocultar detalles" : "Ver detalles"}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-gray-500" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-500" />
                            )}
                          </button>
                          
                          {!isCurrentVersion && (
                            <button
                              onClick={() => handleRevert(version.version)}
                              disabled={isReverting}
                              className="px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                              title="Revertir a esta versión"
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span>Revertir</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                          {version.notes && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">Notas:</span>
                              </div>
                              <p className="text-sm text-gray-600 pl-6">{version.notes}</p>
                            </div>
                          )}

                          {/* Styles Preview */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <GitBranch className="w-4 h-4 text-gray-500" />
                              <span className="text-sm font-medium text-gray-700">
                                Configuración:
                              </span>
                            </div>
                            <div className="pl-6 bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                              <pre className="text-xs text-gray-700 font-mono">
                                {JSON.stringify(version.styles, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{versions.length}</span> versión{versions.length !== 1 ? 'es' : ''} 
            {versions.length > 0 && (
              <>
                {' · '}
                <span className="font-medium">v{currentVersion}</span> actual
              </>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={isReverting}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

