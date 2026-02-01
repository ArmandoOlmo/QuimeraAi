import { BillingData } from '../types';

// Cloud Function URL for billing metrics
const BILLING_API_URL = 'https://us-central1-quimeraai.cloudfunctions.net/getBillingMetrics';

// Mock data as fallback
const MOCK_DATA: BillingData = {
  mrr: 0,
  activeSubscriptions: 0,
  arpu: 0,
  churnRate: 0,
  revenueTrend: [
    { month: 'Jan', revenue: 0 },
    { month: 'Feb', revenue: 0 },
    { month: 'Mar', revenue: 0 },
    { month: 'Apr', revenue: 0 },
    { month: 'May', revenue: 0 },
    { month: 'Jun', revenue: 0 },
    { month: 'Jul', revenue: 0 },
    { month: 'Aug', revenue: 0 },
    { month: 'Sep', revenue: 0 },
    { month: 'Oct', revenue: 0 },
    { month: 'Nov', revenue: 0 },
    { month: 'Dec', revenue: 0 },
  ],
  planDistribution: [],
  serviceModules: [
    { id: 'module_builder', name: 'AI Website Builder', description: 'Core website creation and hosting.' },
    { id: 'module_analytics', name: 'Advanced Analytics', description: 'In-depth visitor analytics and reporting.' },
    { id: 'module_support', name: 'Priority Support', description: '24/7 priority email and chat support.' },
    { id: 'module_api', name: 'API Access', description: 'Programmatic access to platform features.' },
    { id: 'module_whitelabel', name: 'White-Label Portal', description: 'Custom branded client portal with your domain.' },
    { id: 'module_multitenancy', name: 'Multi-Tenancy', description: 'Manage multiple client workspaces.' },
    { id: 'module_ecommerce', name: 'E-Commerce', description: 'Full e-commerce capabilities with Stripe.' },
    { id: 'module_chat', name: 'AI Chat Widget', description: 'Embeddable chat for lead capture.' },
  ],
  plans: [],
};

/**
 * Fetch billing data from Stripe via Cloud Function
 * Falls back to empty/mock data if API fails
 */
export const fetchBillingData = async (): Promise<BillingData> => {
  try {
    const response = await fetch(BILLING_API_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('Billing API returned error, using fallback data');
      return MOCK_DATA;
    }

    const data = await response.json();
    
    // Merge with default service modules if not provided
    return {
      ...data,
      serviceModules: data.serviceModules || MOCK_DATA.serviceModules,
    };

  } catch (error) {
    console.warn('Failed to fetch billing data from API:', error);
    return MOCK_DATA;
  }
};

/**
 * Create or update a plan in Stripe
 */
export const savePlan = async (plan: BillingData['plans'][0]): Promise<{ success: boolean; productId?: string; error?: string }> => {
  try {
    const response = await fetch('https://us-central1-quimeraai.cloudfunctions.net/createOrUpdatePlan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ plan }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || 'Failed to save plan' };
    }

    const data = await response.json();
    return { success: true, productId: data.productId };

  } catch (error) {
    console.error('Failed to save plan:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Archive a plan in Stripe
 */
export const archivePlanApi = async (productId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch('https://us-central1-quimeraai.cloudfunctions.net/archivePlan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productId }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || 'Failed to archive plan' };
    }

    return { success: true };

  } catch (error) {
    console.error('Failed to archive plan:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};
