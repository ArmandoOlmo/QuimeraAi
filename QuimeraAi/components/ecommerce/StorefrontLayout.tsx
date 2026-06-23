/**
 * StorefrontLayout Component
 * Layout wrapper for the public storefront that includes the project's header
 * This ensures the store pages maintain the same branding as the landing page
 * Now includes cart functionality via StorefrontCartProvider
 */

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { doc, getDoc } from '@/utils/compatData';
import { db } from '@/utils/compatData';
import Header from '../Header';
import { HeaderData, ThemeData, Project } from '../../types';
import { Headphones, Loader2, RefreshCw, ShieldCheck, Truck } from 'lucide-react';
import { StoreAuthProvider, StorefrontCartProvider, useStorefrontCart } from './context';
import CartDrawer from './CartDrawer';
import UserAccountButton from './auth/UserAccountButton';
// import CartButton from './CartButton'; // Removed as we use Header's cart

interface StorefrontLayoutProps {
    storeId: string;
    children: React.ReactNode;
    onNavigateHome?: () => void;
    onNavigateToCheckout?: () => void;
    onNavigateToAccount?: () => void;
    onNavigateStorefront?: (href: string) => void;
    projectData?: ProjectPublicData;
}

interface SitePageNav {
    id: string;
    title: string;
    slug: string;
    showInNavigation?: boolean;
    navigationOrder?: number;
}

interface MenuItemNav {
    text: string;
    href: string;
    icon?: any;
}

interface MenuNav {
    id: string;
    handle?: string;
    items: MenuItemNav[];
}

export interface ProjectPublicData {
    header: HeaderData;
    theme: ThemeData;
    name: string;
    pages?: SitePageNav[];
    menus?: MenuNav[];
}

