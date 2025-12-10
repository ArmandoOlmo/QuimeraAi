/**
 * StorefrontLayout Component
 * Layout wrapper for the public storefront that includes the project's header
 * This ensures the store pages maintain the same branding as the landing page
 * Now includes cart functionality via StorefrontCartProvider
 */

import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import Header from '../Header';
import { HeaderData, ThemeData, Project } from '../../types';
import { Loader2 } from 'lucide-react';
import { StorefrontCartProvider, useStorefrontCart } from './context';
import CartDrawer from './CartDrawer';
import CartButton from './CartButton';

interface StorefrontLayoutProps {
    storeId: string;
    children: React.ReactNode;
    onNavigateHome?: () => void;
    onNavigateToCheckout?: () => void;
}

interface ProjectPublicData {
    header: HeaderData;
    theme: ThemeData;
    name: string;
}

const defaultHeaderData: HeaderData = {
    style: 'sticky-solid',
    layout: 'classic',
    isSticky: true,
    glassEffect: false,
    height: 70,
    logoType: 'text',
    logoText: 'Store',
    logoImageUrl: '',
    logoWidth: 120,
    links: [],
    hoverStyle: 'underline',
    ctaText: '',
    showCta: false,
    showLogin: false,
    loginText: 'Login',
    colors: {
        background: '#ffffff',
        text: '#0f172a',
        accent: '#4f46e5',
    },
    buttonBorderRadius: 'md',
};

/**
 * Inner layout component that uses cart context
 */
const StorefrontLayoutInner: React.FC<StorefrontLayoutProps & { projectData: ProjectPublicData | null }> = ({
    storeId,
    children,
    onNavigateHome,
    onNavigateToCheckout,
    projectData,
}) => {
    const cart = useStorefrontCart();

    // Get primary color from theme
    const primaryColor = projectData?.theme?.globalColors?.primary || 
                        projectData?.header?.colors?.accent || 
                        '#6366f1';

    // Background color from theme or default
    const backgroundColor = projectData?.theme?.pageBackground || 
                           projectData?.theme?.globalColors?.background || 
                           '#ffffff';

    // Prepare header links - add Home link that goes back to landing
    const headerLinks = [
        { text: 'Inicio', href: onNavigateHome ? '#' : `/preview/${storeId}` },
        ...(projectData?.header?.links || []),
    ];

    const handleCheckout = () => {
        cart.closeCart();
        if (onNavigateToCheckout) {
            onNavigateToCheckout();
        }
    };

    return (
        <div 
            className="min-h-screen"
            style={{ backgroundColor }}
        >
            {/* Header from the project */}
            {projectData?.header && (
                <div className="relative">
                    <Header
                        {...projectData.header}
                        links={headerLinks}
                        isPreviewMode={true}
                    />
                    {/* Cart Button - positioned in header */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50" style={{ top: (projectData?.header?.height || 70) / 2 }}>
                        <CartButton
                            itemCount={cart.itemCount}
                            onClick={cart.toggleCart}
                            primaryColor={primaryColor}
                        />
                    </div>
                </div>
            )}

            {/* Spacer for sticky header */}
            <div style={{ height: projectData?.header?.height || 70 }} />

            {/* Main Content */}
            <main>
                {children}
            </main>

            {/* Cart Drawer */}
            <CartDrawer
                isOpen={cart.isCartOpen}
                onClose={cart.closeCart}
                items={cart.items}
                subtotal={cart.subtotal}
                discountCode={cart.discountCode || undefined}
                discountAmount={cart.discountAmount}
                onUpdateQuantity={cart.updateQuantity}
                onRemoveItem={cart.removeItem}
                onApplyDiscount={cart.applyDiscount}
                onRemoveDiscount={cart.removeDiscount}
                onCheckout={handleCheckout}
                storeId={storeId}
                primaryColor={primaryColor}
                freeShippingThreshold={500}
            />

            {/* Simple Footer */}
            <footer 
                className="py-8 mt-16 border-t"
                style={{ 
                    backgroundColor: projectData?.header?.colors?.background || '#ffffff',
                    borderColor: 'rgba(0,0,0,0.1)'
                }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <p 
                        className="text-sm"
                        style={{ color: projectData?.header?.colors?.text || '#6b7280' }}
                    >
                        &copy; {new Date().getFullYear()} {projectData?.name || 'Store'}. Todos los derechos reservados.
                    </p>
                </div>
            </footer>
        </div>
    );
};

/**
 * StorefrontLayout - Wraps storefront pages with the project's header and cart
 */
const StorefrontLayout: React.FC<StorefrontLayoutProps> = ({
    storeId,
    children,
    onNavigateHome,
    onNavigateToCheckout,
}) => {
    const [projectData, setProjectData] = useState<ProjectPublicData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!storeId) {
            setIsLoading(false);
            return;
        }

        const fetchProjectData = async () => {
            try {
                // First, try to get the project data from publicStores
                const publicStoreRef = doc(db, 'publicStores', storeId);
                const publicStoreDoc = await getDoc(publicStoreRef);

                if (publicStoreDoc.exists()) {
                    const data = publicStoreDoc.data();
                    
                    // If the public store has header data, use it
                    if (data.header) {
                        setProjectData({
                            header: data.header,
                            theme: data.theme || {},
                            name: data.name || 'Store',
                        });
                        setIsLoading(false);
                        return;
                    }
                }

                // If no public store data, try to find the project by looking up the owner
                // This requires knowing the userId, which we might get from the publicStore
                const publicData = publicStoreDoc.data();
                if (publicData?.userId) {
                    const projectRef = doc(db, 'users', publicData.userId, 'projects', storeId);
                    const projectDoc = await getDoc(projectRef);

                    if (projectDoc.exists()) {
                        const project = projectDoc.data() as Project;
                        setProjectData({
                            header: project.data?.header || defaultHeaderData,
                            theme: project.theme || {} as any,
                            name: project.name || 'Store',
                        });
                        setIsLoading(false);
                        return;
                    }
                }

                // Fallback to default header
                setProjectData({
                    header: defaultHeaderData,
                    theme: {} as any,
                    name: 'Store',
                });
            } catch (err: any) {
                console.error('Error fetching project data for storefront:', err);
                setError(err.message);
                // Use default header on error
                setProjectData({
                    header: defaultHeaderData,
                    theme: {} as any,
                    name: 'Store',
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchProjectData();
    }, [storeId]);

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
                    <p className="text-gray-500">Cargando tienda...</p>
                </div>
            </div>
        );
    }

    return (
        <StorefrontCartProvider storeId={storeId}>
            <StorefrontLayoutInner
                storeId={storeId}
                onNavigateHome={onNavigateHome}
                onNavigateToCheckout={onNavigateToCheckout}
                projectData={projectData}
            >
                {children}
            </StorefrontLayoutInner>
        </StorefrontCartProvider>
    );
};

export default StorefrontLayout;
