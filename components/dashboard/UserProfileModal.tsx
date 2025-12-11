import React, { useState, useRef } from 'react';
import { useAuth } from '../../contexts/core/AuthContext';
import { useFiles } from '../../contexts/files';
import { X, Camera, User, Mail, Shield, Save, Loader2 } from 'lucide-react';
import { ROLE_LABELS, ROLE_COLORS } from '../../constants/roles';

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
    const { userDocument } = useAuth();
    const { uploadFile } = useFiles();
    // TODO: Add updateUserProfile to AuthContext
    const updateUserProfile = async (data: any) => { console.warn('updateUserProfile not implemented'); };
    const [name, setName] = useState(userDocument?.name || '');
    const [loading, setLoading] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen || !userDocument) return null;

    const handleSave = async () => {
        if (!name.trim()) return;

        setLoading(true);
        try {
            await updateUserProfile(name, userDocument.photoURL || '');
            onClose();
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('Error al guardar el perfil');
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingPhoto(true);
        try {
            const photoURL = await uploadFile(file);
            if (photoURL) {
                await updateUserProfile(name, photoURL);
            }
        } catch (error) {
            console.error('Error uploading photo:', error);
            alert('Error al subir la foto');
        } finally {
            setUploadingPhoto(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-4 border-b border-editor-border flex items-center justify-between bg-editor-bg/50">
                    <h2 className="text-lg font-semibold text-editor-text-primary flex items-center gap-2">
                        <User className="w-5 h-5 text-editor-accent" />
                        Mi Perfil
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-editor-border/50 rounded-lg transition-colors text-editor-text-secondary hover:text-editor-text-primary"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Photo Upload */}
                    <div className="flex flex-col items-center">
                        <div className="relative group cursor-pointer" onClick={handlePhotoClick}>
                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-editor-bg shadow-lg ring-2 ring-editor-border group-hover:ring-editor-accent transition-all">
                                {uploadingPhoto ? (
                                    <div className="w-full h-full bg-editor-bg flex items-center justify-center">
                                        <Loader2 className="w-8 h-8 text-editor-accent animate-spin" />
                                    </div>
                                ) : (
                                    <img
                                        src={userDocument.photoURL || `https://ui-avatars.com/api/?name=${userDocument.name}&background=random`}
                                        alt={userDocument.name}
                                        className="w-full h-full object-cover"
                                    />
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Camera className="w-8 h-8 text-white" />
                                </div>
                            </div>
                            <div className="absolute bottom-0 right-0 bg-editor-accent text-white p-1.5 rounded-full shadow-lg border-2 border-editor-panel-bg">
                                <Camera size={14} />
                            </div>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />
                        <p className="text-xs text-editor-text-secondary mt-2">Click para cambiar foto</p>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-editor-text-secondary mb-1.5">
                                Nombre Completo
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-editor-text-secondary" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent/50 transition-all"
                                    placeholder="Tu nombre"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-editor-text-secondary mb-1.5">
                                Email
                            </label>
                            <div className="relative opacity-70">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-editor-text-secondary" />
                                <input
                                    type="email"
                                    value={userDocument.email}
                                    readOnly
                                    className="w-full pl-9 pr-4 py-2.5 bg-editor-bg/50 border border-editor-border rounded-lg text-editor-text-secondary cursor-not-allowed"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-editor-text-secondary mb-1.5">
                                Rol
                            </label>
                            <div className="flex items-center gap-2 p-2.5 bg-editor-bg/30 border border-editor-border rounded-lg">
                                <Shield className="w-4 h-4 text-editor-text-secondary" />
                                <span className={`px-2 py-0.5 text-xs rounded-md border ${ROLE_COLORS[userDocument.role || 'user']}`}>
                                    {ROLE_LABELS[userDocument.role || 'user']}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-editor-border bg-editor-bg/30 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/50 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading || !name.trim()}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-editor-accent text-white rounded-lg hover:bg-editor-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-editor-accent/20"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserProfileModal;
