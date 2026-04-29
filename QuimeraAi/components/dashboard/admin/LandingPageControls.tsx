import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { GlobalColors, FontFamily } from '../../../types';
import { useFiles } from '../../../contexts/files';
import { useCMS } from '../../../contexts/cms';
import { useAdmin } from '../../../contexts/admin';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useRouter } from '../../../hooks/useRouter';
import { ControlsDeps } from '../../controls/ControlsShared';
import TabbedControls from '../../ui/TabbedControls';
import GlobalStylesControl from '../../ui/GlobalStylesControl';
import FontFamilyPicker from '../../ui/FontFamilyPicker';
import FontWeightPicker from '../../ui/FontWeightPicker';
import { resolveFontFamily } from '../../../utils/fontLoader';
import { storage, ref, uploadBytes, getDownloadURL } from '../../../firebase';
import { ProjectContext } from '../../../contexts/project';

// Import all renderers from web editor
import {
    renderHeroControlsWithTabs,
    renderHeroSplitControls,
    renderHeroGalleryControls,
    renderHeroWaveControls,
    renderHeroNovaControls,
    renderHeroLeadControls,
    renderHeaderControlsWithTabs,
    renderFeaturesControlsWithTabs,
    renderListSectionControls as _renderListSectionControls,
    renderPricingControlsWithTabs,
    renderTestimonialsControlsWithTabs,
    renderSlideshowControlsWithTabs,
    renderVideoControlsWithTabs,
    renderFooterControlsWithTabs,
    renderMapControls,
    renderTopBarControls,
    renderLogoBannerControls,
    renderServicesControlsWithTabs,
    renderTeamControlsWithTabs,
    renderFAQControlsWithTabs,
    renderPortfolioControlsWithTabs,
    renderLeadsControlsWithTabs,
    renderCMSFeedControlsWithTabs,
    renderNewsletterControlsWithTabs,
    renderCTAControlsWithTabs,
    renderHowItWorksControlsWithTabs,
    renderMenuControlsWithTabs,
    renderBannerControlsWithTabs,
    renderProductsControlsWithTabs,
    renderSignupFloatControlsWithTabs,
    renderChatbotControlsWithTabs,
    renderSeparatorControlsWithTabs,
    renderRealEstateListingsControlsWithTabs,
    renderRestaurantReservationControlsWithTabs,
    renderHeroLuminaControls,
    renderFeaturesLuminaControls,
    renderCtaLuminaControls,
    renderPortfolioLuminaControls,
    renderPricingLuminaControls,
    renderTestimonialsLuminaControls,
    renderFaqLuminaControls,
} from '../../controls/sections';

import { renderHeroNeonControls } from '../../controls/sections/renderHeroNeonControls';
import { renderTestimonialsNeonControls } from '../../controls/sections/renderTestimonialsNeonControls';
import { renderFeaturesNeonControls } from '../../controls/sections/renderFeaturesNeonControls';
import { renderCtaNeonControls } from '../../controls/sections/renderCtaNeonControls';
import { renderPortfolioNeonControls } from '../../controls/sections/renderPortfolioNeonControls';
import { renderPricingNeonControls } from '../../controls/sections/renderPricingNeonControls';
import { renderFaqNeonControls } from '../../controls/sections/renderFaqNeonControls';

interface LandingSection {
    id: string;
    type: string;
    enabled: boolean;
    order: number;
    data: Record<string, any>;
}

interface LandingPageControlsProps {
    section?: LandingSection;
    isStructureItem?: boolean;
    structureItemId?: string;
    onUpdateSection: (sectionId: string, data: any | ((prev: any) => any)) => void;
    onRefreshPreview: () => void;
    allSections?: LandingSection[];
    onApplyGlobalColors?: (colors: GlobalColors) => void;
    portalContainer?: HTMLElement | null;
}

