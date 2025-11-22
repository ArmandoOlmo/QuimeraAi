import React, { useState, useMemo } from 'react';
import { useEditor } from '../../../contexts/EditorContext';
import { ABTestConfig } from '../../../types';
import { Play, Pause, TrendingUp, Users, Target, Plus, X, Eye, BarChart3 } from 'lucide-react';

const ABTestingDashboard: React.FC = () => {
    const { projects } = useEditor();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedTest, setSelectedTest] = useState<ABTestConfig | null>(null);
    const [newTest, setNewTest] = useState<Partial<ABTestConfig>>({
        name: '',
        description: '',
        variants: [
            { name: 'Control', config: {}, weight: 50 },
            { name: 'Variant A', config: {}, weight: 50 }
        ],
        goals: [],
        isActive: false,
    });

    // Collect all A/B tests from all projects
    const allTests = useMemo(() => {
        const tests: (ABTestConfig & { projectId: string; projectName: string })[] = [];
        projects.forEach(project => {
            if (project.abTests) {
                project.abTests.forEach(test => {
                    tests.push({
                        ...test,
                        projectId: project.id,
                        projectName: project.name
                    });
                });
            }
        });
        return tests;
    }, [projects]);

    const activeTests = allTests.filter(t => t.isActive);
    const pausedTests = allTests.filter(t => !t.isActive);

    const handleCreateTest = () => {
        // In a real application, this would save to Firebase
        console.log('Creating A/B test:', newTest);
        alert('A/B Test created successfully!');
        setShowCreateModal(false);
        setNewTest({
            name: '',
            description: '',
            variants: [
                { name: 'Control', config: {}, weight: 50 },
                { name: 'Variant A', config: {}, weight: 50 }
            ],
            goals: [],
            isActive: false,
        });
    };

    const handleToggleTest = (test: ABTestConfig & { projectId: string }) => {
        // In a real application, this would update in Firebase
        console.log(`Toggling test ${test.name}:`, !test.isActive);
        alert(`Test ${test.isActive ? 'paused' : 'resumed'}!`);
    };

    const addVariant = () => {
        if (newTest.variants && newTest.variants.length < 10) {
            setNewTest({
                ...newTest,
                variants: [
                    ...newTest.variants,
                    { name: `Variant ${String.fromCharCode(65 + newTest.variants.length - 1)}`, config: {}, weight: 0 }
                ]
            });
        }
    };

    const removeVariant = (index: number) => {
        if (newTest.variants && newTest.variants.length > 2) {
            const variants = [...newTest.variants];
            variants.splice(index, 1);
            setNewTest({ ...newTest, variants });
        }
    };

    const updateVariantWeight = (index: number, weight: number) => {
        if (newTest.variants) {
            const variants = [...newTest.variants];
            variants[index] = { ...variants[index], weight };
            setNewTest({ ...newTest, variants });
        }
    };

    const calculateMetrics = (test: ABTestConfig) => {
        // Placeholder metrics - in a real app, these would come from analytics
        return {
            impressions: Math.floor(Math.random() * 10000),
            conversions: Math.floor(Math.random() * 500),
            conversionRate: (Math.random() * 10).toFixed(2)
        };
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-editor-text-primary mb-2">A/B Testing Dashboard</h2>
                    <p className="text-editor-text-secondary">Create and monitor A/B experiments across your projects</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-editor-accent text-editor-bg font-bold rounded-lg hover:bg-opacity-90 transition-all flex items-center gap-2"
                >
                    <Plus size={20} />
                    New Experiment
                </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-editor-panel-bg border border-editor-border rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                            <Play size={20} className="text-green-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-editor-text-primary">{activeTests.length}</div>
                            <div className="text-sm text-editor-text-secondary">Active Tests</div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-editor-panel-bg border border-editor-border rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-yellow-500/20 rounded-lg">
                            <Pause size={20} className="text-yellow-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-editor-text-primary">{pausedTests.length}</div>
                            <div className="text-sm text-editor-text-secondary">Paused Tests</div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-editor-panel-bg border border-editor-border rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <TrendingUp size={20} className="text-blue-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-editor-text-primary">{allTests.length}</div>
                            <div className="text-sm text-editor-text-secondary">Total Tests</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Active Tests */}
            {activeTests.length > 0 && (
                <div>
                    <h3 className="text-xl font-bold text-editor-text-primary mb-4">Active Experiments</h3>
                    <div className="space-y-4">
                        {activeTests.map((test) => {
                            const metrics = calculateMetrics(test);
                            return (
                                <div
                                    key={test.id}
                                    className="bg-editor-panel-bg border border-editor-border rounded-lg p-6 space-y-4"
                                >
                                    {/* Test Header */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h4 className="text-lg font-bold text-editor-text-primary">{test.name}</h4>
                                                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded">
                                                    ACTIVE
                                                </span>
                                            </div>
                                            <p className="text-sm text-editor-text-secondary mb-2">{test.description}</p>
                                            <div className="text-xs text-editor-text-secondary">
                                                Project: {test.projectName}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setSelectedTest(test)}
                                                className="p-2 bg-editor-bg hover:bg-editor-border rounded-md transition-colors"
                                                title="View Details"
                                            >
                                                <Eye size={20} className="text-editor-accent" />
                                            </button>
                                            <button
                                                onClick={() => handleToggleTest(test)}
                                                className="p-2 bg-editor-bg hover:bg-editor-border rounded-md transition-colors"
                                                title="Pause Test"
                                            >
                                                <Pause size={20} className="text-yellow-400" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Metrics */}
                                    <div className="grid grid-cols-3 gap-4 p-4 bg-editor-bg rounded-lg">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Users size={16} className="text-editor-accent" />
                                                <span className="text-xs text-editor-text-secondary">Impressions</span>
                                            </div>
                                            <div className="text-xl font-bold text-editor-text-primary">
                                                {metrics.impressions.toLocaleString()}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Target size={16} className="text-green-400" />
                                                <span className="text-xs text-editor-text-secondary">Conversions</span>
                                            </div>
                                            <div className="text-xl font-bold text-editor-text-primary">
                                                {metrics.conversions.toLocaleString()}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <TrendingUp size={16} className="text-blue-400" />
                                                <span className="text-xs text-editor-text-secondary">Conv. Rate</span>
                                            </div>
                                            <div className="text-xl font-bold text-editor-text-primary">
                                                {metrics.conversionRate}%
                                            </div>
                                        </div>
                                    </div>

                                    {/* Variants */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {test.variants.map((variant, idx) => {
                                            const variantMetrics = calculateMetrics(test);
                                            return (
                                                <div
                                                    key={idx}
                                                    className="p-3 bg-editor-bg border border-editor-border rounded-lg"
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-medium text-editor-text-primary">{variant.name}</span>
                                                        <span className="text-xs text-editor-text-secondary">{variant.weight}%</span>
                                                    </div>
                                                    <div className="text-sm text-editor-text-secondary">
                                                        CR: {variantMetrics.conversionRate}%
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Paused Tests */}
            {pausedTests.length > 0 && (
                <div>
                    <h3 className="text-xl font-bold text-editor-text-primary mb-4">Paused Experiments</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pausedTests.map((test) => (
                            <div
                                key={test.id}
                                className="bg-editor-panel-bg border border-editor-border rounded-lg p-4"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h4 className="font-bold text-editor-text-primary mb-1">{test.name}</h4>
                                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded">
                                            PAUSED
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleToggleTest(test)}
                                        className="p-2 bg-editor-bg hover:bg-editor-border rounded-md transition-colors"
                                        title="Resume Test"
                                    >
                                        <Play size={16} className="text-green-400" />
                                    </button>
                                </div>
                                <p className="text-sm text-editor-text-secondary mb-2">{test.description}</p>
                                <div className="text-xs text-editor-text-secondary">
                                    {test.variants.length} variants • {test.projectName}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {allTests.length === 0 && (
                <div className="text-center py-16">
                    <BarChart3 size={64} className="mx-auto text-editor-text-secondary opacity-50 mb-4" />
                    <h3 className="text-xl font-bold text-editor-text-primary mb-2">No A/B Tests Yet</h3>
                    <p className="text-editor-text-secondary mb-4">
                        Create your first experiment to start optimizing your projects
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-2 bg-editor-accent text-editor-bg font-bold rounded-lg hover:bg-opacity-90 transition-all"
                    >
                        Create First Test
                    </button>
                </div>
            )}

            {/* Create Test Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-editor-panel-bg border border-editor-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-editor-panel-bg border-b border-editor-border p-6 flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-editor-text-primary">Create A/B Test</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-6">
                            {/* Test Info */}
                            <div>
                                <label className="block text-sm font-medium text-editor-text-secondary mb-2">
                                    Test Name *
                                </label>
                                <input
                                    type="text"
                                    value={newTest.name}
                                    onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                                    placeholder="e.g., Hero CTA Button Color Test"
                                    className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary placeholder-editor-text-secondary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-editor-text-secondary mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={newTest.description}
                                    onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
                                    placeholder="Describe the purpose and hypothesis of this test..."
                                    className="w-full h-24 px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary placeholder-editor-text-secondary focus:outline-none focus:ring-2 focus:ring-editor-accent resize-none"
                                />
                            </div>

                            {/* Variants */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-medium text-editor-text-secondary">
                                        Variants *
                                    </label>
                                    <button
                                        onClick={addVariant}
                                        className="px-3 py-1 bg-editor-accent text-editor-bg text-sm font-bold rounded hover:bg-opacity-90 transition-all flex items-center gap-1"
                                        disabled={newTest.variants && newTest.variants.length >= 10}
                                    >
                                        <Plus size={16} />
                                        Add Variant
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {newTest.variants?.map((variant, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-3 p-3 bg-editor-bg border border-editor-border rounded-lg"
                                        >
                                            <input
                                                type="text"
                                                value={variant.name}
                                                onChange={(e) => {
                                                    const variants = [...(newTest.variants || [])];
                                                    variants[idx] = { ...variants[idx], name: e.target.value };
                                                    setNewTest({ ...newTest, variants });
                                                }}
                                                className="flex-1 px-3 py-2 bg-editor-panel-bg border border-editor-border rounded text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                                placeholder="Variant name"
                                            />
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={variant.weight}
                                                    onChange={(e) => updateVariantWeight(idx, parseInt(e.target.value) || 0)}
                                                    className="w-20 px-3 py-2 bg-editor-panel-bg border border-editor-border rounded text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                                />
                                                <span className="text-editor-text-secondary">%</span>
                                            </div>
                                            {newTest.variants && newTest.variants.length > 2 && (
                                                <button
                                                    onClick={() => removeVariant(idx)}
                                                    className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                >
                                                    <X size={20} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-2 text-xs text-editor-text-secondary">
                                    Total weight: {newTest.variants?.reduce((sum, v) => sum + v.weight, 0)}% (should equal 100%)
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="sticky bottom-0 bg-editor-panel-bg border-t border-editor-border p-6 flex items-center justify-between">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateTest}
                                disabled={!newTest.name || (newTest.variants?.reduce((sum, v) => sum + v.weight, 0) !== 100)}
                                className="px-6 py-2 bg-editor-accent text-editor-bg font-bold rounded-lg hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Create Test
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ABTestingDashboard;

