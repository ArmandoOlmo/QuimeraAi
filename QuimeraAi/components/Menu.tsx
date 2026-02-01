import React from 'react';
import { MenuData, PaddingSize, BorderRadiusSize, FontSize, ServiceIcon, AnimationType, CornerGradientConfig } from '../types';
import { getAnimationClass, getAnimationDelay } from '../utils/animations';
import ImagePlaceholder from './ui/ImagePlaceholder';
import { isPendingImage } from '../utils/imagePlaceholders';
import { isLightColor, hexToRgba } from '../utils/colorUtils';
import CornerGradient from './ui/CornerGradient';
import { useDesignTokens } from '../hooks/useDesignTokens';
import { 
    Star, Award, ChefHat,
    // Development & Technology
    Code, CodeSquare, Terminal, Cpu, Database, Server, Cloud, Wifi, Globe, Smartphone, Monitor,
    // Design & Creative
    Brush, Paintbrush, Palette, PenTool, Layout, Image, Camera, Video, Film, Scissors,
    // Business & Marketing
    Megaphone, TrendingUp, BarChart, PieChart, Target, Briefcase, DollarSign, CreditCard,
    // Communication
    Mail, MessageCircle, Phone, Send, Mic, Users, UserCheck, AtSign,
    // Social & Media
    Share2, Heart, Bookmark, ThumbsUp, Eye, Hash, Instagram, Twitter, Facebook,
    // Tools & Services
    Wrench, Settings, Hammer, Package, Box, ShoppingCart, ShoppingBag, Gift, Truck,
    // Document & Files
    File, FileText, Folder, Book, Clipboard, Edit, Feather, Pen,
    // Location & Map
    MapPin, Map, Navigation, Compass, Home, Building, Store,
    // Time & Calendar
    Clock, Calendar, Timer, Watch, Hourglass,
    // Security & Protection
    Shield, Lock, Key, EyeOff, CheckCircle, AlertCircle,
    // Food & Hospitality
    Utensils, Coffee, Wine, Beer, UtensilsCrossed, CakeSlice, Pizza, Soup, Salad,
    // Other
    Zap, Trophy, Rocket, Lightbulb, Sparkles, CircleDot, Hexagon, Layers
} from 'lucide-react';

const paddingYClasses: Record<PaddingSize, string> = {
  none: 'py-0',
  sm: 'py-10 md:py-16',
  md: 'py-16 md:py-24',
  lg: 'py-20 md:py-32',
  xl: 'py-24 md:py-40',
};

const paddingXClasses: Record<PaddingSize, string> = {
  none: 'px-0',
  sm: 'px-4',
  md: 'px-6',
  lg: 'px-8',
  xl: 'px-12',
};

const titleSizeClasses: Record<FontSize, string> = {
    sm: 'text-2xl md:text-3xl',
    md: 'text-3xl md:text-4xl',
    lg: 'text-4xl md:text-5xl',
    xl: 'text-5xl md:text-7xl',
};

const descriptionSizeClasses: Record<FontSize, string> = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
};

const borderRadiusClasses: Record<BorderRadiusSize, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-3xl',
};

// Helper function to check if background is light/white
const isBackgroundLight = (backgroundColor: string | undefined): boolean => {
    if (!backgroundColor) return false;
    // Handle rgba colors
    if (backgroundColor.includes('rgba')) {
        const match = backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
            const [, r, g, b] = match.map(Number);
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            return luminance > 0.6;
        }
    }
    // Handle hex colors
    if (backgroundColor.startsWith('#')) {
        return isLightColor(backgroundColor);
    }
    // Handle color names
    if (backgroundColor.toLowerCase() === 'white' || backgroundColor === '#fff' || backgroundColor === '#ffffff') {
        return true;
    }
    return false;
};

