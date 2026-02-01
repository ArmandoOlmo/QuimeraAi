
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/core/AuthContext';
import Modal from '../ui/Modal';
import {
    auth,
    storage,
    db,
    EmailAuthProvider,
    reauthenticateWithCredential,
    deleteUser,
    updateProfile,
    doc,
    updateDoc,
    deleteDoc,
    ref,
    uploadBytes,
    getDownloadURL
} from '../../firebase';
import { X, Camera, Trash2, Save, AlertTriangle } from 'lucide-react';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const { user, userDocument, setUserDocument } = useAuth();
    const [name, setName] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [bio, setBio] = useState('');
    const [phone, setPhone] = useState('');
    const [department, setDepartment] = useState('');
    const [socialLinks, setSocialLinks] = useState({ linkedin: '', twitter: '', github: '', website: '' });

    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (userDocument) {
            setName(userDocument.name || '');
            setJobTitle(userDocument.jobTitle || '');
            setBio(userDocument.bio || '');
            setPhone(userDocument.phone || '');
            setDepartment(userDocument.department || '');
            setSocialLinks({
                linkedin: userDocument.socialLinks?.linkedin || '',
                twitter: userDocument.socialLinks?.twitter || '',
                github: userDocument.socialLinks?.github || '',
                website: userDocument.socialLinks?.website || '',
            });
            setPhotoPreview(userDocument.photoURL);
        }
    }, [userDocument]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSaveChanges = async () => {
        if (!user) return;
        setIsLoading(true);
        setError('');
        try {
            let newPhotoURL = userDocument?.photoURL || '';
            // 1. Upload new photo if it exists
            if (photoFile) {
                const storageRef = ref(storage, `profile-pictures/${user.uid}`);
                const snapshot = await uploadBytes(storageRef, photoFile);
                newPhotoURL = await getDownloadURL(snapshot.ref);
            }

            // 2. Update Firebase Auth profile
            // We only update displayName and photoURL here as custom claims/fields aren't on Auth object directly
            if (name !== user.displayName || newPhotoURL !== user.photoURL) {
                await updateProfile(user, {
                    displayName: name,
                    photoURL: newPhotoURL,
                });
            }

            // 3. Update Firestore document
            const updatedDocData = {
                name,
                photoURL: newPhotoURL,
                jobTitle,
                bio,
                phone,
                department,
                socialLinks
            };
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, updatedDocData);

            // 4. Update context state
            setUserDocument(prev => prev ? { ...prev, ...updatedDocData } : null);
            onClose();

        } catch (err) {
            setError(t('profile.errors.updateFailed', 'Error al actualizar perfil'));
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !user.email) return;

        setIsLoading(true);
        setError('');

        try {
            const credential = EmailAuthProvider.credential(user.email, deletePassword);
            await reauthenticateWithCredential(user, credential);

            // Re-authentication successful, proceed with deletion
            const userDocRef = doc(db, 'users', user.uid);
            await deleteDoc(userDocRef);
            await deleteUser(user);

            // onAuthStateChanged will handle logout and redirect
            onClose();

        } catch (err: any) {
            if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setError(t('profile.errors.incorrectPassword'));
            } else {
                setError(t('profile.errors.deleteFailed'));
            }
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const hasChanges = (userDocument && (
        name !== userDocument.name ||
        jobTitle !== (userDocument.jobTitle || '') ||
        bio !== (userDocument.bio || '') ||
        phone !== (userDocument.phone || '') ||
        department !== (userDocument.department || '') ||
        socialLinks.linkedin !== (userDocument.socialLinks?.linkedin || '') ||
        socialLinks.twitter !== (userDocument.socialLinks?.twitter || '') ||
        socialLinks.website !== (userDocument.socialLinks?.website || '') ||
        !!photoFile
    ));

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
            <>
                <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center bg-secondary/30 backdrop-blur-sm sm:rounded-t-xl">
                    <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center">
                        {t('profile.title')}
                    </h2>
                    <button onClick={onClose} className="p-2.5 sm:p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors touch-manipulation">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 sm:p-6 md:p-8 overflow-y-auto space-y-6 sm:space-y-8 custom-scrollbar">
                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 sm:p-4 rounded-xl flex items-center">
                            <AlertTriangle size={16} className="mr-2 flex-shrink-0" /> {error}
                        </div>
                    )}

                    {/* Profile Picture Section - Stack vertical on mobile */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
                        <div className="relative group">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1 bg-gradient-to-tr from-primary to-orange-500">
                                <img
                                    src={photoPreview || `https://ui-avatars.com/api/?name=${name}&background=random`}
                                    alt="Profile"
                                    className="w-full h-full rounded-full object-cover border-4 border-card"
                                />
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-0 right-0 bg-foreground text-background p-2 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors shadow-lg touch-manipulation active:scale-95"
                            >
                                <Camera size={16} />
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-xl sm:text-2xl text-foreground">{name || 'User'}</h3>
                            <p className="text-sm text-muted-foreground break-all">{user?.email}</p>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 mt-2">
                                {t('profile.proPlan')}
                            </span>
                        </div>
                    </div>

                    {/* Form Section */}
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label htmlFor="display-name" className="block text-sm font-medium text-foreground mb-2">
                                    {t('profile.displayName', 'Nombre de visualización')}
                                </label>
                                <input
                                    id="display-name"
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full bg-secondary/30 text-foreground p-3 rounded-xl border border-border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-base"
                                />
                            </div>

                            {/* Job Title */}
                            <div>
                                <label htmlFor="job-title" className="block text-sm font-medium text-muted-foreground mb-2">
                                    {t('profile.jobTitle', 'Cargo / Puesto')}
                                </label>
                                <input
                                    id="job-title"
                                    type="text"
                                    value={jobTitle}
                                    onChange={e => setJobTitle(e.target.value)}
                                    placeholder="e.g. Senior Designer"
                                    className="w-full bg-secondary/30 text-foreground p-3 rounded-xl border border-border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-sm"
                                />
                            </div>

                            {/* Department */}
                            <div>
                                <label htmlFor="department" className="block text-sm font-medium text-muted-foreground mb-2">
                                    {t('profile.department', 'Departamento')}
                                </label>
                                <input
                                    id="department"
                                    type="text"
                                    value={department}
                                    onChange={e => setDepartment(e.target.value)}
                                    placeholder="e.g. Marketing"
                                    className="w-full bg-secondary/30 text-foreground p-3 rounded-xl border border-border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-sm"
                                />
                            </div>

                            {/* Bio */}
                            <div className="sm:col-span-2">
                                <label htmlFor="bio" className="block text-sm font-medium text-muted-foreground mb-2">
                                    {t('profile.bio', 'Biografía')}
                                </label>
                                <textarea
                                    id="bio"
                                    value={bio}
                                    onChange={e => setBio(e.target.value)}
                                    placeholder={t('profile.bioPlaceholder', 'Cuéntanos un poco sobre ti...')}
                                    rows={3}
                                    className="w-full bg-secondary/30 text-foreground p-3 rounded-xl border border-border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-sm resize-none"
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-muted-foreground mb-2">
                                    {t('profile.phone', 'Teléfono')}
                                </label>
                                <input
                                    id="phone"
                                    type="tel"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder="+1 234 567 890"
                                    className="w-full bg-secondary/30 text-foreground p-3 rounded-xl border border-border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-sm"
                                />
                            </div>

                            {/* Website */}
                            <div>
                                <label htmlFor="website" className="block text-sm font-medium text-muted-foreground mb-2">
                                    {t('profile.website', 'Sitio Web')}
                                </label>
                                <input
                                    id="website"
                                    type="url"
                                    value={socialLinks.website}
                                    onChange={e => setSocialLinks(prev => ({ ...prev, website: e.target.value }))}
                                    placeholder="https://"
                                    className="w-full bg-secondary/30 text-foreground p-3 rounded-xl border border-border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-sm"
                                />
                            </div>

                            {/* Social Links */}
                            <div className="sm:col-span-2 space-y-3 pt-2">
                                <h4 className="text-sm font-medium text-foreground border-b border-border pb-2">Redes Sociales</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="linkedin" className="block text-xs text-muted-foreground mb-1">LinkedIn</label>
                                        <input
                                            id="linkedin"
                                            type="url"
                                            value={socialLinks.linkedin}
                                            onChange={e => setSocialLinks(prev => ({ ...prev, linkedin: e.target.value }))}
                                            placeholder="LinkedIn Profile URL"
                                            className="w-full bg-secondary/30 text-foreground p-3 rounded-xl border border-border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="twitter" className="block text-xs text-muted-foreground mb-1">Twitter / X</label>
                                        <input
                                            id="twitter"
                                            type="url"
                                            value={socialLinks.twitter}
                                            onChange={e => setSocialLinks(prev => ({ ...prev, twitter: e.target.value }))}
                                            placeholder="Twitter Profile URL"
                                            className="w-full bg-secondary/30 text-foreground p-3 rounded-xl border border-border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center sm:justify-end pt-4 border-t border-border">
                        <button
                            onClick={handleSaveChanges}
                            disabled={!hasChanges || isLoading}
                            className="w-full sm:w-auto bg-primary text-primary-foreground font-bold py-3 px-8 rounded-xl shadow-[0_0_20px_-5px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_25px_-5px_hsl(var(--primary)/0.7)] sm:hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center touch-manipulation active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                            ) : (
                                <Save size={18} className="mr-2" />
                            )}
                            {t('profile.saveChanges')}
                        </button>
                    </div>

                    {/* Danger Zone */}
                    <div className="mt-6 sm:mt-10 pt-6 sm:pt-8 border-t border-border">
                        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:p-6">
                            <h3 className="font-bold text-destructive flex items-center text-sm sm:text-base">
                                <Trash2 size={18} className="mr-2 flex-shrink-0" /> {t('profile.dangerZone')}
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-2 mb-4">
                                {t('profile.deleteWarning')}
                            </p>

                            {!isDeleteConfirm ? (
                                <button
                                    onClick={() => setIsDeleteConfirm(true)}
                                    className="text-sm font-bold text-destructive hover:text-destructive/80 hover:underline transition-colors touch-manipulation py-2"
                                >
                                    {t('profile.deleteAccount')}
                                </button>
                            ) : (
                                <form onSubmit={handleDeleteAccount} className="space-y-4 animate-fade-in-up">
                                    <input
                                        type="password"
                                        value={deletePassword}
                                        onChange={e => setDeletePassword(e.target.value)}
                                        required
                                        placeholder={t('profile.confirmWithPassword')}
                                        className="w-full bg-background text-foreground p-3 rounded-lg border border-destructive/50 focus:ring-2 focus:ring-destructive focus:outline-none text-base"
                                    />
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:space-x-4 sm:gap-0">
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="bg-destructive text-destructive-foreground font-bold py-3 sm:py-2 px-4 rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 text-sm touch-manipulation active:scale-[0.98]"
                                        >
                                            {t('profile.confirmDeletion')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsDeleteConfirm(false)}
                                            className="text-sm text-muted-foreground hover:text-foreground py-2 touch-manipulation"
                                        >
                                            {t('common.cancel')}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>

                </div>
            </>
        </Modal>
    );
};

export default ProfileModal;
