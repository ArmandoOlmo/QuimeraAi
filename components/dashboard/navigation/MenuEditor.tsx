import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationMenu, NavigationMenuItem } from '../../../types';
import { useCMS } from '../../../contexts/cms';
import { useProject } from '../../../contexts/project';
import { ArrowLeft, GripVertical, Plus, Trash2, X, Save, Loader2, ChevronRight, Search, Hash, Globe, FileText, ArrowUpLeft, Newspaper, ShoppingBag, Tag, Package } from 'lucide-react';
import DashboardSidebar from '../DashboardSidebar';
import { Menu as MenuIcon } from 'lucide-react';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { usePublicProducts } from '../../../hooks/usePublicProducts';

interface MenuEditorProps {
    menu: NavigationMenu;
    onClose: () => void;
    isNew: boolean;
    projectId?: string | null;
}

type LinkCategory = 'root' | 'sections' | 'policies' | 'articles' | 'store' | 'store-categories' | 'store-products';

// Section links use anchor format (/#section) for smooth scroll on same page
// This is the standard approach used by Shopify, Wix, etc.
const SECTION_LINKS = [
    { label: 'Home (Hero)', value: '/' },
    { label: 'Features', value: '/#features' },
    { label: 'Services', value: '/#services' },
    { label: 'Testimonials', value: '/#testimonials' },
    { label: 'Pricing', value: '/#pricing' },
    { label: 'Team', value: '/#team' },
    { label: 'FAQ', value: '/#faq' },
    { label: 'Portfolio', value: '/#portfolio' },
    { label: 'Contact / Leads', value: '/#leads' },
    { label: 'Newsletter', value: '/#newsletter' },
    { label: 'Video', value: '/#video' },
    { label: 'How It Works', value: '/#howItWorks' },
    { label: 'Stats', value: '/#stats' },
    { label: 'CTA Section', value: '/#cta' },
    { label: 'Logo Cloud', value: '/#logoCloud' },
];

