/**
 * Onboarding Workflow
 * Complete workflow for adding new sub-clients with progress tracking
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  FileText,
  Mail,
  CreditCard,
  Rocket,
} from 'lucide-react';
import { ClientIntakeForm, type ClientIntakeData } from './ClientIntakeForm';
import { useTenant } from '../../../contexts/tenant/TenantContext';

// ============================================================================
// TYPES
// ============================================================================

type WorkflowStep =
  | 'form'
  | 'provisioning'
  | 'completed'
  | 'error';

interface ProvisioningProgress {
  step: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  message: string;
}

interface OnboardingWorkflowProps {
  onComplete?: (clientTenantId: string) => void;
  onCancel?: () => void;
}

type SupabaseClient = typeof import('@/supabase')['supabase'];

const CLIENT_LOGO_BUCKET = 'platform-assets';
const MAX_CLIENT_LOGO_SIZE_BYTES = 2 * 1024 * 1024;

function sanitizeStorageFileName(fileName: string): string {
  const [rawBaseName, ...extensionParts] = fileName.split('.');
  const extension = extensionParts.length > 0
    ? `.${extensionParts.pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png'}`
    : '';
  const baseName = rawBaseName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'client-logo';

  return `${baseName}${extension}`;
}

function buildClientLogoStoragePath(agencyTenantId: string, fileName: string): string {
  const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `agencies/${agencyTenantId}/client-logos/${Date.now()}_${randomId}_${sanitizeStorageFileName(fileName)}`;
}

async function uploadClientLogoToStorage(
  supabaseClient: SupabaseClient,
  agencyTenantId: string,
  file: File,
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El logo debe ser una imagen válida.');
  }

  if (file.size > MAX_CLIENT_LOGO_SIZE_BYTES) {
    throw new Error('El logo no puede superar 2MB.');
  }

  const storagePath = buildClientLogoStoragePath(agencyTenantId, file.name);
  const { error: uploadError } = await supabaseClient.storage
    .from(CLIENT_LOGO_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabaseClient.storage
    .from(CLIENT_LOGO_BUCKET)
    .getPublicUrl(storagePath);

  return publicUrl;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function OnboardingWorkflow({
  onComplete,
  onCancel,
}: OnboardingWorkflowProps) {
  const { t } = useTranslation();
  const { currentTenant } = useTenant();
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('form');
  const [progress, setProgress] = useState<ProvisioningProgress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [clientTenantId, setClientTenantId] = useState<string | null>(null);
  const [invitesSent, setInvitesSent] = useState(0);



  // ============================================================================
  // HANDLERS
  // ============================================================================

  const updateProgress = (
    step: string,
    status: ProvisioningProgress['status'],
    message: string
  ) => {
    setProgress((prev) => {
      const existing = prev.find((p) => p.step === step);
      if (existing) {
        return prev.map((p) =>
          p.step === step ? { ...p, status, message } : p
        );
      }
      return [...prev, { step, status, message }];
    });
  };

  const handleFormSubmit = async (data: ClientIntakeData) => {
    setCurrentStep('provisioning');
    setError(null);
    setProgress([]);

    try {
      const { supabase } = await import('@/supabase');
      if (!currentTenant?.id) {
        throw new Error('No hay agencia activa para crear el cliente.');
      }

      // Step 1: Upload logo if provided
      let logoUrl: string | undefined;
      if (data.logo) {
        updateProgress(
          'upload_logo',
          'in_progress',
          'Subiendo logo del cliente...'
        );

        try {
          logoUrl = await uploadClientLogoToStorage(supabase, currentTenant.id, data.logo);

          updateProgress(
            'upload_logo',
            'completed',
            'Logo subido correctamente'
          );
        } catch (err) {
          updateProgress('upload_logo', 'error', 'Error al subir logo');
          throw err;
        }
      }

      // Step 2: Provision client tenant
      updateProgress(
        'provision_tenant',
        'in_progress',
        'Creando workspace del cliente...'
      );

      const result = await supabase.functions.invoke('onboarding-api', {
        body: {
            action: 'autoProvision',
            agencyTenantId: currentTenant.id,
            businessName: data.businessName,
            industry: data.industry,
            contactEmail: data.contactEmail,
            contactPhone: data.contactPhone,
            projectTemplate: data.projectTemplate,
            enabledFeatures: data.enabledFeatures,
            initialUsers: data.initialUsers,
            logoUrl,
            primaryColor: data.primaryColor,
            secondaryColor: data.secondaryColor,
            monthlyPrice: data.setupBilling ? data.monthlyPrice : undefined,
            selectedPlanId: data.selectedPlanId,
            selectedPlanName: data.selectedPlanName,
            setupBilling: data.setupBilling,
            aiStudioMode: data.aiStudioMode,
            generateWebsite: data.generateWebsite,
            generateStorefront: data.generateStorefront,
            generateEcommerce: data.generateEcommerce,
            generateChatbot: data.generateChatbot,
            generateEmailFlows: data.generateEmailFlows,
            generateAppointments: data.generateAppointments,
            generateRestaurantModule: data.generateRestaurantModule,
            generateRealtyModule: data.generateRealtyModule,
            generateBioPage: data.generateBioPage,
            generateMediaAssets: data.generateMediaAssets,
        }
      });

      if (result.error) throw result.error;
      const response = result.data?.data || result.data;

      if (!response.success) {
        throw new Error('Failed to provision client');
      }

      setClientTenantId(response.clientTenantId);
      setInvitesSent(response.invitesSent);

      updateProgress(
        'provision_tenant',
        'completed',
        `Workspace "${data.businessName}" creado exitosamente`
      );

      // Step 3: Project created (if applicable)
      if (response.projectId) {
        updateProgress(
          'create_project',
          'completed',
          'Proyecto inicial creado desde template'
        );
      }

      // Step 4: Users invited
      updateProgress(
        'invite_users',
        'completed',
        `${response.invitesSent} invitaciones enviadas por email`
      );

      // Step 5: Billing setup (if applicable)
      if (data.setupBilling) {
        updateProgress(
          'setup_billing',
          'completed',
          `Configuración de facturación guardada ($${data.monthlyPrice}/mes)`
        );
      }

      // Complete!
      setCurrentStep('completed');
    } catch (err: any) {
      console.error('Error in onboarding workflow:', err);
      setError(
        err.message || 'Ocurrió un error durante el proceso de onboarding'
      );
      setCurrentStep('error');

      // Mark current step as error
      const lastProgress = progress[progress.length - 1];
      if (lastProgress && lastProgress.status === 'in_progress') {
        updateProgress(lastProgress.step, 'error', 'Error en este paso');
      }
    }
  };

  const handleRetry = () => {
    setCurrentStep('form');
    setProgress([]);
    setError(null);
    setClientTenantId(null);
    setInvitesSent(0);
  };

  const handleGoToDashboard = () => {
    if (clientTenantId && onComplete) {
      onComplete(clientTenantId);
    }
  };

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  const renderFormStep = () => (
    <ClientIntakeForm onSubmit={handleFormSubmit} onCancel={onCancel} />
  );

  const renderProvisioningStep = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-q-surface rounded-lg shadow-sm p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-q-accent/10 rounded-full mb-4">
            <Clock className="h-8 w-8 text-q-accent animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {t('dashboard.agency.onboardingPage.configuringClient')}
          </h2>
          <p className="text-q-text-muted">
            {t('dashboard.agency.onboardingPage.pleaseWait')}
          </p>
        </div>

        <div className="space-y-4">
          {progress.map((item, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-4 border border-q-border rounded-lg"
            >
              <div className="mt-1">
                {item.status === 'completed' && (
                  <CheckCircle2 className="h-6 w-6 text-q-success" />
                )}
                {item.status === 'in_progress' && (
                  <div className="h-6 w-6 border-4 border-q-accent/25 border-t-transparent rounded-full animate-spin" />
                )}
                {item.status === 'error' && (
                  <XCircle className="h-6 w-6 text-q-error" />
                )}
                {item.status === 'pending' && (
                  <div className="h-6 w-6 border-4 border-q-border rounded-full" />
                )}
              </div>
              <div className="flex-1">
                <p
                  className={`font-medium ${item.status === 'error'
                    ? 'text-q-error'
                    : item.status === 'completed'
                      ? 'text-q-success'
                      : 'text-foreground'
                    }`}
                >
                  {item.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCompletedStep = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-q-surface rounded-lg shadow-sm p-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-q-success/10 rounded-full mb-6">
          <Rocket className="h-10 w-10 text-q-success" />
        </div>

        <h2 className="text-3xl font-bold text-foreground mb-3">
          {t('dashboard.agency.onboardingPage.success')}
        </h2>

        <p className="text-lg text-q-text-muted mb-8">
          {t('dashboard.agency.onboardingPage.workspaceConfigured')}
        </p>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-6 bg-q-accent/10 rounded-lg">
            <Users className="h-8 w-8 text-q-accent mx-auto mb-2" />
            <p className="text-2xl font-bold text-q-accent">{invitesSent}</p>
            <p className="text-sm text-q-accent">{t('dashboard.agency.onboardingPage.usersInvited')}</p>
          </div>

          <div className="p-6 bg-q-success/10 rounded-lg">
            <FileText className="h-8 w-8 text-q-success mx-auto mb-2" />
            <p className="text-2xl font-bold text-q-success">1</p>
            <p className="text-sm text-q-success">{t('dashboard.agency.onboardingPage.projectCreated')}</p>
          </div>

          <div className="p-6 bg-q-accent/10 rounded-lg">
            <Mail className="h-8 w-8 text-q-accent mx-auto mb-2" />
            <p className="text-2xl font-bold text-q-accent">{invitesSent}</p>
            <p className="text-sm text-q-accent">{t('dashboard.agency.onboardingPage.emailsSent')}</p>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-q-bg rounded-lg p-6 mb-8 text-left">
          <h3 className="font-semibold text-foreground mb-3">
            📋 {t('dashboard.agency.onboardingPage.nextSteps')}
          </h3>
          <ul className="space-y-2 text-q-text-muted">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-q-success mt-0.5" />
              <span>
                {t('dashboard.agency.onboardingPage.nextStep1')}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-q-success mt-0.5" />
              <span>{t('dashboard.agency.onboardingPage.nextStep2')}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-q-success mt-0.5" />
              <span>
                {t('dashboard.agency.onboardingPage.nextStep3')}
              </span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleGoToDashboard}
            className="px-8 py-3 bg-q-accent text-q-text-on-accent rounded-lg hover:bg-q-accent font-semibold"
          >
            {t('dashboard.agency.onboardingPage.viewClientDashboard')}
          </button>
          <button
            onClick={handleRetry}
            className="px-8 py-3 bg-q-border text-q-text-muted rounded-lg hover:bg-q-border font-semibold"
          >
            {t('dashboard.agency.onboardingPage.addAnotherClient')}
          </button>
        </div>
      </div>
    </div>
  );

  const renderErrorStep = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-q-surface rounded-lg shadow-sm p-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-q-error/10 rounded-full mb-6">
          <XCircle className="h-10 w-10 text-q-error" />
        </div>

        <h2 className="text-3xl font-bold text-foreground mb-3">
          {t('dashboard.agency.onboardingPage.errorTitle')}
        </h2>

        <p className="text-lg text-q-text-muted mb-8">
          {t('dashboard.agency.onboardingPage.errorDescription')}
        </p>

        {/* Error Message */}
        <div className="bg-q-error/10 border border-q-error/25 rounded-lg p-6 mb-8 text-left">
          <h3 className="font-semibold text-q-error mb-2">{t('dashboard.agency.onboardingPage.errorDetails')}</h3>
          <p className="text-q-error">{error}</p>
        </div>

        {/* Progress (what was completed) */}
        {progress.length > 0 && (
          <div className="bg-q-bg rounded-lg p-6 mb-8 text-left">
            <h3 className="font-semibold text-foreground mb-3">
              {t('dashboard.agency.onboardingPage.completedSteps')}
            </h3>
            <div className="space-y-2">
              {progress.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  {item.status === 'completed' ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-q-success" />
                      <span className="text-q-text-muted">{item.message}</span>
                    </>
                  ) : item.status === 'error' ? (
                    <>
                      <XCircle className="h-5 w-5 text-q-error" />
                      <span className="text-q-text-muted">{item.message}</span>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleRetry}
            className="px-8 py-3 bg-q-accent text-q-text-on-accent rounded-lg hover:bg-q-accent font-semibold"
          >
            {t('dashboard.agency.onboardingPage.tryAgain')}
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-8 py-3 bg-q-border text-q-text-muted rounded-lg hover:bg-q-border font-semibold"
            >
              {t('common.cancel')}
            </button>
          )}
        </div>
      </div>
    </div >
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-q-bg py-12 px-6">
      <div className="max-w-4xl mx-auto mb-8 text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {t('dashboard.agency.onboardingPage.addNewClient')}
        </h1>
        <p className="text-q-text-muted">
          {t('dashboard.agency.onboardingPage.completeOnboarding')}
        </p>
      </div>

      {currentStep === 'form' && renderFormStep()}
      {currentStep === 'provisioning' && renderProvisioningStep()}
      {currentStep === 'completed' && renderCompletedStep()}
      {currentStep === 'error' && renderErrorStep()}
    </div>
  );
}
