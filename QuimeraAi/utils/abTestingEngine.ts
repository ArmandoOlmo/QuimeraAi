import { ABTestExperiment, ExperimentVariant, ExperimentMetrics } from '../types';

/**
 * A/B Testing Engine
 * Handles variant selection, metric tracking, and experiment analysis
 */

interface VariantAssignment {
    experimentId: string;
    variantId: string;
    timestamp: number;
}

/**
 * Store for user's variant assignments
 * In production, this would be in localStorage or a cookie
 */
const variantAssignments: Map<string, VariantAssignment> = new Map();

/**
 * Select a variant for a user based on weighted distribution
 */
export function selectVariant(experiment: ABTestExperiment, userId: string): ExperimentVariant {
    // Check if user already has an assignment
    const existingAssignment = variantAssignments.get(`${experiment.id}-${userId}`);
    if (existingAssignment) {
        const variant = experiment.variants.find(v => v.id === existingAssignment.variantId);
        if (variant) return variant;
    }

    // Select variant based on weighted distribution
    const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const variant of experiment.variants) {
        random -= variant.weight;
        if (random <= 0) {
            // Store assignment
            variantAssignments.set(`${experiment.id}-${userId}`, {
                experimentId: experiment.id,
                variantId: variant.id,
                timestamp: Date.now()
            });
            return variant;
        }
    }
    
    // Fallback to first variant
    return experiment.variants[0];
}

/**
 * Track an impression (component view)
 */
export function trackImpression(experimentId: string, variantId: string): void {
    // In production, this would send data to Firebase/analytics
    console.log(`[A/B Test] Impression: ${experimentId} - ${variantId}`);
    
    // Update metrics in memory (in production, update Firebase)
    // This is a placeholder for the actual implementation
}

/**
 * Track an interaction (click, hover, etc.)
 */
export function trackInteraction(experimentId: string, variantId: string): void {
    console.log(`[A/B Test] Interaction: ${experimentId} - ${variantId}`);
}

/**
 * Track a conversion (goal achieved)
 */
export function trackConversion(experimentId: string, variantId: string): void {
    console.log(`[A/B Test] Conversion: ${experimentId} - ${variantId}`);
}

/**
 * Calculate conversion rate
 */
export function calculateConversionRate(metrics: ExperimentMetrics): number {
    if (metrics.impressions === 0) return 0;
    return (metrics.conversions / metrics.impressions) * 100;
}

/**
 * Calculate interaction rate
 */
export function calculateInteractionRate(metrics: ExperimentMetrics): number {
    if (metrics.impressions === 0) return 0;
    return (metrics.interactions / metrics.impressions) * 100;
}

/**
 * Determine winning variant based on conversion rate
 */
export function determineWinner(experiment: ABTestExperiment): string | null {
    if (!experiment.metrics) return null;
    
    let bestVariantId: string | null = null;
    let bestConversionRate = 0;
    
    for (const [variantId, metrics] of Object.entries(experiment.metrics)) {
        const conversionRate = calculateConversionRate(metrics);
        if (conversionRate > bestConversionRate) {
            bestConversionRate = conversionRate;
            bestVariantId = variantId;
        }
    }
    
    return bestVariantId;
}

/**
 * Check if experiment has statistical significance
 * Using simplified chi-square test
 */
export function hasStatisticalSignificance(
    experiment: ABTestExperiment,
    confidenceLevel: number = 0.95
): boolean {
    if (!experiment.metrics || Object.keys(experiment.metrics).length < 2) {
        return false;
    }
    
    // Simplified version - in production use proper statistical analysis
    const metrics = Object.values(experiment.metrics);
    const totalImpressions = metrics.reduce((sum, m) => sum + m.impressions, 0);
    
    // Need minimum sample size
    if (totalImpressions < 100) return false;
    
    // Calculate variance in conversion rates
    const conversionRates = metrics.map(calculateConversionRate);
    const mean = conversionRates.reduce((sum, rate) => sum + rate, 0) / conversionRates.length;
    const variance = conversionRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / conversionRates.length;
    
    // If variance is high enough, we have significance
    return variance > 5; // Threshold can be adjusted
}

/**
 * Get experiment summary
 */
export function getExperimentSummary(experiment: ABTestExperiment) {
    const summary = {
        experimentId: experiment.id,
        name: experiment.name,
        status: experiment.status,
        totalImpressions: 0,
        totalInteractions: 0,
        totalConversions: 0,
        variantPerformance: [] as Array<{
            variantId: string;
            variantName: string;
            impressions: number;
            interactions: number;
            conversions: number;
            conversionRate: number;
            interactionRate: number;
        }>,
        winner: determineWinner(experiment),
        hasSignificance: hasStatisticalSignificance(experiment)
    };
    
    if (experiment.metrics) {
        for (const [variantId, metrics] of Object.entries(experiment.metrics)) {
            const variant = experiment.variants.find(v => v.id === variantId);
            
            summary.totalImpressions += metrics.impressions;
            summary.totalInteractions += metrics.interactions;
            summary.totalConversions += metrics.conversions;
            
            summary.variantPerformance.push({
                variantId,
                variantName: variant?.name || 'Unknown',
                impressions: metrics.impressions,
                interactions: metrics.interactions,
                conversions: metrics.conversions,
                conversionRate: calculateConversionRate(metrics),
                interactionRate: calculateInteractionRate(metrics)
            });
        }
    }
    
    return summary;
}

/**
 * Check if user should see experiment (based on status and dates)
 */
export function shouldShowExperiment(experiment: ABTestExperiment): boolean {
    if (experiment.status !== 'running') return false;
    
    const now = Date.now() / 1000;
    
    if (experiment.startDate && now < experiment.startDate.seconds) {
        return false;
    }
    
    if (experiment.endDate && now > experiment.endDate.seconds) {
        return false;
    }
    
    return true;
}

/**
 * Clear user's variant assignments (for testing)
 */
export function clearAssignments(): void {
    variantAssignments.clear();
}

/**
 * Get user's current assignments
 */
export function getUserAssignments(userId: string): VariantAssignment[] {
    const assignments: VariantAssignment[] = [];
    variantAssignments.forEach((assignment, key) => {
        if (key.includes(userId)) {
            assignments.push(assignment);
        }
    });
    return assignments;
}

/**
 * Calculate confidence interval for conversion rate
 */
export function calculateConfidenceInterval(
    metrics: ExperimentMetrics,
    confidenceLevel: number = 0.95
): { lower: number; upper: number } {
    if (metrics.impressions === 0) {
        return { lower: 0, upper: 0 };
    }
    
    const p = metrics.conversions / metrics.impressions;
    const n = metrics.impressions;
    
    // Z-score for 95% confidence
    const z = confidenceLevel === 0.95 ? 1.96 : 2.58;
    
    const standardError = Math.sqrt((p * (1 - p)) / n);
    const margin = z * standardError;
    
    return {
        lower: Math.max(0, (p - margin) * 100),
        upper: Math.min(100, (p + margin) * 100)
    };
}

