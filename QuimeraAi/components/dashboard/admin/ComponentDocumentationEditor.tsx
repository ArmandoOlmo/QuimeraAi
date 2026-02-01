
import React, { useState } from 'react';
import { CustomComponent, ComponentDocumentation, PropDocumentation } from '../../../types';
import { BookOpen, Plus, Trash2, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ComponentDocumentationEditorProps {
    component: CustomComponent;
    onUpdate: (documentation: ComponentDocumentation) => Promise<void>;
}

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <label className="block text-sm font-medium text-editor-text-secondary mb-1">{children}</label>
);

const ComponentDocumentationEditor: React.FC<ComponentDocumentationEditorProps> = ({ component, onUpdate }) => {
    const [description, setDescription] = useState(component.documentation?.description || '');
    const [usageExamples, setUsageExamples] = useState<string[]>(component.documentation?.usageExamples || []);
    const [properties, setProperties] = useState<PropDocumentation[]>(component.documentation?.properties || []);
    const [changelog, setChangelog] = useState(component.documentation?.changelog || '');
    const [showPreview, setShowPreview] = useState(false);

    const handleSave = async () => {
        const documentation: ComponentDocumentation = {
            description,
            usageExamples,
            properties,
            changelog
        };
        await onUpdate(documentation);
    };

    const addUsageExample = () => {
        setUsageExamples([...usageExamples, '']);
    };

    const updateUsageExample = (index: number, value: string) => {
        const newExamples = [...usageExamples];
        newExamples[index] = value;
        setUsageExamples(newExamples);
    };

    const removeUsageExample = (index: number) => {
        setUsageExamples(usageExamples.filter((_, i) => i !== index));
    };

    const addProperty = () => {
        setProperties([
            ...properties,
            {
                name: '',
                type: 'string',
                description: '',
                required: false
            }
        ]);
    };

    const updateProperty = (index: number, field: keyof PropDocumentation, value: any) => {
        const newProperties = [...properties];
        newProperties[index] = { ...newProperties[index], [field]: value };
        setProperties(newProperties);
    };

    const removeProperty = (index: number) => {
        setProperties(properties.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BookOpen className="text-editor-accent" size={20} />
                    <h4 className="font-semibold text-editor-text-primary">Component Documentation</h4>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowPreview(!showPreview)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            showPreview
                                ? 'bg-editor-accent text-editor-bg'
                                : 'bg-editor-border text-editor-text-primary hover:bg-editor-accent hover:text-editor-bg'
                        }`}
                    >
                        <Eye size={14} className="inline mr-1" />
                        {showPreview ? 'Edit' : 'Preview'}
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-3 py-1.5 bg-editor-accent text-editor-bg text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
                    >
                        Save Documentation
                    </button>
                </div>
            </div>

            {!showPreview ? (
                <>
                    {/* Description */}
                    <div>
                        <Label>Description (Markdown supported)</Label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe what this component does and when to use it..."
                            rows={4}
                            className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-md text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent font-mono text-sm"
                        />
                    </div>

                    {/* Usage Examples */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label>Usage Examples</Label>
                            <button
                                onClick={addUsageExample}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-editor-accent text-editor-bg rounded-md hover:opacity-90"
                            >
                                <Plus size={12} />
                                Add Example
                            </button>
                        </div>
                        <div className="space-y-2">
                            {usageExamples.length === 0 ? (
                                <p className="text-sm text-editor-text-secondary italic">No usage examples yet. Add one above.</p>
                            ) : (
                                usageExamples.map((example, index) => (
                                    <div key={index} className="flex gap-2">
                                        <textarea
                                            value={example}
                                            onChange={(e) => updateUsageExample(index, e.target.value)}
                                            placeholder={`Example ${index + 1}: Show how to use this component...`}
                                            rows={2}
                                            className="flex-1 px-3 py-2 bg-editor-bg border border-editor-border rounded-md text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent font-mono text-sm"
                                        />
                                        <button
                                            onClick={() => removeUsageExample(index)}
                                            className="p-2 text-red-500 hover:bg-red-500 hover:text-white rounded-md transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Properties */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label>Properties / Props</Label>
                            <button
                                onClick={addProperty}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-editor-accent text-editor-bg rounded-md hover:opacity-90"
                            >
                                <Plus size={12} />
                                Add Property
                            </button>
                        </div>
                        <div className="space-y-3">
                            {properties.length === 0 ? (
                                <p className="text-sm text-editor-text-secondary italic">No properties documented yet. Add one above.</p>
                            ) : (
                                properties.map((prop, index) => (
                                    <div key={index} className="border border-editor-border rounded-lg p-3 bg-editor-panel-bg space-y-2">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={prop.name}
                                                onChange={(e) => updateProperty(index, 'name', e.target.value)}
                                                placeholder="Property name"
                                                className="flex-1 px-2 py-1 bg-editor-bg border border-editor-border rounded text-editor-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-editor-accent"
                                            />
                                            <select
                                                value={prop.type}
                                                onChange={(e) => updateProperty(index, 'type', e.target.value)}
                                                className="px-2 py-1 bg-editor-bg border border-editor-border rounded text-editor-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-editor-accent"
                                            >
                                                <option value="string">string</option>
                                                <option value="number">number</option>
                                                <option value="boolean">boolean</option>
                                                <option value="object">object</option>
                                                <option value="array">array</option>
                                                <option value="function">function</option>
                                                <option value="any">any</option>
                                            </select>
                                            <label className="flex items-center gap-1 text-xs text-editor-text-secondary">
                                                <input
                                                    type="checkbox"
                                                    checked={prop.required}
                                                    onChange={(e) => updateProperty(index, 'required', e.target.checked)}
                                                    className="rounded border-editor-border"
                                                />
                                                Required
                                            </label>
                                            <button
                                                onClick={() => removeProperty(index)}
                                                className="p-1 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={prop.description}
                                            onChange={(e) => updateProperty(index, 'description', e.target.value)}
                                            placeholder="Description"
                                            className="w-full px-2 py-1 bg-editor-bg border border-editor-border rounded text-editor-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-editor-accent"
                                        />
                                        <input
                                            type="text"
                                            value={prop.defaultValue || ''}
                                            onChange={(e) => updateProperty(index, 'defaultValue', e.target.value)}
                                            placeholder="Default value (optional)"
                                            className="w-full px-2 py-1 bg-editor-bg border border-editor-border rounded text-editor-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-editor-accent"
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Changelog */}
                    <div>
                        <Label>Changelog (Markdown supported)</Label>
                        <textarea
                            value={changelog}
                            onChange={(e) => setChangelog(e.target.value)}
                            placeholder="## Version 1.0.0 - 2024-01-01&#10;- Initial release&#10;&#10;## Version 1.1.0 - 2024-01-15&#10;- Added new feature"
                            rows={6}
                            className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-md text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent font-mono text-sm"
                        />
                    </div>
                </>
            ) : (
                /* Preview Mode */
                <div className="space-y-6 p-4 bg-editor-panel-bg border border-editor-border rounded-lg">
                    {/* Description Preview */}
                    {description && (
                        <div>
                            <h5 className="text-lg font-semibold text-editor-text-primary mb-2">Description</h5>
                            <div className="prose prose-invert max-w-none text-editor-text-primary">
                                <ReactMarkdown>{description}</ReactMarkdown>
                            </div>
                        </div>
                    )}

                    {/* Usage Examples Preview */}
                    {usageExamples.length > 0 && (
                        <div>
                            <h5 className="text-lg font-semibold text-editor-text-primary mb-2">Usage Examples</h5>
                            <div className="space-y-2">
                                {usageExamples.map((example, index) => (
                                    <div key={index} className="bg-editor-bg p-3 rounded border border-editor-border">
                                        <p className="text-xs text-editor-text-secondary mb-1">Example {index + 1}</p>
                                        <pre className="text-sm text-editor-text-primary font-mono overflow-x-auto">{example}</pre>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Properties Preview */}
                    {properties.length > 0 && (
                        <div>
                            <h5 className="text-lg font-semibold text-editor-text-primary mb-2">Properties</h5>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-editor-bg">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-editor-text-secondary font-semibold">Name</th>
                                            <th className="px-3 py-2 text-left text-editor-text-secondary font-semibold">Type</th>
                                            <th className="px-3 py-2 text-left text-editor-text-secondary font-semibold">Required</th>
                                            <th className="px-3 py-2 text-left text-editor-text-secondary font-semibold">Default</th>
                                            <th className="px-3 py-2 text-left text-editor-text-secondary font-semibold">Description</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {properties.map((prop, index) => (
                                            <tr key={index} className="border-t border-editor-border">
                                                <td className="px-3 py-2 font-mono text-editor-accent">{prop.name || '—'}</td>
                                                <td className="px-3 py-2 font-mono text-editor-text-primary">{prop.type}</td>
                                                <td className="px-3 py-2 text-editor-text-primary">
                                                    {prop.required ? '✓ Yes' : '✗ No'}
                                                </td>
                                                <td className="px-3 py-2 font-mono text-editor-text-secondary text-xs">
                                                    {prop.defaultValue || '—'}
                                                </td>
                                                <td className="px-3 py-2 text-editor-text-primary">{prop.description || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Changelog Preview */}
                    {changelog && (
                        <div>
                            <h5 className="text-lg font-semibold text-editor-text-primary mb-2">Changelog</h5>
                            <div className="prose prose-invert max-w-none text-editor-text-primary">
                                <ReactMarkdown>{changelog}</ReactMarkdown>
                            </div>
                        </div>
                    )}

                    {!description && !usageExamples.length && !properties.length && !changelog && (
                        <p className="text-center text-editor-text-secondary italic">No documentation content yet. Switch to edit mode to add documentation.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default ComponentDocumentationEditor;