const defaultHeaderData: HeaderData = {
    style: 'sticky-solid',
    layout: 'minimal',
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

const isRecord = (value: unknown): value is Record<string, any> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const toRecord = (value: unknown): Record<string, any> =>
    isRecord(value) ? value : {};

const firstArray = <T,>(...values: unknown[]): T[] => {
    const found = values.find(Array.isArray);
    return (found || []) as T[];
};

const normalizeHeaderData = (value: unknown, fallbackName = 'Store', fallbackTheme: Record<string, any> = {}): HeaderData => {
    const header = toRecord(value);
    const globalColors = toRecord(fallbackTheme.globalColors);

    return {
        ...defaultHeaderData,
        logoText: fallbackName || defaultHeaderData.logoText,
        ...header,
        colors: {
            ...defaultHeaderData.colors,
            ...(globalColors.background ? { background: globalColors.background } : {}),
            ...(globalColors.text ? { text: globalColors.text } : {}),
            ...(globalColors.primary || globalColors.accent ? { accent: globalColors.primary || globalColors.accent } : {}),
            ...toRecord(header.colors),
        },
    } as HeaderData;
};

export const calculateStorefrontHeaderClearance = (
    shellRect: Pick<DOMRectReadOnly, 'bottom'> | null | undefined,
    headerRect: Pick<DOMRectReadOnly, 'bottom'> | null | undefined,
): number => {
    const shellBottom = typeof shellRect?.bottom === 'number' ? shellRect.bottom : 0;
    const headerBottom = typeof headerRect?.bottom === 'number' ? headerRect.bottom : 0;

    return Math.max(0, Math.ceil(headerBottom - shellBottom));
};

export const normalizeProjectPublicData = (value: unknown): ProjectPublicData | null => {
    if (!isRecord(value)) return null;

    const root = value;
    const firstData = toRecord(root.data);
    const nestedData = toRecord(firstData.data);
    const headerSource = root.header || firstData.header || nestedData.header;
    const theme = toRecord(root.theme || firstData.theme || nestedData.theme) as ThemeData;
    const name = String(
        root.name ||
        firstData.name ||
        nestedData.name ||
        toRecord(headerSource).logoText ||
        'Store'
    );
    const header = normalizeHeaderData(headerSource, name, theme);

    return {
        header,
        theme,
        name,
        pages: firstArray<SitePageNav>(root.pages, firstData.pages, nestedData.pages),
        menus: firstArray<MenuNav>(root.menus, firstData.menus, nestedData.menus),
    };
};

const normalizeNavigationText = (value: unknown): string =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();

const normalizeNavigationHref = (value: unknown): string =>
    String(value || '')
        .trim()
        .replace(/^https?:\/\/[^/]+/i, '')
        .replace(/\/+$/g, '') || '/';

export const isStorefrontHomeNavigationLink = (link: MenuItemNav): boolean => {
    const text = normalizeNavigationText(link.text);
    const href = normalizeNavigationHref(link.href);

    return text === 'inicio' ||
        text === 'home' ||
        href === '/' ||
        href === '#' ||
        href === '/inicio' ||
        href === '/home';
};

export const buildStorefrontHeaderLinks = (
    storeId: string,
    navigationLinks: MenuItemNav[],
    hasHomeHandler: boolean,
): MenuItemNav[] => {
    let hasHomeLink = false;
    const dedupedLinks = navigationLinks.filter(link => {
        if (!isStorefrontHomeNavigationLink(link)) return true;
        if (hasHomeLink) return false;
        hasHomeLink = true;
        return true;
    });

    if (hasHomeLink) return dedupedLinks;

    return [
        { text: 'Inicio', href: hasHomeHandler ? '#' : `/preview/${storeId}` },
        ...dedupedLinks,
    ];
};

/**
 * Inner layout component that uses cart context
 */
const StorefrontLayoutInner: React.FC<StorefrontLayoutProps & { projectData: ProjectPublicData | null }> = ({
    storeId,
    children,
    onNavigateHome,
    onNavigateToCheckout,
    onNavigateToAccount,
    onNavigateStorefront,
    projectData,
}) => {
    const cart = useStorefrontCart();
    const headerShellRef = useRef<HTMLDivElement>(null);
    const [headerClearance, setHeaderClearance] = useState(0);

    // Get primary color from theme
    const primaryColor = projectData?.theme?.globalColors?.primary ||
        projectData?.header?.colors?.accent ||
        '#6366f1';

    // Background color from theme or default
    const backgroundColor = projectData?.theme?.pageBackground ||
        projectData?.theme?.globalColors?.background ||
        '#f8fafc';

    const storeName = projectData?.name || projectData?.header?.logoText || 'Store';

    // Build header links with priority: CMS Menu > main-menu > Pages > Manual Links
    // This matches the logic in PageRenderer.tsx for consistency
    const navigationLinks = (() => {
        const menus = projectData?.menus || [];
        const header = projectData?.header;

        // 0. Explicit manual override
        if (header?.menuId === 'manual') {
            return header?.links || [];
        }

        // 1. CMS Menu by ID takes priority if configured
        if (header?.menuId) {
            const menu = menus.find(m => m.id === header.menuId);
            if (menu && menu.items?.length > 0) {
                return menu.items.map(i => ({ text: i.text, href: i.href, icon: i.icon }));
            }
        }

        // 2. Try main-menu from CMS menus
        const mainMenu = menus.find(m => m.id === 'main' || m.handle === 'main-menu');
        if (mainMenu && mainMenu.items?.length > 0) {
            return mainMenu.items.map(i => ({ text: i.text, href: i.href, icon: i.icon }));
        }

        // 3. Generate from pages if available (multi-page architecture)
        const pages = projectData?.pages || [];
        if (pages.length > 0) {
            const navPages = pages
                .filter(p => p.showInNavigation)
                .sort((a, b) => (a.navigationOrder || 0) - (b.navigationOrder || 0));

            if (navPages.length > 0) {
                return navPages.map(p => ({
                    text: p.title,
                    href: p.slug,
                }));
            }
        }

        // 4. Fall back to manual links
        return header?.links || [];
    })();

    // Prepare final header links - add Home only when the project header does not already include one.
    const headerLinks = buildStorefrontHeaderLinks(storeId, navigationLinks, Boolean(onNavigateHome));

    const handleHeaderNavigate = (href: string) => {
        if (onNavigateStorefront) {
            onNavigateStorefront(href);
            return;
        }

        if (isStorefrontHomeNavigationLink({ text: '', href })) {
            onNavigateHome?.();
            return;
        }

        window.location.href = href;
    };

    const handleCheckout = () => {
        cart.closeCart();
        if (onNavigateToCheckout) {
            onNavigateToCheckout();
        }
    };

    const measureHeaderClearance = useCallback(() => {
        const shell = headerShellRef.current;
        if (!shell) {
            setHeaderClearance(0);
            return;
        }

        const headerSurface = shell.querySelector<HTMLElement>('[data-site-header-surface="true"]');
        const header = headerSurface || shell.querySelector<HTMLElement>('[data-site-header="true"]');
        const nextClearance = calculateStorefrontHeaderClearance(
            shell.getBoundingClientRect(),
            header?.getBoundingClientRect(),
        );

        setHeaderClearance(previous => previous === nextClearance ? previous : nextClearance);
    }, []);

    useEffect(() => {
        measureHeaderClearance();
        const shell = headerShellRef.current;
        if (!shell) return;

        const headerSurface = shell.querySelector<HTMLElement>('[data-site-header-surface="true"]');
        const header = headerSurface || shell.querySelector<HTMLElement>('[data-site-header="true"]');
        const resizeObserver = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(measureHeaderClearance)
            : null;
        const raf = requestAnimationFrame(measureHeaderClearance);

        resizeObserver?.observe(shell);
        if (header) resizeObserver?.observe(header);
        window.addEventListener('resize', measureHeaderClearance);

        return () => {
            cancelAnimationFrame(raf);
            resizeObserver?.disconnect();
            window.removeEventListener('resize', measureHeaderClearance);
        };
    }, [measureHeaderClearance, projectData?.header]);

    return (
        <div
            className="min-h-screen"
            style={{
                backgroundColor,
                '--site-base-bg': backgroundColor,
                '--property-detail-bg': backgroundColor,
            } as React.CSSProperties}
        >
            {/* Header from the project */}
            {projectData?.header && (
                <div ref={headerShellRef} className="relative" data-storefront-header-shell="true">
                    <Header
                        {...projectData.header}
                        links={headerLinks}
                        isPreviewMode={true}

                        // Use Header's built-in cart functionality to prevent mobile layout conflicts
                        showCart={true}
                        cartItemCount={cart.itemCount}
                        onCartClick={cart.toggleCart}
                        onNavigate={handleHeaderNavigate}
                        forceSolid={true}
                        forceWideFloating={true}
                    />
                </div>
            )}

            <div
                className="border-b"
                data-storefront-trust-bar="true"
                style={{
                    marginTop: headerClearance ? `${headerClearance}px` : undefined,
                    backgroundColor: projectData?.header?.colors?.background || '#ffffff',
                    borderColor: 'rgba(15,23,42,0.08)',
                }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <button
                            type="button"
                            onClick={onNavigateHome}
                            className="inline-flex items-center gap-2 text-left text-sm font-semibold"
                            style={{ color: projectData?.header?.colors?.text || '#0f172a' }}
                        >
                            <span
                                className="flex h-8 w-8 items-center justify-center rounded-full"
                                style={{ backgroundColor: `${primaryColor}14`, color: primaryColor }}
                            >
                                <ShieldCheck size={17} />
                            </span>
                            {storeName}
                        </button>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
                            <div className="grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-3 lg:flex lg:items-center lg:gap-5">
                                <span className="inline-flex items-center gap-2">
                                    <Truck size={15} style={{ color: primaryColor }} />
                                    Envio coordinado por la tienda
                                </span>
                                <span className="inline-flex items-center gap-2">
                                    <ShieldCheck size={15} style={{ color: primaryColor }} />
                                    Checkout protegido
                                </span>
                                <span className="inline-flex items-center gap-2">
                                    <RefreshCw size={15} style={{ color: primaryColor }} />
                                    Soporte post-compra
                                </span>
                            </div>
                            <UserAccountButton
                                primaryColor={primaryColor}
                                storeName={storeName}
                                logoUrl={projectData?.header?.logoImageUrl}
                                onNavigateToAccount={onNavigateToAccount}
                                onNavigateToOrders={onNavigateToAccount}
                                variant="full"
                                className="shrink-0"
                            />
                        </div>
                    </div>
                </div>
            </div>

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

            <footer
                id="footer"
                data-storefront-section="footer"
                className="mt-16 border-t"
                style={{
                    backgroundColor: projectData?.header?.colors?.background || '#ffffff',
                    borderColor: 'rgba(15,23,42,0.08)',
                    scrollMarginTop: 120,
                }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div
                                className="flex items-center gap-2 text-base font-semibold"
                                style={{ color: projectData?.header?.colors?.text || '#0f172a' }}
                            >
                                <Headphones size={18} style={{ color: primaryColor }} />
                                {storeName}
                            </div>
                            <p className="mt-1 text-sm text-slate-500">
                                &copy; {new Date().getFullYear()} Todos los derechos reservados.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                            <span>Compras seguras</span>
                            <span aria-hidden="true">/</span>
                            <span>Ordenes protegidas</span>
                            <span aria-hidden="true">/</span>
                            <span>Atencion al cliente</span>
                        </div>
                    </div>
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
    onNavigateToAccount,
    onNavigateStorefront,
    projectData: initialProjectData,
}) => {
    const [fetchedProjectData, setFetchedProjectData] = useState<ProjectPublicData | null>(null);
    const [isLoading, setIsLoading] = useState(!initialProjectData);
    const [error, setError] = useState<string | null>(null);
    const projectData = useMemo(
        () => initialProjectData
            ? normalizeProjectPublicData(initialProjectData)
            : fetchedProjectData,
        [fetchedProjectData, initialProjectData],
    );

    useEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        const root = document.getElementById('root');

        html.style.overflow = 'auto';
        html.style.height = 'auto';
        body.style.overflow = 'auto';
        body.style.height = 'auto';
        if (root) {
            root.style.overflow = 'visible';
            root.style.height = 'auto';
        }

        return () => {
            html.style.overflow = '';
            html.style.height = '';
            body.style.overflow = '';
            body.style.height = '';
            if (root) {
                root.style.overflow = '';
                root.style.height = '';
            }
        };
    }, []);

    useEffect(() => {
        if (!storeId || initialProjectData) {
            if (initialProjectData) setIsLoading(false);
            return;
        }

        const fetchProjectData = async () => {
            try {
                // First, try to get the project data from public_stores
                const publicStoreRef = doc(db, 'public_stores', storeId);
                const publicStoreDoc = await getDoc(publicStoreRef);

                if (publicStoreDoc.exists()) {
                    const data = publicStoreDoc.data();

                    // If the public store has header data, use it
                    // Check both root level (new) and nested in data (legacy fallback)
                    const headerData = data.header || data.data?.header;
                    if (headerData) {
                        setFetchedProjectData({
                            header: headerData,
                            theme: data.theme || {},
                            name: data.name || 'Store',
                            pages: data.pages || [],
                            menus: data.menus || [],
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
                        setFetchedProjectData({
                            header: project.data?.header || defaultHeaderData,
                            theme: project.theme || {} as any,
                            name: project.name || 'Store',
                            pages: project.pages || [],
                            menus: project.menus || [],
                        });
                        setIsLoading(false);
                        return;
                    }
                }

                // Fallback to default header
                setFetchedProjectData({
                    header: defaultHeaderData,
                    theme: {} as any,
                    name: 'Store',
                    pages: [],
                    menus: [],
                });
            } catch (err: any) {
                console.error('Error fetching project data for storefront:', err);
                setError(err.message);
                // Use default header on error
                setFetchedProjectData({
                    header: defaultHeaderData,
                    theme: {} as any,
                    name: 'Store',
                    pages: [],
                    menus: [],
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchProjectData();
    }, [initialProjectData, storeId]);

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
        <StoreAuthProvider storeId={storeId}>
            <StorefrontCartProvider storeId={storeId}>
                <StorefrontLayoutInner
                    storeId={storeId}
                    onNavigateHome={onNavigateHome}
                    onNavigateToCheckout={onNavigateToCheckout}
                    onNavigateToAccount={onNavigateToAccount}
                    onNavigateStorefront={onNavigateStorefront}
                    projectData={projectData}
                >
                    {children}
                </StorefrontLayoutInner>
            </StorefrontCartProvider>
        </StoreAuthProvider>
    );
};

export default StorefrontLayout;
