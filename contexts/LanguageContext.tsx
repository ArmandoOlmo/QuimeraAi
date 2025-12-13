import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

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
    {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        flag: '🇪🇸',
        enabled: true,
        isDefault: true,
        completeness: 100
    },
    {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        flag: '🇺🇸',
        enabled: true,
        isDefault: false,
        completeness: 100
    },
    {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        flag: '🇫🇷',
        enabled: false,
        isDefault: false,
        completeness: 0
    },
    {
        code: 'de',
        name: 'German',
        nativeName: 'Deutsch',
        flag: '🇩🇪',
        enabled: false,
        isDefault: false,
        completeness: 0
    },
    {
        code: 'pt',
        name: 'Portuguese',
        nativeName: 'Português',
        flag: '🇵🇹',
        enabled: false,
        isDefault: false,
        completeness: 0
    },
    {
        code: 'it',
        name: 'Italian',
        nativeName: 'Italiano',
        flag: '🇮🇹',
        enabled: false,
        isDefault: false,
        completeness: 0
    },
    {
        code: 'ja',
        name: 'Japanese',
        nativeName: '日本語',
        flag: '🇯🇵',
        enabled: false,
        isDefault: false,
        completeness: 0
    },
    {
        code: 'zh',
        name: 'Chinese',
        nativeName: '中文',
        flag: '🇨🇳',
        enabled: false,
        isDefault: false,
        completeness: 0
    },
];

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [languages, setLanguages] = useState<LanguageConfig[]>(DEFAULT_LANGUAGES);
    const [loading, setLoading] = useState(true);
    const { i18n } = useTranslation();

    // Load languages from Firestore
    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'settings', 'languages'), (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                if (data.config && Array.isArray(data.config)) {
                    setLanguages(data.config);

                    // Check if current language is enabled, if not switch to default
                    const currentLangCode = i18n.language;
                    const currentLangConfig = data.config.find((l: LanguageConfig) => l.code === currentLangCode);
                    const defaultLang = data.config.find((l: LanguageConfig) => l.isDefault);

                    if (currentLangConfig && !currentLangConfig.enabled && defaultLang) {
                        i18n.changeLanguage(defaultLang.code);
                    }
                }
            } else {
                // If document doesn't exist, create it with defaults
                setDoc(doc(db, 'settings', 'languages'), { config: DEFAULT_LANGUAGES })
                    .catch(err => console.error("Error creating default language config:", err));
            }
            setLoading(false);
        }, (error) => {
            console.error("Error listening to language config:", error);
            setLoading(false);
        });

        return () => {
            unsubscribe();
        };
    }, [i18n]);

    const updateLanguageConfig = async (newConfig: LanguageConfig[]) => {
        try {
            await setDoc(doc(db, 'settings', 'languages'), {
                config: newConfig,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error("Error updating language config:", error);
            throw error;
        }
    };

    const refreshLanguages = async () => {
        try {
            const docRef = doc(db, 'settings', 'languages');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.config && Array.isArray(data.config)) {
                    setLanguages(data.config);
                }
            }
        } catch (error) {
            console.error("Error refreshing languages:", error);
        }
    };

    return (
        <LanguageContext.Provider value={{ languages, updateLanguageConfig, loading, refreshLanguages }}>
            {children}
        </LanguageContext.Provider>
    );
};
