import React, { useState } from 'react';
import { ServiceIcon } from '../../types';
import * as LucideIcons from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Icon categories for services
const serviceIconCategories = {
    'Development': ['code', 'code2', 'terminal', 'cpu', 'database', 'server', 'cloud', 'wifi', 'globe', 'smartphone', 'monitor'] as ServiceIcon[],
    'Design': ['brush', 'paintbrush', 'palette', 'pen-tool', 'layout', 'image', 'camera', 'video', 'film', 'scissors'] as ServiceIcon[],
    'Business': ['megaphone', 'trending-up', 'chart', 'bar-chart', 'pie-chart', 'target', 'briefcase', 'dollar-sign', 'credit-card'] as ServiceIcon[],
    'Communication': ['mail', 'message-circle', 'phone', 'send', 'mic', 'users', 'user-check', 'at-sign'] as ServiceIcon[],
    'Social': ['share-2', 'heart', 'star', 'bookmark', 'thumbs-up', 'eye', 'hash', 'instagram', 'twitter', 'facebook'] as ServiceIcon[],
    'Tools': ['wrench', 'settings', 'tool', 'package', 'box', 'shopping-cart', 'shopping-bag', 'gift', 'truck'] as ServiceIcon[],
    'Documents': ['file', 'file-text', 'folder', 'book', 'clipboard', 'edit', 'feather', 'pen'] as ServiceIcon[],
    'Location': ['map-pin', 'map', 'navigation', 'compass', 'home', 'building', 'store'] as ServiceIcon[],
    'Time': ['clock', 'calendar', 'timer', 'watch', 'hourglass'] as ServiceIcon[],
    'Security': ['shield', 'lock', 'key', 'eye-off', 'check-circle', 'alert-circle'] as ServiceIcon[],
    'Food & Hospitality': ['utensils', 'coffee', 'wine', 'beer', 'utensils-crossed', 'chef-hat', 'cake-slice', 'pizza', 'soup', 'salad'] as ServiceIcon[],
    'Other': ['zap', 'award', 'trophy', 'rocket', 'lightbulb', 'sparkles', 'circle-dot', 'hexagon', 'layers'] as ServiceIcon[],
};

// Helper function to get translation key for category
const getCategoryKey = (category: string) => {
    const map: Record<string, string> = {
        'Development': 'development',
        'Design': 'design',
        'Business': 'business',
        'Communication': 'communication',
        'Social': 'social',
        'Tools': 'tools',
        'Documents': 'documents',
        'Location': 'location',
        'Time': 'time',
        'Security': 'security',
        'Food & Hospitality': 'foodHospitality',
        'Other': 'other'
    };
    return map[category] || 'other';
};

interface IconSelectorProps {
    value: ServiceIcon;
    onChange: (icon: ServiceIcon) => void;
    label?: string;
    size?: 'sm' | 'md' | 'lg';
}