const MenuEditor: React.FC<MenuEditorProps> = ({ menu, onClose, isNew, projectId }) => {
    const { saveMenu, deleteMenu, cmsPosts, loadCMSPosts } = useCMS();
    const { data, activeProjectId } = useProject();
    const [title, setTitle] = useState(menu.title);
    const [handle, setHandle] = useState(menu.handle || '');
    const [items, setItems] = useState<NavigationMenuItem[]>(Array.isArray(menu.items) ? menu.items : []);
    const [isSaving, setIsSaving] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Use projectId prop if provided, otherwise fall back to activeProjectId
    const effectiveProjectId = projectId ?? activeProjectId;

    // Ecommerce data for link picker
    const { products: storeProducts, categories: storeCategories } = usePublicProducts(effectiveProjectId);
    const [productSearch, setProductSearch] = useState('');

    // Check where this menu is being used
    const usedInHeader = data?.header?.menuId === menu.id;
    const usedInFooter = data?.footer?.linkColumns?.some(col => col.menuId === menu.id);

    // Item Editing State
    const [editingItemId, setEditingItemId] = useState<string | null>(null);

    // Drag and Drop State
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // Link Picker State
    const [linkPickerOpenId, setLinkPickerOpenId] = useState<string | null>(null);
    const [pickerCategory, setPickerCategory] = useState<LinkCategory>('root');
    const [articleSearch, setArticleSearch] = useState('');
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Ensure we have posts loaded for the picker
        if (cmsPosts.length === 0) {
            loadCMSPosts();
        }
    }, []);

    useClickOutside(pickerRef, () => {
        setLinkPickerOpenId(null);
        setPickerCategory('root');
        setArticleSearch('');
        setProductSearch('');
    });

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setTitle(newTitle);
        const generatedHandle = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        setHandle(generatedHandle);
    };

    const handleSave = async () => {
        // Validaciones
        if (!title.trim()) {
            return alert("Menu title is required");
        }

        // Validar que todos los items tengan texto
        const invalidItems = items.filter(item => !item.text.trim());
        if (invalidItems.length > 0) {
            return alert("All menu items must have a name");
        }

        // Validar que todos los items tengan href
        const itemsWithoutLinks = items.filter(item => !item.href.trim());
        if (itemsWithoutLinks.length > 0) {
            return alert("All menu items must have a link");
        }

        setIsSaving(true);
        const updatedMenu: NavigationMenu = {
            ...menu,
            title: title.trim(),
            handle: (handle || title).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            items: items.map(item => ({
                ...item,
                text: item.text.trim(),
                href: item.href.trim()
            }))
        };
        await saveMenu(updatedMenu);
        setIsSaving(false);
        onClose();
    };

    const handleDeleteMenu = async () => {
        let confirmMessage = "Are you sure you want to delete this menu?";

        if (usedInHeader || usedInFooter) {
            const locations = [];
            if (usedInHeader) locations.push("Header");
            if (usedInFooter) locations.push("Footer");
            confirmMessage = `⚠️ This menu is currently being used in: ${locations.join(", ")}.\n\nDeleting it will remove these navigation links from your website.\n\nAre you sure you want to continue?`;
        }

        if (window.confirm(confirmMessage)) {
            await deleteMenu(menu.id);
            onClose();
        }
    };

    const addMenuItem = () => {
        const newItem: NavigationMenuItem = {
            id: `item_${Date.now()}`,
            text: '',
            href: '/',  // Default to home page
            type: 'custom'
        };
        setItems([...items, newItem]);
        setEditingItemId(newItem.id);
    };

    const updateMenuItem = (id: string, data: Partial<NavigationMenuItem>) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
    };

    const deleteMenuItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
        if (editingItemId === id) setEditingItemId(null);
    };

    const moveItem = (index: number, direction: 'up' | 'down') => {
        const newItems = [...items];
        if (direction === 'up' && index > 0) {
            [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
        } else if (direction === 'down' && index < newItems.length - 1) {
            [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
        }
        setItems(newItems);
    };

    // Drag Handlers
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
        // Needed for Firefox to allow drag
        e.dataTransfer.setData("text/plain", index.toString());
        // Make the drag image a bit transparent or look like the row
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === dropIndex) return;

        const newItems = [...items];
        const [draggedItem] = newItems.splice(draggedIndex, 1);
        newItems.splice(dropIndex, 0, draggedItem);

        setItems(newItems);
        setDraggedIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };


    // Link Picker Logic
    const handleLinkSelect = (item: NavigationMenuItem, value: string) => {
        updateMenuItem(item.id, { href: value });
        setLinkPickerOpenId(null);
        setPickerCategory('root');
        setArticleSearch('');
    };

    const renderLinkPickerContent = (item: NavigationMenuItem) => {
        if (pickerCategory === 'root') {
            return (
                <div className="py-1">
                    <button
                        onClick={() => handleLinkSelect(item, '/')}
                        className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 flex items-center group"
                    >
                        <Globe size={16} className="mr-3 text-muted-foreground group-hover:text-primary" />
                        Home page
                    </button>
                    <button
                        onClick={() => setPickerCategory('sections')}
                        className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 flex items-center justify-between group"
                    >
                        <div className="flex items-center">
                            <Hash size={16} className="mr-3 text-muted-foreground group-hover:text-primary" />
                            Sections
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground" />
                    </button>
                    <button
                        onClick={() => setPickerCategory('store')}
                        className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 flex items-center justify-between group"
                    >
                        <div className="flex items-center">
                            <ShoppingBag size={16} className="mr-3 text-muted-foreground group-hover:text-primary" />
                            Store / Ecommerce
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground" />
                    </button>
                    <button
                        onClick={() => setPickerCategory('articles')}
                        className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 flex items-center justify-between group"
                    >
                        <div className="flex items-center">
                            <Newspaper size={16} className="mr-3 text-muted-foreground group-hover:text-primary" />
                            Articles
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground" />
                    </button>
                    <button
                        onClick={() => setPickerCategory('policies')}
                        className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 flex items-center justify-between group"
                    >
                        <div className="flex items-center">
                            <FileText size={16} className="mr-3 text-muted-foreground group-hover:text-primary" />
                            Policies
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground" />
                    </button>
                </div>
            );
        }

        if (pickerCategory === 'sections') {
            return (
                <div>
                    <div className="px-2 py-2 border-b border-border flex items-center">
                        <button onClick={() => setPickerCategory('root')} className="p-1 hover:bg-secondary rounded mr-2 text-muted-foreground hover:text-foreground">
                            <ArrowLeft size={16} />
                        </button>
                        <span className="text-sm font-semibold">Sections</span>
                    </div>
                    <div className="py-1 max-h-48 overflow-y-auto custom-scrollbar">
                        {SECTION_LINKS.map((link) => (
                            <button
                                key={link.value}
                                onClick={() => handleLinkSelect(item, link.value)}
                                className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50"
                            >
                                {link.label}
                            </button>
                        ))}
                    </div>
                </div>
            );
        }

        if (pickerCategory === 'articles') {
            const filteredPosts = cmsPosts.filter(p => p.status === 'published' && p.title.toLowerCase().includes(articleSearch.toLowerCase()));
            return (
                <div>
                    <div className="px-2 py-2 border-b border-border flex items-center">
                        <button onClick={() => setPickerCategory('root')} className="p-1 hover:bg-secondary rounded mr-2 text-muted-foreground hover:text-foreground">
                            <ArrowLeft size={16} />
                        </button>
                        <span className="text-sm font-semibold">Articles</span>
                    </div>
                    <div className="p-2 border-b border-border">
                        <div className="flex items-center gap-1.5 bg-secondary/50 border border-border rounded px-2 py-1">
                            <Search size={12} className="text-muted-foreground flex-shrink-0" />
                            <input
                                className="flex-1 bg-transparent outline-none text-xs min-w-0 text-foreground placeholder:text-muted-foreground"
                                placeholder="Search articles..."
                                value={articleSearch}
                                onChange={(e) => setArticleSearch(e.target.value)}
                            />
                            {articleSearch && (
                                <button onClick={() => setArticleSearch('')} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="py-1 max-h-80 overflow-y-auto custom-scrollbar">
                        {filteredPosts.length === 0 ? (
                            <div className="px-4 py-2 text-xs text-muted-foreground">No published articles found.</div>
                        ) : (
                            filteredPosts.map((post) => (
                                <button
                                    key={post.id}
                                    onClick={() => handleLinkSelect(item, `/blog/${post.slug}`)}
                                    className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 truncate"
                                    title={post.title}
                                >
                                    {post.title}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            );
        }

        if (pickerCategory === 'policies') {
            return (
                <div>
                    <div className="px-2 py-2 border-b border-border flex items-center">
                        <button onClick={() => setPickerCategory('root')} className="p-1 hover:bg-secondary rounded mr-2 text-muted-foreground hover:text-foreground">
                            <ArrowLeft size={16} />
                        </button>
                        <span className="text-sm font-semibold">Policies</span>
                    </div>
                    <div className="py-1">
                        <button onClick={() => handleLinkSelect(item, '/privacidad')} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50">Privacy Policy</button>
                        <button onClick={() => handleLinkSelect(item, '/terminos')} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50">Terms of Service</button>
                        <button onClick={() => handleLinkSelect(item, '/reembolsos')} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50">Refund Policy</button>
                    </div>
                </div>
            );
        }

        // Store / Ecommerce options
        if (pickerCategory === 'store') {
            const hasEcommerceData = storeProducts.length > 0 || storeCategories.length > 0;
            return (
                <div>
                    <div className="px-2 py-2 border-b border-border flex items-center">
                        <button onClick={() => setPickerCategory('root')} className="p-1 hover:bg-secondary rounded mr-2 text-muted-foreground hover:text-foreground">
                            <ArrowLeft size={16} />
                        </button>
                        <span className="text-sm font-semibold">Store / Ecommerce</span>
                    </div>
                    {!effectiveProjectId && (
                        <div className="px-4 py-3 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 border-b border-border">
                            No project selected. Please select a project first.
                        </div>
                    )}
                    {effectiveProjectId && !hasEcommerceData && (
                        <div className="px-4 py-3 text-xs text-muted-foreground bg-secondary/30 border-b border-border">
                            No ecommerce data found. Add products in the Ecommerce Dashboard to see them here.
                        </div>
                    )}
                    <div className="py-1">
                        <button
                            onClick={() => handleLinkSelect(item, '/tienda')}
                            className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 flex items-center group"
                        >
                            <ShoppingBag size={16} className="mr-3 text-muted-foreground group-hover:text-primary" />
                            All Products (Store)
                        </button>
                        <button
                            onClick={() => setPickerCategory('store-categories')}
                            className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 flex items-center justify-between group"
                        >
                            <div className="flex items-center">
                                <Tag size={16} className="mr-3 text-muted-foreground group-hover:text-primary" />
                                Categories
                                {storeCategories.length > 0 && (
                                    <span className="ml-2 text-xs text-muted-foreground">({storeCategories.length})</span>
                                )}
                            </div>
                            <ChevronRight size={16} className="text-muted-foreground" />
                        </button>
                        <button
                            onClick={() => setPickerCategory('store-products')}
                            className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 flex items-center justify-between group"
                        >
                            <div className="flex items-center">
                                <Package size={16} className="mr-3 text-muted-foreground group-hover:text-primary" />
                                Products
                                {storeProducts.length > 0 && (
                                    <span className="ml-2 text-xs text-muted-foreground">({storeProducts.length})</span>
                                )}
                            </div>
                            <ChevronRight size={16} className="text-muted-foreground" />
                        </button>
                    </div>
                </div>
            );
        }

        if (pickerCategory === 'store-categories') {
            return (
                <div>
                    <div className="px-2 py-2 border-b border-border flex items-center">
                        <button onClick={() => setPickerCategory('store')} className="p-1 hover:bg-secondary rounded mr-2 text-muted-foreground hover:text-foreground">
                            <ArrowLeft size={16} />
                        </button>
                        <span className="text-sm font-semibold">Categories</span>
                    </div>
                    <div className="py-1 max-h-48 overflow-y-auto custom-scrollbar">
                        {storeCategories.length === 0 ? (
                            <div className="px-4 py-2 text-xs text-muted-foreground">No categories found. Add categories in the Ecommerce Dashboard.</div>
                        ) : (
                            storeCategories.map((category) => (
                                <button
                                    key={category.id}
                                    onClick={() => handleLinkSelect(item, `/tienda/categoria/${category.slug}`)}
                                    className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 truncate"
                                    title={category.name}
                                >
                                    {category.name}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            );
        }

        if (pickerCategory === 'store-products') {
            const filteredProducts = storeProducts.filter(p =>
                p.name.toLowerCase().includes(productSearch.toLowerCase())
            );
            return (
                <div>
                    <div className="px-2 py-2 border-b border-border flex items-center">
                        <button onClick={() => setPickerCategory('store')} className="p-1 hover:bg-secondary rounded mr-2 text-muted-foreground hover:text-foreground">
                            <ArrowLeft size={16} />
                        </button>
                        <span className="text-sm font-semibold">Products</span>
                    </div>
                    <div className="p-2 border-b border-border">
                        <div className="flex items-center gap-1.5 bg-secondary/50 border border-border rounded px-2 py-1">
                            <Search size={12} className="text-muted-foreground flex-shrink-0" />
                            <input
                                className="flex-1 bg-transparent outline-none text-xs min-w-0 text-foreground placeholder:text-muted-foreground"
                                placeholder="Search products..."
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                            />
                            {productSearch && (
                                <button onClick={() => setProductSearch('')} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="py-1 max-h-80 overflow-y-auto custom-scrollbar">
                        {filteredProducts.length === 0 ? (
                            <div className="px-4 py-2 text-xs text-muted-foreground">No products found. Add products in the Ecommerce Dashboard.</div>
                        ) : (
                            filteredProducts.map((product) => (
                                <button
                                    key={product.id}
                                    onClick={() => handleLinkSelect(item, `/tienda/producto/${product.slug}`)}
                                    className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 truncate"
                                    title={product.name}
                                >
                                    {product.name}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            );
        }

        // Fallback - should not reach here
        return null;
    };


    return (
        <div className="flex h-screen bg-background text-foreground">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden relative bg-background">
                {/* Header */}
                <header className="h-14 px-2 sm:px-6 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm z-20 sticky top-0">
                    <div className="flex items-center gap-1 sm:gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-border/40 rounded-full transition-colors lg:hidden">
                            <MenuIcon className="w-4 h-4" />
                        </button>
                        <button onClick={onClose} className="p-2 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-lg sm:text-xl font-bold truncate max-w-[120px] sm:max-w-none">
                            {isNew ? 'Add menu' : title}
                        </h1>
                        {!isNew && (usedInHeader || usedInFooter) && (
                            <div className="hidden sm:flex gap-2 ml-3">
                                {usedInHeader && (
                                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-primary bg-primary/10 rounded-full">
                                        Used in Header
                                    </span>
                                )}
                                {usedInFooter && (
                                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-primary bg-primary/10 rounded-full">
                                        Used in Footer
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-1 sm:gap-2">
                        {!isNew && (
                            <button onClick={handleDeleteMenu} className="px-2 sm:px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                                <span className="hidden sm:inline">Delete menu</span>
                                <Trash2 size={18} className="sm:hidden" />
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-1.5 h-9 px-2 sm:px-3 rounded-md text-sm font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-50"
                        >
                            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                            <span className="hidden sm:inline">Save</span>
                            {!isSaving && <Save size={18} className="sm:hidden" />}
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                    <div className="max-w-4xl mx-auto space-y-6">

                        {/* Title Section */}
                        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={handleTitleChange}
                                        className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                                        placeholder="e.g. Main Menu"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Handle</label>
                                    <input
                                        type="text"
                                        value={handle}
                                        onChange={(e) => setHandle(e.target.value)}
                                        className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none font-mono text-sm"
                                        placeholder="e.g. main-menu"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">Used to reference this menu in liquid/code.</p>
                                </div>
                            </div>
                        </div>

                        {/* Preview Section */}
                        {items.length > 0 && (
                            <div className="bg-card border border-border rounded-xl shadow-sm p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-md font-semibold text-foreground">Preview</h3>
                                    <span className="text-xs text-muted-foreground">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
                                </div>
                                <div className="p-4 bg-secondary/10 rounded-lg border border-border">
                                    <div className="flex gap-6 flex-wrap items-center">
                                        {items.map(item => (
                                            <a
                                                key={item.id}
                                                href={item.href}
                                                onClick={(e) => e.preventDefault()}
                                                className="text-sm font-medium text-primary hover:underline transition-all"
                                                title={item.href}
                                            >
                                                {item.text || '(No name)'}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Menu Items Section */}
                        <div className="bg-card border border-border rounded-xl shadow-sm">
                            <div className="p-6 border-b border-border">
                                <h3 className="text-md font-semibold text-foreground">Menu items</h3>
                            </div>

                            <div className="divide-y divide-border overflow-visible">
                                {items.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground text-sm">
                                        This menu doesn't have any items yet.
                                    </div>
                                ) : (
                                    items.map((item, index) => (
                                        <div
                                            key={item.id}
                                            className={`bg-card relative transition-all duration-200 ${draggedIndex === index ? 'opacity-50 bg-secondary/20' : ''} ${draggedIndex !== null && draggedIndex !== index ? 'border-t-2 border-transparent hover:border-primary/50' : ''}`}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, index)}
                                            onDragOver={(e) => handleDragOver(e, index)}
                                            onDrop={(e) => handleDrop(e, index)}
                                            onDragEnd={handleDragEnd}
                                        >
                                            {editingItemId === item.id ? (
                                                <div className="p-4 bg-secondary/10 overflow-visible">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <span className="text-sm font-semibold">Edit item</span>
                                                        <button onClick={() => setEditingItemId(null)}><X size={16} className="text-muted-foreground" /></button>
                                                    </div>
                                                    <div className="space-y-4 overflow-visible">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-visible">
                                                            <div>
                                                                <label className="block text-xs font-medium text-muted-foreground mb-1">Name</label>
                                                                <input
                                                                    autoFocus
                                                                    type="text"
                                                                    value={item.text}
                                                                    onChange={(e) => updateMenuItem(item.id, { text: e.target.value })}
                                                                    className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-md text-sm focus:ring-1 focus:ring-primary outline-none"
                                                                />
                                                            </div>
                                                            <div className="relative">
                                                                <label className="block text-xs font-medium text-muted-foreground mb-1">Link</label>
                                                                <div className="relative">
                                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                        <Search size={14} className="text-muted-foreground" />
                                                                    </div>
                                                                    <input
                                                                        type="text"
                                                                        value={item.href}
                                                                        onChange={(e) => {
                                                                            updateMenuItem(item.id, { href: e.target.value });
                                                                            setLinkPickerOpenId(item.id); // Open picker on type
                                                                        }}
                                                                        onFocus={() => setLinkPickerOpenId(item.id)}
                                                                        placeholder="Paste a link or search"
                                                                        className="w-full pl-9 pr-3 py-2 bg-secondary/30 border border-border rounded-md text-sm focus:ring-1 focus:ring-primary outline-none"
                                                                    />
                                                                </div>

                                                                {/* Link Picker Popover */}
                                                                {linkPickerOpenId === item.id && (
                                                                    <div
                                                                        ref={pickerRef}
                                                                        className="absolute top-full left-0 w-full mt-1 bg-popover border border-border rounded-lg shadow-2xl z-[100] animate-fade-in-up"
                                                                        style={{ minHeight: 'auto', maxHeight: '400px' }}
                                                                    >
                                                                        {renderLinkPickerContent(item)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-4 flex justify-between">
                                                        <button onClick={() => deleteMenuItem(item.id)} className="text-red-500 text-sm flex items-center hover:underline"><Trash2 size={14} className="mr-1" /> Delete</button>
                                                        <button onClick={() => setEditingItemId(null)} className="bg-secondary/50 border border-border px-3 py-1.5 rounded text-sm font-medium hover:bg-secondary">Done</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-3 flex items-center hover:bg-secondary/20 group cursor-move">
                                                    <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 mr-2">
                                                        <GripVertical size={20} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium text-foreground">{item.text || '(No name)'}</div>
                                                        <div className="text-xs text-muted-foreground">{item.href}</div>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => setEditingItemId(item.id)}
                                                            className="px-3 py-1.5 text-xs font-medium border border-border rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors"
                                                        >
                                                            Edit
                                                        </button>
                                                        <div className="flex flex-col">
                                                            <button onClick={() => moveItem(index, 'up')} disabled={index === 0} className="p-1 hover:text-primary disabled:opacity-20"><ArrowUpLeft size={12} className="rotate-45" /></button>
                                                            <button onClick={() => moveItem(index, 'down')} disabled={index === items.length - 1} className="p-1 hover:text-primary disabled:opacity-20"><ArrowUpLeft size={12} className="-rotate-135" /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-4 bg-secondary/10 border-t border-border">
                                <button
                                    onClick={addMenuItem}
                                    className="flex items-center text-primary font-medium text-sm hover:underline"
                                >
                                    <Plus size={16} className="mr-1" /> Add menu item
                                </button>
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
};

export default MenuEditor;
