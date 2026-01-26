import { Project, Domain, DeploymentProvider, DeploymentLog } from '../types';

// Helper to generate static HTML from project
const generateStaticHTML = (project: Project): string => {
    const { data, theme, componentOrder, sectionVisibility, componentStatus, componentStyles, seoConfig, brandIdentity } = project;

    // Derive global colors
    const pageBg = theme?.pageBackground || theme?.globalColors?.background || '#0f172a';
    const primaryColor = theme?.primaryColor || theme?.globalColors?.primary || '#4f46e5';

    // UI Helpers
    const getContrastingText = (bg: string) => {
        // Simplified luminance check
        const color = bg.replace('#', '');
        const r = parseInt(color.substring(0, 2), 16);
        const g = parseInt(color.substring(2, 4), 16);
        const b = parseInt(color.substring(4, 6), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
    };

    // Component Renderers
    const renderers: Record<string, (data: any) => string> = {
        header: (d) => `
            <header class="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-opacity-80 border-b border-white/5" style="background-color: ${d.colors?.background || 'transparent'}; border-color: ${d.colors?.border || 'rgba(255,255,255,0.1)'}">
                <div class="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        ${brandIdentity?.logoUrl ? `<img src="${brandIdentity.logoUrl}" class="h-8" alt="Logo">` : `<span class="text-xl font-bold" style="color: ${d.colors?.text || '#fff'}">${project.name}</span>`}
                    </div>
                    <nav class="hidden md:flex gap-8">
                        ${(d.links || []).map((l: any) => `<a href="${l.href}" class="text-sm font-medium hover:opacity-80 transition-opacity" style="color: ${d.colors?.text || '#fff'}">${l.text}</a>`).join('')}
                    </nav>
                    ${d.showCta ? `<a href="#" class="px-5 py-2 rounded-lg font-bold text-sm transition-transform hover:scale-105" style="background-color: ${d.colors?.accent || primaryColor}; color: ${getContrastingText(d.colors?.accent || primaryColor)}">${d.ctaText || 'Get Started'}</a>` : ''}
                </div>
            </header>
        `,
        hero: (d) => `
            <section class="min-h-screen flex items-center justify-center pt-24 px-6 overflow-hidden relative" style="background-color: ${d.colors?.background || pageBg}">
                <div class="container mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
                    <div class="max-w-2xl">
                        ${d.showBadge ? `<span class="inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-6 tracking-wider uppercase" style="background-color: ${d.badgeBackgroundColor || primaryColor + '20'}; color: ${d.badgeColor || primaryColor}">${d.badgeText || '✨ Premium Experience'}</span>` : ''}
                        <h1 class="text-5xl md:text-7xl font-black mb-6 leading-tight text-white">${d.headline || 'Transforma tu Visión en una <span class="text-yellow-400">Experiencia Digital</span>'}</h1>
                        <p class="text-xl text-white/60 mb-10 leading-relaxed">${d.subheadline || 'Crea, personaliza y despliega sitios web de alto impacto impulsados por Inteligencia Artificial.'}</p>
                        <div class="flex flex-wrap gap-4">
                            <a href="${d.primaryCtaLink || '#'}" class="px-8 py-4 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 text-center min-w-[160px]" style="background-color: ${d.colors?.buttonBackground || primaryColor}; color: ${d.colors?.buttonText || getContrastingText(d.colors?.buttonBackground || primaryColor)}">${d.primaryCta || 'Empezar Gratis'}</a>
                            ${d.secondaryCta ? `<a href="${d.secondaryCtaLink || '#'}" class="px-8 py-4 rounded-xl font-bold border border-white/10 hover:bg-white/5 transition-all text-center min-w-[160px]" style="color: ${d.colors?.secondaryButtonText || '#fff'}">${d.secondaryCta}</a>` : ''}
                        </div>
                    </div>
                    <div class="hidden lg:block relative">
                        <div class="absolute inset-0 bg-gradient-to-tr from-yellow-400/20 to-transparent rounded-3xl blur-3xl animate-pulse"></div>
                        <img src="${d.imageUrl || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426'}" class="relative z-10 rounded-2xl border border-white/10 shadow-2xl animate-float" style="width: ${d.imageWidth || 100}%; height: ${d.imageHeight || 500}px; object-fit: ${d.imageObjectFit || 'cover'}">
                    </div>
                </div>
            </section>
        `,
        features: (d) => `
            <section id="features" class="py-24 px-6 relative" style="background-color: ${d.colors?.background || pageBg}">
                <div class="container mx-auto">
                    <div class="max-w-3xl mb-16">
                        <h2 class="text-4xl md:text-5xl font-bold mb-6 text-white">${d.title || 'Nuestras <span class="text-yellow-400">Funciones</span>'}</h2>
                        <p class="text-lg text-white/50">${d.description || 'Descubre las herramientas inteligentes que tenemos para potenciar tu negocio.'}</p>
                    </div>
                    <div class="grid md:grid-cols-${d.gridColumns || 3} gap-8">
                        ${(d.items || [
                { title: 'Diseño Inteligente', description: 'IA que genera estructuras optimizadas.', imageUrl: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&w=800' },
                { title: 'SEO Automatizado', description: 'Mejores prácticas integradas nativamente.', imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800' },
                { title: 'Ecommerce Pro', description: 'Venta fluida de productos digitales y físicos.', imageUrl: 'https://images.unsplash.com/photo-1557821552-17105176677c?auto=format&fit=crop&w=800' }
            ]).map((item: any) => `
                            <div class="p-8 rounded-2xl border border-white/5 hover:border-yellow-400/30 transition-all group" style="background-color: ${d.colors?.cardBackground || 'rgba(255,255,255,0.03)'}">
                                <div class="overflow-hidden rounded-xl mb-6 aspect-video">
                                    <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800'}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                                </div>
                                <h3 class="text-xl font-bold mb-3 text-white">${item.title}</h3>
                                <p class="text-white/40 leading-relaxed">${item.description}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </section>
        `,
        cta: (d) => `
            <section class="py-24 px-6">
                <div class="container mx-auto text-center p-16 rounded-[40px] relative overflow-hidden" style="background: linear-gradient(135deg, ${d.colors?.gradientStart || primaryColor}, ${d.colors?.gradientEnd || '#000'})">
                    <h2 class="text-4xl md:text-6xl font-black mb-6 text-white">${d.title || d.headline}</h2>
                    <p class="text-xl text-white/80 mb-10 max-w-2xl mx-auto">${d.description || d.subheadline}</p>
                    <button class="px-10 py-5 bg-white text-black font-bold text-lg rounded-2xl hover:scale-105 transition-transform">${d.buttonText}</button>
                </div>
            </section>
        `,
        footer: (d) => `
            <footer class="py-16 px-6 border-t border-white/5" style="background-color: ${d.colors?.background || pageBg}">
                <div class="container mx-auto grid md:grid-cols-4 gap-12">
                    <div class="col-span-2">
                        <div class="text-2xl font-bold mb-4" style="color: ${d.colors?.heading || '#fff'}">${project.name}</div>
                        <p class="opacity-60 max-w-xs" style="color: ${d.colors?.text || '#fff'}">${d.description || ''}</p>
                    </div>
                    ${(d.linkColumns || []).map((col: any) => `
                        <div>
                            <h4 class="font-bold mb-6" style="color: ${d.colors?.heading || '#fff'}">${col.title}</h4>
                            <ul class="space-y-4">
                                ${(col.links || []).map((l: any) => `<li><a href="${l.href}" class="opacity-60 hover:opacity-100 transition-opacity text-sm" style="color: ${d.colors?.text || '#fff'}">${l.text}</a></li>`).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>
                <div class="container mx-auto mt-16 pt-8 border-t border-white/5 text-center text-sm opacity-40">
                    ${d.copyrightText || `© ${new Date().getFullYear()} ${project.name}. All rights reserved.`}
                </div>
            </footer>
        `,
        featuredProducts: (d) => `
            <section id="products" class="py-24 px-6" style="background-color: ${d.colors?.background || pageBg}">
                <div class="container mx-auto">
                    <div class="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                        <div>
                            <h2 class="text-4xl font-bold mb-4" style="color: ${d.colors?.heading || '#fff'}">${d.title || d.headline || 'Featured Products'}</h2>
                            <p class="opacity-70 max-w-xl" style="color: ${d.colors?.text || '#fff'}">${d.description || d.subheadline || 'Explore our best sellers and new arrivals.'}</p>
                        </div>
                        <a href="#" class="text-sm font-bold uppercase tracking-widest hover:opacity-70 transition-opacity" style="color: ${d.colors?.accent || primaryColor}">View All Products →</a>
                    </div>
                    <div class="grid md:grid-cols-4 gap-6">
                        ${(d.products || d.items || []).map((p: any) => `
                            <div class="group bg-white/5 rounded-2xl overflow-hidden border border-white/5 hover:border-white/10 transition-all flex flex-col h-full">
                                <div class="aspect-square relative overflow-hidden bg-white/5">
                                    <img src="${p.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800'}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="${p.name}">
                                    ${p.badge ? `<span class="absolute top-4 left-4 px-3 py-1 bg-white text-black text-[10px] font-bold uppercase rounded-full shadow-lg">${p.badge}</span>` : ''}
                                </div>
                                <div class="p-6 flex flex-col flex-grow">
                                    <h3 class="font-bold text-lg mb-2" style="color: ${d.colors?.heading || '#fff'}">${p.name}</h3>
                                    <div class="flex items-center justify-between mt-auto">
                                        <div class="flex flex-col">
                                            <span class="text-xl font-black" style="color: ${d.colors?.accent || primaryColor}">$${p.price}</span>
                                            ${p.oldPrice ? `<span class="text-xs opacity-40 line-through">$${p.oldPrice}</span>` : ''}
                                        </div>
                                        <button onclick="addToCart('${p.id}', '${p.name}', ${p.price}, '${p.imageUrl}')" class="p-3 bg-white text-black rounded-xl hover:scale-110 transition-transform">
                                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </section>
        `,
        slideshow: (d) => `
            <section class="py-24 px-6 overflow-hidden" style="background-color: ${d.colors?.background || pageBg}">
                <div class="container mx-auto">
                    ${d.showTitle ? `<h2 class="text-4xl font-bold mb-12 text-white text-center">${d.title || 'Nuestra <span class="text-yellow-400">Galería</span>'}</h2>` : ''}
                    <div class="flex gap-6 overflow-x-auto pb-8 snap-x scrollbar-hide">
                        ${(d.items || [
                { imageUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200', caption: 'Modern Workspace' },
                { imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200', caption: 'Innovative Design' },
                { imageUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200', caption: 'Team Collaboration' }
            ]).map((img: any) => `
                            <div class="min-w-[80%] md:min-w-[700px] aspect-video rounded-2xl overflow-hidden snap-center border border-white/10 relative group">
                                <img src="${img.imageUrl}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
                                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                                    <p class="text-white font-bold text-xl">${img.caption || ''}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </section>
        `,
        categoryGrid: (d) => `
            <section class="py-24 px-6" style="background-color: ${d.colors?.background || pageBg}">
                <div class="container mx-auto">
                    <h2 class="text-3xl font-bold mb-12 text-center" style="color: ${d.colors?.heading || '#fff'}">${d.title || 'Shop by Category'}</h2>
                    <div class="grid md:grid-cols-3 gap-8">
                        ${(d.categories || []).map((c: any) => `
                            <a href="${c.href || '#'}" class="group relative aspect-[4/5] rounded-[2rem] overflow-hidden">
                                <img src="${c.imageUrl}" class="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="${c.name}">
                                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8">
                                    <h3 class="text-2xl font-bold text-white mb-2">${c.name}</h3>
                                    <span class="text-white/60 text-sm font-medium">Explore Collection →</span>
                                </div>
                            </a>
                        `).join('')}
                    </div>
                </div>
            </section>
        `,
        productHero: (d) => `
            <section class="py-24 px-6 bg-black relative overflow-hidden" style="background-color: ${d.colors?.background || '#000'}">
                <div class="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,${primaryColor}33,transparent_70%)]"></div>
                <div class="container mx-auto grid md:grid-cols-2 gap-16 items-center relative z-10">
                    <div class="order-2 md:order-1">
                        <span class="inline-block px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20 mb-6" style="color: ${d.colors?.accent || primaryColor}; border-color: ${d.colors?.accent || primaryColor}40">${d.tagline || 'Limited Edition'}</span>
                        <h2 class="text-5xl md:text-8xl font-black mb-8 leading-tight text-white">${d.title || 'Master the New Standard'}</h2>
                        <p class="text-xl text-white/70 mb-12 max-w-lg leading-relaxed">${d.description}</p>
                        <div class="flex items-center gap-8">
                            <button onclick="addToCart('hero-item', '${d.title}', ${d.price || 0}, '${d.imageUrl}')" class="px-10 py-5 bg-white text-black font-black rounded-2xl hover:scale-105 transition-transform">Buy Now — $${d.price}</button>
                            <div class="flex flex-col">
                                <span class="text-xs uppercase opacity-40 font-bold tracking-widest">Free Shipping</span>
                                <span class="text-xs uppercase opacity-40 font-bold tracking-widest">Lifetime Warranty</span>
                            </div>
                        </div>
                    </div>
                    <div class="order-1 md:order-2 flex justify-center">
                        <div class="relative w-4/5">
                            <div class="absolute inset-0 bg-white/20 rounded-full blur-[100px] animate-pulse"></div>
                            <img src="${d.imageUrl}" class="relative z-10 w-full drop-shadow-[0_35px_35px_rgba(255,255,255,0.1)] animate-float" alt="Product">
                        </div>
                    </div>
                </div>
            </section>
        `,
        saleCountdown: (d) => `
            <section class="py-12 px-6" style="background-color: ${d.colors?.background || primaryColor}">
                <div class="container mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
                    <div class="flex items-center gap-6">
                        <div class="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                        <div>
                            <h3 class="text-2xl font-black text-white italic uppercase">${d.title || d.headline || 'Flash Sale'}</h3>
                            <p class="text-white/80 font-medium">${d.description || d.subheadline || 'Ends soon, don\'t miss out!'}</p>
                        </div>
                    </div>
                    <div class="flex gap-4">
                        ${['24', '12', '45'].map((num, i) => `
                            <div class="flex flex-col items-center">
                                <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-black font-black text-2xl shadow-xl">${num}</div>
                                <span class="text-[10px] font-black uppercase tracking-tighter mt-2 text-white">${i === 0 ? 'Hours' : i === 1 ? 'Mins' : 'Secs'}</span>
                            </div>
                        `).join('<span class="text-white font-black text-2xl pt-4">:</span>')}
                    </div>
                    <button class="px-8 py-4 bg-black text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-2xl">${d.buttonText || 'Shop the Sale'}</button>
                </div>
            </section>
        `,
        announcementBar: (d) => `
            <div class="py-2 text-center text-[11px] font-black uppercase tracking-[0.2em] relative z-[60]" style="background-color: ${d.colors?.background || '#000'}; color: ${d.colors?.text || '#fff'}">
                ${d.text}
                ${d.linkText ? `<a href="${d.linkHref || '#'}" class="ml-2 underline underline-offset-4 decoration-white/30 hover:decoration-white transition-all">${d.linkText}</a>` : ''}
            </div>
        `,
        trustBadges: (d) => `
            <section class="py-16 border-y border-white/5" style="background-color: ${d.colors?.background || pageBg}">
                <div class="container mx-auto overflow-x-auto">
                    <div class="flex justify-between items-center min-w-[800px] px-6 gap-12">
                        ${(d.badges || []).map((b: any) => `
                            <div class="flex items-center gap-4 opacity-40 hover:opacity-100 transition-all">
                                ${b.iconUrl ? `<img src="${b.iconUrl}" class="w-8 h-8 grayscale brightness-200">` : `<div class="w-8 h-8 rounded-full border border-white/20"></div>`}
                                <span class="text-xs font-black uppercase tracking-widest text-white whitespace-nowrap">${b.label}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </section>
        `
    };

    // Check for ecommerce
    const hasEcommerce = componentOrder.some(key =>
        ['featuredProducts', 'categoryGrid', 'productHero', 'saleCountdown'].includes(key) &&
        componentStatus?.[key] !== false && sectionVisibility?.[key] !== false
    );

    // Render static parts
    const headerData = { ...(componentStyles?.header || {}), ...(data.header || {}), hasEcommerce };
    const footerData = { ...(componentStyles?.footer || {}), ...(data.footer || {}) };

    // Update header renderer to include cart button if e-commerce is enabled
    const originalHeaderRenderer = renderers.header;
    renderers.header = (d) => {
        let html = originalHeaderRenderer(d);
        if (d.hasEcommerce) {
            const cartBtn = `
                <button onclick="toggleCart()" class="relative p-2 hover:opacity-70 transition-opacity" style="color: ${d.colors?.text || '#fff'}">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                    <span id="cart-count" class="absolute -top-1 -right-1 w-4 h-4 bg-white text-black text-[10px] font-bold rounded-full flex items-center justify-center opacity-0 transition-opacity">0</span>
                </button>
            `;
            // Insert before the end of the navigation or before CTA
            if (html.includes('</nav>')) {
                html = html.replace('</nav>', `</nav>${cartBtn}`);
            }
        }
        return html;
    };

    // Generate main content sections
    const sectionsHtml = componentOrder
        .filter(key => componentStatus?.[key] !== false && sectionVisibility?.[key] !== false && key !== 'header' && key !== 'footer')
        .map(key => {
            const renderer = renderers[key] || ((d) => `<section class="py-20 text-center border-b border-white/5 text-white/20">Component ${key} Placeholder</section>`);
            const merged = { ...(componentStyles?.[key] || {}), ...(data[key] || {}) };
            return renderer(merged);
        })
        .join('');

    const headerHtml = componentStatus?.header !== false && sectionVisibility?.header !== false ? renderers.header(headerData) : '';
    const footerHtml = componentStatus?.footer !== false && sectionVisibility?.footer !== false ? renderers.footer(footerData) : '';

    // Cart Drawer HTML
    const cartDrawerHtml = hasEcommerce ? `
    <!-- Cart Drawer -->
    <div id="cart-drawer" class="fixed inset-0 z-[100] transition-opacity duration-300 opacity-0 pointer-events-none">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="toggleCart()"></div>
        <div class="absolute top-0 right-0 bottom-0 w-full max-w-md bg-[#0f172a] border-l border-white/5 shadow-2xl transform translate-x-full transition-transform duration-300 flex flex-col">
            <div class="p-6 border-b border-white/5 flex justify-between items-center">
                <h2 class="text-xl font-bold">Your Cart</h2>
                <button onclick="toggleCart()" class="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            <div id="cart-items" class="flex-grow overflow-y-auto p-6 space-y-4">
                <!-- Items will be injected here -->
                <div id="empty-cart-msg" class="text-center py-12 opacity-40">
                    <p>Your cart is empty</p>
                </div>
            </div>
            <div class="p-6 border-t border-white/5 space-y-4">
                <div class="flex justify-between items-center text-lg font-bold">
                    <span>Total</span>
                    <span id="cart-total">$0.00</span>
                </div>
                <button onclick="checkout()" class="w-full py-4 bg-white text-black font-black rounded-xl hover:scale-[1.02] transition-transform">Checkout Now</button>
                <p class="text-[10px] text-center opacity-40">Taxes and shipping calculated at checkout</p>
            </div>
        </div>
    </div>
    ` : '';

    // Cart Script
    const cartScript = hasEcommerce ? `
    <script>
        let cart = JSON.parse(localStorage.getItem('quimera_cart_${project.id}') || '[]');
        
        function updateCartUI() {
            const countEl = document.getElementById('cart-count');
            const itemsContainer = document.getElementById('cart-items');
            const totalEl = document.getElementById('cart-total');
            const emptyMsg = document.getElementById('empty-cart-msg');
            
            // Update count
            const count = cart.reduce((acc, item) => acc + item.quantity, 0);
            if(countEl) {
                countEl.innerText = count;
                countEl.style.opacity = count > 0 ? '1' : '0';
            }
            
            // Update items
            if(itemsContainer) {
                const itemsHtml = cart.map(item => \`
                    <div class="flex gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                        <img src="\${item.image}" class="w-16 h-16 rounded-lg object-cover">
                        <div class="flex-grow">
                            <h4 class="font-bold text-sm">\${item.name}</h4>
                            <div class="flex justify-between items-center mt-2">
                                <span class="text-xs opacity-60">\$\${item.price} x \${item.quantity}</span>
                                <button onclick="removeFromCart('\${item.id}')" class="text-xs text-red-400 font-bold">Remove</button>
                            </div>
                        </div>
                    </div>
                \`).join('');
                
                if (cart.length > 0) {
                    emptyMsg.style.display = 'none';
                    itemsContainer.innerHTML = itemsHtml;
                } else {
                    emptyMsg.style.display = 'block';
                    itemsContainer.innerHTML = '<div id="empty-cart-msg" class="text-center py-12 opacity-40"><p>Your cart is empty</p></div>';
                }
            }
            
            // Update total
            const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            if(totalEl) totalEl.innerText = \`$\${total.toFixed(2)}\`;
            
            localStorage.setItem('quimera_cart_${project.id}', JSON.stringify(cart));
        }
        
        function addToCart(id, name, price, image) {
            const existing = cart.find(item => item.id === id);
            if (existing) {
                existing.quantity += 1;
            } else {
                cart.push({ id, name, price, image, quantity: 1 });
            }
            updateCartUI();
            toggleCart(true);
        }
        
        function removeFromCart(id) {
            cart = cart.filter(item => item.id !== id);
            updateCartUI();
        }
        
        function toggleCart(forceOpen = false) {
            const drawer = document.getElementById('cart-drawer');
            const inner = drawer.querySelector('.shadow-2xl');
            const isOpen = forceOpen || drawer.classList.contains('pointer-events-none');
            
            if (isOpen) {
                drawer.classList.remove('pointer-events-none', 'opacity-0');
                inner.classList.remove('translate-x-full');
            } else {
                drawer.classList.add('pointer-events-none', 'opacity-0');
                inner.classList.add('translate-x-full');
            }
        }
        
        function checkout() {
            alert('Redirecting to Quimera Secure Checkout...');
            // In production, this would redirect to:
            // window.location.href = \`https://checkout.quimera.ai/${project.id}?cart=\${btoa(JSON.stringify(cart))}\`;
        }
        
        // Initial load
        window.addEventListener('scroll', () => {
             const header = document.querySelector('header');
             if(window.scrollY > 50) header.classList.add('bg-[#0f172a]');
             else header.classList.remove('bg-[#0f172a]');
        });
        
        document.addEventListener('DOMContentLoaded', updateCartUI);
    </script>
    ` : '';

    // Meta tags & SEO
    const escapeHtml = (str: string) => str ? str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;') : '';

    const title = seoConfig?.title || project.name || 'Tienda Online';
    const description = seoConfig?.description || brandIdentity?.tagline || `Bienvenido a ${project.name}`;
    const image = seoConfig?.ogImage || brandIdentity?.logoUrl || '';

    const metaTags = `
    <meta name="description" content="${escapeHtml(description)}">
    ${seoConfig?.keywords?.length ? `<meta name="keywords" content="${escapeHtml(seoConfig.keywords.join(', '))}">` : ''}
    
    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="${escapeHtml(seoConfig?.ogTitle || title)}">
    <meta property="og:description" content="${escapeHtml(seoConfig?.ogDescription || description)}">
    ${image ? `<meta property="og:image" content="${escapeHtml(image)}">` : ''}
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(seoConfig?.twitterTitle || title)}">
    <meta name="twitter:description" content="${escapeHtml(seoConfig?.twitterDescription || description)}">
    ${image ? `<meta name="twitter:image" content="${escapeHtml(image)}">` : ''}
    
    <!-- Robots -->
    <meta name="robots" content="${seoConfig?.robots || 'index, follow'}">
    `;

    return `<!DOCTYPE html>
<html lang="${seoConfig?.language || 'es'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${seoConfig?.title || project.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
    ${metaTags}
    <style>
        body { font-family: 'Inter', sans-serif; background-color: ${pageBg}; color: white; -webkit-font-smoothing: antialiased; scroll-behavior: smooth; }
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .container { max-width: 1200px; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
    </style>
</head>
<body class="antialiased">
    ${headerHtml}
    <main>
        ${sectionsHtml}
    </main>
    ${footerHtml}
    
    ${cartDrawerHtml}
    ${cartScript}

</body>
</html>`;
};

// Deployment Service Interface
interface DeploymentResult {
    success: boolean;
    deploymentUrl?: string;
    deploymentId?: string;
    dnsRecords?: Array<{
        type: 'A' | 'CNAME' | 'TXT';
        host: string;
        value: string;
        verified?: boolean;
    }>;
    error?: string;
}

// DNS Verification Result
interface DNSVerificationResult {
    verified: boolean;
    records: Array<{
        type: "A" | "CNAME" | "TXT";
        host: string;
        value: string;
        verified: boolean;
    }>;
    error?: string;
}

class DeploymentService {
    private static instance: DeploymentService;

    private constructor() { }

    static getInstance(): DeploymentService {
        if (!DeploymentService.instance) {
            DeploymentService.instance = new DeploymentService();
        }
        return DeploymentService.instance;
    }

    /**
     * Generic deploy method for context bridge
     */
    async deploy(
        projectId: string,
        domainName: string,
        provider: DeploymentProvider = 'vercel'
    ): Promise<{ success: boolean; url?: string; error?: string }> {
        try {
            // Need to fetch project data - this should be passed in ideally
            // but for the context bridge we'll handle the routing
            console.log(`Generic deploy call: project ${projectId}, domain ${domainName}, provider ${provider}`);

            // In a real app, we'd fetch the project from Firestore here if not provided
            // For now, we'll assume the caller of deployProject provides the full objects
            return {
                success: false,
                error: "Please use deployProject with full project and domain objects"
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Deploy a project to a specific domain
     */
    async deployProject(
        project: Project,
        domain: Domain,
        provider: DeploymentProvider = 'vercel'
    ): Promise<DeploymentResult> {
        try {
            console.log(`Starting deployment for ${domain.name} using ${provider}...`);

            // Generate static HTML
            const html = generateStaticHTML(project);

            // Deploy based on provider
            switch (provider) {
                case 'vercel':
                    return await this.deployToVercel(project, domain, html);
                case 'cloudflare':
                    return await this.deployToCloudflare(project, domain, html);
                case 'netlify':
                    return await this.deployToNetlify(project, domain, html);
                default:
                    return await this.simulateDeployment(project, domain, html);
            }
        } catch (error) {
            console.error('Deployment error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown deployment error'
            };
        }
    }

    /**
     * Verify DNS records for a domain
     */
    async verifyDNS(domainName: string): Promise<DNSVerificationResult> {
        try {
            // In a real implementation, this would check actual DNS records
            // For now, we'll simulate the verification
            console.log(`Verifying DNS for ${domainName}...`);

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Simulate verification (70% success rate)
            const verified = Math.random() > 0.3;

            if (verified) {
                return {
                    verified: true,
                    records: [
                        {
                            type: 'A' as const,
                            host: '@',
                            value: '76.76.21.21',
                            verified: true
                        },
                        {
                            type: 'CNAME' as const,
                            host: 'www',
                            value: 'cname.vercel-dns.com',
                            verified: true
                        }
                    ]
                };
            } else {
                return {
                    verified: false,
                    records: [
                        {
                            type: 'A' as const,
                            host: '@',
                            value: '76.76.21.21',
                            verified: false
                        },
                        {
                            type: 'CNAME' as const,
                            host: 'www',
                            value: 'cname.vercel-dns.com',
                            verified: false
                        }
                    ],
                    error: 'DNS records not found or incorrect'
                };
            }
        } catch (error) {
            return {
                verified: false,
                records: [],
                error: error instanceof Error ? error.message : 'DNS verification failed'
            };
        }
    }

    /**
     * Get DNS records for domain setup
     */
    /**
     * Get DNS records for domain setup
     */
    generateDNSRecords(provider: DeploymentProvider = 'vercel') {
        const records = {
            vercel: [
                {
                    type: 'A' as const,
                    host: '@',
                    value: '76.76.21.21',
                    verified: false
                },
                {
                    type: 'CNAME' as const,
                    host: 'www',
                    value: 'cname.vercel-dns.com',
                    verified: false
                }
            ],
            cloudflare: [
                {
                    type: 'CNAME' as const,
                    host: '@',
                    value: 'quimera.pages.dev', // Default placeholder, will be updated with actual project URL
                    verified: false
                }
            ],
            netlify: [
                {
                    type: 'A' as const,
                    host: '@',
                    value: '75.2.60.5',
                    verified: false
                },
                {
                    type: 'CNAME' as const,
                    host: 'www',
                    value: 'example.netlify.app',
                    verified: false
                }
            ],
            custom: [
                {
                    type: 'A' as const,
                    host: '@',
                    value: '172.67.140.40', // Typical Cloud Run / Load Balancer IP if custom
                    verified: false
                }
            ]
        };

        return records[provider || 'vercel'] || records.vercel;
    }

    /**
     * Deploy to Vercel (placeholder for real implementation)
     */
    private async deployToVercel(
        project: Project,
        domain: Domain,
        html: string
    ): Promise<DeploymentResult> {
        try {
            console.log('Deploying to Vercel via API...');

            // Check for API credentials
            const VERCEL_TOKEN = import.meta.env.VITE_VERCEL_TOKEN;
            const VERCEL_TEAM_ID = import.meta.env.VITE_VERCEL_TEAM_ID;

            if (!VERCEL_TOKEN) {
                console.warn('VITE_VERCEL_TOKEN not found. Using simulation mode.');
                return await this.simulateDeployment(project, domain, html);
            }

            const projectName = domain.name.replace(/\./g, '-');

            // 2. Create Deployment
            const deploymentResponse = await fetch(`https://api.vercel.com/v13/deployments${VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${VERCEL_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: projectName,
                    projectSettings: {
                        framework: null,
                    },
                    files: [
                        {
                            file: 'index.html',
                            data: html,
                        }
                    ],
                    target: 'production',
                }),
            });

            if (!deploymentResponse.ok) {
                const errorData = await deploymentResponse.json();
                throw new Error(`Vercel API error: ${errorData.error?.message || deploymentResponse.statusText}`);
            }

            const deploymentData = await deploymentResponse.json();

            return {
                success: true,
                deploymentUrl: `https://${deploymentData.url}`,
                deploymentId: deploymentData.id,
                dnsRecords: this.generateDNSRecords('vercel')
            };

        } catch (error) {
            console.error('Vercel deployment failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Vercel API connection failed'
            };
        }
    }

    /**
     * Deploy to Cloudflare Pages (placeholder)
     */
    private async deployToCloudflare(
        project: Project,
        domain: Domain,
        html: string
    ): Promise<DeploymentResult> {
        try {
            console.log('Deploying to Cloudflare Pages via API...');

            const CLOUDFLARE_TOKEN = import.meta.env.VITE_CLOUDFLARE_TOKEN;
            const CLOUDFLARE_ACCOUNT_ID = import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID;

            if (!CLOUDFLARE_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
                console.warn('Cloudflare credentials not found. Using simulation mode.');
                return await this.simulateDeployment(project, domain, html);
            }

            const projectName = domain.name.replace(/\./g, '-');

            // 1. Create or Get Project
            const projectCheckResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${projectName}`, {
                headers: {
                    'Authorization': `Bearer ${CLOUDFLARE_TOKEN}`,
                    'Content-Type': 'application/json',
                }
            });

            if (projectCheckResponse.status === 404) {
                console.log('Project not found. Creating new Cloudflare Pages project...');
                const createResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${CLOUDFLARE_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: projectName,
                        production_branch: 'main'
                    })
                });

                if (!createResponse.ok) {
                    const error = await createResponse.json();
                    throw new Error(`Failed to create Cloudflare project: ${error.errors?.[0]?.message || 'Unknown error'}`);
                }
            }

            // 2. Direct Upload
            // Cloudflare Direct Upload requires multipart/form-data
            const formData = new FormData();

            // We need to provide the directory structure
            // For a single file, we can just name it index.html
            const file = new Blob([html], { type: 'text/html' });
            formData.append('file', file, 'index.html');
            formData.append('branch', 'main');

            const deploymentResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${projectName}/deployments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${CLOUDFLARE_TOKEN}`,
                },
                body: formData
            });

            if (!deploymentResponse.ok) {
                const errorData = await deploymentResponse.json();
                console.error('Cloudflare Deployment Error:', errorData);
                throw new Error(`Cloudflare API error: ${errorData.errors?.[0]?.message || 'Upload failed'}`);
            }

            const deploymentData = await deploymentResponse.json();

            return {
                success: true,
                deploymentUrl: `https://${projectName}.pages.dev`,
                deploymentId: deploymentData.result?.id || `cf_${Date.now()}`,
                dnsRecords: this.generateDNSRecords('cloudflare')
            };
        } catch (error) {
            console.error('Cloudflare deployment failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Cloudflare API failed'
            };
        }
    }

    /**
     * Deploy to Netlify (placeholder)
     */
    private async deployToNetlify(
        project: Project,
        domain: Domain,
        html: string
    ): Promise<DeploymentResult> {
        console.log('Deploying to Netlify...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        const deploymentId = `ntl_${Date.now()}`;
        const subdomain = domain.name.replace(/\./g, '-');

        return {
            success: true,
            deploymentUrl: `https://${subdomain}.netlify.app`,
            deploymentId,
            dnsRecords: this.generateDNSRecords('netlify')
        };
    }

    /**
     * Simulate deployment for development/testing
     */
    private async simulateDeployment(
        project: Project,
        domain: Domain,
        html: string
    ): Promise<DeploymentResult> {
        console.log('Simulating deployment...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 90% success rate for simulation
        const success = Math.random() > 0.1;

        if (success) {
            return {
                success: true,
                deploymentUrl: `https://${domain.name}`,
                deploymentId: `sim_${Date.now()}`,
                dnsRecords: this.generateDNSRecords('vercel')
            };
        } else {
            return {
                success: false,
                error: 'Simulated deployment failure'
            };
        }
    }

    /**
     * Create a deployment log entry
     */
    createDeploymentLog(
        status: 'started' | 'success' | 'failed',
        message: string,
        details?: string
    ): DeploymentLog {
        return {
            id: `log_${Date.now()}`,
            timestamp: new Date().toISOString(),
            status,
            message,
            details
        };
    }
}

export const deploymentService = DeploymentService.getInstance();
export default deploymentService;

