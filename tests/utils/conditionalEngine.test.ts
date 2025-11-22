import { describe, it, expect } from 'vitest';
import { 
  evaluateCondition, 
  evaluateRule, 
  shouldShowComponent,
  applyConditionalStyles
} from '../../utils/conditionalEngine';
import { Condition, ConditionalRule } from '../../types';

describe('ConditionalEngine', () => {
  const mockContext = {
    userRole: 'user',
    deviceType: 'desktop' as const,
    screenSize: { width: 1920, height: 1080 },
    timeOfDay: 14,
    location: 'US',
  };

  describe('evaluateCondition', () => {
    it('should evaluate equals operator correctly', () => {
      const condition: Condition = {
        target: 'userRole',
        operator: 'equals',
        value: 'user',
      };

      expect(evaluateCondition(condition, mockContext)).toBe(true);
    });

    it('should evaluate notEquals operator correctly', () => {
      const condition: Condition = {
        target: 'userRole',
        operator: 'notEquals',
        value: 'admin',
      };

      expect(evaluateCondition(condition, mockContext)).toBe(true);
    });

    it('should evaluate contains operator correctly', () => {
      const condition: Condition = {
        target: 'location',
        operator: 'contains',
        value: 'U',
      };

      expect(evaluateCondition(condition, mockContext)).toBe(true);
    });

    it('should evaluate greaterThan operator correctly', () => {
      const condition: Condition = {
        target: 'screenSize',
        operator: 'greaterThan',
        value: 1024,
      };

      expect(evaluateCondition(condition, mockContext)).toBe(true);
    });

    it('should evaluate lessThan operator correctly', () => {
      const condition: Condition = {
        target: 'timeOfDay',
        operator: 'lessThan',
        value: 20,
      };

      expect(evaluateCondition(condition, mockContext)).toBe(true);
    });

    it('should evaluate exists operator correctly', () => {
      const condition: Condition = {
        target: 'userRole',
        operator: 'exists',
        value: null,
      };

      expect(evaluateCondition(condition, mockContext)).toBe(true);
    });

    it('should evaluate notExists operator correctly', () => {
      const condition: Condition = {
        target: 'customField',
        operator: 'notExists',
        value: null,
      };

      expect(evaluateCondition(condition, { ...mockContext, customFields: undefined })).toBe(true);
    });

    it('should return false for unknown operator', () => {
      const condition: Condition = {
        target: 'userRole',
        operator: 'unknown' as any,
        value: 'user',
      };

      expect(evaluateCondition(condition, mockContext)).toBe(false);
    });
  });

  describe('evaluateRule', () => {
    it('should return true when no conditions provided', () => {
      const rule: ConditionalRule = {
        id: 'rule-1',
        name: 'Empty Rule',
        matchType: 'all',
        conditions: [],
        actions: { show: true },
      };

      expect(evaluateRule(rule, mockContext)).toBe(true);
    });

    it('should return true when all conditions pass (matchType: all)', () => {
      const rule: ConditionalRule = {
        id: 'rule-1',
        name: 'All Conditions',
        matchType: 'all',
        conditions: [
          { target: 'userRole', operator: 'equals', value: 'user' },
          { target: 'deviceType', operator: 'equals', value: 'desktop' },
        ],
        actions: { show: true },
      };

      expect(evaluateRule(rule, mockContext)).toBe(true);
    });

    it('should return false when any condition fails (matchType: all)', () => {
      const rule: ConditionalRule = {
        id: 'rule-1',
        name: 'All Conditions',
        matchType: 'all',
        conditions: [
          { target: 'userRole', operator: 'equals', value: 'user' },
          { target: 'deviceType', operator: 'equals', value: 'mobile' },
        ],
        actions: { show: true },
      };

      expect(evaluateRule(rule, mockContext)).toBe(false);
    });

    it('should return true when any condition passes (matchType: any)', () => {
      const rule: ConditionalRule = {
        id: 'rule-1',
        name: 'Any Condition',
        matchType: 'any',
        conditions: [
          { target: 'userRole', operator: 'equals', value: 'admin' },
          { target: 'deviceType', operator: 'equals', value: 'desktop' },
        ],
        actions: { show: true },
      };

      expect(evaluateRule(rule, mockContext)).toBe(true);
    });
  });

  describe('shouldShowComponent', () => {
    it('should return default value when no active rules', () => {
      expect(shouldShowComponent([], mockContext, true)).toBe(true);
      expect(shouldShowComponent([], mockContext, false)).toBe(false);
    });

    it('should hide component when rule sets show to false', () => {
      const rules: ConditionalRule[] = [
        {
          id: 'rule-1',
          name: 'Hide Rule',
          matchType: 'all',
          conditions: [
            { target: 'userRole', operator: 'equals', value: 'user' },
          ],
          actions: { show: false },
        },
      ];

      expect(shouldShowComponent(rules, mockContext)).toBe(false);
    });

    it('should show component when rule sets show to true', () => {
      const rules: ConditionalRule[] = [
        {
          id: 'rule-1',
          name: 'Show Rule',
          matchType: 'all',
          conditions: [
            { target: 'userRole', operator: 'equals', value: 'user' },
          ],
          actions: { show: true },
        },
      ];

      expect(shouldShowComponent(rules, mockContext, false)).toBe(true);
    });
  });

  describe('applyConditionalStyles', () => {
    it('should return base styles when no active rules', () => {
      const baseStyles = { color: 'blue', fontSize: '16px' };
      const result = applyConditionalStyles(baseStyles, [], mockContext);
      
      expect(result).toEqual(baseStyles);
    });

    it('should merge conditional styles with base styles', () => {
      const baseStyles = { color: 'blue', fontSize: '16px' };
      const rules: ConditionalRule[] = [
        {
          id: 'rule-1',
          name: 'Style Rule',
          matchType: 'all',
          conditions: [
            { target: 'userRole', operator: 'equals', value: 'user' },
          ],
          actions: { 
            show: true,
            applyStyles: { color: 'red', fontWeight: 'bold' }
          },
        },
      ];

      const result = applyConditionalStyles(baseStyles, rules, mockContext);
      
      expect(result).toEqual({
        color: 'red',
        fontSize: '16px',
        fontWeight: 'bold',
      });
    });
  });
});