const menuIcons: Record<ServiceIcon, React.ReactNode> = {
    // Development & Technology
    code: <Code size={40} />,
    code2: <CodeSquare size={40} />,
    terminal: <Terminal size={40} />,
    cpu: <Cpu size={40} />,
    database: <Database size={40} />,
    server: <Server size={40} />,
    cloud: <Cloud size={40} />,
    wifi: <Wifi size={40} />,
    globe: <Globe size={40} />,
    smartphone: <Smartphone size={40} />,
    monitor: <Monitor size={40} />,
    // Design & Creative
    brush: <Brush size={40} />,
    paintbrush: <Paintbrush size={40} />,
    palette: <Palette size={40} />,
    'pen-tool': <PenTool size={40} />,
    layout: <Layout size={40} />,
    image: <Image size={40} />,
    camera: <Camera size={40} />,
    video: <Video size={40} />,
    film: <Film size={40} />,
    scissors: <Scissors size={40} />,
    // Business & Marketing
    megaphone: <Megaphone size={40} />,
    'trending-up': <TrendingUp size={40} />,
    chart: <BarChart size={40} />,
    'bar-chart': <BarChart size={40} />,
    'pie-chart': <PieChart size={40} />,
    target: <Target size={40} />,
    briefcase: <Briefcase size={40} />,
    'dollar-sign': <DollarSign size={40} />,
    'credit-card': <CreditCard size={40} />,
    // Communication
    mail: <Mail size={40} />,
    'message-circle': <MessageCircle size={40} />,
    phone: <Phone size={40} />,
    send: <Send size={40} />,
    mic: <Mic size={40} />,
    users: <Users size={40} />,
    'user-check': <UserCheck size={40} />,
    'at-sign': <AtSign size={40} />,
    // Social & Media
    'share-2': <Share2 size={40} />,
    heart: <Heart size={40} />,
    star: <Star size={40} />,
    bookmark: <Bookmark size={40} />,
    'thumbs-up': <ThumbsUp size={40} />,
    eye: <Eye size={40} />,
    hash: <Hash size={40} />,
    instagram: <Instagram size={40} />,
    twitter: <Twitter size={40} />,
    facebook: <Facebook size={40} />,
    // Tools & Services
    wrench: <Wrench size={40} />,
    settings: <Settings size={40} />,
    tool: <Hammer size={40} />,
    package: <Package size={40} />,
    box: <Box size={40} />,
    'shopping-cart': <ShoppingCart size={40} />,
    'shopping-bag': <ShoppingBag size={40} />,
    gift: <Gift size={40} />,
    truck: <Truck size={40} />,
    // Document & Files
    file: <File size={40} />,
    'file-text': <FileText size={40} />,
    folder: <Folder size={40} />,
    book: <Book size={40} />,
    clipboard: <Clipboard size={40} />,
    edit: <Edit size={40} />,
    feather: <Feather size={40} />,
    pen: <Pen size={40} />,
    // Location & Map
    'map-pin': <MapPin size={40} />,
    map: <Map size={40} />,
    navigation: <Navigation size={40} />,
    compass: <Compass size={40} />,
    home: <Home size={40} />,
    building: <Building size={40} />,
    store: <Store size={40} />,
    // Time & Calendar
    clock: <Clock size={40} />,
    calendar: <Calendar size={40} />,
    timer: <Timer size={40} />,
    watch: <Watch size={40} />,
    hourglass: <Hourglass size={40} />,
    // Security & Protection
    shield: <Shield size={40} />,
    lock: <Lock size={40} />,
    key: <Key size={40} />,
    'eye-off': <EyeOff size={40} />,
    'check-circle': <CheckCircle size={40} />,
    'alert-circle': <AlertCircle size={40} />,
    // Food & Hospitality
    utensils: <Utensils size={40} />,
    coffee: <Coffee size={40} />,
    wine: <Wine size={40} />,
    beer: <Beer size={40} />,
    'utensils-crossed': <UtensilsCrossed size={40} />,
    'chef-hat': <ChefHat size={40} />,
    'cake-slice': <CakeSlice size={40} />,
    pizza: <Pizza size={40} />,
    soup: <Soup size={40} />,
    salad: <Salad size={40} />,
    // Other
    zap: <Zap size={40} />,
    award: <Award size={40} />,
    trophy: <Trophy size={40} />,
    rocket: <Rocket size={40} />,
    lightbulb: <Lightbulb size={40} />,
    sparkles: <Sparkles size={40} />,
    'circle-dot': <CircleDot size={40} />,
    hexagon: <Hexagon size={40} />,
    layers: <Layers size={40} />,
};

