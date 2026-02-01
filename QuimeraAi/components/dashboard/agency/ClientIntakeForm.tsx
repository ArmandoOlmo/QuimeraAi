/**
 * Client Intake Form
 * Complete form for onboarding new sub-clients
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Mail,
  Phone,
  Palette,
  CreditCard,
  Users,
  CheckCircle2,
  AlertCircle,
  Package,
} from 'lucide-react';
import { useTenant } from '../../../contexts/tenant/TenantContext';
import { AgencyPlanCardSelector } from './plans';
import { AgencyPlan } from '../../../types/agencyPlans';

// ============================================================================
// TYPES
// ============================================================================

interface ClientIntakeData {
  // Basic Information
  businessName: string;
  industry: string;
  contactEmail: string;
  contactPhone: string;

  // Initial Configuration
  projectTemplate: string;
  enabledFeatures: string[];
  initialUsers: InitialUser[];

  // Branding
  logo: File | null;
  primaryColor: string;
  secondaryColor: string;

  // Billing (optional)
  monthlyPrice: number;
  setupBilling: boolean;

  // Plan assignment (optional)
  selectedPlanId: string | null;
  selectedPlanName: string | null;
}

interface InitialUser {
  email: string;
  name: string;
  role: 'client' | 'client_admin' | 'client_user';
}

interface ClientIntakeFormProps {
  onSubmit: (data: ClientIntakeData) => Promise<void>;
  onCancel?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ClientIntakeForm({ onSubmit, onCancel }: ClientIntakeFormProps) {
  const { t } = useTranslation();
  const { currentTenant } = useTenant();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Translation-based constants - moved inside component to access t()
  const INDUSTRIES = [
    { value: 'restaurant', label: t('dashboard.agency.newClientPage.industries.restaurant') },
    { value: 'retail', label: t('dashboard.agency.newClientPage.industries.retail') },
    { value: 'professional_services', label: t('dashboard.agency.newClientPage.industries.professional_services') },
    { value: 'healthcare', label: t('dashboard.agency.newClientPage.industries.healthcare') },
    { value: 'real_estate', label: t('dashboard.agency.newClientPage.industries.real_estate') },
    { value: 'education', label: t('dashboard.agency.newClientPage.industries.education') },
    { value: 'technology', label: t('dashboard.agency.newClientPage.industries.technology') },
    { value: 'hospitality', label: t('dashboard.agency.newClientPage.industries.hospitality') },
    { value: 'fitness', label: t('dashboard.agency.newClientPage.industries.fitness') },
    { value: 'other', label: t('dashboard.agency.newClientPage.industries.other') },
  ];

  const AVAILABLE_FEATURES = [
    { id: 'cms', label: t('dashboard.agency.newClientPage.features.cms'), description: t('dashboard.agency.newClientPage.features.cmsDesc') },
    { id: 'leads', label: t('dashboard.agency.newClientPage.features.leads'), description: t('dashboard.agency.newClientPage.features.leadsDesc') },
    { id: 'ecommerce', label: t('dashboard.agency.newClientPage.features.ecommerce'), description: t('dashboard.agency.newClientPage.features.ecommerceDesc') },
    { id: 'chatbot', label: t('dashboard.agency.newClientPage.features.chatbot'), description: t('dashboard.agency.newClientPage.features.chatbotDesc') },
    { id: 'email', label: t('dashboard.agency.newClientPage.features.email'), description: t('dashboard.agency.newClientPage.features.emailDesc') },
    { id: 'analytics', label: t('dashboard.agency.newClientPage.features.analytics'), description: t('dashboard.agency.newClientPage.features.analyticsDesc') },
  ];

  const USER_ROLES = [
    { value: 'client_admin', label: t('dashboard.agency.newClientPage.roles.client_admin'), description: t('dashboard.agency.newClientPage.roles.client_adminDesc') },
    { value: 'client', label: t('dashboard.agency.newClientPage.roles.client'), description: t('dashboard.agency.newClientPage.roles.clientDesc') },
    { value: 'client_user', label: t('dashboard.agency.newClientPage.roles.client_user'), description: t('dashboard.agency.newClientPage.roles.client_userDesc') },
  ];

  const [formData, setFormData] = useState<ClientIntakeData>({
    businessName: '',
    industry: '',
    contactEmail: '',
    contactPhone: '',
    projectTemplate: 'default',
    enabledFeatures: ['cms', 'leads'],
    initialUsers: [],
    logo: null,
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    monthlyPrice: 0,
    setupBilling: false,
    selectedPlanId: null,
    selectedPlanName: null,
  });

  // Handle plan selection
  const handlePlanSelect = (plan: AgencyPlan | null) => {
    if (plan) {
      setFormData({
        ...formData,
        selectedPlanId: plan.id,
        selectedPlanName: plan.name,
        monthlyPrice: plan.price,
        setupBilling: true,
      });
    } else {
      setFormData({
        ...formData,
        selectedPlanId: null,
        selectedPlanName: null,
      });
    }
  };

  const totalSteps = 4;

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.businessName.trim()) {
        newErrors.businessName = t('dashboard.agency.newClientPage.businessNameRequired');
      }
      if (!formData.industry) {
        newErrors.industry = t('dashboard.agency.newClientPage.industryRequired');
      }
      if (!formData.contactEmail.trim()) {
        newErrors.contactEmail = t('dashboard.agency.newClientPage.contactEmailRequired');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
        newErrors.contactEmail = t('dashboard.agency.newClientPage.invalidEmail');
      }
    }

    if (step === 2) {
      if (formData.enabledFeatures.length === 0) {
        newErrors.enabledFeatures = t('dashboard.agency.newClientPage.selectAtLeastOneFeature');
      }
    }

    if (step === 4) {
      if (formData.initialUsers.length === 0) {
        newErrors.initialUsers = t('dashboard.agency.newClientPage.addAtLeastOneUser');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep(currentStep)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ submit: t('dashboard.agency.newClientPage.errorCreating') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addUser = () => {
    setFormData({
      ...formData,
      initialUsers: [
        ...formData.initialUsers,
        { email: '', name: '', role: 'client' },
      ],
    });
  };

  const updateUser = (index: number, field: keyof InitialUser, value: string) => {
    const updatedUsers = [...formData.initialUsers];
    updatedUsers[index] = { ...updatedUsers[index], [field]: value };
    setFormData({ ...formData, initialUsers: updatedUsers });
  };

  const removeUser = (index: number) => {
    setFormData({
      ...formData,
      initialUsers: formData.initialUsers.filter((_, i) => i !== index),
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, logo: file });
    }
  };

  const toggleFeature = (featureId: string) => {
    const features = formData.enabledFeatures.includes(featureId)
      ? formData.enabledFeatures.filter((f) => f !== featureId)
      : [...formData.enabledFeatures, featureId];

    setFormData({ ...formData, enabledFeatures: features });
  };

  // ============================================================================
  // RENDER STEPS
  // ============================================================================

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          {t('dashboard.agency.newClientPage.clientInfo')}
        </h3>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('dashboard.agency.newClientPage.businessName')} *
        </label>
        <input
          type="text"
          value={formData.businessName}
          onChange={(e) =>
            setFormData({ ...formData, businessName: e.target.value })
          }
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${errors.businessName ? 'border-red-500' : 'border-border'
            }`}
          placeholder={t('dashboard.agency.newClientPage.businessNamePlaceholder')}
        />
        {errors.businessName && (
          <p className="text-sm text-red-600 mt-1">{errors.businessName}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('dashboard.agency.newClientPage.industry')} *
        </label>
        <select
          value={formData.industry}
          onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${errors.industry ? 'border-red-500' : 'border-border'
            }`}
        >
          <option value="">{t('dashboard.agency.newClientPage.selectIndustry')}</option>
          {INDUSTRIES.map((industry) => (
            <option key={industry.value} value={industry.value}>
              {industry.label}
            </option>
          ))}
        </select>
        {errors.industry && (
          <p className="text-sm text-red-600 mt-1">{errors.industry}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Mail className="h-4 w-4" />
            {t('dashboard.agency.newClientPage.contactEmail')} *
          </label>
          <input
            type="email"
            value={formData.contactEmail}
            onChange={(e) =>
              setFormData({ ...formData, contactEmail: e.target.value })
            }
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${errors.contactEmail ? 'border-red-500' : 'border-border'
              }`}
            placeholder={t('dashboard.agency.newClientPage.contactEmailPlaceholder')}
          />
          {errors.contactEmail && (
            <p className="text-sm text-red-600 mt-1">{errors.contactEmail}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Phone className="h-4 w-4" />
            {t('dashboard.agency.newClientPage.contactPhone')}
          </label>
          <input
            type="tel"
            value={formData.contactPhone}
            onChange={(e) =>
              setFormData({ ...formData, contactPhone: e.target.value })
            }
            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder={t('dashboard.agency.newClientPage.contactPhonePlaceholder')}
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {t('dashboard.agency.newClientPage.initialFeatures')}
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          {t('dashboard.agency.newClientPage.selectFeatures')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AVAILABLE_FEATURES.map((feature) => (
          <div
            key={feature.id}
            onClick={() => toggleFeature(feature.id)}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.enabledFeatures.includes(feature.id)
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-border'
              }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {formData.enabledFeatures.includes(feature.id) ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <div className="h-5 w-5 border-2 border-border rounded-full" />
                )}
              </div>
              <div>
                <h4 className="font-medium text-foreground">{feature.label}</h4>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {errors.enabledFeatures && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {errors.enabledFeatures}
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          {t('dashboard.agency.newClientPage.brandingOptional')}
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          {t('dashboard.agency.newClientPage.customizePortal')}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('dashboard.agency.newClientPage.clientLogo')}
        </label>
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
          />
          {formData.logo && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              {t('dashboard.agency.newClientPage.uploaded')}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('dashboard.agency.newClientPage.primaryColor')}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={formData.primaryColor}
              onChange={(e) =>
                setFormData({ ...formData, primaryColor: e.target.value })
              }
              className="h-10 w-16 rounded cursor-pointer"
            />
            <input
              type="text"
              value={formData.primaryColor}
              onChange={(e) =>
                setFormData({ ...formData, primaryColor: e.target.value })
              }
              className="flex-1 px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="#3B82F6"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t('dashboard.agency.newClientPage.secondaryColor')}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={formData.secondaryColor}
              onChange={(e) =>
                setFormData({ ...formData, secondaryColor: e.target.value })
              }
              className="h-10 w-16 rounded cursor-pointer"
            />
            <input
              type="text"
              value={formData.secondaryColor}
              onChange={(e) =>
                setFormData({ ...formData, secondaryColor: e.target.value })
              }
              className="flex-1 px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="#10B981"
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="p-6 border border-border rounded-lg">
        <p className="text-sm font-medium text-foreground mb-3">{t('dashboard.agency.newClientPage.preview')}</p>
        <div
          className="h-24 rounded-lg flex items-center justify-center text-white font-semibold"
          style={{
            background: `linear-gradient(135deg, ${formData.primaryColor} 0%, ${formData.secondaryColor} 100%)`,
          }}
        >
          {formData.businessName || t('dashboard.agency.newClientPage.businessName')}
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          {t('dashboard.agency.newClientPage.initialUsers')}
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          {t('dashboard.agency.newClientPage.addUsersDesc')}
        </p>
      </div>

      {formData.initialUsers.map((user, index) => (
        <div key={index} className="p-4 border border-border rounded-lg">
          <div className="flex justify-between items-start mb-4">
            <h4 className="font-medium text-foreground">{t('dashboard.agency.newClientPage.userNumber')} {index + 1}</h4>
            <button
              type="button"
              onClick={() => removeUser(index)}
              className="text-red-600 text-sm hover:text-red-700"
            >
              {t('dashboard.agency.newClientPage.removeUser')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('dashboard.agency.newClientPage.name')}
              </label>
              <input
                type="text"
                value={user.name}
                onChange={(e) => updateUser(index, 'name', e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder={t('dashboard.agency.newClientPage.namePlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('dashboard.agency.newClientPage.email')}
              </label>
              <input
                type="email"
                value={user.email}
                onChange={(e) => updateUser(index, 'email', e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder={t('dashboard.agency.newClientPage.emailPlaceholder')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('dashboard.agency.newClientPage.role')}
            </label>
            <select
              value={user.role}
              onChange={(e) =>
                updateUser(index, 'role', e.target.value as InitialUser['role'])
              }
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {USER_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label} - {role.description}
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addUser}
        className="w-full py-3 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        {t('dashboard.agency.newClientPage.addUser')}
      </button>

      {errors.initialUsers && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {errors.initialUsers}
        </div>
      )}

      {/* Plan Selection Section */}
      <div className="border-t pt-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <Package className="h-5 w-5 text-primary" />
          <h4 className="font-semibold text-foreground">
            {t('dashboard.agency.newClientPage.planAssignment', 'Asignar Plan de Servicio')}
          </h4>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {t('dashboard.agency.newClientPage.planAssignmentDesc', 'Selecciona un plan predefinido o configura facturación manual abajo.')}
        </p>

        {currentTenant?.id && (
          <AgencyPlanCardSelector
            tenantId={currentTenant.id}
            selectedPlanId={formData.selectedPlanId}
            onChange={handlePlanSelect}
            showDetails={true}
          />
        )}

        {formData.selectedPlanId && (
          <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">
                {t('dashboard.agency.newClientPage.planSelected', 'Plan seleccionado')}: {formData.selectedPlanName}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t('dashboard.agency.newClientPage.planSelectedDesc', 'El cliente heredará los límites y precio de este plan.')}
            </p>
          </div>
        )}
      </div>

      {/* Manual Billing Section */}
      <div className="border-t pt-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="h-5 w-5 text-primary" />
          <h4 className="font-semibold text-foreground">
            {formData.selectedPlanId
              ? t('dashboard.agency.newClientPage.billingOverride', 'Sobrescribir Precio (Opcional)')
              : t('dashboard.agency.newClientPage.billingSetupOptional')}
          </h4>
        </div>

        {!formData.selectedPlanId && (
          <label className="flex items-start gap-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={formData.setupBilling}
              onChange={(e) =>
                setFormData({ ...formData, setupBilling: e.target.checked })
              }
              className="mt-1"
            />
            <div>
              <p className="font-medium text-foreground">
                {t('dashboard.agency.newClientPage.setupBillingNow')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('dashboard.agency.newClientPage.defineMonthlyPrice')}
              </p>
            </div>
          </label>
        )}

        {(formData.setupBilling || formData.selectedPlanId) && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('dashboard.agency.newClientPage.monthlyPriceUsd')}
              {formData.selectedPlanId && (
                <span className="text-muted-foreground font-normal ml-2">
                  ({t('dashboard.agency.newClientPage.fromPlan', 'del plan')})
                </span>
              )}
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={formData.monthlyPrice}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  monthlyPrice: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="99"
            />
            {formData.selectedPlanId && (
              <p className="text-xs text-muted-foreground mt-1">
                {t('dashboard.agency.newClientPage.priceFromPlanNote', 'Puedes modificar el precio si deseas cobrar diferente al plan.')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="max-w-4xl mx-auto px-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`flex items-center ${step < totalSteps ? 'flex-1' : ''}`}
            >
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${step < currentStep
                  ? 'bg-green-500 text-white'
                  : step === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gray-200 text-muted-foreground'
                  }`}
              >
                {step < currentStep ? <CheckCircle2 className="h-5 w-5" /> : step}
              </div>
              {step < totalSteps && (
                <div
                  className={`flex-1 h-1 mx-2 ${step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-between text-sm">
          <span
            className={
              currentStep === 1 ? 'font-semibold text-primary' : 'text-muted-foreground'
            }
          >
            {t('dashboard.agency.newClientPage.stepInfo')}
          </span>
          <span
            className={
              currentStep === 2 ? 'font-semibold text-primary' : 'text-muted-foreground'
            }
          >
            {t('dashboard.agency.newClientPage.stepFeatures')}
          </span>
          <span
            className={
              currentStep === 3 ? 'font-semibold text-primary' : 'text-muted-foreground'
            }
          >
            {t('dashboard.agency.newClientPage.stepBranding')}
          </span>
          <span
            className={
              currentStep === 4 ? 'font-semibold text-primary' : 'text-muted-foreground'
            }
          >
            {t('dashboard.agency.newClientPage.stepUsers')}
          </span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-card rounded-lg shadow-sm p-8">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}

        {/* Error Message */}
        {errors.submit && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <p>{errors.submit}</p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex justify-between">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-6 py-2 text-muted-foreground hover:text-foreground"
                disabled={isSubmitting}
              >
                {t('dashboard.agency.newClientPage.back')}
              </button>
            )}
            {onCancel && currentStep === 1 && (
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 text-muted-foreground hover:text-foreground"
                disabled={isSubmitting}
              >
                {t('dashboard.agency.newClientPage.cancel')}
              </button>
            )}
          </div>

          <div>
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {t('dashboard.agency.newClientPage.next')}
              </button>
            ) : (
              <button
                type="submit"
                className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    {t('dashboard.agency.newClientPage.creatingClient')}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    {t('dashboard.agency.newClientPage.createClient')}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
