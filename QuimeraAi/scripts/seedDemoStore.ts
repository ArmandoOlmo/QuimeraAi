/**
 * Seed Demo Store Script
 * Script para poblar una tienda de ecommerce con datos de prueba
 * 
 * Este script puede ejecutarse desde la consola del navegador o importarse como módulo
 */

import {
    collection,
    doc,
    setDoc,
    writeBatch,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

// =============================================================================
// TYPES
// =============================================================================

interface SeedCategory {
    name: string;
    description: string;
    imageUrl?: string;
}

interface SeedProduct {
    name: string;
    description: string;
    shortDescription: string;
    price: number;
    compareAtPrice?: number;
    categoryName: string;
    images: string[];
    quantity: number;
    sku: string;
    tags: string[];
    isFeatured?: boolean;
}

interface SeedStoreSettings {
    storeName: string;
    storeEmail: string;
    storePhone: string;
    currency: string;
    currencySymbol: string;
    taxEnabled: boolean;
    taxRate: number;
    freeShippingThreshold: number;
}

// =============================================================================
// DEMO DATA
// =============================================================================

export const DEMO_CATEGORIES: SeedCategory[] = [
    {
        name: 'Electrónica',
        description: 'Los mejores productos tecnológicos para tu hogar y oficina',
        imageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=400&fit=crop',
    },
    {
        name: 'Ropa',
        description: 'Moda para todas las ocasiones',
        imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=400&fit=crop',
    },
    {
        name: 'Hogar',
        description: 'Todo para hacer de tu casa un hogar acogedor',
        imageUrl: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=400&h=400&fit=crop',
    },
    {
        name: 'Deportes',
        description: 'Equipamiento deportivo de alta calidad',
        imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=400&fit=crop',
    },
    {
        name: 'Libros',
        description: 'Conocimiento y entretenimiento en cada página',
        imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=400&fit=crop',
    },
    {
        name: 'Accesorios',
        description: 'Los detalles que marcan la diferencia',
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
    },
];

export const DEMO_PRODUCTS: SeedProduct[] = [
    // Electrónica
    {
        name: 'Auriculares Bluetooth Pro',
        description: 'Auriculares inalámbricos con cancelación de ruido activa, batería de 30 horas y sonido de alta fidelidad. Perfectos para trabajo, viajes o música en casa.',
        shortDescription: 'Auriculares premium con cancelación de ruido',
        price: 149.99,
        compareAtPrice: 199.99,
        categoryName: 'Electrónica',
        images: [
            'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop',
            'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=600&h=600&fit=crop',
        ],
        quantity: 50,
        sku: 'ELEC-AUR-001',
        tags: ['auriculares', 'bluetooth', 'wireless', 'premium'],
        isFeatured: true,
    },
    {
        name: 'Smartwatch Fitness Tracker',
        description: 'Reloj inteligente con monitor cardíaco, GPS integrado, resistente al agua y más de 20 modos deportivos. Compatible con iOS y Android.',
        shortDescription: 'Smartwatch con GPS y monitor de salud',
        price: 199.99,
        categoryName: 'Electrónica',
        images: [
            'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop',
            'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&h=600&fit=crop',
        ],
        quantity: 35,
        sku: 'ELEC-SWT-001',
        tags: ['smartwatch', 'fitness', 'gps', 'salud'],
        isFeatured: true,
    },
    {
        name: 'Altavoz Portátil Waterproof',
        description: 'Altavoz Bluetooth resistente al agua IPX7 con 24 horas de batería. Sonido potente de 360° ideal para exteriores.',
        shortDescription: 'Altavoz resistente al agua con gran autonomía',
        price: 79.99,
        compareAtPrice: 99.99,
        categoryName: 'Electrónica',
        images: [
            'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&h=600&fit=crop',
        ],
        quantity: 80,
        sku: 'ELEC-ALT-001',
        tags: ['altavoz', 'bluetooth', 'waterproof', 'portátil'],
    },
    {
        name: 'Cargador Inalámbrico Rápido',
        description: 'Cargador Qi de 15W compatible con todos los dispositivos. Incluye luz LED indicadora y protección contra sobrecalentamiento.',
        shortDescription: 'Carga rápida sin cables',
        price: 34.99,
        categoryName: 'Electrónica',
        images: [
            'https://images.unsplash.com/photo-1586816001966-79b736744398?w=600&h=600&fit=crop',
        ],
        quantity: 120,
        sku: 'ELEC-CAR-001',
        tags: ['cargador', 'wireless', 'qi', 'rápido'],
    },

    // Ropa
    {
        name: 'Camiseta Premium Algodón',
        description: 'Camiseta de algodón orgánico 100% de primera calidad. Corte moderno, suave al tacto y muy cómoda para el uso diario.',
        shortDescription: 'Camiseta de algodón orgánico premium',
        price: 29.99,
        categoryName: 'Ropa',
        images: [
            'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600&fit=crop',
            'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=600&h=600&fit=crop',
        ],
        quantity: 200,
        sku: 'ROPA-CAM-001',
        tags: ['camiseta', 'algodón', 'orgánico', 'casual'],
    },
    {
        name: 'Sudadera Hoodie Unisex',
        description: 'Sudadera con capucha de felpa interior suave. Bolsillo canguro y cordón ajustable. Ideal para cualquier temporada.',
        shortDescription: 'Hoodie cómoda y versátil',
        price: 49.99,
        compareAtPrice: 64.99,
        categoryName: 'Ropa',
        images: [
            'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=600&fit=crop',
        ],
        quantity: 75,
        sku: 'ROPA-SUD-001',
        tags: ['sudadera', 'hoodie', 'unisex', 'casual'],
        isFeatured: true,
    },
    {
        name: 'Jeans Slim Fit Premium',
        description: 'Jeans de mezclilla premium con stretch para máxima comodidad. Corte slim fit moderno y duradero.',
        shortDescription: 'Jeans con ajuste perfecto',
        price: 69.99,
        categoryName: 'Ropa',
        images: [
            'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=600&fit=crop',
        ],
        quantity: 60,
        sku: 'ROPA-JEA-001',
        tags: ['jeans', 'denim', 'slim fit', 'premium'],
    },
    {
        name: 'Chaqueta Impermeable',
        description: 'Chaqueta ligera impermeable y cortavientos. Perfecta para actividades al aire libre. Se empaca en su propio bolsillo.',
        shortDescription: 'Protección total contra el clima',
        price: 89.99,
        compareAtPrice: 119.99,
        categoryName: 'Ropa',
        images: [
            'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&h=600&fit=crop',
        ],
        quantity: 40,
        sku: 'ROPA-CHA-001',
        tags: ['chaqueta', 'impermeable', 'outdoor', 'ligera'],
    },

    // Hogar
    {
        name: 'Lámpara de Mesa LED',
        description: 'Lámpara de escritorio con luz LED regulable, 5 niveles de brillo y 3 temperaturas de color. Puerto USB integrado para cargar dispositivos.',
        shortDescription: 'Iluminación perfecta para tu escritorio',
        price: 44.99,
        categoryName: 'Hogar',
        images: [
            'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&h=600&fit=crop',
        ],
        quantity: 65,
        sku: 'HOG-LAM-001',
        tags: ['lámpara', 'led', 'escritorio', 'regulable'],
    },
    {
        name: 'Set de Velas Aromáticas',
        description: 'Colección de 6 velas aromáticas de soja natural con diferentes fragancias relajantes. Duración de 40 horas cada una.',
        shortDescription: 'Aromas naturales para tu hogar',
        price: 39.99,
        compareAtPrice: 54.99,
        categoryName: 'Hogar',
        images: [
            'https://images.unsplash.com/photo-1602028915047-37269d1a73f7?w=600&h=600&fit=crop',
        ],
        quantity: 90,
        sku: 'HOG-VEL-001',
        tags: ['velas', 'aromáticas', 'soja', 'relajante'],
        isFeatured: true,
    },
    {
        name: 'Organizador de Escritorio',
        description: 'Organizador multifuncional de bambú con compartimentos para bolígrafos, notas, teléfono y accesorios. Diseño elegante y ecológico.',
        shortDescription: 'Mantén tu escritorio ordenado',
        price: 27.99,
        categoryName: 'Hogar',
        images: [
            'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&h=600&fit=crop',
        ],
        quantity: 100,
        sku: 'HOG-ORG-001',
        tags: ['organizador', 'bambú', 'escritorio', 'ecológico'],
    },
    {
        name: 'Manta Sherpa Premium',
        description: 'Manta de doble cara: felpa suave por un lado y sherpa esponjosa por el otro. Tamaño grande 150x200cm.',
        shortDescription: 'Calidez y suavidad excepcional',
        price: 54.99,
        categoryName: 'Hogar',
        images: [
            'https://images.unsplash.com/photo-1580301762395-21ce84d00bc6?w=600&h=600&fit=crop',
        ],
        quantity: 45,
        sku: 'HOG-MAN-001',
        tags: ['manta', 'sherpa', 'cálida', 'suave'],
    },

    // Deportes
    {
        name: 'Botella Térmica 750ml',
        description: 'Botella de acero inoxidable de doble pared que mantiene bebidas frías 24h o calientes 12h. Libre de BPA.',
        shortDescription: 'Hidratación perfecta todo el día',
        price: 24.99,
        categoryName: 'Deportes',
        images: [
            'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&h=600&fit=crop',
        ],
        quantity: 150,
        sku: 'DEP-BOT-001',
        tags: ['botella', 'térmica', 'acero', 'deportes'],
    },
    {
        name: 'Banda de Resistencia Set',
        description: 'Set de 5 bandas de resistencia con diferentes niveles de intensidad. Incluye bolsa de transporte y guía de ejercicios.',
        shortDescription: 'Entrenamiento en cualquier lugar',
        price: 19.99,
        categoryName: 'Deportes',
        images: [
            'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=600&h=600&fit=crop',
        ],
        quantity: 200,
        sku: 'DEP-BAN-001',
        tags: ['bandas', 'resistencia', 'fitness', 'portátil'],
    },
    {
        name: 'Esterilla de Yoga Premium',
        description: 'Esterilla antideslizante de 6mm de grosor con líneas de alineación. Material ecológico TPE de alta densidad.',
        shortDescription: 'Yoga y ejercicios con máximo confort',
        price: 39.99,
        compareAtPrice: 49.99,
        categoryName: 'Deportes',
        images: [
            'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600&h=600&fit=crop',
        ],
        quantity: 70,
        sku: 'DEP-EST-001',
        tags: ['yoga', 'esterilla', 'ecológico', 'antideslizante'],
        isFeatured: true,
    },
    {
        name: 'Guantes de Entrenamiento',
        description: 'Guantes de gimnasio con soporte para muñeca y palmas acolchadas. Transpirables y de secado rápido.',
        shortDescription: 'Protección y agarre en cada repetición',
        price: 22.99,
        categoryName: 'Deportes',
        images: [
            'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&h=600&fit=crop',
        ],
        quantity: 85,
        sku: 'DEP-GUA-001',
        tags: ['guantes', 'gimnasio', 'entrenamiento', 'protección'],
    },

    // Libros
    {
        name: 'Diario de Productividad',
        description: 'Planificador diario con secciones para metas, tareas, reflexiones y hábitos. Papel premium de 120gsm. Encuadernación de tapa dura.',
        shortDescription: 'Organiza tu día, alcanza tus metas',
        price: 19.99,
        categoryName: 'Libros',
        images: [
            'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=600&h=600&fit=crop',
        ],
        quantity: 120,
        sku: 'LIB-DIA-001',
        tags: ['diario', 'productividad', 'planner', 'organización'],
    },
    {
        name: 'Cuaderno de Notas A5',
        description: 'Cuaderno de notas con 200 páginas punteadas. Tapa de cuero sintético con marcador de cinta y bolsillo interior.',
        shortDescription: 'Ideas sin límites',
        price: 14.99,
        categoryName: 'Libros',
        images: [
            'https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&h=600&fit=crop',
        ],
        quantity: 180,
        sku: 'LIB-CUA-001',
        tags: ['cuaderno', 'notas', 'punteado', 'bullet journal'],
    },

    // Accesorios
    {
        name: 'Cartera Minimalista',
        description: 'Cartera slim de cuero genuino con protección RFID. Capacidad para 8 tarjetas y billetes. Diseño elegante y compacto.',
        shortDescription: 'Elegancia en tu bolsillo',
        price: 34.99,
        categoryName: 'Accesorios',
        images: [
            'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&h=600&fit=crop',
        ],
        quantity: 95,
        sku: 'ACC-CAR-001',
        tags: ['cartera', 'cuero', 'rfid', 'minimalista'],
    },
    {
        name: 'Gafas de Sol Polarizadas',
        description: 'Gafas de sol con lentes polarizadas UV400. Montura ligera de acetato con diseño atemporal unisex.',
        shortDescription: 'Estilo y protección premium',
        price: 59.99,
        compareAtPrice: 79.99,
        categoryName: 'Accesorios',
        images: [
            'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&h=600&fit=crop',
        ],
        quantity: 55,
        sku: 'ACC-GAF-001',
        tags: ['gafas', 'sol', 'polarizadas', 'uv400'],
        isFeatured: true,
    },
    {
        name: 'Mochila Urbana Antirrobo',
        description: 'Mochila con compartimento acolchado para laptop 15.6", puerto USB externo y bolsillo oculto. Resistente al agua.',
        shortDescription: 'Seguridad y estilo para tu día a día',
        price: 69.99,
        categoryName: 'Accesorios',
        images: [
            'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=600&fit=crop',
        ],
        quantity: 40,
        sku: 'ACC-MOC-001',
        tags: ['mochila', 'antirrobo', 'laptop', 'urbana'],
    },
    {
        name: 'Correa de Reloj Premium',
        description: 'Correa de silicona suave y duradera compatible con Apple Watch. Disponible en múltiples colores.',
        shortDescription: 'Renueva tu reloj con estilo',
        price: 12.99,
        categoryName: 'Accesorios',
        images: [
            'https://images.unsplash.com/photo-1434056886845-ddd796c1cf58?w=600&h=600&fit=crop',
        ],
        quantity: 250,
        sku: 'ACC-COR-001',
        tags: ['correa', 'apple watch', 'silicona', 'colores'],
    },
];

export const DEMO_STORE_SETTINGS: SeedStoreSettings = {
    storeName: 'Tienda Demo Quimera',
    storeEmail: 'tienda@quimera.ai',
    storePhone: '+1 234 567 8900',
    currency: 'USD',
    currencySymbol: '$',
    taxEnabled: true,
    taxRate: 16,
    freeShippingThreshold: 100,
};

// =============================================================================
// SEED FUNCTIONS
// =============================================================================

/**
 * Generate slug from name
 */
const generateSlug = (name: string): string => {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};

/**
 * Seed categories for a store
 * Writes to both private and public collections
 */
export const seedCategories = async (
    userId: string,
    storeId: string,
    categories: SeedCategory[] = DEMO_CATEGORIES
): Promise<Record<string, string>> => {
    const categoryMap: Record<string, string> = {};
    const batch = writeBatch(db);
    const categoriesPath = `users/${userId}/stores/${storeId}/categories`;
    const publicCategoriesPath = `publicStores/${storeId}/categories`;

    categories.forEach((category, index) => {
        const categoryId = `demo-cat-${generateSlug(category.name)}`;
        const categoryRef = doc(db, categoriesPath, categoryId);
        const publicCategoryRef = doc(db, publicCategoriesPath, categoryId);
        
        const slug = generateSlug(category.name);
        
        // Private category data
        const categoryData = {
            name: category.name,
            slug,
            description: category.description,
            imageUrl: category.imageUrl || null,
            position: index,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        
        // Public category data
        const publicCategoryData = {
            id: categoryId,
            name: category.name,
            slug,
            description: category.description,
            image: category.imageUrl || null,
            order: index,
            updatedAt: serverTimestamp(),
        };
        
        batch.set(categoryRef, categoryData);
        batch.set(publicCategoryRef, publicCategoryData);
        categoryMap[category.name] = categoryId;
    });

    await batch.commit();
    console.log(`✅ ${categories.length} categorías creadas (privadas + públicas)`);
    return categoryMap;
};

/**
 * Seed products for a store
 * Writes to both private and public collections
 */
export const seedProducts = async (
    userId: string,
    storeId: string,
    products: SeedProduct[] = DEMO_PRODUCTS,
    categoryMap: Record<string, string>,
    categoryNameMap?: Record<string, string>
): Promise<void> => {
    const productsPath = `users/${userId}/stores/${storeId}/products`;
    const publicProductsPath = `publicStores/${storeId}/products`;
    
    // Build category name map if not provided
    const catNameMap = categoryNameMap || Object.fromEntries(
        Object.entries(categoryMap).map(([name, id]) => [id, name])
    );
    
    // Split into batches of 250 (to account for double writes)
    const batchSize = 250;
    for (let i = 0; i < products.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchProducts = products.slice(i, i + batchSize);

        batchProducts.forEach((product) => {
            const productId = `demo-${generateSlug(product.name)}-${Date.now()}`;
            const productRef = doc(db, productsPath, productId);
            const publicProductRef = doc(db, publicProductsPath, productId);
            
            const slug = generateSlug(product.name);
            const categoryId = categoryMap[product.categoryName] || null;
            
            const images = product.images.map((url, idx) => ({
                id: `img-${idx}`,
                url,
                altText: product.name,
                position: idx,
            }));
            
            // Private product data (full)
            const productData = {
                name: product.name,
                slug,
                description: product.description,
                shortDescription: product.shortDescription,
                price: product.price,
                compareAtPrice: product.compareAtPrice || null,
                costPrice: Math.round(product.price * 0.6 * 100) / 100, // 40% margin
                currency: 'USD',
                sku: product.sku,
                barcode: null,
                quantity: product.quantity,
                trackInventory: true,
                lowStockThreshold: 10,
                images,
                categoryId,
                tags: product.tags,
                hasVariants: false,
                variants: null,
                options: null,
                metaTitle: product.name,
                metaDescription: product.shortDescription,
                status: 'active',
                isDigital: false,
                isFeatured: product.isFeatured || false,
                weight: null,
                weightUnit: 'kg',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                publishedAt: serverTimestamp(),
            };
            
            // Public product data (for storefront)
            const publicProductData = {
                id: productId,
                name: product.name,
                slug,
                description: product.description,
                shortDescription: product.shortDescription,
                price: product.price,
                compareAtPrice: product.compareAtPrice || null,
                images,
                categoryId,
                categoryName: product.categoryName,
                tags: product.tags,
                variants: null,
                trackInventory: true,
                inStock: product.quantity > 0,
                lowStock: product.quantity <= 10,
                isFeatured: product.isFeatured || false,
                seoTitle: product.name,
                seoDescription: product.shortDescription,
                status: 'active', // Required for storefront query
                storeId,
                userId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            
            batch.set(productRef, productData);
            batch.set(publicProductRef, publicProductData);
        });

        await batch.commit();
        console.log(`✅ Lote ${Math.floor(i / batchSize) + 1}: ${batchProducts.length} productos creados`);
    }

    console.log(`✅ Total: ${products.length} productos creados (privados + públicos)`);
};

/**
 * Seed store settings
 * Writes to both private settings and public store document
 */
export const seedStoreSettings = async (
    userId: string,
    storeId: string,
    settings: SeedStoreSettings = DEMO_STORE_SETTINGS
): Promise<void> => {
    const settingsPath = `users/${userId}/stores/${storeId}/settings/general`;
    const publicStorePath = `publicStores/${storeId}`;
    const settingsRef = doc(db, settingsPath);
    const publicStoreRef = doc(db, publicStorePath);

    const settingsData = {
        // General
        storeName: settings.storeName,
        storeEmail: settings.storeEmail,
        storePhone: settings.storePhone,
        storeLogo: null,
        currency: settings.currency,
        currencySymbol: settings.currencySymbol,
        
        // Taxes
        taxEnabled: settings.taxEnabled,
        taxRate: settings.taxRate,
        taxName: 'IVA',
        taxIncluded: false,
        
        // Shipping
        shippingZones: [
            {
                id: 'zone-1',
                name: 'Nacional',
                countries: ['MX', 'US'],
                rates: [
                    {
                        id: 'rate-1',
                        name: 'Envío Estándar',
                        price: 9.99,
                        estimatedDays: '3-5 días',
                    },
                    {
                        id: 'rate-2',
                        name: 'Envío Express',
                        price: 19.99,
                        estimatedDays: '1-2 días',
                    },
                ],
            },
        ],
        freeShippingThreshold: settings.freeShippingThreshold,
        
        // Payments
        stripeEnabled: false,
        paypalEnabled: false,
        cashOnDeliveryEnabled: true,
        
        // Notifications
        orderNotificationEmail: settings.storeEmail,
        lowStockNotifications: true,
        lowStockThreshold: 10,
        notifyOnNewOrder: true,
        notifyOnLowStock: true,
        sendOrderConfirmation: true,
        sendShippingNotification: true,
        
        // Checkout
        requirePhone: true,
        requireShippingAddress: true,
        
        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    // Public store data (for storefront)
    const publicStoreData = {
        id: storeId,
        name: settings.storeName,
        description: 'Tienda de demostración',
        currency: settings.currency,
        currencySymbol: settings.currencySymbol,
        updatedAt: serverTimestamp(),
    };

    await Promise.all([
        setDoc(settingsRef, settingsData),
        setDoc(publicStoreRef, publicStoreData, { merge: true }),
    ]);
    
    console.log('✅ Configuración de tienda guardada (privada + pública)');
};

/**
 * Main function to seed entire demo store
 */
export const seedDemoStore = async (
    userId: string,
    storeId: string
): Promise<{ success: boolean; message: string }> => {
    try {
        console.log('🚀 Iniciando seed de tienda demo...');
        console.log(`   Usuario: ${userId}`);
        console.log(`   Tienda: ${storeId}`);

        // 1. Seed categories
        console.log('\n📁 Creando categorías...');
        const categoryMap = await seedCategories(userId, storeId);

        // 2. Seed products
        console.log('\n📦 Creando productos...');
        await seedProducts(userId, storeId, DEMO_PRODUCTS, categoryMap);

        // 3. Seed store settings
        console.log('\n⚙️ Configurando tienda...');
        await seedStoreSettings(userId, storeId);

        console.log('\n✅ ¡Tienda demo creada exitosamente!');
        console.log(`   - ${DEMO_CATEGORIES.length} categorías`);
        console.log(`   - ${DEMO_PRODUCTS.length} productos`);
        console.log(`   - Configuración completa`);

        return {
            success: true,
            message: `Tienda demo creada: ${DEMO_CATEGORIES.length} categorías, ${DEMO_PRODUCTS.length} productos`,
        };
    } catch (error: any) {
        console.error('❌ Error al crear tienda demo:', error);
        return {
            success: false,
            message: `Error: ${error.message}`,
        };
    }
};

export default seedDemoStore;