// =============================================================================
// VARIANT 1: CLASSIC (Grid with Image on Top)
// =============================================================================
const ClassicMenuCard: React.FC<{ 
    item: any; 
    colors: any; 
    borderRadius: string; 
    index: number;
    animationType?: AnimationType;
    enableAnimation?: boolean;
}> = ({ item, colors, borderRadius, index, animationType = 'fade-in-up', enableAnimation = true }) => {
    const animationClass = getAnimationClass(animationType, enableAnimation);
    const cardBg = colors?.cardBackground || 'rgba(30, 41, 59, 0.5)';
    const hasLightBackground = isBackgroundLight(cardBg);
    
    // Use specific colors - respect user's choices
    const priceColor = colors?.priceColor || hexToRgba(colors?.accent || '#4f46e5', 0.3);
    const titleColor = colors?.cardTitleColor || '#ffffff';
    const textColor = colors?.cardText || colors?.text || '#94a3b8';
    
    return (
        <div 
            className={`group bg-white/5 border overflow-hidden transform hover:-translate-y-2 transition-all duration-300 ${animationClass} ${borderRadius}`}
            style={{ 
                borderColor: colors?.borderColor,
                backgroundColor: cardBg,
                animationDelay: getAnimationDelay(index, 0.1)
            }}
        >
        <div className="relative overflow-hidden h-56">
            {isPendingImage(item.imageUrl) ? (
                <ImagePlaceholder aspectRatio="4:3" showGenerateButton={false} className="w-full h-full" />
            ) : (
                <img 
                    src={item.imageUrl} 
                    alt={item.name} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
            )}
            {item.isSpecial && (
                <div 
                    className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
                    style={{ backgroundColor: colors?.accent, color: '#fff' }}
                >
                    <Star size={12} fill="currentColor" />
                    Especial
                </div>
            )}
            <div 
                className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/80 to-transparent"
            />
        </div>
        
        <div className="p-6">
            <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-bold font-header flex-1" style={{ color: titleColor, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>
                    {item.name}
                </h3>
                <span 
                    className="text-2xl font-bold ml-3 font-header" 
                    style={{ color: priceColor }}
                >
                    {item.price}
                </span>
            </div>
            <p className="text-sm leading-relaxed font-body opacity-90" style={{ color: textColor }}>
                {item.description}
            </p>
            {item.category && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: colors?.borderColor }}>
                    <span className="text-xs uppercase tracking-wider font-bold opacity-60" style={{ color: textColor }}>
                        {item.category}
                    </span>
                </div>
            )}
        </div>
    </div>
    );
};

