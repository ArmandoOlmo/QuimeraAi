/**
 * API Keys Manager
 * Manage API keys for programmatic access to Quimera API
 */

import React, { useState, useEffect, useMemo } from 'react';
import ConfirmationModal from '../../ui/ConfirmationModal';
import { useTenant } from '@/contexts/tenant/TenantContext';
import { supabase } from '@/supabase';
import {
  Key,
  Plus,
  Copy,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Code,
  Book,
  Terminal,
  ShieldCheck,
  Activity,
  Clock3,
} from 'lucide-react';
import QuimeraLoader from '@/components/ui/QuimeraLoader';

// ============================================================================
// TYPES
// ============================================================================

interface ApiKey {
  id: string;
  tenantId: string;
  projectId?: string | null;
  name: string;
  keyPreview: string; // Last 8 characters
  scopes: string[];
  status: 'active' | 'revoked';
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
  callsLast30Days?: number;
}

interface CreateApiKeyData {
  name: string;
  scopes: string[];
  expiresInDays?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const AVAILABLE_SCOPES = [
  {
    id: 'projects:read',
    name: 'Leer proyectos',
    description: 'Ver proyectos y estructura de páginas.',
    category: 'Projects',
  },
  {
    id: 'projects:write',
    name: 'Editar proyectos',
    description: 'Crear y actualizar páginas, secciones y previews.',
    category: 'Projects',
  },
  {
    id: 'templates:read',
    name: 'Leer templates',
    description: 'Listar templates disponibles.',
    category: 'Templates',
  },
  {
    id: 'templates:write',
    name: 'Editar templates',
    description: 'Crear y actualizar templates.',
    category: 'Templates',
  },
  {
    id: 'ai:generate_content',
    name: 'Generar contenido',
    description: 'Generar copy, JSON de páginas, SEO y prompts.',
    category: 'AI',
  },
  {
    id: 'ai:generate_image',
    name: 'Generar imágenes',
    description: 'Crear imágenes y guardarlas en Supabase Storage.',
    category: 'AI',
  },
  {
    id: 'ai:generate_batch',
    name: 'Generación batch',
    description: 'Generar assets o proyectos completos.',
    category: 'AI',
  },
  {
    id: 'ai:apply_to_project',
    name: 'Aplicar AI',
    description: 'Aplicar contenido e imágenes generadas a proyectos.',
    category: 'AI',
  },
  {
    id: 'leads:read',
    name: 'Leer leads',
    description: 'Ver leads y actividad CRM.',
    category: 'CRM',
  },
  {
    id: 'leads:write',
    name: 'Editar leads',
    description: 'Crear, actualizar y eliminar leads, actividades y tareas.',
    category: 'CRM',
  },
  {
    id: 'cms:read',
    name: 'Leer CMS',
    description: 'Ver artículos y navegación.',
    category: 'CMS',
  },
  {
    id: 'cms:write',
    name: 'Editar CMS',
    description: 'Crear artículos, navegación y SEO.',
    category: 'CMS',
  },
  {
    id: 'commerce:read',
    name: 'Leer ecommerce',
    description: 'Ver productos, órdenes y descuentos.',
    category: 'Commerce',
  },
  {
    id: 'commerce:write',
    name: 'Editar ecommerce',
    description: 'Crear productos, actualizar órdenes y descuentos.',
    category: 'Commerce',
  },
  {
    id: 'appointments:read',
    name: 'Leer citas',
    description: 'Ver citas y bloqueos.',
    category: 'Appointments',
  },
  {
    id: 'appointments:write',
    name: 'Editar citas',
    description: 'Crear, actualizar, eliminar y bloquear fechas.',
    category: 'Appointments',
  },
  {
    id: 'domains:read',
    name: 'Leer dominios',
    description: 'Ver dominios y logs de despliegue.',
    category: 'Domains',
  },
  {
    id: 'domains:write',
    name: 'Editar dominios',
    description: 'Reservado para manejo futuro de dominios.',
    category: 'Domains',
  },
  {
    id: 'reports:read',
    name: 'Leer reportes',
    description: 'Ver resúmenes operativos.',
    category: 'Reports',
  },
];

const SCOPE_CATEGORY_ORDER = [
  'Projects',
  'Templates',
  'AI',
  'CRM',
  'CMS',
  'Commerce',
  'Appointments',
  'Domains',
  'Reports',
];

const getScopeGroups = () =>
  SCOPE_CATEGORY_ORDER.map((category) => ({
    category,
    scopes: AVAILABLE_SCOPES.filter((scope) => scope.category === category),
  })).filter((group) => group.scopes.length > 0);

const getMcpKeysUrl = (tenantId?: string) => {
  const configuredBase = import.meta.env.VITE_MCP_API_BASE_URL?.replace(/\/$/, '');
  const isLocalhost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const base = configuredBase || (isLocalhost ? 'https://www.quimera.ai' : '');
  const path = '/api/mcp/keys';
  const query = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
  return `${base}${path}${query}`;
};

const readJsonResponse = async (response: Response) => {
  const contentType = response.headers.get('content-type') || '';
  const raw = await response.text();
  if (!contentType.includes('application/json')) {
    throw new Error(raw.slice(0, 160) || 'La API no devolvió JSON.');
  }
  return raw ? JSON.parse(raw) : {};
};

const formatMcpApiError = (payload: any, fallback: string) => {
  const message = payload?.error || fallback;
  return payload?.details ? `${message} ${payload.details}` : message;
};

let accessTokenRequest: Promise<string> | null = null;

const readSupabaseAccessToken = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message || 'No se pudo validar la sesión de Supabase.');

  const token = data.session?.access_token;
  if (!token) throw new Error('No hay sesión activa de Supabase.');
  return token;
};

