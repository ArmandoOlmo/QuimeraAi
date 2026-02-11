/**
 * Onboarding Workflow
 * Complete workflow for adding new sub-clients with progress tracking
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getFunctions, httpsCallable } from 'firebase/functions';
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
import { ClientIntakeForm } from './ClientIntakeForm';

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

interface ClientIntakeData {
  businessName: string;
  industry: string;
  contactEmail: string;
  contactPhone: string;
  projectTemplate: string;
  enabledFeatures: string[];
  initialUsers: Array<{
    email: string;
    name: string;
    role: string;
  }>;
  logo: File | null;
  primaryColor: string;
  secondaryColor: string;
  monthlyPrice: number;
  setupBilling: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function OnboardingWorkflow({
  onComplete,
  onCancel,
}: OnboardingWorkflowProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('form');
  const [progress, setProgress] = useState<ProvisioningProgress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [clientTenantId, setClientTenantId] = useState<string | null>(null);
  const [invitesSent, setInvitesSent] = useState(0);

  const functions = getFunctions();

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
      // Step 1: Upload logo if provided
      let logoUrl: string | undefined;
      if (data.logo) {
        updateProgress(
          'upload_logo',
          'in_progress',
          'Subiendo logo del cliente...'
        );

        try {
          // TODO: Implement actual file upload to Firebase Storage
          // For now, just simulate
          await new Promise((resolve) => setTimeout(resolve, 1000));
          logoUrl = 'https://example.com/logo.png'; // Placeholder

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

      const autoProvisionClient = httpsCallable(
        functions,
        'agencyOnboarding-autoProvision'
      );

      const result = await autoProvisionClient({
        businessName: data.businessName,
        industry: data.industry,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        projectTemplate: data.projectTemplate,
        enabledFeatures: data.enabledFeatures,
        initialUsers: data.initialUsers,
        logo: logoUrl,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        monthlyPrice: data.setupBilling ? data.monthlyPrice : undefined,
        paymentMethod: undefined, // Will be set up later
      });

      const response = result.data as any;

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
      <div className="bg-card rounded-lg shadow-sm p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Clock className="h-8 w-8 text-blue-600 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {t('dashboard.agency.onboardingPage.configuringClient')}
          </h2>
          <p className="text-muted-foreground">
            {t('dashboard.agency.onboardingPage.pleaseWait')}
          </p>
        </div>

        <div className="space-y-4">
          {progress.map((item, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-4 border border-border rounded-lg"
            >
              <div className="mt-1">
                {item.status === 'completed' && (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                )}
                {item.status === 'in_progress' && (
                  <div className="h-6 w-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                )}
                {item.status === 'error' && (
                  <XCircle className="h-6 w-6 text-red-500" />
                )}
                {item.status === 'pending' && (
                  <div className="h-6 w-6 border-4 border-border rounded-full" />
                )}
              </div>
              <div className="flex-1">
                <p
                  className={`font-medium ${item.status === 'error'
                    ? 'text-red-600'
                    : item.status === 'completed'
                      ? 'text-green-600'
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
      <div className="bg-card rounded-lg shadow-sm p-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
          <Rocket className="h-10 w-10 text-green-600" />
        </div>

        <h2 className="text-3xl font-bold text-foreground mb-3">
          {t('dashboard.agency.onboardingPage.success')}
        </h2>

        <p className="text-lg text-muted-foreground mb-8">
          {t('dashboard.agency.onboardingPage.workspaceConfigured')}
        </p>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-6 bg-blue-50 rounded-lg">
            <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-900">{invitesSent}</p>
            <p className="text-sm text-blue-700">{t('dashboard.agency.onboardingPage.usersInvited')}</p>
          </div>

          <div className="p-6 bg-green-50 rounded-lg">
            <FileText className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-900">1</p>
            <p className="text-sm text-green-700">{t('dashboard.agency.onboardingPage.projectCreated')}</p>
          </div>

          <div className="p-6 bg-purple-50 rounded-lg">
            <Mail className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-purple-900">{invitesSent}</p>
            <p className="text-sm text-purple-700">{t('dashboard.agency.onboardingPage.emailsSent')}</p>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-background rounded-lg p-6 mb-8 text-left">
          <h3 className="font-semibold text-foreground mb-3">
            📋 {t('dashboard.agency.onboardingPage.nextSteps')}
          </h3>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <span>
                {t('dashboard.agency.onboardingPage.nextStep1')}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <span>{t('dashboard.agency.onboardingPage.nextStep2')}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
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
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            {t('dashboard.agency.onboardingPage.viewClientDashboard')}
          </button>
          <button
            onClick={handleRetry}
            className="px-8 py-3 bg-gray-200 text-muted-foreground rounded-lg hover:bg-gray-300 font-semibold"
          >
            {t('dashboard.agency.onboardingPage.addAnotherClient')}
          </button>
        </div>
      </div>
    </div>
  );

  const renderErrorStep = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-card rounded-lg shadow-sm p-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
          <XCircle className="h-10 w-10 text-red-600" />
        </div>

        <h2 className="text-3xl font-bold text-foreground mb-3">
          {t('dashboard.agency.onboardingPage.errorTitle')}
        </h2>

        <p className="text-lg text-muted-foreground mb-8">
          {t('dashboard.agency.onboardingPage.errorDescription')}
        </p>

        {/* Error Message */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8 text-left">
          <h3 className="font-semibold text-red-900 mb-2">{t('dashboard.agency.onboardingPage.errorDetails')}</h3>
          <p className="text-red-700">{error}</p>
        </div>

        {/* Progress (what was completed) */}
        {progress.length > 0 && (
          <div className="bg-background rounded-lg p-6 mb-8 text-left">
            <h3 className="font-semibold text-foreground mb-3">
              {t('dashboard.agency.onboardingPage.completedSteps')}
            </h3>
            <div className="space-y-2">
              {progress.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  {item.status === 'completed' ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="text-muted-foreground">{item.message}</span>
                    </>
                  ) : item.status === 'error' ? (
                    <>
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span className="text-muted-foreground">{item.message}</span>
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
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            {t('dashboard.agency.onboardingPage.tryAgain')}
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-8 py-3 bg-gray-200 text-muted-foreground rounded-lg hover:bg-gray-300 font-semibold"
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
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-4xl mx-auto mb-8 text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {t('dashboard.agency.onboardingPage.addNewClient')}
        </h1>
        <p className="text-muted-foreground">
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