const LandingPageControls: React.FC<LandingPageControlsProps> = ({
    section,
    isStructureItem,
    structureItemId,
    onUpdateSection,
    onRefreshPreview,
    allSections,
    onApplyGlobalColors,
    portalContainer,
}) => {
    const { t } = useTranslation();
    const { uploadImageAndGetURL } = useFiles();
    const { menus, categories } = useCMS();
    const { componentStyles } = useAdmin();
    const { navigate } = useRouter();

    const [aiAssistField, setAiAssistField] = useState<{ path: string, value: string, context: string } | null>(null);
    const faviconInputRef = useRef<HTMLInputElement>(null);
    const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [geocodeError, setGeocodeError] = useState<string | null>(null);
    const [heroPrimaryLinkType, setHeroPrimaryLinkType] = useState<'manual' | 'product' | 'collection' | 'section'>('section');
    const [heroSecondaryLinkType, setHeroSecondaryLinkType] = useState<'manual' | 'product' | 'collection' | 'section'>('section');
    const [showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker] = useState(false);
    const [showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker] = useState(false);
    const [showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker] = useState(false);
    const [showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker] = useState(false);
    const [heroProductSearch, setHeroProductSearch] = useState('');
    const [showHeroImagePicker, setShowHeroImagePicker] = useState(false);

    // Mock project context for GlobalStylesControl
    const mockActiveProject = { id: 'landing_page', name: 'Landing Page', status: 'Template' };

    // Get the base data key expected by the Web Editor renderer for a given section type
    const getRendererDataKey = (type: string) => {
        switch (type) {
            // Quimera Suite maps to base components
            case 'heroQuimera': return 'hero';
            case 'featuresQuimera': return 'features';
            case 'ctaQuimera': return 'cta';
            case 'platformShowcaseQuimera': return 'features';
            case 'bentoShowcaseQuimera': return 'features';
            case 'agentDemonstrationQuimera': return 'features';
            case 'pricingQuimera': return 'pricing';
            case 'testimonialsQuimera': return 'testimonials';
            case 'faqQuimera': return 'faq';
            case 'metricsQuimera': return 'features';
            case 'industrySolutionsQuimera': return 'features';
            case 'finalCtaQuimera': return 'cta';
            case 'aiCapabilitiesQuimera': return 'features';
            case 'agencyWhiteLabelQuimera': return 'features';
            
            // Legacy / Fallbacks
            case 'screenshotCarousel': return 'features';
            
            default: return type;
        }
    };

    // Set up nested data updater
    // Web Editor format: setNestedData('hero.headline', 'Value')
    // Landing Page format: onUpdateSection(section.id, (prevData) => ({...prevData, headline: 'Value'}))
    const setNestedData = (path: string, value: any) => {
        if (!section) return;
        
        // Extract the property path (e.g., 'hero.headline' -> 'headline')
        const parts = path.split('.');
        const propertyPath = parts.slice(1);
        
        onUpdateSection(section.id, (prevData: any) => {
            const newData = JSON.parse(JSON.stringify(prevData || {}));
            let current = newData;
            
            for (let i = 0; i < propertyPath.length - 1; i++) {
                const key = propertyPath[i];
                if (!current[key]) current[key] = {};
                current = current[key];
            }
            
            current[propertyPath[propertyPath.length - 1]] = value;
            return newData;
        });
    };

    const deps: ControlsDeps = {
        // data should simulate the Web Editor's projectData, mapping the landing page section type to the key the renderer expects
        data: section ? { [getRendererDataKey(section.type)]: section.data } : {},
        setNestedData,
        setAiAssistField,
        t,
        activeProject: mockActiveProject,
        updateProjectFavicon: async () => {},
        menus,
        categories,
        navigate,
        uploadImageAndGetURL: async (file: File, _path?: string): Promise<string> => {
            try {
                const timestamp = Date.now();
                const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const path = `admin/landing_page/assets/${timestamp}_${safeFileName}`;
                const storageRef = ref(storage, path);
                await uploadBytes(storageRef, file);
                return await getDownloadURL(storageRef);
            } catch (error) {
                console.error("Error uploading to admin storage:", error);
                throw error;
            }
        },
        heroProducts: [],
        heroCategories: [],
        isLoadingHeroProducts: false,
        heroProductSearch,
        setHeroProductSearch,
        showHeroImagePicker,
        setShowHeroImagePicker,
        showHeroPrimaryProductPicker,
        setShowHeroPrimaryProductPicker,
        showHeroSecondaryProductPicker,
        setShowHeroSecondaryProductPicker,
        showHeroPrimaryCollectionPicker,
        setShowHeroPrimaryCollectionPicker,
        showHeroSecondaryCollectionPicker,
        setShowHeroSecondaryCollectionPicker,
        heroPrimaryLinkType,
        setHeroPrimaryLinkType,
        heroSecondaryLinkType,
        setHeroSecondaryLinkType,
        isGeocoding,
        setIsGeocoding,
        geocodeError,
        setGeocodeError,
        faviconInputRef,
        isUploadingFavicon,
        setIsUploadingFavicon,
        componentStyles,
        renderListSectionControls: (sk: string, il: string, fields: any[]) => _renderListSectionControls(deps, sk, il, fields),
    };

    // Render structure items
    if (isStructureItem) {
        // Since GlobalStylesControl requires ProjectContext, we will just render a placeholder 
        // or a stripped down version, but wait, the landing page is not a project.
        // For now, render standard global controls if possible or a message to use theme settings.
        return (
            <div className="w-full">
                <p className="text-q-text-muted text-sm">
                    {t('landingEditor.structureNote', 'Utilice las pestañas para editar la estructura y diseño.')}
                </p>
                {structureItemId === 'colors' && (
                     <div className="space-y-4">
                         <h3 className="text-sm font-semibold text-q-text">Colores Globales</h3>
                         {/* To avoid crashing due to missing ProjectContext, we won't mount GlobalStylesControl directly */}
                         <p className="text-xs text-q-text-muted">La edición de colores globales requiere integración del ProjectContext. (Pendiente)</p>
                     </div>
                )}
                {structureItemId === 'typography' && (
                     <div className="space-y-6">
                         <div>
                             <h3 className="text-sm font-semibold text-q-text mb-4">Tipografía Global</h3>
                             <div className="space-y-4">
                                 <div className="bg-q-surface/50 p-3 rounded-lg border border-q-border">
                                     <FontFamilyPicker
                                         label="Fuente de Títulos"
                                         value={resolveFontFamily(section?.data?.headingFont)}
                                         onChange={(font) => onUpdateSection(section.id, (d: any) => ({ ...d, headingFont: font }))}
                                     />
                                     <div className="mt-2">
                                         <FontWeightPicker
                                             label="Estilo de Títulos"
                                             weight={section?.data?.fontWeightHeader || 700}
                                             style={section?.data?.fontStyleHeader || 'normal'}
                                             onWeightChange={(w) => onUpdateSection(section.id, (d: any) => ({ ...d, fontWeightHeader: w }))}
                                             onStyleChange={(s) => onUpdateSection(section.id, (d: any) => ({ ...d, fontStyleHeader: s }))}
                                         />
                                     </div>
                                 </div>
                                 
                                 <div className="bg-q-surface/50 p-3 rounded-lg border border-q-border">
                                     <FontFamilyPicker
                                         label="Fuente de Cuerpo"
                                         value={resolveFontFamily(section?.data?.bodyFont)}
                                         onChange={(font) => onUpdateSection(section.id, (d: any) => ({ ...d, bodyFont: font }))}
                                     />
                                     <div className="mt-2">
                                         <FontWeightPicker
                                             label="Estilo de Cuerpo"
                                             weight={section?.data?.fontWeightBody || 400}
                                             style={section?.data?.fontStyleBody || 'normal'}
                                             onWeightChange={(w) => onUpdateSection(section.id, (d: any) => ({ ...d, fontWeightBody: w }))}
                                             onStyleChange={(s) => onUpdateSection(section.id, (d: any) => ({ ...d, fontStyleBody: s }))}
                                         />
                                     </div>
                                 </div>

                                 <div className="bg-q-surface/50 p-3 rounded-lg border border-q-border">
                                     <FontFamilyPicker
                                         label="Fuente de Botones"
                                         value={resolveFontFamily(section?.data?.buttonFont)}
                                         onChange={(font) => onUpdateSection(section.id, (d: any) => ({ ...d, buttonFont: font }))}
                                     />
                                     <div className="mt-2">
                                         <FontWeightPicker
                                             label="Estilo de Botones"
                                             weight={section?.data?.fontWeightButton || 600}
                                             style={section?.data?.fontStyleButton || 'normal'}
                                             onWeightChange={(w) => onUpdateSection(section.id, (d: any) => ({ ...d, fontWeightButton: w }))}
                                             onStyleChange={(s) => onUpdateSection(section.id, (d: any) => ({ ...d, fontStyleButton: s }))}
                                         />
                                     </div>
                                 </div>
                             </div>
                         </div>
                         
                         <div className="border-t border-q-border pt-4">
                             <h4 className="text-sm font-semibold text-q-text mb-3">Estilos Todo Mayúsculas</h4>
                             
                             <div className="space-y-3">
                                 <label className="flex items-center justify-between p-3 border border-q-border rounded-lg hover:border-q-accent transition-colors cursor-pointer">
                                     <span className="text-sm font-medium text-q-text">Títulos en Mayúsculas</span>
                                     <input
                                         type="checkbox"
                                         checked={section?.data?.headingsCaps || false}
                                         onChange={(e) => onUpdateSection(section.id, (d: any) => ({ ...d, headingsCaps: e.target.checked }))}
                                         className="w-4 h-4 text-q-accent bg-q-bg border-q-border rounded focus:ring-q-accent"
                                     />
                                 </label>
                                 
                                 <label className="flex items-center justify-between p-3 border border-q-border rounded-lg hover:border-q-accent transition-colors cursor-pointer">
                                     <span className="text-sm font-medium text-q-text">Botones en Mayúsculas</span>
                                     <input
                                         type="checkbox"
                                         checked={section?.data?.buttonsCaps || false}
                                         onChange={(e) => onUpdateSection(section.id, (d: any) => ({ ...d, buttonsCaps: e.target.checked }))}
                                         className="w-4 h-4 text-q-accent bg-q-bg border-q-border rounded focus:ring-q-accent"
                                     />
                                 </label>
                                 
                                 <label className="flex items-center justify-between p-3 border border-q-border rounded-lg hover:border-q-accent transition-colors cursor-pointer">
                                     <span className="text-sm font-medium text-q-text">Menú en Mayúsculas</span>
                                     <input
                                         type="checkbox"
                                         checked={section?.data?.navLinksCaps || false}
                                         onChange={(e) => onUpdateSection(section.id, (d: any) => ({ ...d, navLinksCaps: e.target.checked }))}
                                         className="w-4 h-4 text-q-accent bg-q-bg border-q-border rounded focus:ring-q-accent"
                                     />
                                 </label>
                             </div>
                         </div>
                     </div>
                )}
            </div>
        );
    }

    if (!section) return null;

    const renderControls = () => {
        // Use Web Editor's renderers
        switch (section.type) {
            // Legacy + Core Sections
            case 'hero': return renderHeroControlsWithTabs(deps);
            case 'heroSplit': return renderHeroSplitControls(deps);
            case 'heroGallery': return renderHeroGalleryControls(deps);
            case 'heroWave': return renderHeroWaveControls(deps);
            case 'heroNova': return renderHeroNovaControls(deps);
            case 'heroLead': return renderHeroLeadControls(deps);
            case 'header': return renderHeaderControlsWithTabs(deps);
            case 'features': return renderFeaturesControlsWithTabs(deps);
            case 'pricing': return renderPricingControlsWithTabs(deps);
            case 'testimonials': return renderTestimonialsControlsWithTabs(deps);
            case 'slideshow': return renderSlideshowControlsWithTabs(deps);
            case 'video': return renderVideoControlsWithTabs(deps);
            case 'footer': return renderFooterControlsWithTabs(deps);
            case 'map': return <TabbedControls contentControls={renderMapControls(deps)} />;
            
            // Extended Sections
            case 'topBar': return <TabbedControls contentControls={renderTopBarControls(deps)} />;
            case 'logoBanner': return <TabbedControls contentControls={renderLogoBannerControls(deps)} />;
            case 'services': return renderServicesControlsWithTabs(deps);
            case 'team': return renderTeamControlsWithTabs(deps);
            case 'faq': return renderFAQControlsWithTabs(deps);
            case 'portfolio': return renderPortfolioControlsWithTabs(deps);
            case 'leads': return renderLeadsControlsWithTabs(deps);
            case 'cmsFeed': return renderCMSFeedControlsWithTabs(deps);
            case 'newsletter': return renderNewsletterControlsWithTabs(deps);
            case 'cta': return renderCTAControlsWithTabs(deps);
            case 'howItWorks': return renderHowItWorksControlsWithTabs(deps);
            case 'menu': return renderMenuControlsWithTabs(deps);
            case 'banner': return renderBannerControlsWithTabs(deps);
            case 'signupFloat': return renderSignupFloatControlsWithTabs(deps);
            case 'chatbot': return renderChatbotControlsWithTabs(deps);
            case 'separator': return renderSeparatorControlsWithTabs(deps);
            case 'realEstateListings': return renderRealEstateListingsControlsWithTabs(deps);
            case 'restaurantReservation': return renderRestaurantReservationControlsWithTabs(deps);

            // Lumina Suite
            case 'heroLumina': return renderHeroLuminaControls(deps);
            case 'featuresLumina': return renderFeaturesLuminaControls(deps);
            case 'ctaLumina': return renderCtaLuminaControls(deps);
            case 'portfolioLumina': return renderPortfolioLuminaControls(deps);
            case 'pricingLumina': return renderPricingLuminaControls(deps);
            case 'testimonialsLumina': return renderTestimonialsLuminaControls(deps);
            case 'faqLumina': return renderFaqLuminaControls(deps);

            // Neon Suite
            case 'heroNeon': return renderHeroNeonControls(deps);
            case 'testimonialsNeon': return renderTestimonialsNeonControls(deps);
            case 'featuresNeon': return renderFeaturesNeonControls(deps);
            case 'ctaNeon': return renderCtaNeonControls(deps);
            case 'portfolioNeon': return renderPortfolioNeonControls(deps);
            case 'pricingNeon': return renderPricingNeonControls(deps);
            case 'faqNeon': return renderFaqNeonControls(deps);

            // Quimera Suite
            case 'heroQuimera': return renderHeroControlsWithTabs(deps);
            case 'featuresQuimera': return renderFeaturesControlsWithTabs(deps);
            case 'ctaQuimera': return renderCTAControlsWithTabs(deps);
            case 'platformShowcaseQuimera': return renderFeaturesControlsWithTabs(deps);
            case 'bentoShowcaseQuimera': return renderFeaturesControlsWithTabs(deps);
            case 'agentDemonstrationQuimera': return renderFeaturesControlsWithTabs(deps);
            case 'pricingQuimera': return renderPricingControlsWithTabs(deps);
            case 'testimonialsQuimera': return renderTestimonialsControlsWithTabs(deps);
            case 'faqQuimera': return renderFAQControlsWithTabs(deps);
            case 'metricsQuimera': return renderFeaturesControlsWithTabs(deps);
            case 'industrySolutionsQuimera': return renderFeaturesControlsWithTabs(deps);
            case 'aiCapabilitiesQuimera': return renderFeaturesControlsWithTabs(deps);
            case 'agencyWhiteLabelQuimera': return renderFeaturesControlsWithTabs(deps);
            case 'finalCtaQuimera': return renderCTAControlsWithTabs(deps);

            default:
                return (
                    <div className="p-4 text-center text-q-text-muted">
                        No controls found for section: {section.type}
                    </div>
                );
        }
    };

    return (
        <ProjectContext.Provider value={{ activeProject: mockActiveProject } as any}>
            {renderControls()}
        </ProjectContext.Provider>
    );
};

export default LandingPageControls;
