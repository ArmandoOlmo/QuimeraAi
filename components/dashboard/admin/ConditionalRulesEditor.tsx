
import React, { useState } from 'react';
import { ConditionalRule, Condition, ConditionTarget, ConditionOperator } from '../../../types';
import { Plus, Trash2, Zap, Eye, EyeOff } from 'lucide-react';

interface ConditionalRulesEditorProps {
    rules: ConditionalRule[];
    onUpdate: (rules: ConditionalRule[]) => Promise<void>;
}

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <label className="block text-sm font-medium text-editor-text-secondary mb-1">{children}</label>
);

const conditionTargets: { value: ConditionTarget; label: string }[] = [
    { value: 'userRole', label: 'User Role' },
    { value: 'deviceType', label: 'Device Type' },
    { value: 'screenSize', label: 'Screen Size' },
    { value: 'timeOfDay', label: 'Time of Day' },
    { value: 'location', label: 'Location' },
    { value: 'customField', label: 'Custom Field' }
];

const conditionOperators: { value: ConditionOperator; label: string }[] = [
    { value: 'equals', label: 'Equals' },
    { value: 'notEquals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'greaterThan', label: 'Greater Than' },
    { value: 'lessThan', label: 'Less Than' },
    { value: 'exists', label: 'Exists' },
    { value: 'notExists', label: 'Does Not Exist' }
];

const ConditionalRulesEditor: React.FC<ConditionalRulesEditorProps> = ({ rules, onUpdate }) => {
    const [localRules, setLocalRules] = useState<ConditionalRule[]>(rules);
    const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

    const addNewRule = () => {
        const newRule: ConditionalRule = {
            id: `rule-${Date.now()}`,
            name: `Rule ${localRules.length + 1}`,
            conditions: [],
            matchType: 'all',
            actions: {
                show: true
            }
        };
        setLocalRules([...localRules, newRule]);
        setExpandedRules(new Set([...expandedRules, newRule.id]));
    };

    const deleteRule = (ruleId: string) => {
        const updated = localRules.filter(r => r.id !== ruleId);
        setLocalRules(updated);
        onUpdate(updated);
    };

    const updateRule = (ruleId: string, updates: Partial<ConditionalRule>) => {
        const updated = localRules.map(r => r.id === ruleId ? { ...r, ...updates } : r);
        setLocalRules(updated);
    };

    const addCondition = (ruleId: string) => {
        const newCondition: Condition = {
            id: `condition-${Date.now()}`,
            target: 'userRole',
            operator: 'equals',
            value: ''
        };
        
        const updated = localRules.map(r => 
            r.id === ruleId 
                ? { ...r, conditions: [...r.conditions, newCondition] }
                : r
        );
        setLocalRules(updated);
    };

    const updateCondition = (ruleId: string, conditionId: string, updates: Partial<Condition>) => {
        const updated = localRules.map(r => 
            r.id === ruleId
                ? {
                    ...r,
                    conditions: r.conditions.map(c => 
                        c.id === conditionId ? { ...c, ...updates } : c
                    )
                }
                : r
        );
        setLocalRules(updated);
    };

    const deleteCondition = (ruleId: string, conditionId: string) => {
        const updated = localRules.map(r => 
            r.id === ruleId
                ? { ...r, conditions: r.conditions.filter(c => c.id !== conditionId) }
                : r
        );
        setLocalRules(updated);
    };

    const toggleRuleExpanded = (ruleId: string) => {
        const newExpanded = new Set(expandedRules);
        if (newExpanded.has(ruleId)) {
            newExpanded.delete(ruleId);
        } else {
            newExpanded.add(ruleId);
        }
        setExpandedRules(newExpanded);
    };

    const handleSave = async () => {
        await onUpdate(localRules);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Zap className="text-editor-accent" size={20} />
                    <h4 className="font-semibold text-editor-text-primary">Conditional Rules</h4>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={addNewRule}
                        className="flex items-center gap-2 px-3 py-1.5 bg-editor-border text-editor-text-primary text-sm font-medium rounded-md hover:bg-editor-accent hover:text-editor-bg transition-colors"
                    >
                        <Plus size={14} />
                        Add Rule
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-3 py-1.5 bg-editor-accent text-editor-bg text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
                    >
                        Save Rules
                    </button>
                </div>
            </div>

            <p className="text-sm text-editor-text-secondary">
                Create conditional rules to dynamically show/hide components or apply styles based on user context.
            </p>

            {/* Rules List */}
            <div className="space-y-3">
                {localRules.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-editor-border rounded-lg">
                        <Zap size={48} className="mx-auto text-editor-text-secondary mb-3" />
                        <p className="text-editor-text-secondary mb-2">No conditional rules yet</p>
                        <button
                            onClick={addNewRule}
                            className="text-editor-accent hover:underline text-sm font-medium"
                        >
                            Create your first rule
                        </button>
                    </div>
                ) : (
                    localRules.map((rule) => {
                        const isExpanded = expandedRules.has(rule.id);
                        return (
                            <div key={rule.id} className="border border-editor-border rounded-lg bg-editor-panel-bg overflow-hidden">
                                {/* Rule Header */}
                                <div className="p-4 flex items-center justify-between bg-editor-bg border-b border-editor-border">
                                    <button
                                        onClick={() => toggleRuleExpanded(rule.id)}
                                        className="flex-1 flex items-center gap-3 text-left"
                                    >
                                        <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={rule.name}
                                                onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                                                onClick={(e) => e.stopPropagation()}
                                                className="font-semibold text-editor-text-primary bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-editor-accent rounded px-1"
                                            />
                                            <p className="text-xs text-editor-text-secondary mt-0.5">
                                                {rule.conditions.length} condition{rule.conditions.length !== 1 ? 's' : ''} • Match {rule.matchType}
                                            </p>
                                        </div>
                                    </button>
                                    <div className="flex items-center gap-2">
                                        {rule.actions.show !== undefined && (
                                            <span className="px-2 py-1 text-xs rounded-full bg-editor-border text-editor-text-secondary">
                                                {rule.actions.show ? <Eye size={12} className="inline" /> : <EyeOff size={12} className="inline" />}
                                            </span>
                                        )}
                                        <button
                                            onClick={() => deleteRule(rule.id)}
                                            className="p-1.5 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Rule Content */}
                                {isExpanded && (
                                    <div className="p-4 space-y-4">
                                        {/* Match Type */}
                                        <div>
                                            <Label>Match Type</Label>
                                            <select
                                                value={rule.matchType}
                                                onChange={(e) => updateRule(rule.id, { matchType: e.target.value as 'all' | 'any' })}
                                                className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-md text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                            >
                                                <option value="all">All conditions must match (AND)</option>
                                                <option value="any">Any condition can match (OR)</option>
                                            </select>
                                        </div>

                                        {/* Conditions */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <Label>Conditions</Label>
                                                <button
                                                    onClick={() => addCondition(rule.id)}
                                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-editor-accent text-editor-bg rounded-md hover:opacity-90"
                                                >
                                                    <Plus size={12} />
                                                    Add Condition
                                                </button>
                                            </div>

                                            <div className="space-y-2">
                                                {rule.conditions.length === 0 ? (
                                                    <p className="text-sm text-editor-text-secondary italic">
                                                        No conditions yet. Add one above.
                                                    </p>
                                                ) : (
                                                    rule.conditions.map((condition, index) => (
                                                        <div key={condition.id} className="flex gap-2 items-start p-3 bg-editor-bg rounded-md border border-editor-border">
                                                            <div className="flex-1 grid grid-cols-3 gap-2">
                                                                {/* Target */}
                                                                <select
                                                                    value={condition.target}
                                                                    onChange={(e) => updateCondition(rule.id, condition.id, { target: e.target.value as ConditionTarget })}
                                                                    className="px-2 py-1.5 bg-editor-panel-bg border border-editor-border rounded text-editor-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-editor-accent"
                                                                >
                                                                    {conditionTargets.map(t => (
                                                                        <option key={t.value} value={t.value}>{t.label}</option>
                                                                    ))}
                                                                </select>

                                                                {/* Operator */}
                                                                <select
                                                                    value={condition.operator}
                                                                    onChange={(e) => updateCondition(rule.id, condition.id, { operator: e.target.value as ConditionOperator })}
                                                                    className="px-2 py-1.5 bg-editor-panel-bg border border-editor-border rounded text-editor-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-editor-accent"
                                                                >
                                                                    {conditionOperators.map(o => (
                                                                        <option key={o.value} value={o.value}>{o.label}</option>
                                                                    ))}
                                                                </select>

                                                                {/* Value */}
                                                                <input
                                                                    type="text"
                                                                    value={condition.value}
                                                                    onChange={(e) => updateCondition(rule.id, condition.id, { value: e.target.value })}
                                                                    placeholder="Value"
                                                                    className="px-2 py-1.5 bg-editor-panel-bg border border-editor-border rounded text-editor-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-editor-accent"
                                                                />
                                                            </div>
                                                            <button
                                                                onClick={() => deleteCondition(rule.id, condition.id)}
                                                                className="p-1.5 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div>
                                            <Label>Actions</Label>
                                            <div className="space-y-2">
                                                {/* Show/Hide */}
                                                <div className="flex items-center justify-between p-3 bg-editor-bg rounded-md border border-editor-border">
                                                    <span className="text-sm text-editor-text-primary">Component Visibility</span>
                                                    <select
                                                        value={rule.actions.show === true ? 'show' : rule.actions.show === false ? 'hide' : 'none'}
                                                        onChange={(e) => {
                                                            const show = e.target.value === 'show' ? true : e.target.value === 'hide' ? false : undefined;
                                                            updateRule(rule.id, { actions: { ...rule.actions, show } });
                                                        }}
                                                        className="px-3 py-1.5 bg-editor-panel-bg border border-editor-border rounded text-editor-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-editor-accent"
                                                    >
                                                        <option value="none">No change</option>
                                                        <option value="show">Show component</option>
                                                        <option value="hide">Hide component</option>
                                                    </select>
                                                </div>

                                                {/* Redirect */}
                                                <div className="flex items-center gap-2 p-3 bg-editor-bg rounded-md border border-editor-border">
                                                    <span className="text-sm text-editor-text-primary">Redirect to:</span>
                                                    <input
                                                        type="text"
                                                        value={rule.actions.redirect || ''}
                                                        onChange={(e) => updateRule(rule.id, { actions: { ...rule.actions, redirect: e.target.value || undefined } })}
                                                        placeholder="/path or URL"
                                                        className="flex-1 px-2 py-1.5 bg-editor-panel-bg border border-editor-border rounded text-editor-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-editor-accent"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Help Text */}
            <div className="p-3 bg-editor-bg border border-editor-border rounded-lg">
                <p className="text-xs text-editor-text-secondary">
                    <strong>💡 Examples:</strong>
                    <br />• Show premium features only to users with role "premium"
                    <br />• Hide mobile menu on desktop devices (screenSize &gt; 1024)
                    <br />• Display different content based on time of day
                    <br />• Redirect users from specific locations to localized pages
                </p>
            </div>
        </div>
    );
};

export default ConditionalRulesEditor;

