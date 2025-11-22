
import React, { useState } from 'react';
import { CustomComponent, ComponentPermissions } from '../../../types';
import { Shield, Search, X, Check, User } from 'lucide-react';
import { useEditor } from '../../../contexts/EditorContext';

interface ComponentPermissionsEditorProps {
    component: CustomComponent;
    onUpdate: (permissions: ComponentPermissions) => Promise<void>;
}

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <label className="block text-sm font-medium text-editor-text-secondary mb-1">{children}</label>
);

const ComponentPermissionsEditor: React.FC<ComponentPermissionsEditorProps> = ({ component, onUpdate }) => {
    const { allUsers, fetchAllUsers } = useEditor();
    const [searchQuery, setSearchQuery] = useState('');
    const [isPublic, setIsPublic] = useState(component.permissions?.isPublic || false);
    const [canView, setCanView] = useState<string[]>(component.permissions?.canView || []);
    const [canEdit, setCanEdit] = useState<string[]>(component.permissions?.canEdit || []);
    const [showUserSearch, setShowUserSearch] = useState(false);

    React.useEffect(() => {
        fetchAllUsers();
    }, []);

    const handleSave = async () => {
        const permissions: ComponentPermissions = {
            isPublic,
            canView,
            canEdit,
            creator: component.createdBy || ''
        };
        await onUpdate(permissions);
    };

    const togglePublic = async () => {
        const newIsPublic = !isPublic;
        setIsPublic(newIsPublic);
        const permissions: ComponentPermissions = {
            isPublic: newIsPublic,
            canView,
            canEdit,
            creator: component.createdBy || ''
        };
        await onUpdate(permissions);
    };

    const addUserPermission = (userId: string, level: 'view' | 'edit') => {
        if (level === 'view' && !canView.includes(userId)) {
            const newCanView = [...canView, userId];
            setCanView(newCanView);
        } else if (level === 'edit') {
            if (!canEdit.includes(userId)) {
                setCanEdit([...canEdit, userId]);
            }
            // Also add to canView if not already there
            if (!canView.includes(userId)) {
                setCanView([...canView, userId]);
            }
        }
        setShowUserSearch(false);
        handleSave();
    };

    const removeUserPermission = (userId: string, level: 'view' | 'edit') => {
        if (level === 'view') {
            setCanView(canView.filter(id => id !== userId));
            // Also remove from canEdit if present
            setCanEdit(canEdit.filter(id => id !== userId));
        } else if (level === 'edit') {
            setCanEdit(canEdit.filter(id => id !== userId));
        }
        handleSave();
    };

    const upgradeToEdit = (userId: string) => {
        if (!canEdit.includes(userId)) {
            setCanEdit([...canEdit, userId]);
            handleSave();
        }
    };

    const filteredUsers = allUsers.filter(user => 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.name?.toLowerCase().includes(searchQuery.toLowerCase())
    ).filter(user => !canView.includes(user.uid)); // Don't show users who already have permissions

    const getUserById = (userId: string) => allUsers.find(u => u.uid === userId);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
                <Shield className="text-editor-accent" size={20} />
                <h4 className="font-semibold text-editor-text-primary">Component Permissions</h4>
            </div>

            {/* Public Component Toggle */}
            <div className="border border-editor-border rounded-lg p-4 bg-editor-panel-bg">
                <div className="flex items-center justify-between">
                    <div>
                        <Label>Public Component</Label>
                        <p className="text-xs text-editor-text-secondary">
                            Anyone can view and use this component
                        </p>
                    </div>
                    <button
                        onClick={togglePublic}
                        className={`${isPublic ? 'bg-editor-accent' : 'bg-editor-border'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-editor-accent focus:ring-offset-2 focus:ring-offset-editor-panel-bg`}
                    >
                        <span
                            className={`${isPublic ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                        />
                    </button>
                </div>
            </div>

            {/* User Permissions List */}
            {!isPublic && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label>User Permissions</Label>
                        <button
                            onClick={() => setShowUserSearch(!showUserSearch)}
                            className="px-3 py-1.5 bg-editor-accent text-editor-bg text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
                        >
                            Add User
                        </button>
                    </div>

                    {/* User Search */}
                    {showUserSearch && (
                        <div className="border border-editor-border rounded-lg p-4 bg-editor-bg">
                            <div className="relative mb-3">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-editor-text-secondary" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search users by email or name..."
                                    className="w-full pl-10 pr-3 py-2 bg-editor-panel-bg border border-editor-border rounded-md text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                />
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-2">
                                {filteredUsers.length === 0 ? (
                                    <p className="text-sm text-editor-text-secondary text-center py-4">
                                        No users found
                                    </p>
                                ) : (
                                    filteredUsers.map(user => (
                                        <div key={user.uid} className="flex items-center justify-between p-2 rounded hover:bg-editor-panel-bg">
                                            <div className="flex items-center gap-2">
                                                <User size={16} className="text-editor-text-secondary" />
                                                <div>
                                                    <p className="text-sm text-editor-text-primary">{user.email}</p>
                                                    {user.name && <p className="text-xs text-editor-text-secondary">{user.name}</p>}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => addUserPermission(user.uid, 'view')}
                                                    className="px-2 py-1 text-xs bg-editor-border text-editor-text-primary rounded hover:bg-editor-accent hover:text-editor-bg transition-colors"
                                                >
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => addUserPermission(user.uid, 'edit')}
                                                    className="px-2 py-1 text-xs bg-editor-accent text-editor-bg rounded hover:opacity-90 transition-opacity"
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Current Permissions */}
                    <div className="border border-editor-border rounded-lg bg-editor-panel-bg divide-y divide-editor-border">
                        {canView.length === 0 ? (
                            <div className="p-4 text-center text-sm text-editor-text-secondary">
                                No users have been granted permissions yet
                            </div>
                        ) : (
                            canView.map(userId => {
                                const user = getUserById(userId);
                                const hasEdit = canEdit.includes(userId);
                                return (
                                    <div key={userId} className="p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <User size={16} className="text-editor-text-secondary" />
                                            <div>
                                                <p className="text-sm text-editor-text-primary">
                                                    {user?.email || 'Unknown user'}
                                                </p>
                                                <p className="text-xs text-editor-text-secondary">
                                                    {hasEdit ? 'Can edit' : 'Can view'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!hasEdit && (
                                                <button
                                                    onClick={() => upgradeToEdit(userId)}
                                                    className="px-2 py-1 text-xs bg-editor-border text-editor-text-primary rounded hover:bg-editor-accent hover:text-editor-bg transition-colors"
                                                >
                                                    Upgrade to Edit
                                                </button>
                                            )}
                                            <button
                                                onClick={() => removeUserPermission(userId, 'view')}
                                                className="p-1 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="p-3 bg-editor-bg border border-editor-border rounded-lg">
                        <p className="text-xs text-editor-text-secondary">
                            <strong>Permission Levels:</strong>
                            <br />
                            <span className="text-editor-accent">View</span>: Can see and use the component in projects
                            <br />
                            <span className="text-editor-accent">Edit</span>: Can modify component styles and settings
                            <br />
                            <span className="text-editor-accent">Admin</span>: Component creator (you) - full control
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComponentPermissionsEditor;