// =============================================================================
// VARIANT 2: MODERN GRID (Bento-style with side images)
// =============================================================================
const ModernGridCard: React.FC<{ item: any; colors: any; borderRadius: string; index: number }> = ({ item, colors, borderRadius, index }) => {
    const isWide = index % 3 === 0;
    const cardBg = colors?.cardBackground || 'rgba(30, 41, 59, 0.5)';
    
    // Use specific colors - respect user's choices
    const priceColor = colors?.priceColor || hexToRgba(colors?.accent || '#4f46e5', 0.3);
    const titleColor = colors?.cardTitleColor || '#ffffff';
    const textColor = colors?.cardText || colors?.text || '#94a3b8';
    
    return (
        <div 
            className={`group relative border overflow-hidden transition-all duration-500 ${borderRadius} ${isWide ? 'md:col-span-2' : 'md:col-span-1'}`}
            style={{ 
                borderColor: colors?.borderColor,
                backgroundColor: cardBg,
            }}
        >
            {/* Gradient Glow Effect */}
            <div 
                className="absolute -right-20 -top-20 h-[250px] w-[250px] rounded-full blur-[100px] transition-all duration-500 group-hover:blur-[120px]" 
                style={{ backgroundColor: hexToRgba(colors?.accent, 0.19), opacity: 0.3 }}
            />
            
            <div className={`relative z-10 flex ${isWide ? 'flex-row' : 'flex-col'} h-full`}>
                {/* Image Section */}
                <div className={`relative overflow-hidden ${isWide ? 'w-1/2' : 'w-full h-48'}`}>
                    {isPendingImage(item.imageUrl) ? (
                        <ImagePlaceholder aspectRatio="4:3" showGenerateButton={false} className="w-full h-full" />
                    ) : (
                        <img 
                            src={item.imageUrl} 
                            alt={item.name} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                    )}
                    {item.isSpecial && (
                        <div 
                            className="absolute top-4 left-4 p-2 rounded-full"
                            style={{ backgroundColor: colors?.accent }}
                        >
                            <Award size={20} className="text-white" />
                        </div>
                    )}
                </div>
                
                {/* Content Section */}
                <div className={`p-6 flex flex-col justify-between ${isWide ? 'w-1/2' : 'w-full'}`}>
                    <div>
                        {item.category && (
                            <span 
                                className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3"
                                style={{ backgroundColor: hexToRgba(colors?.accent, 0.125), color: colors?.accent }}
                            >
                                {item.category}
                            </span>
                        )}
                        <h3 className="text-2xl font-bold mb-3 font-header group-hover:text-[var(--accent)] transition-colors" style={{ color: titleColor, '--accent': colors?.accent, textTransform: 'var(--headings-transform, none)', letterSpacing: 'var(--headings-spacing, normal)' } as any}>
                            {item.name}
                        </h3>
                        <p className="text-sm leading-relaxed font-body mb-4 opacity-90" style={{ color: textColor }}>
                            {item.description}
                        </p>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: colors?.borderColor }}>
                        <span className="text-3xl font-bold font-header" style={{ color: priceColor }}>
                            {item.price}
                        </span>
                        <button 
                            className="px-4 py-2 rounded-lg font-bold text-sm transition-all hover:scale-105"
                            style={{ backgroundColor: colors?.accent, color: '#fff' }}
                        >
                            Ordenar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// =============================================================================
// VARIANT 3: ELEGANT LIST (Horizontal layout, magazine-style)
// =============================================================================

