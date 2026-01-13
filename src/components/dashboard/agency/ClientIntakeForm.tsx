/**
 * Client Intake Form
 * Automated onboarding form for new sub-clients
 */

import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useTenant } from '../../../contexts/tenant/TenantContext';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { toast } from 'react-hot-toast';
import { Loader2, Plus, Trash2, Check } from 'lucide-react';

interface InitialUser {
  name: string;
  email: string;
  role: string;
}

interface ClientIntakeData {
  businessName: string;
  industry: string;
  contactEmail: string;
  contactPhone: string;
  projectTemplate?: string;
  enabledFeatures: string[];
  initialUsers: InitialUser[];
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  monthlyPrice?: number;
  paymentMethod?: string;
}

const INDUSTRIES = [
  { value: 'restaurant', label: 'Restaurante' },
  { value: 'retail', label: 'Retail / Tienda' },
  { value: 'professional_services', label: 'Servicios Profesionales' },
  { value: 'healthcare', label: 'Salud' },
  { value: 'education', label: 'Educación' },
  { value: 'real_estate', label: 'Bienes Raíces' },
  { value: 'hospitality', label: 'Hotelería' },
  { value: 'construction', label: 'Construcción' },
  { value: 'automotive', label: 'Automotriz' },
  { value: 'other', label: 'Otro' },
];

const FEATURES = [
  { id: 'cms', label: 'CMS / Blog', description: 'Gestor de contenidos' },
  { id: 'leads', label: 'CRM / Leads', description: 'Captura y gestión de leads' },
  { id: 'ecommerce', label: 'E-commerce', description: 'Tienda online' },
  { id: 'chatbot', label: 'Chatbot AI', description: 'Chatbot inteligente' },
  { id: 'email', label: 'Email Marketing', description: 'Campañas de email' },
];

const USER_ROLES = [
  { value: 'client', label: 'Cliente (Owner)' },
  { value: 'client_admin', label: 'Admin' },
  { value: 'client_editor', label: 'Editor' },
];

