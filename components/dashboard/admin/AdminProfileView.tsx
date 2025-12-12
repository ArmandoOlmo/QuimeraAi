import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useAdmin } from '../../../contexts/admin';
import { useFiles } from '../../../contexts/files';
import { useToast } from '../../../contexts/ToastContext';
import { UserDocument, UserRole } from '../../../types';
import { ROLE_LABELS, ROLE_COLORS, ROLE_DESCRIPTIONS, isOwner } from '../../../constants/roles';
import AdminViewLayout from './AdminViewLayout';
import {
    Camera,
    Mail,
    Shield,
    Calendar,
    Clock,
    Trash2,
    Save,
    Loader2,
    User,
    Building,
    Crown,
    UserCog,
    Eye,
    Users
} from 'lucide-react';

interface AdminProfileViewProps {
    user: UserDocument;
    onBack: () => void;
}

const AdminProfileView: React.FC<AdminProfileViewProps> = ({ user, onBack }) => {
    const { t, i18n } = useTranslation();
    const { userDocument: currentUser } = useAuth();
    const { updateUserRole, deleteUserRecord, updateUserDetails } = useAdmin();
    const { uploadFile } = useFiles();
    const { success, error: showError } = useToast();

    const [name, setName] = useState(user.name);
    const [photoURL, setPhotoURL] = useState(user.photoURL || '');
    const [role, setRole] = useState<UserRole>(user.role || 'user');
    const [loading, setLoading] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Permissions
    const isTargetOwner = isOwner(user.email);
    const isSelf = currentUser?.id === user.id;
    const canEditRole = !isTargetOwner && !isSelf;
    const canDelete = !isTargetOwner && !isSelf;

    const handleSave = async () => {
        setLoading(true);
        try {
            if (name !== user.name || photoURL !== user.photoURL) {
                await updateUserDetails(user.id, { name, photoURL });
            }
            if (role !== user.role && canEditRole) {
                await updateUserRole(user.id, role);
            }
            success(t('superadmin.profile.saveSuccess'));
        } catch (error) {
            console.error("Error saving user:", error);
            showError(t('superadmin.profile.saveError'));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(t('superadmin.profile.deleteConfirm', { name: user.name }))) {
            return;
        }
        setLoading(true);
        try {
            await deleteUserRecord(user.id);
            onBack();
        } catch (error) {
            console.error("Error deleting user:", error);
            showError(t('superadmin.profile.deleteError'));
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
            const url = await uploadFile(file);
            if (url) {
                setPhotoURL(url);
            }
        } catch (error) {
            console.error('Error uploading photo:', error);
            showError(t('superadmin.profile.uploadError'));
        } finally {
            setUploadingPhoto(false);
        }
    };

    const formatDate = (date: any) => {
        if (!date) return 'N/A';
        if (date.seconds) {
            return new Date(date.seconds * 1000).toLocaleDateString(i18n.language, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        return new Date(date).toLocaleDateString(i18n.language);
    };

    const getRoleIcon = (roleKey: string) => {
        switch (roleKey) {
            case 'owner': return <Crown size={18} className="text-yellow-500" />;
            case 'superadmin': return <Shield size={18} className="text-purple-400" />;
            case 'admin': return <UserCog size={18} className="text-blue-400" />;
            case 'manager': return <Eye size={18} className="text-green-400" />;
            default: return <Users size={18} className="text-gray-400" />;
        }
    };

    return (
        <AdminViewLayout title={t('superadmin.profile.title', { name: user.name })} onBack={onBack}>
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Profile Header Card */}
                <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        {/* Avatar */}
                        <div className="relative group cursor-pointer" onClick={handlePhotoClick}>
                            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-editor-bg shadow-lg ring-2 ring-editor-border group-hover:ring-editor-accent transition-all">
                                {uploadingPhoto ? (
                                    <div className="w-full h-full bg-editor-bg flex items-center justify-center">
                                        <Loader2 className="w-8 h-8 text-editor-accent animate-spin" />
                                    </div>
                                ) : (
                                    <img
                                        src={
                                            photoURL ||
                                            'https://ui-avatars.com/api/?name=' +
                                                encodeURIComponent(user.name || 'User') +
                                                '&background=random&size=128'
                                        }
                                        alt={user.name}
                                        className="w-full h-full object-cover"
                                    />
                                )}
                            </div>
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                                <Camera className="w-8 h-8 text-white" />
                            </div>
                            <div className="absolute bottom-0 right-0 bg-editor-accent text-white p-2 rounded-full shadow-lg border-2 border-editor-panel-bg">
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

{/* Info */ }
<div className="flex-1 text-center sm:text-left">
    <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
        <h1 className="text-2xl font-bold text-editor-text-primary">{user.name}</h1>
        {isTargetOwner && <Crown size={20} className="text-yellow-500" />}
    </div>
    <p className="text-editor-text-secondary flex items-center justify-center sm:justify-start gap-2">
        <Mail size={14} /> {user.email}
    </p>
    <div className="mt-3">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${ROLE_COLORS[user.role || 'user']}`}>
            {getRoleIcon(user.role || 'user')}
            {t(`superadmin.roles.${user.role || 'user'}`)}
        </span>
    </div>
</div>
                    </div >
                </div >

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Edit Form */}
        <div className="lg:col-span-2 space-y-6">

            {/* Basic Info */}
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-editor-text-primary mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-editor-accent" />
                    {t('superadmin.profile.personalInfo')}
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-editor-text-secondary mb-1.5">{t('superadmin.profile.name')}</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2.5 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent/50 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-editor-text-secondary mb-1.5">{t('superadmin.profile.email')}</label>
                        <input
                            type="email"
                            value={user.email}
                            readOnly
                            className="w-full px-4 py-2.5 bg-editor-bg/50 border border-editor-border rounded-lg text-editor-text-secondary cursor-not-allowed"
                        />
                        <p className="text-xs text-editor-text-secondary mt-1">{t('superadmin.profile.emailReadOnly')}</p>
                    </div>
                </div>
            </div>

            {/* Role Management */}
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-editor-text-primary mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-editor-accent" />
                    {t('superadmin.profile.rolesPermissions')}
                </h3>
                {!canEditRole && (
                    <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-300">
                        {isTargetOwner
                            ? t('superadmin.profile.ownerRoleImmutable')
                            : t('superadmin.profile.selfRoleImmutable')}
                    </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(ROLE_LABELS).map(([roleKey, label]) => {
                        if (roleKey === 'owner' && !isOwner(currentUser?.email)) return null;

                        const isSelected = role === roleKey;
                        const isDisabled = !canEditRole || (roleKey === 'owner' && !isOwner(currentUser?.email));

                        return (
                            <div
                                key={roleKey}
                                onClick={() => !isDisabled && setRole(roleKey as UserRole)}
                                className={`
                                                relative p-4 rounded-xl border-2 transition-all
                                                ${isSelected
                                        ? 'border-editor-accent bg-editor-accent/10'
                                        : 'border-editor-border hover:border-editor-border/80 bg-editor-bg/30'}
                                                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                            `}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    {getRoleIcon(roleKey)}
                                    <span className={`font-semibold ${isSelected ? 'text-editor-text-primary' : 'text-editor-text-secondary'}`}>
                                        {t(`superadmin.roles.${roleKey}`)}
                                    </span>
                                    {isSelected && (
                                        <div className="ml-auto w-3 h-3 rounded-full bg-editor-accent" />
                                    )}
                                </div>
                                <p className="text-xs text-editor-text-secondary pl-6">
                                    {t(`superadmin.roleDescriptions.${roleKey}`)}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Danger Zone */}
            {canDelete && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-red-500 mb-2 flex items-center gap-2">
                        <Trash2 className="w-5 h-5" />
                        {t('superadmin.profile.dangerZone')}
                    </h3>
                    <p className="text-sm text-editor-text-secondary mb-4">
                        {t('superadmin.profile.dangerZoneDesc')}
                    </p>
                    <button
                        onClick={handleDelete}
                        disabled={loading}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm font-medium transition-colors border border-red-500/20"
                    >
                        {t('superadmin.profile.deleteUser')}
                    </button>
                </div>
            )}
        </div>

        {/* Right Column: Metadata */}
        <div className="space-y-6">
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-editor-text-primary flex items-center gap-2 mb-4">
                    <Building className="w-4 h-4 text-editor-accent" />
                    {t('superadmin.profile.systemInfo')}
                </h3>
                <div className="space-y-4 text-sm">
                    <div className="flex justify-between py-2 border-b border-editor-border/50">
                        <span className="text-editor-text-secondary flex items-center gap-2">
                            <Shield size={14} /> {t('superadmin.profile.id')}
                        </span>
                        <span className="font-mono text-xs text-editor-text-primary truncate max-w-[120px]" title={user.id}>
                            {user.id.slice(0, 8)}...
                        </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-editor-border/50">
                        <span className="text-editor-text-secondary flex items-center gap-2">
                            <Calendar size={14} /> {t('superadmin.profile.created')}
                        </span>
                        <span className="text-editor-text-primary text-right">
                            {formatDate(user.createdAt)}
                        </span>
                    </div>
                    <div className="flex justify-between py-2">
                        <span className="text-editor-text-secondary flex items-center gap-2">
                            <Clock size={14} /> {t('superadmin.profile.lastAccess')}
                        </span>
                        <span className="text-editor-text-primary text-right">
                            {formatDate(user.lastLogin)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Save Button - Sticky on mobile */}
            <div className="sticky bottom-6">
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium bg-editor-accent text-white rounded-xl hover:bg-editor-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-editor-accent/20"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {t('superadmin.profile.saveChanges')}
                </button>
            </div>
        </div>
    </div>
            </div >
        </AdminViewLayout >
    );
};

export default AdminProfileView;