const getSupabaseAccessToken = async (): Promise<string> => {
  accessTokenRequest ||= readSupabaseAccessToken().finally(() => {
    accessTokenRequest = null;
  });
  return accessTokenRequest;
};

const fetchMcpKeys = async (url: string, init: RequestInit = {}) => {
  const buildInit = (token: string): RequestInit => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return { ...init, headers };
  };

  const token = await getSupabaseAccessToken();
  let response = await fetch(url, buildInit(token));
  let payload = await readJsonResponse(response);

  if (response.status === 401) {
    response = await fetch(url, buildInit(await getSupabaseAccessToken()));
    payload = await readJsonResponse(response);
  }

  return { response, payload };
};

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

  const activeKeys = apiKeys.filter((key) => key.status === 'active').length;
  const totalCallsLast30Days = apiKeys.reduce((sum, key) => sum + (key.callsLast30Days || 0), 0);
  const broadestScopeCount = apiKeys.reduce((max, key) => Math.max(max, key.scopes.length), 0);
  const lastUsedLabel = useMemo(() => {
    const lastUsedDates = apiKeys
      .map((key) => key.lastUsedAt)
      .filter((date): date is Date => Boolean(date))
      .sort((a, b) => b.getTime() - a.getTime());

    return lastUsedDates[0]?.toLocaleDateString('es-MX', {
      month: 'short',
      day: 'numeric',
    }) || 'Nunca';
  }, [apiKeys]);



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
      const { response, payload } = await fetchMcpKeys(getMcpKeysUrl(currentTenant.id));
      if (!response.ok) throw new Error(formatMcpApiError(payload, 'Error al cargar API keys'));

      const keys: ApiKey[] = (payload.keys || []).map((key: any) => ({
        id: key.id,
        tenantId: key.tenantId,
        projectId: key.projectId,
        name: key.name,
        keyPreview: key.keyPreview || 'qma_live',
        scopes: key.scopes || [],
        status: key.status || 'active',
        createdAt: key.createdAt ? new Date(key.createdAt) : new Date(),
        lastUsedAt: key.lastUsedAt ? new Date(key.lastUsedAt) : undefined,
        expiresAt: key.expiresAt ? new Date(key.expiresAt) : undefined,
        callsLast30Days: key.callsLast30Days || 0,
      }));

      setApiKeys(keys);
    } catch (err) {
      console.error('Error loading API keys:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar las API keys');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCreateKey = async (data: CreateApiKeyData): Promise<string | undefined> => {
    try {
      const { response, payload } = await fetchMcpKeys(getMcpKeysUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create',
          tenantId: currentTenant?.id,
          name: data.name,
          scopes: data.scopes,
          expiresInDays: data.expiresInDays,
        }),
      });
      if (!response.ok) throw new Error(formatMcpApiError(payload, 'Error al crear la API key'));

      if (payload.success) {
        await loadApiKeys();
        return payload.apiKey;
      }
    } catch (err: any) {
      console.error('Error creating API key:', err);
      setError(err.message || 'Error al crear la API key');
    }
    return undefined;
  };

  const handleRevokeKey = (keyId: string) => {
    setRevokeConfirmId(keyId);
  };

  const confirmRevokeKey = async () => {
    if (!revokeConfirmId) return;
    try {
      const { response, payload } = await fetchMcpKeys(getMcpKeysUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'revoke',
          tenantId: currentTenant?.id,
          keyId: revokeConfirmId,
        }),
      });
      if (!response.ok) throw new Error(formatMcpApiError(payload, 'Error al revocar la API key'));

      await loadApiKeys();
    } catch (err) {
      console.error('Error revoking key:', err);
      setError(err instanceof Error ? err.message : 'Error al revocar la API key');
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
        <QuimeraLoader size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-body">
      {/* Header */}
      <div className="rounded-xl border border-q-border bg-q-surface/80 p-5 shadow-sm backdrop-blur-md sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-q-accent/25 bg-q-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-q-accent">
              MCP Access
            </div>
            <h2 className="flex items-center gap-3 font-header text-2xl font-bold text-q-text sm:text-3xl">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-q-accent/15 text-q-accent">
                <Key className="h-5 w-5" />
              </span>
              API Keys
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-q-text-secondary">
              Gestiona las llaves que usan agentes, integraciones y automatizaciones para operar proyectos, templates, leads, contenido y generación AI.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-q-accent px-5 py-2.5 font-button text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-q-accent/90 focus:outline-none focus:ring-2 focus:ring-q-accent/40"
          >
            <Plus className="h-4 w-4" />
            Crear API Key
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Activas"
            value={activeKeys.toLocaleString()}
          />
          <MetricCard
            icon={<Key className="h-4 w-4" />}
            label="Total keys"
            value={apiKeys.length.toLocaleString()}
          />
          <MetricCard
            icon={<Activity className="h-4 w-4" />}
            label="Llamadas 30d"
            value={totalCallsLast30Days.toLocaleString()}
          />
          <MetricCard
            icon={<Clock3 className="h-4 w-4" />}
            label="Último uso"
            value={lastUsedLabel}
          />
        </div>
      </div>

      <div className="rounded-xl border border-q-border bg-q-surface/70 p-4 backdrop-blur-md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-header text-base font-semibold text-q-text">Permisos disponibles</h3>
            <p className="mt-1 text-sm text-q-text-secondary">
              {AVAILABLE_SCOPES.length} scopes en {SCOPE_CATEGORY_ORDER.length} áreas operativas.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-q-border bg-q-bg px-3 py-1.5 text-xs font-semibold text-q-text-secondary">
            <Key className="h-5 w-5" />
            Máximo en una key: {broadestScopeCount}
          </div>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SCOPE_CATEGORY_ORDER.map((category) => (
            <span
              key={category}
              className="shrink-0 rounded-full border border-q-border bg-q-bg px-3 py-1.5 text-xs font-medium text-q-text-secondary"
            >
              {category}
            </span>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl border border-destructive/25 bg-destructive/10 p-4 flex items-start gap-3 text-destructive">
          <AlertCircle className="h-5 w-5 mt-0.5" />
          <div>
            <h4 className="font-header font-semibold">Error</h4>
            <p className="font-body text-sm text-destructive/85">{error}</p>
          </div>
        </div>
      )}

      {/* API Keys List */}
      {apiKeys.length === 0 ? (
        <div className="rounded-xl border border-dashed border-q-border bg-q-surface/80 p-8 text-center backdrop-blur-md sm:p-12">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-q-accent/10 text-q-accent">
            <Key className="h-8 w-8" />
          </div>
          <h3 className="font-header text-lg font-semibold text-q-text mb-2">
            No tienes API keys
          </h3>
          <p className="font-body text-sm text-q-text-secondary mb-6">
            Crea una API key para comenzar a usar la API de Quimera
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center rounded-full bg-q-accent px-6 py-2.5 font-button text-sm font-semibold text-primary-foreground transition-all hover:bg-q-accent/90 focus:outline-none focus:ring-2 focus:ring-q-accent/40"
          >
            Crear Primera API Key
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-3 lg:hidden">
            {apiKeys.map((key) => (
              <ApiKeyCard key={key.id} apiKey={key} onRevoke={handleRevokeKey} />
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-xl border border-q-border bg-q-surface/80 shadow-sm backdrop-blur-md lg:block">
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-q-border">
            <thead className="bg-q-surface-overlay/40">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-q-text-secondary uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-q-text-secondary uppercase tracking-wider">
                  Key
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-q-text-secondary uppercase tracking-wider">
                  Permisos
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-q-text-secondary uppercase tracking-wider">
                  Último Uso
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-q-text-secondary uppercase tracking-wider">
                  Llamadas (30d)
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-q-text-secondary uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-q-text-secondary uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-q-border">
              {apiKeys.map((key) => (
                <tr key={key.id} className="transition-colors hover:bg-q-surface-overlay/30">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-header font-semibold text-q-text">{key.name}</div>
                    <div className="font-body text-xs text-q-text-muted">
                      Creada el{' '}
                      {key.createdAt?.toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="rounded-full border border-q-border bg-q-bg px-2.5 py-1 font-mono text-xs text-q-text-secondary">
                      ...{key.keyPreview}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {key.scopes.slice(0, 2).map((perm) => (
                        <span
                          key={perm}
                          className="rounded-full border border-q-accent/25 bg-q-accent/10 px-2.5 py-1 text-xs font-medium text-q-accent"
                        >
                          {perm}
                        </span>
                      ))}
                      {key.scopes.length > 2 && (
                        <span className="rounded-full border border-q-border bg-q-bg px-2.5 py-1 text-xs text-q-text-secondary">
                          +{key.scopes.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-q-text-secondary">
                    {key.lastUsedAt
                      ? key.lastUsedAt.toLocaleDateString('es-MX')
                      : 'Nunca'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-q-text">
                    {key.callsLast30Days?.toLocaleString() || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${key.status === 'active'
                        ? 'bg-q-success/10 text-q-success'
                        : 'bg-destructive/10 text-destructive'
                        }`}
                    >
                      {key.status === 'active' ? 'Activa' : 'Revocada'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    {key.status === 'active' && (
                      <button
                        onClick={() => handleRevokeKey(key.id)}
                        className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-destructive transition-colors hover:bg-destructive/10"
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
          </div>
        </>
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

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function MetricCard({ icon, label, value }: MetricCardProps) {
  return (
    <div className="h-[92px] rounded-xl border border-q-border bg-q-bg/60 p-3.5">
      <div className="flex items-center justify-between gap-2 text-q-text-secondary">
        <span className="truncate text-xs font-semibold uppercase tracking-[0.08em]">{label}</span>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-q-accent/10 text-q-accent">
          {icon}
        </span>
      </div>
      <div className="mt-4 truncate font-header text-xl font-bold text-q-text">{value}</div>
    </div>
  );
}

interface ApiKeyCardProps {
  apiKey: ApiKey;
  onRevoke: (keyId: string) => void;
}

function ApiKeyCard({ apiKey, onRevoke }: ApiKeyCardProps) {
  return (
    <article className="rounded-xl border border-q-border bg-q-surface/80 p-4 shadow-sm backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-header text-base font-semibold text-q-text">{apiKey.name}</h3>
          <p className="mt-1 text-xs text-q-text-muted">
            Creada el{' '}
            {apiKey.createdAt?.toLocaleDateString('es-MX', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${apiKey.status === 'active'
            ? 'bg-q-success/10 text-q-success'
            : 'bg-destructive/10 text-destructive'
            }`}
        >
          {apiKey.status === 'active' ? 'Activa' : 'Revocada'}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-q-border bg-q-bg/60 p-3">
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-q-text-muted">Key</div>
          <code className="mt-2 block truncate font-mono text-xs text-q-text-secondary">...{apiKey.keyPreview}</code>
        </div>
        <div className="rounded-lg border border-q-border bg-q-bg/60 p-3">
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-q-text-muted">Llamadas</div>
          <div className="mt-2 font-header text-base font-semibold text-q-text">
            {apiKey.callsLast30Days?.toLocaleString() || 0}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {apiKey.scopes.slice(0, 4).map((perm) => (
          <span
            key={perm}
            className="rounded-full border border-q-accent/25 bg-q-accent/10 px-2.5 py-1 text-xs font-medium text-q-accent"
          >
            {perm}
          </span>
        ))}
        {apiKey.scopes.length > 4 && (
          <span className="rounded-full border border-q-border bg-q-bg px-2.5 py-1 text-xs text-q-text-secondary">
            +{apiKey.scopes.length - 4}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-q-border pt-3">
        <span className="text-xs text-q-text-muted">
          Último uso: {apiKey.lastUsedAt ? apiKey.lastUsedAt.toLocaleDateString('es-MX') : 'Nunca'}
        </span>
        {apiKey.status === 'active' && (
          <button
            onClick={() => onRevoke(apiKey.id)}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            Revocar
          </button>
        )}
      </div>
    </article>
  );
}

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
      className="block rounded-xl border border-q-border bg-q-surface/80 p-5 shadow-sm backdrop-blur-md transition-all hover:border-q-accent/50 hover:bg-q-surface-overlay/30"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="rounded-xl bg-q-accent/10 p-2 text-q-accent">{icon}</div>
        <h3 className="font-header font-semibold text-q-text">{title}</h3>
      </div>
      <p className="font-body text-sm text-q-text-secondary">{description}</p>
    </a>
  );
}

interface CreateApiKeyModalProps {
  onClose: () => void;
  onCreate: (data: CreateApiKeyData) => Promise<string | undefined>;
  onSuccess: (key: string) => void;
}

function CreateApiKeyModal({
  onClose,
  onCreate,
  onSuccess,
}: CreateApiKeyModalProps) {
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>([
    'projects:read',
    'projects:write',
    'templates:read',
    'ai:generate_content',
    'ai:generate_image',
    'ai:generate_batch',
    'ai:apply_to_project',
  ]);
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(
    undefined
  );
  const [isCreating, setIsCreating] = useState(false);
  const scopeGroups = useMemo(getScopeGroups, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsCreating(true);
    try {
      const createdKey = await onCreate({ name, scopes, expiresInDays });
      if (createdKey) {
        onSuccess(createdKey);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const toggleScope = (scopeId: string) => {
    setScopes((prev) =>
      prev.includes(scopeId)
        ? prev.filter((p) => p !== scopeId)
        : [...prev, scopeId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-q-bg/80 p-4 backdrop-blur-md">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-q-border bg-q-surface shadow-2xl">
        <div className="border-b border-q-border p-6">
          <h2 className="font-header text-2xl font-bold text-q-text">
            Crear Nueva API Key
          </h2>
          <p className="font-body text-sm text-q-text-secondary mt-1">
            Configura una nueva API key para acceso programático
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-q-text mb-2">
              Nombre de la API Key *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-q-border bg-q-bg px-4 py-2.5 text-q-text placeholder:text-q-text-muted focus:border-q-accent focus:outline-none focus:ring-2 focus:ring-q-accent/30"
              placeholder="Ej: Production API, CI/CD Pipeline"
              required
            />
          </div>

          {/* Permissions */}
          <div>
            <label className="block text-sm font-semibold text-q-text mb-3">
              Permisos *
            </label>
            <div className="space-y-4">
              {scopeGroups.map((group) => (
                <section key={group.category} className="rounded-xl border border-q-border bg-q-bg/40 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="font-header text-sm font-semibold text-q-text">{group.category}</h3>
                    <span className="rounded-full border border-q-border bg-q-surface px-2.5 py-1 text-xs text-q-text-secondary">
                      {group.scopes.filter((scope) => scopes.includes(scope.id)).length}/{group.scopes.length}
                    </span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {group.scopes.map((perm) => (
                      <label
                        key={perm.id}
                        className={`flex min-h-[88px] cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${scopes.includes(perm.id)
                          ? 'border-q-accent/50 bg-q-accent/10'
                          : 'border-q-border bg-q-surface/50 hover:bg-q-surface-overlay/30'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={scopes.includes(perm.id)}
                          onChange={() => toggleScope(perm.id)}
                          className="mt-1 accent-[var(--q-accent)]"
                        />
                        <span className="min-w-0">
                          <span className="block font-header text-sm font-semibold text-q-text">{perm.name}</span>
                          <span className="mt-1 block text-xs leading-5 text-q-text-secondary">{perm.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>

          {/* Expiration */}
          <div>
            <label className="block text-sm font-semibold text-q-text mb-2">
              Expiración (opcional)
            </label>
            <select
              value={expiresInDays || ''}
              onChange={(e) =>
                setExpiresInDays(
                  e.target.value ? parseInt(e.target.value) : undefined
                )
              }
              className="w-full rounded-lg border border-q-border bg-q-bg px-4 py-2.5 text-q-text focus:border-q-accent focus:outline-none focus:ring-2 focus:ring-q-accent/30"
            >
              <option value="">Sin expiración</option>
              <option value="30">30 días</option>
              <option value="90">90 días</option>
              <option value="180">180 días</option>
              <option value="365">1 año</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 border-t border-q-border pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-q-border px-5 py-2.5 font-button text-sm font-semibold text-q-text-secondary transition-colors hover:bg-q-surface-overlay hover:text-q-text"
              disabled={isCreating}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-q-accent px-5 py-2.5 font-button text-sm font-semibold text-primary-foreground transition-all hover:bg-q-accent/90 disabled:opacity-50"
              disabled={isCreating || scopes.length === 0}
            >
              {isCreating ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-q-bg/40 border-t-transparent" />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-q-bg/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-xl border border-q-border bg-q-surface shadow-2xl">
        <div className="border-b border-q-border p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full bg-q-success/10 p-2 text-q-success">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="font-header text-2xl font-bold text-q-text">
              ¡API Key Creada!
            </h2>
          </div>
          <p className="font-body text-sm text-q-text-secondary">
            Guarda esta API key en un lugar seguro. No podrás verla nuevamente.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* API Key Display */}
          <div className="rounded-xl border border-q-border bg-q-bg/60 p-4">
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="text-sm font-semibold text-q-text">
                Tu API Key:
              </label>
              <button
                onClick={handleCopy}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-q-accent px-4 py-2 font-button text-sm font-semibold text-primary-foreground transition-colors hover:bg-q-accent/90"
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
            <code className="block break-all rounded-lg border border-q-border bg-q-surface p-3 font-mono text-sm text-q-text">
              {apiKey}
            </code>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 rounded-xl border border-q-warning/30 bg-q-warning/10 p-4 text-q-warning">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div>
              <h4 className="font-header font-semibold">
                Importante: Guarda esta key de forma segura
              </h4>
              <p className="font-body text-sm text-q-text-secondary mt-1">
                Por razones de seguridad, no podrás ver esta API key nuevamente.
                Guárdala en un gestor de contraseñas o variable de entorno.
              </p>
            </div>
          </div>

          {/* Example Usage */}
          <div>
            <h4 className="font-header font-semibold text-q-text mb-2">Ejemplo de Uso:</h4>
            <pre className="overflow-x-auto rounded-xl border border-q-border bg-q-bg p-4 text-sm text-q-text">
              {`curl -X POST https://www.quimera.ai/api/mcp \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'`}
            </pre>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full rounded-full bg-q-accent px-5 py-2.5 font-button text-sm font-semibold text-primary-foreground transition-colors hover:bg-q-accent/90"
          >
            Entendido, Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
