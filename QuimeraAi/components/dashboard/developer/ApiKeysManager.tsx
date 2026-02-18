/**
 * API Keys Manager
 * Manage API keys for programmatic access to Quimera API
 */

import React, { useState, useEffect } from 'react';
import ConfirmationModal from '../../ui/ConfirmationModal';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useTenant } from '@/contexts/tenant/TenantContext';
import {
  Key,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Code,
  Book,
  Terminal,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface ApiKey {
  id: string;
  tenantId: string;
  name: string;
  keyPreview: string; // Last 8 characters
  permissions: string[];
  status: 'active' | 'revoked';
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
  callsLast30Days?: number;
}

interface CreateApiKeyData {
  name: string;
  permissions: string[];
  expiresInDays?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const AVAILABLE_PERMISSIONS = [
  {
    id: 'read_tenants',
    name: 'Leer Tenants',
    description: 'Ver información de sub-clientes',
    category: 'Tenants',
  },
  {
    id: 'create_tenants',
    name: 'Crear Tenants',
    description: 'Crear nuevos sub-clientes',
    category: 'Tenants',
  },
  {
    id: 'update_tenants',
    name: 'Actualizar Tenants',
    description: 'Modificar información de sub-clientes',
    category: 'Tenants',
  },
  {
    id: 'delete_tenants',
    name: 'Eliminar Tenants',
    description: 'Eliminar sub-clientes (soft delete)',
    category: 'Tenants',
  },
  {
    id: 'manage_members',
    name: 'Gestionar Miembros',
    description: 'Agregar/remover miembros de sub-clientes',
    category: 'Members',
  },
  {
    id: 'generate_reports',
    name: 'Generar Reportes',
    description: 'Crear reportes consolidados',
    category: 'Reports',
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function ApiKeysManager() {
  const { currentTenant } = useTenant();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyData, setNewKeyData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);

  const functions = getFunctions();

  // ============================================================================
  // LOAD API KEYS
  // ============================================================================

  useEffect(() => {
    if (currentTenant) {
      loadApiKeys();
    }
  }, [currentTenant]);

  const loadApiKeys = async () => {
    if (!currentTenant) return;

    setIsLoading(true);
    try {
      const keysQuery = query(
        collection(db, 'apiKeys'),
        where('tenantId', '==', currentTenant.id)
      );

      const snapshot = await getDocs(keysQuery);

      const keys: ApiKey[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          tenantId: data.tenantId,
          name: data.name,
          keyPreview: data.keyPreview || '********',
          permissions: data.permissions || [],
          status: data.status,
          createdAt: data.createdAt?.toDate(),
          lastUsedAt: data.lastUsedAt?.toDate(),
          expiresAt: data.expiresAt?.toDate(),
          callsLast30Days: data.callsLast30Days || 0,
        };
      });

      setApiKeys(keys);
    } catch (err) {
      console.error('Error loading API keys:', err);
      setError('Error al cargar las API keys');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCreateKey = async (data: CreateApiKeyData) => {
    try {
      const createApiKey = httpsCallable(functions, 'createApiKey');

      const result = await createApiKey({
        tenantId: currentTenant?.id,
        ...data,
      });

      const response = result.data as any;

      if (response.success) {
        setNewKeyData(response.apiKey);
        await loadApiKeys();
      }
    } catch (err: any) {
      console.error('Error creating API key:', err);
      setError(err.message || 'Error al crear la API key');
    }
  };

  const handleRevokeKey = (keyId: string) => {
    setRevokeConfirmId(keyId);
  };

  const confirmRevokeKey = async () => {
    if (!revokeConfirmId) return;
    try {
      await updateDoc(doc(db, 'apiKeys', revokeConfirmId), {
        status: 'revoked',
        revokedAt: serverTimestamp(),
      });

      await loadApiKeys();
    } catch (err) {
      console.error('Error revoking key:', err);
      setError('Error al revocar la API key');
    } finally {
      setRevokeConfirmId(null);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    // Show toast notification
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Key className="h-7 w-7 text-blue-600" />
            API Keys
          </h2>
          <p className="text-gray-600 mt-2">
            Gestiona el acceso programático a la API de Quimera
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Crear API Key
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-900">Error</h4>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* API Keys List */}
      {apiKeys.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <Key className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No tienes API keys
          </h3>
          <p className="text-gray-600 mb-6">
            Crea una API key para comenzar a usar la API de Quimera
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Crear Primera API Key
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Key
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permisos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Último Uso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Llamadas (30d)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {apiKeys.map((key) => (
                <tr key={key.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{key.name}</div>
                    <div className="text-xs text-gray-500">
                      Creada el{' '}
                      {key.createdAt?.toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      ...{key.keyPreview}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {key.permissions.slice(0, 2).map((perm) => (
                        <span
                          key={perm}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                        >
                          {perm}
                        </span>
                      ))}
                      {key.permissions.length > 2 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          +{key.permissions.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {key.lastUsedAt
                      ? key.lastUsedAt.toLocaleDateString('es-MX')
                      : 'Nunca'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {key.callsLast30Days?.toLocaleString() || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded ${key.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                        }`}
                    >
                      {key.status === 'active' ? 'Activa' : 'Revocada'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    {key.status === 'active' && (
                      <button
                        onClick={() => handleRevokeKey(key.id)}
                        className="text-red-600 hover:text-red-700 flex items-center gap-1 ml-auto"
                      >
                        <Trash2 className="h-4 w-4" />
                        Revocar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Documentation Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DocumentationCard
          icon={<Terminal className="h-6 w-6" />}
          title="Quick Start"
          description="Comienza a usar la API en minutos"
          link="/docs/api/quickstart"
        />
        <DocumentationCard
          icon={<Code className="h-6 w-6" />}
          title="Ejemplos de Código"
          description="Ejemplos en múltiples lenguajes"
          link="/docs/api/examples"
        />
        <DocumentationCard
          icon={<Book className="h-6 w-6" />}
          title="Referencia Completa"
          description="Documentación detallada de endpoints"
          link="/docs/api/reference"
        />
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateApiKeyModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateKey}
          onSuccess={(key) => {
            setNewKeyData(key);
            setShowCreateModal(false);
          }}
        />
      )}

      {/* Revoke API Key Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!revokeConfirmId}
        onConfirm={confirmRevokeKey}
        onCancel={() => setRevokeConfirmId(null)}
        title="Revocar API Key"
        message="¿Estás seguro de que deseas revocar esta API key? Esta acción no se puede deshacer."
        variant="danger"
      />

      {newKeyData && (
        <NewApiKeyModal
          apiKey={newKeyData}
          onClose={() => setNewKeyData(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface DocumentationCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  link: string;
}

function DocumentationCard({
  icon,
  title,
  description,
  link,
}: DocumentationCardProps) {
  return (
    <a
      href={link}
      className="block p-6 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">{icon}</div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <p className="text-sm text-gray-600">{description}</p>
    </a>
  );
}

interface CreateApiKeyModalProps {
  onClose: () => void;
  onCreate: (data: CreateApiKeyData) => Promise<void>;
  onSuccess: (key: string) => void;
}

function CreateApiKeyModal({
  onClose,
  onCreate,
  onSuccess,
}: CreateApiKeyModalProps) {
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<string[]>(['read_tenants']);
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(
    undefined
  );
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsCreating(true);
    try {
      await onCreate({ name, permissions, expiresInDays });
    } finally {
      setIsCreating(false);
    }
  };

  const togglePermission = (permId: string) => {
    setPermissions((prev) =>
      prev.includes(permId)
        ? prev.filter((p) => p !== permId)
        : [...prev, permId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Crear Nueva API Key
          </h2>
          <p className="text-gray-600 mt-1">
            Configura una nueva API key para acceso programático
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la API Key *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: Production API, CI/CD Pipeline"
              required
            />
          </div>

          {/* Permissions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Permisos *
            </label>
            <div className="space-y-2">
              {AVAILABLE_PERMISSIONS.map((perm) => (
                <label
                  key={perm.id}
                  className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={permissions.includes(perm.id)}
                    onChange={() => togglePermission(perm.id)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{perm.name}</div>
                    <div className="text-sm text-gray-600">{perm.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Expiration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expiración (opcional)
            </label>
            <select
              value={expiresInDays || ''}
              onChange={(e) =>
                setExpiresInDays(
                  e.target.value ? parseInt(e.target.value) : undefined
                )
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Sin expiración</option>
              <option value="30">30 días</option>
              <option value="90">90 días</option>
              <option value="180">180 días</option>
              <option value="365">1 año</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              disabled={isCreating}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              disabled={isCreating || permissions.length === 0}
            >
              {isCreating ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Creando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Crear API Key
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface NewApiKeyModalProps {
  apiKey: string;
  onClose: () => void;
}

function NewApiKeyModal({ apiKey, onClose }: NewApiKeyModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-full">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              ¡API Key Creada!
            </h2>
          </div>
          <p className="text-gray-600">
            Guarda esta API key en un lugar seguro. No podrás verla nuevamente.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* API Key Display */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Tu API Key:
              </label>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar
                  </>
                )}
              </button>
            </div>
            <code className="block p-3 bg-white border border-gray-300 rounded font-mono text-sm break-all">
              {apiKey}
            </code>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-900">
                Importante: Guarda esta key de forma segura
              </h4>
              <p className="text-sm text-yellow-800 mt-1">
                Por razones de seguridad, no podrás ver esta API key nuevamente.
                Guárdala en un gestor de contraseñas o variable de entorno.
              </p>
            </div>
          </div>

          {/* Example Usage */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Ejemplo de Uso:</h4>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
              {`curl -X GET https://api.quimera.ai/v1/tenants \\
  -H "X-API-Key: ${apiKey}"`}
            </pre>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Entendido, Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
