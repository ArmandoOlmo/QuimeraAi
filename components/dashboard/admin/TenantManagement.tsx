import React, { useEffect, useState } from 'react';
import { useEditor } from '../../../contexts/EditorContext';
import { UserDocument } from '../../../types';
import DashboardSidebar from '../DashboardSidebar';
import { ArrowLeft, Menu, Users, Trash2 } from 'lucide-react';

interface TenantManagementProps {
    onBack: () => void;
}

const TenantManagement: React.FC<TenantManagementProps> = ({ onBack }) => {
    const { allUsers, fetchAllUsers, updateUserRole, deleteUserRecord } = useEditor();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUsers = async () => {
            setLoading(true);
            await fetchAllUsers();
            setLoading(false);
        };
        loadUsers();
    }, []);

    const handleDelete = (userId: string) => {
        if (window.confirm('Are you sure you want to delete this user record? This cannot be undone.')) {
            deleteUserRecord(userId);
        }
    }

    const UserRow: React.FC<{ user: UserDocument }> = ({ user }) => (
        <tr className="border-b border-editor-border hover:bg-editor-panel-bg/50">
            <td className="p-4">
                <div className="flex items-center space-x-3">
                    <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.name}&background=3f3f46&color=e4e4e7`} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                        <p className="font-semibold text-editor-text-primary">{user.name}</p>
                        <p className="text-xs text-editor-text-secondary">{user.email}</p>
                    </div>
                </div>
            </td>
            <td className="p-4">
                 <select 
                    value={user.role || 'user'} 
                    onChange={(e) => updateUserRole(user.id, e.target.value as 'user' | 'superadmin')}
                    className="bg-editor-bg border border-editor-border rounded-md px-2 py-1 text-sm focus:ring-editor-accent focus:border-editor-accent"
                 >
                    <option value="user">User</option>
                    <option value="superadmin">Super Admin</option>
                 </select>
            </td>
            <td className="p-4 text-sm text-editor-text-secondary">
                {/* Mocked project count for now */}
                {Math.floor(Math.random() * 5)}
            </td>
            <td className="p-4 text-right">
                <button 
                    onClick={() => handleDelete(user.id)}
                    className="p-2 text-editor-text-secondary rounded-full hover:bg-red-500/10 hover:text-red-400 transition-colors"
                >
                    <Trash2 size={18} />
                </button>
            </td>
        </tr>
    );

    const UserCard: React.FC<{ user: UserDocument }> = ({ user }) => (
        <div className="bg-editor-panel-bg p-4 rounded-lg border border-editor-border">
            <div className="flex items-center space-x-3 mb-4">
                <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.name}&background=3f3f46&color=e4e4e7`} alt={user.name} className="w-12 h-12 rounded-full object-cover" />
                <div>
                    <p className="font-semibold text-editor-text-primary">{user.name}</p>
                    <p className="text-xs text-editor-text-secondary">{user.email}</p>
                </div>
            </div>
            <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-editor-text-secondary">Role</span>
                    <select 
                        value={user.role || 'user'} 
                        onChange={(e) => updateUserRole(user.id, e.target.value as 'user' | 'superadmin')}
                        className="bg-editor-bg border border-editor-border rounded-md px-2 py-1 text-sm focus:ring-editor-accent focus:border-editor-accent"
                    >
                        <option value="user">User</option>
                        <option value="superadmin">Super Admin</option>
                    </select>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-editor-text-secondary">Projects</span>
                    <span className="font-semibold">{Math.floor(Math.random() * 5)}</span>
                </div>
            </div>
            <div className="mt-4 border-t border-editor-border pt-3 flex justify-end">
                 <button 
                    onClick={() => handleDelete(user.id)}
                    className="flex items-center text-sm text-red-400 hover:text-red-500"
                >
                    <Trash2 size={16} className="mr-2" />
                    Delete User
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-editor-bg text-editor-text-primary">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-[65px] bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                    <div className="flex items-center">
                         <button 
                            onClick={onBack}
                            className="p-2 text-editor-text-secondary hover:text-editor-text-primary md:hidden mr-2"
                            title="Back to Admin"
                        >
                            <ArrowLeft />
                        </button>
                        <div className="flex items-center space-x-2">
                             <Users className="text-editor-accent" />
                             <h1 className="text-xl font-bold text-editor-text-primary">Tenant Management</h1>
                        </div>
                    </div>
                     <button 
                        onClick={onBack}
                        className="hidden md:flex items-center text-sm font-semibold py-2 px-4 rounded-lg bg-editor-border text-editor-text-secondary hover:bg-editor-accent hover:text-editor-bg transition-colors"
                    >
                        <ArrowLeft size={16} className="mr-1.5" />
                        Back to Admin
                    </button>
                </header>

                <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
                     {/* Mobile & Tablet View */}
                    <div className="lg:hidden space-y-4">
                        {loading ? (
                            <p className="text-center py-8 text-editor-text-secondary">Loading users...</p>
                        ) : (
                            allUsers.map(user => <UserCard key={user.id} user={user} />)
                        )}
                    </div>
                
                    {/* Desktop View */}
                    <div className="hidden lg:block bg-editor-panel-bg border border-editor-border rounded-lg overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-editor-panel-bg/50">
                                <tr className="border-b border-editor-border">
                                    <th className="p-4 text-sm font-semibold text-editor-text-secondary">User</th>
                                    <th className="p-4 text-sm font-semibold text-editor-text-secondary">Role</th>
                                    <th className="p-4 text-sm font-semibold text-editor-text-secondary">Projects</th>
                                    <th className="p-4"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="text-center p-8 text-editor-text-secondary">
                                            Loading users...
                                        </td>
                                    </tr>
                                ) : (
                                    allUsers.map(user => <UserRow key={user.id} user={user} />)
                                )}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default TenantManagement;