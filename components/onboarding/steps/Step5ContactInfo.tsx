/**
 * Step5ContactInfo
 * Fifth step: Contact information form
 */

import React, { useState } from 'react';
import { Contact, Mail, Phone, MapPin, Globe, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OnboardingContactInfo, BusinessHours, DayHours } from '../../../types/onboarding';

// Social media icons (using simple text for now)
const SOCIAL_PLATFORMS = [
    { id: 'facebook', label: 'Facebook', placeholder: 'facebook.com/yourbusiness' },
    { id: 'instagram', label: 'Instagram', placeholder: '@yourbusiness' },
    { id: 'twitter', label: 'Twitter/X', placeholder: '@yourbusiness' },
    { id: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/company/yourbusiness' },
    { id: 'youtube', label: 'YouTube', placeholder: 'youtube.com/@yourbusiness' },
    { id: 'tiktok', label: 'TikTok', placeholder: '@yourbusiness' },
];

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const DAY_LABELS: Record<string, string> = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
};

interface Step5ContactInfoProps {
    contactInfo?: OnboardingContactInfo;
    onUpdate: (contactInfo: OnboardingContactInfo) => void;
}

const Step5ContactInfo: React.FC<Step5ContactInfoProps> = ({
    contactInfo = {},
    onUpdate,
}) => {
    const { t } = useTranslation();
    const [showSocial, setShowSocial] = useState(false);
    const [showHours, setShowHours] = useState(false);

    const handleInputChange = (field: keyof OnboardingContactInfo, value: string) => {
        onUpdate({ ...contactInfo, [field]: value });
    };

    const handleSocialChange = (platform: string, value: string) => {
        onUpdate({ ...contactInfo, [platform]: value });
    };

    const handleHoursChange = (day: keyof BusinessHours, field: keyof DayHours, value: any) => {
        const currentHours = contactInfo.businessHours || {};
        const currentDay = currentHours[day] || { isOpen: false };

        onUpdate({
            ...contactInfo,
            businessHours: {
                ...currentHours,
                [day]: { ...currentDay, [field]: value },
            },
        });
    };

    const getTranslatedDay = (day: string) => {
        return t(`onboarding.days.${day}`, DAY_LABELS[day] || day);
    };

    return (
        <div className="max-w-xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                    <Contact size={32} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-editor-text-primary mb-2">
                    {t('onboarding.step5Heading', 'Contact Information')}
                </h3>
                <p className="text-editor-text-secondary">
                    {t('onboarding.step5Subheading', 'How can customers reach you? (All fields optional)')}
                </p>
            </div>

            {/* Basic Contact Info */}
            <div className="space-y-4">
                {/* Email */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-editor-text-primary">
                        <Mail size={16} className="text-editor-text-secondary" />
                        {t('onboarding.email', 'Email')}
                    </label>
                    <input
                        type="email"
                        value={contactInfo.email || ''}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="contact@yourbusiness.com"
                        className="w-full px-4 py-3 bg-editor-sidebar border border-editor-border rounded-xl text-editor-text-primary placeholder:text-editor-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                    />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-editor-text-primary">
                        <Phone size={16} className="text-editor-text-secondary" />
                        {t('onboarding.phone', 'Phone')}
                    </label>
                    <input
                        type="tel"
                        value={contactInfo.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="+1 (555) 123-4567"
                        className="w-full px-4 py-3 bg-editor-sidebar border border-editor-border rounded-xl text-editor-text-primary placeholder:text-editor-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                    />
                </div>

                {/* Address */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-editor-text-primary">
                        <MapPin size={16} className="text-editor-text-secondary" />
                        {t('onboarding.address', 'Address')}
                    </label>
                    <input
                        type="text"
                        value={contactInfo.address || ''}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="123 Main Street"
                        className="w-full px-4 py-3 bg-editor-sidebar border border-editor-border rounded-xl text-editor-text-primary placeholder:text-editor-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                    />
                </div>

                {/* City, State, Zip */}
                <div className="grid grid-cols-3 gap-3">
                    <input
                        type="text"
                        value={contactInfo.city || ''}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder={t('onboarding.city', 'City')}
                        className="px-4 py-3 bg-editor-sidebar border border-editor-border rounded-xl text-editor-text-primary placeholder:text-editor-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                    />
                    <input
                        type="text"
                        value={contactInfo.state || ''}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        placeholder={t('onboarding.state', 'State')}
                        className="px-4 py-3 bg-editor-sidebar border border-editor-border rounded-xl text-editor-text-primary placeholder:text-editor-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                    />
                    <input
                        type="text"
                        value={contactInfo.zipCode || ''}
                        onChange={(e) => handleInputChange('zipCode', e.target.value)}
                        placeholder={t('onboarding.zip', 'ZIP')}
                        className="px-4 py-3 bg-editor-sidebar border border-editor-border rounded-xl text-editor-text-primary placeholder:text-editor-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                    />
                </div>
            </div>

            {/* Social Media (Collapsible) */}
            <div className="border border-editor-border rounded-xl overflow-hidden">
                <button
                    onClick={() => setShowSocial(!showSocial)}
                    className="w-full flex items-center justify-between p-4 bg-editor-sidebar hover:bg-editor-sidebar-hover transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Globe size={18} className="text-editor-text-secondary" />
                        <span className="font-medium text-editor-text-primary">
                            {t('onboarding.socialMedia', 'Social Media')}
                        </span>
                        <span className="text-xs text-editor-text-secondary">
                            ({t('onboarding.optional', 'optional')})
                        </span>
                    </div>
                    {showSocial ? (
                        <ChevronUp size={18} className="text-editor-text-secondary" />
                    ) : (
                        <ChevronDown size={18} className="text-editor-text-secondary" />
                    )}
                </button>

                {showSocial && (
                    <div className="p-4 border-t border-editor-border space-y-3">
                        {SOCIAL_PLATFORMS.map((platform) => (
                            <div key={platform.id} className="flex items-center gap-3">
                                <span className="w-24 text-sm text-editor-text-secondary">
                                    {t(`onboarding.social.${platform.id}`, platform.label)}
                                </span>
                                <input
                                    type="text"
                                    value={(contactInfo as any)[platform.id] || ''}
                                    onChange={(e) => handleSocialChange(platform.id, e.target.value)}
                                    placeholder={platform.placeholder}
                                    className="flex-1 px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-sm text-editor-text-primary placeholder:text-editor-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Business Hours (Collapsible) */}
            <div className="border border-editor-border rounded-xl overflow-hidden">
                <button
                    onClick={() => setShowHours(!showHours)}
                    className="w-full flex items-center justify-between p-4 bg-editor-sidebar hover:bg-editor-sidebar-hover transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Clock size={18} className="text-editor-text-secondary" />
                        <span className="font-medium text-editor-text-primary">
                            {t('onboarding.businessHours', 'Business Hours')}
                        </span>
                        <span className="text-xs text-editor-text-secondary">
                            ({t('onboarding.optional', 'optional')})
                        </span>
                    </div>
                    {showHours ? (
                        <ChevronUp size={18} className="text-editor-text-secondary" />
                    ) : (
                        <ChevronDown size={18} className="text-editor-text-secondary" />
                    )}
                </button>

                {showHours && (
                    <div className="p-4 border-t border-editor-border space-y-3">
                        {DAYS.map((day) => {
                            const dayHours = contactInfo.businessHours?.[day] || { isOpen: false };
                            return (
                                <div key={day} className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 w-28">
                                        <input
                                            type="checkbox"
                                            checked={dayHours.isOpen}
                                            onChange={(e) => handleHoursChange(day, 'isOpen', e.target.checked)}
                                            className="w-4 h-4 rounded border-editor-border bg-editor-sidebar text-cyan-500 focus:ring-cyan-500/50"
                                        />
                                        <span className="text-sm text-editor-text-primary">
                                            {getTranslatedDay(day)}
                                        </span>
                                    </label>
                                    {dayHours.isOpen && (
                                        <div className="flex items-center gap-2 flex-1">
                                            <input
                                                type="time"
                                                value={dayHours.openTime || '09:00'}
                                                onChange={(e) => handleHoursChange(day, 'openTime', e.target.value)}
                                                className="px-2 py-1 bg-editor-bg border border-editor-border rounded-lg text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                                            />
                                            <span className="text-editor-text-secondary">-</span>
                                            <input
                                                type="time"
                                                value={dayHours.closeTime || '18:00'}
                                                onChange={(e) => handleHoursChange(day, 'closeTime', e.target.value)}
                                                className="px-2 py-1 bg-editor-bg border border-editor-border rounded-lg text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                                            />
                                        </div>
                                    )}
                                    {!dayHours.isOpen && (
                                        <span className="text-sm text-editor-text-secondary/50">
                                            {t('onboarding.closed', 'Closed')}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Tip */}
            <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                <p className="text-sm text-cyan-300">
                    <span className="font-semibold">💡 {t('onboarding.tip', 'Tip')}:</span>{' '}
                    {t('onboarding.step5Tip', "All fields are optional. Add what you'd like to display on your website. You can always update this information later.")}
                </p>
            </div>
        </div>
    );
};

export default Step5ContactInfo;
















