import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import i18n from '../i18n';

export interface LanguageConfig {
    code: string;
    name: string;
    nativeName: string;
    flag: string;
    enabled: boolean;
    isDefault: boolean;
    completeness: number;
}

interface LanguageContextType {
    languages: LanguageConfig[];
    updateLanguageConfig: (newConfig: LanguageConfig[]) => Promise<void>;
    loading: boolean;
    refreshLanguages: () => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

// Default languages configuration
const DEFAULT_LANGUAGES: LanguageConfig[] = [
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', enabled: true, isDefault: true, completeness: 100 },
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', enabled: true, isDefault: false, completeness: 100 },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', enabled: false, isDefault: false, completeness: 0 },
    { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', enabled: false, isDefault: false, completeness: 0 },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', enabled: false, isDefault: false, completeness: 0 },
    { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', enabled: false, isDefault: false, completeness: 0 },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', enabled: false, isDefault: false, completeness: 0 },
    { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', enabled: false, isDefault: false, completeness: 0 },
];

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [languages, setLanguages] = useState<LanguageConfig[]>(DEFAULT_LANGUAGES);
    const [loading, setLoading] = useState(true);

    const fetchLanguages = async () => {
        try {
            const { data, error } = await supabase.from('settings').select('config').eq('id', 'languages').maybeSingle();
            if (!error && data?.config && Array.isArray(data.config)) {
                setLanguages(data.config);

                const currentLangCode = i18n.language;
                const currentLangConfig = data.config.find((l: LanguageConfig) => l.code === currentLangCode);
                const defaultLang = data.config.find((l: LanguageConfig) => l.isDefault);

                if (currentLangConfig && !currentLangConfig.enabled && defaultLang) {
                    i18n.changeLanguage(defaultLang.code);
                }
            } else if (error && error.code === 'PGRST116') {
                // Not found, create it
                await supabase.from('settings').insert([{
                    id: 'languages',
                    config: DEFAULT_LANGUAGES,
                    updated_at: new Date().toISOString()
                }]);
            }
        } catch (error) {
            console.error("Error fetching languages:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLanguages();

        const channel = supabase.channel('public:settings:languages')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'settings',
                filter: 'id=eq.languages'
            }, (payload) => {
                if (payload.new && (payload.new as any).config) {
                    const newConfig = (payload.new as any).config;
                    setLanguages(newConfig);

                    const currentLangCode = i18n.language;
                    const currentLangConfig = newConfig.find((l: LanguageConfig) => l.code === currentLangCode);
                    const defaultLang = newConfig.find((l: LanguageConfig) => l.isDefault);

                    if (currentLangConfig && !currentLangConfig.enabled && defaultLang) {
                        i18n.changeLanguage(defaultLang.code);
                    }
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [i18n]);

    const updateLanguageConfig = async (newConfig: LanguageConfig[]) => {
        try {
            await supabase.from('settings').upsert({
                id: 'languages',
                config: newConfig,
                updated_at: new Date().toISOString()
            });
        } catch (error) {
            console.error("Error updating language config:", error);
            throw error;
        }
    };

    const refreshLanguages = async () => {
        await fetchLanguages();
    };

    return (
        <LanguageContext.Provider value={{ languages, updateLanguageConfig, loading, refreshLanguages }}>
            {children}
        </LanguageContext.Provider>
    );
};
