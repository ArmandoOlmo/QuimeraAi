import React from 'react';
import { X } from 'lucide-react';
import { useRouter } from '../../hooks/useRouter';
import { ROUTES } from '../../routes/config';

export type UpgradeTrigger = 'generic' | 'credits' | 'projects' | 'ecommerce' | 'chatbot' | 'domains' | 'users' | 'storage';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    trigger: UpgradeTrigger;
    currentPlanId: string;
    metadata?: any;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
    isOpen,
    onClose,
    trigger,
    currentPlanId,
    metadata
}) => {
    const { navigate } = useRouter();
    
    if (!isOpen) return null;

    const handleViewPricingPlans = () => {
        onClose();
        navigate(ROUTES.SETTINGS_SUBSCRIPTION);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-background border border-border shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="p-8">
                    <h2 className="text-2xl font-bold mb-2">Upgrade Your Plan</h2>
                    <p className="text-muted-foreground mb-6">
                        You've reached a limit or need a premium feature ({trigger}).
                        Current plan: <span className="font-semibold uppercase">{currentPlanId}</span>
                    </p>

                    <div className="space-y-4">
                        <button 
                            onClick={handleViewPricingPlans}
                            className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
                        >
                            View Pricing Plans
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-3 px-4 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
                        >
                            Maybe later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpgradeModal;