export function ClientIntakeForm({ onSuccess }: { onSuccess?: () => void }) {
  const { currentTenant } = useTenant();
  const functions = getFunctions();

  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ClientIntakeData>({
    businessName: '',
    industry: 'other',
    contactEmail: '',
    contactPhone: '',
    enabledFeatures: ['cms', 'leads'],
    initialUsers: [
      {
        name: '',
        email: '',
        role: 'client',
      },
    ],
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
  });

  const updateFormData = (updates: Partial<ClientIntakeData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleToggleFeature = (featureId: string) => {
    updateFormData({
      enabledFeatures: formData.enabledFeatures.includes(featureId)
        ? formData.enabledFeatures.filter((f) => f !== featureId)
        : [...formData.enabledFeatures, featureId],
    });
  };

  const handleAddUser = () => {
    updateFormData({
      initialUsers: [
        ...formData.initialUsers,
        { name: '', email: '', role: 'client_editor' },
      ],
    });
  };

  const handleRemoveUser = (index: number) => {
    updateFormData({
      initialUsers: formData.initialUsers.filter((_, i) => i !== index),
    });
  };

  const handleUpdateUser = (index: number, updates: Partial<InitialUser>) => {
    const newUsers = [...formData.initialUsers];
    newUsers[index] = { ...newUsers[index], ...updates };
    updateFormData({ initialUsers: newUsers });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.businessName || !formData.contactEmail) {
      toast.error('Completa los campos requeridos');
      return;
    }

    if (formData.initialUsers.length === 0) {
      toast.error('Agrega al menos un usuario');
      return;
    }

    // Validate users
    for (const user of formData.initialUsers) {
      if (!user.name || !user.email) {
        toast.error('Completa la información de todos los usuarios');
        return;
      }
    }

    try {
      setLoading(true);
      const provision = httpsCallable(functions, 'agencyOnboarding-autoProvision');
      const result = await provision(formData) as any;

      toast.success(
        `Cliente ${result.data.clientTenantId} creado exitosamente! ${result.data.invitesSent} invitaciones enviadas.`
      );

      // Reset form
      setFormData({
        businessName: '',
        industry: 'other',
        contactEmail: '',
        contactPhone: '',
        enabledFeatures: ['cms', 'leads'],
        initialUsers: [{ name: '', email: '', role: 'client' }],
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981',
      });
      setCurrentStep(1);

      onSuccess?.();
    } catch (error: any) {
      console.error('Error provisioning client:', error);
      toast.error('Error al crear cliente: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.businessName && formData.contactEmail;
      case 2:
        return formData.enabledFeatures.length > 0;
      case 3:
        return true; // Branding is optional
      case 4:
        return formData.initialUsers.every((u) => u.name && u.email);
      default:
        return false;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center flex-1">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step === currentStep
                  ? 'bg-primary-600 text-white'
                  : step < currentStep
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
              }`}
            >
              {step < currentStep ? <Check className="w-5 h-5" /> : step}
            </div>
            {step < 4 && (
              <div
                className={`flex-1 h-1 mx-2 ${
                  step < currentStep
                    ? 'bg-green-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Business Info */}
      {currentStep === 1 && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Información del Cliente
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre del Negocio *
                </label>
                <Input
                  value={formData.businessName}
                  onChange={(e) => updateFormData({ businessName: e.target.value })}
                  placeholder="Ej: Restaurante El Buen Sabor"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Industria *
                </label>
                <select
                  value={formData.industry}
                  onChange={(e) => updateFormData({ industry: e.target.value })}
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                >
                  {INDUSTRIES.map((industry) => (
                    <option key={industry.value} value={industry.value}>
                      {industry.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email de Contacto *
                </label>
                <Input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => updateFormData({ contactEmail: e.target.value })}
                  placeholder="contacto@negocio.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Teléfono (Opcional)
                </label>
                <Input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => updateFormData({ contactPhone: e.target.value })}
                  placeholder="+52 123 456 7890"
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Step 2: Features */}
      {currentStep === 2 && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Funcionalidades
            </h3>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Selecciona las funcionalidades que estarán disponibles para este cliente
            </p>

            <div className="space-y-3">
              {FEATURES.map((feature) => (
                <label
                  key={feature.id}
                  className="flex items-start cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-3 -mx-3 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={formData.enabledFeatures.includes(feature.id)}
                    onChange={() => handleToggleFeature(feature.id)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mt-1"
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {feature.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {feature.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: Branding */}
      {currentStep === 3 && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Branding (Opcional)
            </h3>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Personaliza los colores del portal del cliente
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color Primario
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => updateFormData({ primaryColor: e.target.value })}
                    className="h-10 w-20 rounded border border-gray-300 dark:border-gray-600"
                  />
                  <Input
                    value={formData.primaryColor}
                    onChange={(e) => updateFormData({ primaryColor: e.target.value })}
                    placeholder="#3B82F6"
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color Secundario
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.secondaryColor}
                    onChange={(e) =>
                      updateFormData({ secondaryColor: e.target.value })
                    }
                    className="h-10 w-20 rounded border border-gray-300 dark:border-gray-600"
                  />
                  <Input
                    value={formData.secondaryColor}
                    onChange={(e) =>
                      updateFormData({ secondaryColor: e.target.value })
                    }
                    placeholder="#10B981"
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Logo upload would go here */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border-2 border-dashed border-gray-300 dark:border-gray-600">
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Carga de logo disponible próximamente
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Step 4: Users */}
      {currentStep === 4 && (
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Usuarios Iniciales
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Agrega los usuarios que tendrán acceso al portal del cliente
                </p>
              </div>
              <Button type="button" variant="outline" onClick={handleAddUser}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar Usuario
              </Button>
            </div>

            <div className="space-y-4">
              {formData.initialUsers.map((user, index) => (
                <div
                  key={index}
                  className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Usuario {index + 1}
                    </span>
                    {formData.initialUsers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveUser(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      value={user.name}
                      onChange={(e) =>
                        handleUpdateUser(index, { name: e.target.value })
                      }
                      placeholder="Nombre completo"
                      required
                    />
                    <Input
                      type="email"
                      value={user.email}
                      onChange={(e) =>
                        handleUpdateUser(index, { email: e.target.value })
                      }
                      placeholder="email@ejemplo.com"
                      required
                    />
                    <select
                      value={user.role}
                      onChange={(e) =>
                        handleUpdateUser(index, { role: e.target.value })
                      }
                      className="rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {USER_ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Se enviará un email de bienvenida a cada usuario con un link para acceder
                a su portal personalizado.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
          disabled={currentStep === 1 || loading}
        >
          Anterior
        </Button>

        <div className="flex items-center gap-2">
          {currentStep < 4 ? (
            <Button
              type="button"
              onClick={() => setCurrentStep((prev) => prev + 1)}
              disabled={!canProceed() || loading}
            >
              Siguiente
            </Button>
          ) : (
            <Button type="submit" disabled={!canProceed() || loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando Cliente...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Crear Cliente
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