// =============================================================================
// VARIANT 4: FULL IMAGE (Full photo with text overlay at bottom)
// =============================================================================
const FullImageMenuCard: React.FC<{ 
    item: any; 
    colors: any; 
    borderRadius: string; 
    index: number;
    textAlignment?: 'left' | 'center' | 'right';
    animationType?: AnimationType;
    enableAnimation?: boolean;
}> = ({ item, colors, borderRadius, index, textAlignment = 'center', animationType = 'fade-in-up', enableAnimation = true }) => {
    const animationClass = getAnimationClass(animationType, enableAnimation);
    
    // Use specific colors - respect user's choices
    const priceColor = colors?.priceColor || hexToRgba(colors?.accent || '#4f46e5', 0.3);
    const titleColor = colors?.cardTitleColor || '#ffffff';
    const textColor = colors?.cardText || colors?.text || '#ffffff';
    
    // Text alignment classes
    const alignmentClasses: Record<string, string> = {
        left: 'text-left items-start',
        center: 'text-center items-center',
        right: 'text-right items-end',
    };
    
    return (
        <div 
            className={`group relative overflow-hidden transform hover:-translate-y-2 transition-all duration-500 ${animationClass} ${borderRadius}`}
            style={{ 
                animationDelay: getAnimationDelay(index, 0.1),
                height: '420px',
            }}
        >
            {/* Full Background Image */}
            <div className="absolute inset-0">
                {isPendingImage(item.imageUrl) ? (
                    <ImagePlaceholder aspectRatio="3:4" showGenerateButton={false} className="w-full h-full" />
                ) : (
                    <img 
                        src={item.imageUrl} 
                        alt={item.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                )}
            </div>
            
            {/* Gradient Overlay */}
            <div 
                className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300"
            />
            
            {/* Special Badge */}
            {item.isSpecial && (
                <div 
                    className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 z-10"
                    style={{ backgroundColor: colors?.accent, color: '#fff' }}
                >
                    <Star size={12} fill="currentColor" />
                    Especial
                </div>
            )}
            
            {/* Category Tag */}
            {item.category && (
                <div 
                    className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider z-10"
                    style={{ backgroundColor: hexToRgba(colors?.accent, 0.2), color: colors?.accent, backdropFilter: 'blur(8px)' }}
                >
                    {item.category}
                </div>
            )}
            
            {/* Content at Bottom */}
            <div className={`absolute bottom-0 left-0 right-0 p-6 flex flex-col ${alignmentClasses[textAlignment]} z-10`}>
                {/* Price */}
                <span 
                    className="text-3xl font-black mb-2 font-header drop-shadow-lg" 
                    style={{ color: priceColor }}
                >
                    {item.price}
                </span>
                
                {/* Title */}
                <h3 
                    className="text-2xl font-bold mb-2 font-header drop-shadow-md" 
                    style={{ color: titleColor, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}
                >
                    {item.name}
                </h3>
                
                {/* Description */}
                <p 
                    className="text-sm leading-relaxed font-body opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 max-w-xs drop-shadow-sm" 
                    style={{ color: textColor }}
                >
                    {item.description}
                </p>
            </div>
        </div>
    );
};
const ElegantListCard: React.FC<{ 
    item: any; 
    colors: any; 
    borderRadius: string; 
    index: number;
    animationType?: AnimationType;
    enableAnimation?: boolean;
}> = ({ item, colors, borderRadius, index, animationType = 'fade-in-up', enableAnimation = true }) => {
    const animationClass = getAnimationClass(animationType, enableAnimation);
    const cardBg = colors?.cardBackground || 'transparent';
    
    // Use specific colors - respect user's choices
    const priceColor = colors?.priceColor || hexToRgba(colors?.accent || '#4f46e5', 0.3);
    const titleColor = colors?.cardTitleColor || '#ffffff';
    const textColor = colors?.cardText || colors?.text || '#94a3b8';
    
    return (
        <div 
            className={`group flex flex-col md:flex-row gap-6 p-6 border transition-all duration-300 hover:bg-white/5 ${borderRadius} ${animationClass}`}
            style={{ 
                borderColor: colors?.borderColor,
                backgroundColor: cardBg,
                animationDelay: getAnimationDelay(index, 0.08)
            }}
        >
        {/* Image */}
        <div className={`relative overflow-hidden w-full md:w-64 h-48 flex-shrink-0 ${borderRadius}`}>
            {isPendingImage(item.imageUrl) ? (
                <ImagePlaceholder aspectRatio="4:3" showGenerateButton={false} className="w-full h-full" />
            ) : (
                <img 
                    src={item.imageUrl} 
                    alt={item.name} 
                    className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-110"
                />
            )}
            {item.isSpecial && (
                <div 
                    className="absolute top-3 left-3 p-2 rounded-full"
                    style={{ backgroundColor: colors?.accent }}
                >
                    <ChefHat size={18} className="text-white" />
                </div>
            )}
        </div>
        
        {/* Content */}
        <div className="flex-1 flex flex-col justify-between">
            <div>
                <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                        <h3 className="text-2xl font-bold mb-2 font-header" style={{ color: titleColor, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}>
                            {item.name}
                        </h3>
                        {item.category && (
                            <span 
                                className="inline-block text-xs font-bold uppercase tracking-widest mb-3 opacity-60"
                                style={{ color: colors?.accent }}
                            >
                                {item.category}
                            </span>
                        )}
                    </div>
                    <span 
                        className="text-3xl font-bold ml-4 font-header" 
                        style={{ color: priceColor }}
                    >
                        {item.price}
                    </span>
                </div>
                <p className="leading-relaxed font-body opacity-90" style={{ color: textColor }}>
                    {item.description}
                </p>
            </div>
            
            <div className="flex items-center gap-4 mt-4 pt-4 border-t" style={{ borderColor: colors?.borderColor }}>
                <button 
                    className="px-6 py-2 rounded-lg font-bold text-sm transition-all hover:scale-105"
                    style={{ backgroundColor: colors?.accent, color: '#fff' }}
                >
                    Ver Más
                </button>
                <button 
                    className="px-4 py-2 rounded-lg font-medium text-sm border transition-all hover:bg-white/5"
                    style={{ borderColor: colors?.accent, color: colors?.accent }}
                >
                    Agregar
                </button>
            </div>
        </div>
    </div>
);
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
interface MenuProps extends MenuData {
    borderRadius: BorderRadiusSize;
    cornerGradient?: CornerGradientConfig;
}

const Menu: React.FC<MenuProps> = ({ 
    title, 
    description, 
    items = [], 
    paddingY, 
    paddingX, 
    colors, 
    borderRadius, 
    titleFontSize = 'md', 
    descriptionFontSize = 'md',
    menuVariant = 'classic',
    showIcon = true,
    icon = 'utensils-crossed',
    animationType = 'fade-in-up',
    enableCardAnimation = true,
    textAlignment = 'center',
    cornerGradient
}) => {
    // Get design tokens with primary color
    const { getColor } = useDesignTokens();
    const primaryColor = getColor('primary.main', '#4f46e5');
    
    // Group items by category if showCategories is true
    const categories = Array.from(new Set(items.map(item => item.category).filter(Boolean)));
    
    // Use component colors - respect user's choices
    const sectionTitleColor = colors?.heading || '#ffffff';
    const sectionTextColor = colors?.text || '#94a3b8';
    
    // Use component colors with proper fallbacks
    const menuColors = {
        ...colors,
        cardBackground: colors?.cardBackground || primaryColor,
        cardTitleColor: colors?.cardTitleColor || '#ffffff',
        cardText: colors?.cardText || '#94a3b8',
    };
    
    return (
        <section 
            id="menu" 
            className="w-full relative overflow-hidden" 
            style={{ backgroundColor: colors?.background }}
        >
            <CornerGradient config={cornerGradient} />
            <div className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]} relative z-10`}>
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto mb-16">
                {showIcon && (
                    <div className="flex justify-center mb-6">
                        <div 
                            className="p-4 rounded-2xl"
                            style={{ backgroundColor: hexToRgba(colors?.accent, 0.125) }}
                        >
                            <div style={{ color: colors?.accent }}>
                                {menuIcons[icon] || menuIcons['utensils-crossed']}
                            </div>
                        </div>
                    </div>
                )}
                <h2 
                    className={`${titleSizeClasses[titleFontSize]} font-extrabold mb-4 font-header`} 
                    style={{ color: sectionTitleColor, textTransform: 'var(--headings-transform, none)' as any, letterSpacing: 'var(--headings-spacing, normal)' }}
                >
                    {title}
                </h2>
                <p 
                    className={`${descriptionSizeClasses[descriptionFontSize]} font-body opacity-90`} 
                    style={{ color: sectionTextColor }}
                >
                    {description}
                </p>
            </div>

            {/* Menu Items - Classic Variant */}
            {menuVariant === 'classic' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {items.map((item, index) => (
                        <ClassicMenuCard 
                            key={index} 
                            item={item} 
                            colors={menuColors} 
                            borderRadius={borderRadiusClasses[borderRadius]}
                            index={index}
                            animationType={animationType}
                            enableAnimation={enableCardAnimation}
                        />
                    ))}
                </div>
            )}

            {/* Menu Items - Modern Grid Variant */}
            {menuVariant === 'modern-grid' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {items.map((item, index) => (
                        <ModernGridCard 
                            key={index} 
                            item={item} 
                            colors={menuColors} 
                            borderRadius={borderRadiusClasses[borderRadius]}
                            index={index}
                        />
                    ))}
                </div>
            )}

            {/* Menu Items - Elegant List Variant */}
            {menuVariant === 'elegant-list' && (
                <div className="space-y-6 max-w-6xl mx-auto">
                    {items.map((item, index) => (
                        <ElegantListCard 
                            key={index} 
                            item={item} 
                            colors={menuColors} 
                            borderRadius={borderRadiusClasses[borderRadius]}
                            index={index}
                            animationType={animationType}
                            enableAnimation={enableCardAnimation}
                        />
                    ))}
                </div>
            )}

            {/* Menu Items - Full Image Variant */}
            {menuVariant === 'full-image' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map((item, index) => (
                        <FullImageMenuCard 
                            key={index} 
                            item={item} 
                            colors={menuColors} 
                            borderRadius={borderRadiusClasses[borderRadius]}
                            index={index}
                            textAlignment={textAlignment}
                            animationType={animationType}
                            enableAnimation={enableCardAnimation}
                        />
                    ))}
                </div>
            )}
            </div>
        </section>
    );
};

export default Menu;

