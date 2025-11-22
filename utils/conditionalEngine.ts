import { Condition, ConditionalRule, ConditionOperator, ConditionTarget } from '../types';

/**
 * Conditional Engine
 * Evaluates conditional rules based on user context and conditions
 */

interface EvaluationContext {
    userRole?: string;
    deviceType?: 'mobile' | 'tablet' | 'desktop';
    screenSize?: { width: number; height: number };
    timeOfDay?: number; // 0-23
    location?: string;
    customFields?: Record<string, any>;
}

/**
 * Evaluate a single condition
 */
export function evaluateCondition(condition: Condition, context: EvaluationContext): boolean {
    const contextValue = getContextValue(condition.target, context);
    
    switch (condition.operator) {
        case 'equals':
            return contextValue === condition.value;
        
        case 'notEquals':
            return contextValue !== condition.value;
        
        case 'contains':
            if (typeof contextValue === 'string' && typeof condition.value === 'string') {
                return contextValue.includes(condition.value);
            }
            if (Array.isArray(contextValue)) {
                return contextValue.includes(condition.value);
            }
            return false;
        
        case 'greaterThan':
            if (typeof contextValue === 'number' && typeof condition.value === 'number') {
                return contextValue > condition.value;
            }
            return false;
        
        case 'lessThan':
            if (typeof contextValue === 'number' && typeof condition.value === 'number') {
                return contextValue < condition.value;
            }
            return false;
        
        case 'exists':
            return contextValue !== undefined && contextValue !== null;
        
        case 'notExists':
            return contextValue === undefined || contextValue === null;
        
        default:
            console.warn(`Unknown operator: ${condition.operator}`);
            return false;
    }
}

/**
 * Get the value from context based on target
 */
function getContextValue(target: ConditionTarget, context: EvaluationContext): any {
    switch (target) {
        case 'userRole':
            return context.userRole;
        
        case 'deviceType':
            return context.deviceType;
        
        case 'screenSize':
            return context.screenSize?.width;
        
        case 'timeOfDay':
            return context.timeOfDay;
        
        case 'location':
            return context.location;
        
        case 'customField':
            return context.customFields;
        
        default:
            return undefined;
    }
}

/**
 * Evaluate a conditional rule
 */
export function evaluateRule(rule: ConditionalRule, context: EvaluationContext): boolean {
    if (!rule.conditions || rule.conditions.length === 0) {
        return true; // No conditions means always true
    }

    const results = rule.conditions.map(condition => evaluateCondition(condition, context));

    if (rule.matchType === 'all') {
        return results.every(result => result);
    } else { // 'any'
        return results.some(result => result);
    }
}

/**
 * Get the actions to apply based on rule evaluation
 */
export function getRuleActions(rule: ConditionalRule, context: EvaluationContext) {
    const shouldApply = evaluateRule(rule, context);
    
    if (shouldApply) {
        return rule.actions;
    }
    
    return null;
}

/**
 * Filter rules that should be applied
 */
export function getActiveRules(rules: ConditionalRule[], context: EvaluationContext): ConditionalRule[] {
    return rules.filter(rule => evaluateRule(rule, context));
}

/**
 * Get current evaluation context from browser
 */
export function getCurrentContext(): EvaluationContext {
    const now = new Date();
    
    return {
        deviceType: getDeviceType(),
        screenSize: {
            width: window.innerWidth,
            height: window.innerHeight
        },
        timeOfDay: now.getHours(),
        // location and userRole should be provided by the application
    };
}

/**
 * Detect device type based on screen size
 */
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    
    if (width < 768) {
        return 'mobile';
    } else if (width < 1024) {
        return 'tablet';
    } else {
        return 'desktop';
    }
}

/**
 * Apply conditional styles to a component
 */
export function applyConditionalStyles(
    baseStyles: any,
    rules: ConditionalRule[],
    context: EvaluationContext
): any {
    const activeRules = getActiveRules(rules, context);
    
    let mergedStyles = { ...baseStyles };
    
    for (const rule of activeRules) {
        if (rule.actions.applyStyles) {
            mergedStyles = {
                ...mergedStyles,
                ...rule.actions.applyStyles
            };
        }
    }
    
    return mergedStyles;
}

/**
 * Check if a component should be shown based on rules
 */
export function shouldShowComponent(
    rules: ConditionalRule[],
    context: EvaluationContext,
    defaultShow: boolean = true
): boolean {
    const activeRules = getActiveRules(rules, context);
    
    // If any rule explicitly sets show to false, hide the component
    for (const rule of activeRules) {
        if (rule.actions.show === false) {
            return false;
        }
    }
    
    // If any rule explicitly sets show to true, show the component
    for (const rule of activeRules) {
        if (rule.actions.show === true) {
            return true;
        }
    }
    
    return defaultShow;
}

