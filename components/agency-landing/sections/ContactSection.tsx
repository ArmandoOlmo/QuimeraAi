/**
 * ContactSection
 * Contact section for agency landing page
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, Check, Loader2 } from 'lucide-react';
import { ContactSection as ContactData, LandingBranding } from '../../../types/agencyLanding';

interface ContactSectionProps {
    data: ContactData;
    branding?: LandingBranding;
}

export function ContactSection({ data, branding }: ContactSectionProps) {
    const primaryColor = branding?.primaryColor || '#4f46e5';
    const [formState, setFormState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [formData, setFormData] = useState<Record<string, string>>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormState('loading');

        // Simulate form submission
        try {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            setFormState('success');
            setFormData({});
            setTimeout(() => setFormState('idle'), 3000);
        } catch {
            setFormState('error');
        }
    };

    const defaultFields = [
        { name: 'name', type: 'text' as const, label: 'Nombre', required: true },
        { name: 'email', type: 'email' as const, label: 'Email', required: true },
        { name: 'message', type: 'textarea' as const, label: 'Mensaje', required: true },
    ];

    const fields = data.formFields?.length ? data.formFields : defaultFields;

    return (
        <section id="contact" className="py-20 md:py-32 bg-white">
            <div className="max-w-7xl mx-auto px-6 md:px-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                        {data.title}
                    </h2>
                    {data.subtitle && (
                        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                            {data.subtitle}
                        </p>
                    )}
                </motion.div>

                <div className="grid lg:grid-cols-2 gap-16">
                    {/* Contact Info */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h3 className="text-2xl font-semibold text-gray-900 mb-8">
                            Información de Contacto
                        </h3>

                        <div className="space-y-6">
                            {data.email && (
                                <a
                                    href={`mailto:${data.email}`}
                                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                                >
                                    <div
                                        className="w-12 h-12 rounded-lg flex items-center justify-center transition-colors"
                                        style={{ backgroundColor: `${primaryColor}15` }}
                                    >
                                        <Mail className="w-6 h-6" style={{ color: primaryColor }} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Email</p>
                                        <p className="text-gray-900 font-medium group-hover:text-primary transition-colors">
                                            {data.email}
                                        </p>
                                    </div>
                                </a>
                            )}

                            {data.phone && (
                                <a
                                    href={`tel:${data.phone}`}
                                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                                >
                                    <div
                                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                                        style={{ backgroundColor: `${primaryColor}15` }}
                                    >
                                        <Phone className="w-6 h-6" style={{ color: primaryColor }} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Teléfono</p>
                                        <p className="text-gray-900 font-medium">
                                            {data.phone}
                                        </p>
                                    </div>
                                </a>
                            )}

                            {data.address && (
                                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                                    <div
                                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                                        style={{ backgroundColor: `${primaryColor}15` }}
                                    >
                                        <MapPin className="w-6 h-6" style={{ color: primaryColor }} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Dirección</p>
                                        <p className="text-gray-900 font-medium">
                                            {data.address}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Social Links */}
                        {data.socialLinks && Object.keys(data.socialLinks).length > 0 && (
                            <div className="mt-8">
                                <p className="text-sm text-gray-500 mb-4">Síguenos</p>
                                <div className="flex gap-3">
                                    {data.socialLinks.facebook && (
                                        <a
                                            href={data.socialLinks.facebook}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:text-white transition-colors"
                                            style={{ ':hover': { backgroundColor: primaryColor } } as any}
                                        >
                                            FB
                                        </a>
                                    )}
                                    {data.socialLinks.instagram && (
                                        <a
                                            href={data.socialLinks.instagram}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-pink-500 hover:text-white transition-colors"
                                        >
                                            IG
                                        </a>
                                    )}
                                    {data.socialLinks.linkedin && (
                                        <a
                                            href={data.socialLinks.linkedin}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-blue-600 hover:text-white transition-colors"
                                        >
                                            LI
                                        </a>
                                    )}
                                    {data.socialLinks.twitter && (
                                        <a
                                            href={data.socialLinks.twitter}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-sky-500 hover:text-white transition-colors"
                                        >
                                            TW
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* Contact Form */}
                    {data.showForm && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {fields.map((field) => (
                                    <div key={field.name}>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {field.label}
                                            {field.required && <span className="text-red-500 ml-1">*</span>}
                                        </label>

                                        {field.type === 'textarea' ? (
                                            <textarea
                                                name={field.name}
                                                required={field.required}
                                                rows={4}
                                                value={formData[field.name] || ''}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, [field.name]: e.target.value })
                                                }
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all resize-none"
                                                style={{ '--tw-ring-color': primaryColor } as any}
                                            />
                                        ) : field.type === 'select' ? (
                                            <select
                                                name={field.name}
                                                required={field.required}
                                                value={formData[field.name] || ''}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, [field.name]: e.target.value })
                                                }
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all"
                                            >
                                                <option value="">Seleccionar...</option>
                                                {field.options?.map((option) => (
                                                    <option key={option} value={option}>
                                                        {option}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type={field.type}
                                                name={field.name}
                                                required={field.required}
                                                value={formData[field.name] || ''}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, [field.name]: e.target.value })
                                                }
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all"
                                            />
                                        )}
                                    </div>
                                ))}

                                <button
                                    type="submit"
                                    disabled={formState === 'loading' || formState === 'success'}
                                    className="w-full py-4 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-70"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {formState === 'loading' && (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Enviando...
                                        </>
                                    )}
                                    {formState === 'success' && (
                                        <>
                                            <Check className="w-5 h-5" />
                                            ¡Mensaje enviado!
                                        </>
                                    )}
                                    {(formState === 'idle' || formState === 'error') && (
                                        <>
                                            <Send className="w-5 h-5" />
                                            Enviar Mensaje
                                        </>
                                    )}
                                </button>

                                {formState === 'error' && (
                                    <p className="text-red-500 text-sm text-center">
                                        Hubo un error. Por favor intenta de nuevo.
                                    </p>
                                )}
                            </form>
                        </motion.div>
                    )}
                </div>
            </div>
        </section>
    );
}

export default ContactSection;
