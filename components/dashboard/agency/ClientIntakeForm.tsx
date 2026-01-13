/**
 * Client Intake Form
 * Complete form for onboarding new sub-clients
 */

import React, { useState } from 'react';
import {
  Building2,
  Mail,
  Phone,
  Palette,
  CreditCard,
  Users,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

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
// CONSTANTS
// ============================================================================

const INDUSTRIES = [
  { value: 'restaurant', label: 'Restaurante' },
  { value: 'retail', label: 'Retail / Tienda' },
  { value: 'professional_services', label: 'Servicios Profesionales' },
  { value: 'healthcare', label: 'Salud y Bienestar' },
  { value: 'real_estate', label: 'Bienes Raíces' },
  { value: 'education', label: 'Educación' },
  { value: 'technology', label: 'Tecnología' },
  { value: 'hospitality', label: 'Hospitalidad / Hoteles' },
  { value: 'fitness', label: 'Fitness y Deportes' },
  { value: 'other', label: 'Otro' },
];

const AVAILABLE_FEATURES = [
  { id: 'cms', label: 'CMS / Blog', description: 'Editor de contenido y blog' },
  {
    id: 'leads',
    label: 'Leads y CRM',
    description: 'Gestión de leads y contactos',
  },
  {
    id: 'ecommerce',
    label: 'E-commerce',
    description: 'Tienda online y productos',
  },
  {
    id: 'chatbot',
    label: 'Chatbot con IA',
    description: 'Asistente virtual inteligente',
  },
  {
    id: 'email',
    label: 'Email Marketing',
    description: 'Campañas de email automatizadas',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description: 'Métricas y análisis web',
  },
];

const USER_ROLES = [
  { value: 'client_admin', label: 'Administrador', description: 'Acceso completo' },
  { value: 'client', label: 'Usuario', description: 'Acceso estándar' },
  { value: 'client_user', label: 'Viewer', description: 'Solo lectura' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function ClientIntakeForm({ onSubmit, onCancel }: ClientIntakeFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
  });

  const totalSteps = 4;

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.businessName.trim()) {
        newErrors.businessName = 'El nombre del negocio es requerido';
      }
      if (!formData.industry) {
        newErrors.industry = 'Selecciona una industria';
      }
      if (!formData.contactEmail.trim()) {
        newErrors.contactEmail = 'El email de contacto es requerido';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
        newErrors.contactEmail = 'Email inválido';
      }
    }

    if (step === 2) {
      if (formData.enabledFeatures.length === 0) {
        newErrors.enabledFeatures = 'Selecciona al menos una funcionalidad';
      }
    }

    if (step === 4) {
      if (formData.initialUsers.length === 0) {
        newErrors.initialUsers = 'Agrega al menos un usuario';
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
      setErrors({ submit: 'Error al crear el cliente. Intenta nuevamente.' });
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          Información del Cliente
        </h3>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nombre del Negocio *
        </label>
        <input
          type="text"
          value={formData.businessName}
          onChange={(e) =>
            setFormData({ ...formData, businessName: e.target.value })
          }
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.businessName ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Ej: Café del Centro"
        />
        {errors.businessName && (
          <p className="text-sm text-red-600 mt-1">{errors.businessName}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Industria *
        </label>
        <select
          value={formData.industry}
          onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.industry ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">Selecciona una industria</option>
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
            Email de Contacto *
          </label>
          <input
            type="email"
            value={formData.contactEmail}
            onChange={(e) =>
              setFormData({ ...formData, contactEmail: e.target.value })
            }
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.contactEmail ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="contacto@ejemplo.com"
          />
          {errors.contactEmail && (
            <p className="text-sm text-red-600 mt-1">{errors.contactEmail}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Teléfono (opcional)
          </label>
          <input
            type="tel"
            value={formData.contactPhone}
            onChange={(e) =>
              setFormData({ ...formData, contactPhone: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="+52 55 1234 5678"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Funcionalidades Iniciales
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Selecciona las herramientas que necesita este cliente
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AVAILABLE_FEATURES.map((feature) => (
          <div
            key={feature.id}
            onClick={() => toggleFeature(feature.id)}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              formData.enabledFeatures.includes(feature.id)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {formData.enabledFeatures.includes(feature.id) ? (
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                ) : (
                  <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                )}
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{feature.label}</h4>
                <p className="text-sm text-gray-600">{feature.description}</p>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Palette className="h-5 w-5 text-blue-600" />
          Branding (Opcional)
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Personaliza la apariencia del portal del cliente
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Logo del Cliente
        </label>
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {formData.logo && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              Subido
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Color Primario
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
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="#3B82F6"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Color Secundario
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
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="#10B981"
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="p-6 border border-gray-200 rounded-lg">
        <p className="text-sm font-medium text-gray-700 mb-3">Vista Previa:</p>
        <div
          className="h-24 rounded-lg flex items-center justify-center text-white font-semibold"
          style={{
            background: `linear-gradient(135deg, ${formData.primaryColor} 0%, ${formData.secondaryColor} 100%)`,
          }}
        >
          {formData.businessName || 'Nombre del Negocio'}
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          Usuarios Iniciales
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Agrega los usuarios que tendrán acceso al portal del cliente
        </p>
      </div>

      {formData.initialUsers.map((user, index) => (
        <div key={index} className="p-4 border border-gray-200 rounded-lg">
          <div className="flex justify-between items-start mb-4">
            <h4 className="font-medium text-gray-900">Usuario {index + 1}</h4>
            <button
              type="button"
              onClick={() => removeUser(index)}
              className="text-red-600 text-sm hover:text-red-700"
            >
              Eliminar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre
              </label>
              <input
                type="text"
                value={user.name}
                onChange={(e) => updateUser(index, 'name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Juan Pérez"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={user.email}
                onChange={(e) => updateUser(index, 'email', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="juan@ejemplo.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rol
            </label>
            <select
              value={user.role}
              onChange={(e) =>
                updateUser(index, 'role', e.target.value as InitialUser['role'])
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
      >
        + Agregar Usuario
      </button>

      {errors.initialUsers && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {errors.initialUsers}
        </div>
      )}

      {/* Billing Section */}
      <div className="border-t pt-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="h-5 w-5 text-blue-600" />
          <h4 className="font-semibold text-gray-900">
            Configuración de Facturación (Opcional)
          </h4>
        </div>

        <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={formData.setupBilling}
            onChange={(e) =>
              setFormData({ ...formData, setupBilling: e.target.checked })
            }
            className="mt-1"
          />
          <div>
            <p className="font-medium text-gray-900">
              Configurar facturación ahora
            </p>
            <p className="text-sm text-gray-600">
              Define el precio mensual para este cliente
            </p>
          </div>
        </label>

        {formData.setupBilling && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Precio Mensual (USD)
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="99"
            />
          </div>
        )}
      </div>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`flex items-center ${step < totalSteps ? 'flex-1' : ''}`}
            >
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                  step < currentStep
                    ? 'bg-green-500 text-white'
                    : step === currentStep
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step < currentStep ? <CheckCircle2 className="h-5 w-5" /> : step}
              </div>
              {step < totalSteps && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-between text-sm">
          <span
            className={
              currentStep === 1 ? 'font-semibold text-blue-600' : 'text-gray-600'
            }
          >
            Información
          </span>
          <span
            className={
              currentStep === 2 ? 'font-semibold text-blue-600' : 'text-gray-600'
            }
          >
            Funcionalidades
          </span>
          <span
            className={
              currentStep === 3 ? 'font-semibold text-blue-600' : 'text-gray-600'
            }
          >
            Branding
          </span>
          <span
            className={
              currentStep === 4 ? 'font-semibold text-blue-600' : 'text-gray-600'
            }
          >
            Usuarios
          </span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-8">
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
                className="px-6 py-2 text-gray-700 hover:text-gray-900"
                disabled={isSubmitting}
              >
                ← Atrás
              </button>
            )}
            {onCancel && currentStep === 1 && (
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 text-gray-700 hover:text-gray-900"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
            )}
          </div>

          <div>
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={isSubmitting}
              >
                Siguiente →
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
                    Creando Cliente...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    Crear Cliente
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