const IconSelector: React.FC<IconSelectorProps> = ({ value, onChange, label, size = 'md' }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('Development');

    // Map icon names to their actual components
    const getIconComponent = (iconName: ServiceIcon) => {
        const iconMap: Record<string, any> = {
            'code': LucideIcons.Code,
            'code2': LucideIcons.CodeSquare,
            'terminal': LucideIcons.Terminal,
            'cpu': LucideIcons.Cpu,
            'database': LucideIcons.Database,
            'server': LucideIcons.Server,
            'cloud': LucideIcons.Cloud,
            'wifi': LucideIcons.Wifi,
            'globe': LucideIcons.Globe,
            'smartphone': LucideIcons.Smartphone,
            'monitor': LucideIcons.Monitor,
            'brush': LucideIcons.Brush,
            'paintbrush': LucideIcons.Paintbrush,
            'palette': LucideIcons.Palette,
            'pen-tool': LucideIcons.PenTool,
            'layout': LucideIcons.Layout,
            'image': LucideIcons.Image,
            'camera': LucideIcons.Camera,
            'video': LucideIcons.Video,
            'film': LucideIcons.Film,
            'scissors': LucideIcons.Scissors,
            'megaphone': LucideIcons.Megaphone,
            'trending-up': LucideIcons.TrendingUp,
            'chart': LucideIcons.BarChart,
            'bar-chart': LucideIcons.BarChart,
            'pie-chart': LucideIcons.PieChart,
            'target': LucideIcons.Target,
            'briefcase': LucideIcons.Briefcase,
            'dollar-sign': LucideIcons.DollarSign,
            'credit-card': LucideIcons.CreditCard,
            'mail': LucideIcons.Mail,
            'message-circle': LucideIcons.MessageCircle,
            'phone': LucideIcons.Phone,
            'send': LucideIcons.Send,
            'mic': LucideIcons.Mic,
            'users': LucideIcons.Users,
            'user-check': LucideIcons.UserCheck,
            'at-sign': LucideIcons.AtSign,
            'share-2': LucideIcons.Share2,
            'heart': LucideIcons.Heart,
            'star': LucideIcons.Star,
            'bookmark': LucideIcons.Bookmark,
            'thumbs-up': LucideIcons.ThumbsUp,
            'eye': LucideIcons.Eye,
            'hash': LucideIcons.Hash,
            'instagram': LucideIcons.Instagram,
            'twitter': LucideIcons.Twitter,
            'facebook': LucideIcons.Facebook,
            'wrench': LucideIcons.Wrench,
            'settings': LucideIcons.Settings,
            'tool': LucideIcons.Hammer,
            'package': LucideIcons.Package,
            'box': LucideIcons.Box,
            'shopping-cart': LucideIcons.ShoppingCart,
            'shopping-bag': LucideIcons.ShoppingBag,
            'gift': LucideIcons.Gift,
            'truck': LucideIcons.Truck,
            'file': LucideIcons.File,
            'file-text': LucideIcons.FileText,
            'folder': LucideIcons.Folder,
            'book': LucideIcons.Book,
            'clipboard': LucideIcons.Clipboard,
            'edit': LucideIcons.Edit,
            'feather': LucideIcons.Feather,
            'pen': LucideIcons.Pen,
            'map-pin': LucideIcons.MapPin,
            'map': LucideIcons.Map,
            'navigation': LucideIcons.Navigation,
            'compass': LucideIcons.Compass,
            'home': LucideIcons.Home,
            'building': LucideIcons.Building,
            'store': LucideIcons.Store,
            'clock': LucideIcons.Clock,
            'calendar': LucideIcons.Calendar,
            'timer': LucideIcons.Timer,
            'watch': LucideIcons.Watch,
            'hourglass': LucideIcons.Hourglass,
            'shield': LucideIcons.Shield,
            'lock': LucideIcons.Lock,
            'key': LucideIcons.Key,
            'eye-off': LucideIcons.EyeOff,
            'check-circle': LucideIcons.CheckCircle,
            'alert-circle': LucideIcons.AlertCircle,
            'utensils': LucideIcons.Utensils,
            'coffee': LucideIcons.Coffee,
            'wine': LucideIcons.Wine,
            'beer': LucideIcons.Beer,
            'utensils-crossed': LucideIcons.UtensilsCrossed,
            'chef-hat': LucideIcons.ChefHat,
            'cake-slice': LucideIcons.CakeSlice,
            'pizza': LucideIcons.Pizza,
            'soup': LucideIcons.Soup,
            'salad': LucideIcons.Salad,
            'zap': LucideIcons.Zap,
            'award': LucideIcons.Award,
            'trophy': LucideIcons.Trophy,
            'rocket': LucideIcons.Rocket,
            'lightbulb': LucideIcons.Lightbulb,
            'sparkles': LucideIcons.Sparkles,
            'circle-dot': LucideIcons.CircleDot,
            'hexagon': LucideIcons.Hexagon,
            'layers': LucideIcons.Layers,
        };
        const IconComponent = iconMap[iconName];
        return IconComponent ? React.createElement(IconComponent, { size: size === 'sm' ? 16 : size === 'lg' ? 24 : 20 }) : null;
    };

    const CurrentIcon = getIconComponent(value);

    // Size classes
    const sizeClasses = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-2 text-sm',
        lg: 'px-4 py-3 text-base'
    };

    return (
        <div className="relative">
            {label && (
                <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">
                    {label}
                </label>
            )}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between ${sizeClasses[size]} bg-editor-panel-bg border border-editor-border rounded-md text-editor-text-primary hover:border-editor-accent transition-colors`}
            >
                <div className="flex items-center gap-2">
                    {CurrentIcon}
                    <span>{value}</span>
                </div>
                <ChevronDown className="w-4 h-4" />
            </button>

            {isOpen && (
                <>
                    {/* Overlay para cerrar al hacer clic fuera */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Panel de selección de iconos */}
                    <div className="absolute z-50 mt-1 w-full bg-editor-panel-bg border border-editor-border rounded-lg shadow-xl max-h-96 overflow-hidden">
                        {/* Category tabs */}
                        <div className="flex overflow-x-auto border-b border-editor-border bg-editor-bg">
                            {Object.keys(serviceIconCategories).map((category) => (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${selectedCategory === category
                                            ? 'text-editor-accent border-b-2 border-editor-accent bg-editor-panel-bg/50'
                                            : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-panel-bg/30'
                                        }`}
                                >
                                    {t(`editor.controls.iconSelector.categories.${getCategoryKey(category)}`, category)}
                                </button>
                            ))}
                        </div>

                        {/* Icon grid */}
                        <div className="p-3 overflow-y-auto max-h-80">
                            <div className="grid grid-cols-5 gap-2">
                                {serviceIconCategories[selectedCategory as keyof typeof serviceIconCategories].map((iconName) => {
                                    const IconComponent = getIconComponent(iconName);
                                    return (
                                        <button
                                            key={iconName}
                                            onClick={() => {
                                                onChange(iconName);
                                                setIsOpen(false);
                                            }}
                                            className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all hover:scale-105 ${value === iconName
                                                    ? 'bg-editor-accent/20 border-editor-accent text-editor-accent'
                                                    : 'bg-editor-bg border-editor-border text-editor-text-primary hover:border-editor-accent hover:bg-editor-panel-bg'
                                                }`}
                                            title={iconName}
                                        >
                                            {IconComponent}
                                            <span className="text-[10px] mt-1 truncate w-full text-center">
                                                {iconName.split('-').slice(0, 1).join('-')}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default IconSelector;

