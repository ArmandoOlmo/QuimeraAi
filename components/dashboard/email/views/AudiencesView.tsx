/**
 * AudiencesView
 * Vista para gestionar audiencias/segmentos de email
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Users,
    PlusCircle,
    Search,
    Edit,
    Trash2,
    Copy,
    MoreHorizontal,
    Filter,
    ShoppingCart,
    Mail,
    Tag,
    Calendar,
} from 'lucide-react';
import { useEmailDashboardContext } from '../EmailDashboard';
import { EmailAudience } from '../../../../types/email';

// Mock data for demonstration
const mockAudiences: Partial<EmailAudience>[] = [
    {
        id: '1',
        name: 'Todos los Suscriptores',
        description: 'Clientes que aceptaron marketing',
        acceptsMarketing: true,
        estimatedCount: 2500,
        isDefault: true,
    },
    {
        id: '2',
        name: 'Compradores Frecuentes',
        description: 'Clientes con más de 3 compras',
        minOrders: 3,
        estimatedCount: 450,
        isDefault: false,
    },
    {
        id: '3',
        name: 'Clientes VIP',
        description: 'Gastaron más de $500',
        minTotalSpent: 500,
        estimatedCount: 120,
        isDefault: false,
        tags: ['vip'],
    },
    {
        id: '4',
        name: 'Clientes Inactivos',
        description: 'Sin compras en 60 días',
        lastOrderDaysAgo: 60,
        estimatedCount: 380,
        isDefault: false,
    },
];

const AudiencesView: React.FC = () => {
    const { t } = useTranslation();
    const { userId, projectId } = useEmailDashboardContext();

    const [audiences] = useState<Partial<EmailAudience>[]>(mockAudiences);
    const [searchTerm, setSearchTerm] = useState('');
    const [showNewAudienceModal, setShowNewAudienceModal] = useState(false);

    const filteredAudiences = audiences.filter((audience) =>
        audience.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        audience.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getAudienceIcon = (audience: Partial<EmailAudience>) => {
        if (audience.minOrders) return ShoppingCart;
        if (audience.minTotalSpent) return Tag;
        if (audience.lastOrderDaysAgo) return Calendar;
        return Mail;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-foreground">
                        {t('email.audiences', 'Audiencias')}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        {t('email.audiencesSubtitle', 'Segmenta tus contactos para envíos personalizados')}
                    </p>
                </div>

                <button
                    onClick={() => setShowNewAudienceModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <PlusCircle size={18} />
                    {t('email.newAudience', 'Nuevo Segmento')}
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('email.searchAudiences', 'Buscar audiencias...')}
                    className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
            </div>

            {/* Audiences Grid */}
            {filteredAudiences.length === 0 ? (
                <div className="text-center py-12 bg-card/50 border border-border rounded-xl">
                    <Users className="mx-auto text-muted-foreground mb-4" size={48} />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        {t('email.noAudiences', 'No hay audiencias')}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                        {t('email.noAudiencesDesc', 'Crea segmentos para enviar emails más relevantes')}
                    </p>
                    <button
                        onClick={() => setShowNewAudienceModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <PlusCircle size={18} />
                        {t('email.createFirstAudience', 'Crear Primer Segmento')}
                    </button>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAudiences.map((audience) => {
                        const Icon = getAudienceIcon(audience);
                        return (
                            <div
                                key={audience.id}
                                className="bg-card/50 border border-border rounded-xl p-5 hover:border-primary/50 transition-colors cursor-pointer group"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <Icon className="text-primary" size={20} />
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-1.5 hover:bg-muted rounded-lg" title={t('email.edit', 'Editar')}>
                                            <Edit size={14} className="text-muted-foreground" />
                                        </button>
                                        <button className="p-1.5 hover:bg-muted rounded-lg" title={t('email.duplicate', 'Duplicar')}>
                                            <Copy size={14} className="text-muted-foreground" />
                                        </button>
                                        {!audience.isDefault && (
                                            <button className="p-1.5 hover:bg-muted rounded-lg" title={t('email.delete', 'Eliminar')}>
                                                <Trash2 size={14} className="text-red-400" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <h3 className="text-foreground font-semibold mb-1">
                                    {audience.name}
                                    {audience.isDefault && (
                                        <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                            Default
                                        </span>
                                    )}
                                </h3>
                                <p className="text-muted-foreground text-sm mb-3">
                                    {audience.description}
                                </p>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Users size={14} className="text-muted-foreground" />
                                        <span className="text-foreground font-medium">
                                            {audience.estimatedCount?.toLocaleString()}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {t('email.contacts', 'contactos')}
                                        </span>
                                    </div>

                                    <button className="text-primary text-sm hover:underline">
                                        {t('email.preview', 'Ver')}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* New Audience Modal - Placeholder */}
            {showNewAudienceModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-xl border border-border w-full max-w-lg">
                        <div className="p-6 border-b border-border">
                            <h3 className="text-lg font-bold text-foreground">
                                {t('email.newAudience', 'Nuevo Segmento')}
                            </h3>
                        </div>
                        <div className="p-6">
                            <p className="text-muted-foreground text-center py-8">
                                {t('email.audienceEditorComingSoon', 'Editor de segmentos próximamente...')}
                            </p>
                        </div>
                        <div className="p-6 border-t border-border flex justify-end gap-3">
                            <button
                                onClick={() => setShowNewAudienceModal(false)}
                                className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
                            >
                                {t('common.cancel', 'Cancelar')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AudiencesView;


