import React, { useState } from 'react';
import {
    X, User, Mail, Phone, Briefcase, Building2,
    Globe, DollarSign, Plus, Loader2, Sparkles
} from 'lucide-react';
import Modal from '../../ui/Modal';
import { Lead } from '../../../types';

interface AddLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (leadData: Partial<Lead>) => Promise<void>;
}

const AddLeadModal: React.FC<AddLeadModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<Partial<Lead>>({
        name: '',
        email: '',
        phone: '',
        company: '',
        jobTitle: '',
        industry: '',
        value: 0,
        source: 'manual',
        status: 'new'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email) return;

        setIsSubmitting(true);
        try {
            await onSubmit(formData);
            // Reset form after successful submission
            setFormData({
                name: '',
                email: '',
                phone: '',
                company: '',
                jobTitle: '',
                industry: '',
                value: 0,
                source: 'manual',
                status: 'new'
            });
        } catch (error) {
            console.error("Error adding lead:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (field: keyof Lead, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-2xl"
            className="bg-card/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden"
        >
            {/* Header with Gradient */}
            <div className="relative p-6 border-b border-white/10 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-purple-500/10 to-blue-500/10 opacity-50" />
                <div className="relative flex justify-between items-center z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 text-primary shadow-inner shadow-primary/5">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-xl text-foreground tracking-tight">Add New Lead</h3>
                            <p className="text-xs text-muted-foreground font-medium">Enter lead details to track in your pipeline</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-full text-muted-foreground hover:text-foreground transition-all duration-200 hover:rotate-90"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Primary Info Section */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <User size={12} /> Contact Information
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5 group">
                            <label className="text-xs font-medium text-foreground/80 ml-1 group-focus-within:text-primary transition-colors">Full Name <span className="text-red-400">*</span></label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                                <input
                                    required
                                    value={formData.name}
                                    onChange={e => handleChange('name', e.target.value)}
                                    className="w-full bg-secondary/30 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/30 hover:bg-secondary/50"
                                    placeholder="e.g. Sarah Connor"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 group">
                            <label className="text-xs font-medium text-foreground/80 ml-1 group-focus-within:text-primary transition-colors">Email Address <span className="text-red-400">*</span></label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                                <input
                                    required
                                    type="email"
                                    value={formData.email}
                                    onChange={e => handleChange('email', e.target.value)}
                                    className="w-full bg-secondary/30 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/30 hover:bg-secondary/50"
                                    placeholder="sarah@skynet.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 group">
                            <label className="text-xs font-medium text-foreground/80 ml-1 group-focus-within:text-primary transition-colors">Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => handleChange('phone', e.target.value)}
                                    className="w-full bg-secondary/30 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/30 hover:bg-secondary/50"
                                    placeholder="+1 (555) 000-0000"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 group">
                            <label className="text-xs font-medium text-foreground/80 ml-1 group-focus-within:text-primary transition-colors">Job Title</label>
                            <div className="relative">
                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                                <input
                                    value={formData.jobTitle}
                                    onChange={e => handleChange('jobTitle', e.target.value)}
                                    className="w-full bg-secondary/30 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/30 hover:bg-secondary/50"
                                    placeholder="e.g. CTO"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Company Info Section */}
                <div className="space-y-4 pt-2 border-t border-white/5">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Building2 size={12} /> Company Details
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5 group">
                            <label className="text-xs font-medium text-foreground/80 ml-1 group-focus-within:text-primary transition-colors">Company Name</label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                                <input
                                    value={formData.company}
                                    onChange={e => handleChange('company', e.target.value)}
                                    className="w-full bg-secondary/30 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/30 hover:bg-secondary/50"
                                    placeholder="e.g. Cyberdyne Systems"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 group">
                            <label className="text-xs font-medium text-foreground/80 ml-1 group-focus-within:text-primary transition-colors">Industry</label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                                <input
                                    value={formData.industry}
                                    onChange={e => handleChange('industry', e.target.value)}
                                    className="w-full bg-secondary/30 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/30 hover:bg-secondary/50"
                                    placeholder="e.g. Technology"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Deal Value Section */}
                <div className="space-y-4 pt-2 border-t border-white/5">
                    <div className="space-y-1.5 group max-w-[50%]">
                        <label className="text-xs font-medium text-foreground/80 ml-1 group-focus-within:text-green-500 transition-colors">Estimated Deal Value</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-green-500 transition-colors" size={16} />
                            <input
                                type="number"
                                min="0"
                                value={formData.value}
                                onChange={e => handleChange('value', Number(e.target.value))}
                                className="w-full bg-secondary/30 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-green-500 outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500/50 transition-all placeholder:text-muted-foreground/30 hover:bg-secondary/50"
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-6 mt-2 border-t border-white/5 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="relative overflow-hidden px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed group"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:animate-shimmer" />
                        <span className="flex items-center gap-2 relative z-10">
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus size={16} />
                                    Create Lead
                                </>
                            )}
                        </span>
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AddLeadModal;
