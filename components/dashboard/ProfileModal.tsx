
import React, { useState, useEffect, useRef } from 'react';
import { useEditor } from '../../contexts/EditorContext';
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
    const { user, userDocument, setUserDocument } = useEditor();
    const [name, setName] = useState('');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (userDocument) {
            setName(userDocument.name);
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
            await updateProfile(user, {
                displayName: name,
                photoURL: newPhotoURL,
            });

            // 3. Update Firestore document
            const updatedDocData = { name, photoURL: newPhotoURL };
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, updatedDocData);

            // 4. Update context state
            setUserDocument(prev => prev ? { ...prev, ...updatedDocData } : null);
            onClose();

        } catch (err) {
            setError('Failed to update profile. Please try again.');
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
                setError('Incorrect password. Please try again.');
            } else {
                setError('Failed to delete account. Please try again later.');
            }
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const hasChanges = (userDocument && (name !== userDocument.name || !!photoFile));

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-border flex justify-between items-center bg-secondary/30 backdrop-blur-sm">
                    <h2 className="text-xl font-bold text-foreground flex items-center">
                        Settings & Profile
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                        <X size={20}/>
                    </button>
                </div>

                <div className="p-6 md:p-8 overflow-y-auto space-y-8 custom-scrollbar">
                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-4 rounded-xl flex items-center">
                            <AlertTriangle size={16} className="mr-2" /> {error}
                        </div>
                    )}
                    
                    {/* Profile Picture Section */}
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-primary to-orange-500">
                                <img 
                                    src={photoPreview || `https://ui-avatars.com/api/?name=${name}&background=random`} 
                                    alt="Profile" 
                                    className="w-full h-full rounded-full object-cover border-4 border-card" 
                                />
                            </div>
                            <button 
                                onClick={() => fileInputRef.current?.click()} 
                                className="absolute bottom-0 right-0 bg-foreground text-background p-2 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors shadow-lg"
                            >
                                <Camera size={16} />
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden"/>
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-2xl text-foreground">{name || 'User'}</h3>
                            <p className="text-sm text-muted-foreground">{user?.email}</p>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 mt-2">
                                Pro Plan
                            </span>
                        </div>
                    </div>

                    {/* Form Section */}
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="display-name" className="block text-sm font-medium text-muted-foreground mb-2">Display Name</label>
                            <input 
                                id="display-name" 
                                type="text" 
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                                className="w-full bg-secondary/30 text-foreground p-3 rounded-xl border border-border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all" 
                            />
                        </div>
                    </div>
                    
                    <div className="flex justify-end pt-4 border-t border-border">
                        <button 
                            onClick={handleSaveChanges} 
                            disabled={!hasChanges || isLoading} 
                            className="bg-primary text-primary-foreground font-bold py-3 px-8 rounded-xl shadow-[0_0_20px_-5px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_25px_-5px_hsl(var(--primary)/0.7)] hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                            ) : (
                                <Save size={18} className="mr-2" />
                            )}
                            Save Changes
                        </button>
                    </div>

                    {/* Danger Zone */}
                    <div className="mt-10 pt-8 border-t border-border">
                        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
                            <h3 className="font-bold text-destructive flex items-center">
                                <Trash2 size={18} className="mr-2" /> Danger Zone
                            </h3>
                            <p className="text-sm text-muted-foreground mt-2 mb-4">
                                Once you delete your account, there is no going back. Please be certain.
                            </p>

                            {!isDeleteConfirm ? (
                                <button 
                                    onClick={() => setIsDeleteConfirm(true)} 
                                    className="text-sm font-bold text-destructive hover:text-destructive/80 hover:underline transition-colors"
                                >
                                    Delete My Account
                                </button>
                            ) : (
                                <form onSubmit={handleDeleteAccount} className="space-y-4 animate-fade-in-up">
                                     <input 
                                        type="password" 
                                        value={deletePassword} 
                                        onChange={e => setDeletePassword(e.target.value)} 
                                        required 
                                        placeholder="Confirm with your password" 
                                        className="w-full bg-background text-foreground p-2 rounded-lg border border-destructive/50 focus:ring-2 focus:ring-destructive focus:outline-none text-sm" 
                                    />
                                     <div className="flex items-center space-x-4">
                                         <button 
                                            type="submit" 
                                            disabled={isLoading} 
                                            className="bg-destructive text-destructive-foreground font-bold py-2 px-4 rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 text-sm"
                                        >
                                            Confirm Deletion
                                         </button>
                                         <button 
                                            type="button" 
                                            onClick={() => setIsDeleteConfirm(false)} 
                                            className="text-sm text-muted-foreground hover:text-foreground"
                                        >
                                            Cancel
                                         </button>
                                     </div>
                                </form>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </Modal>
    );
};

export default ProfileModal;
