import { BillingData } from '../types';

const MOCK_DATA: BillingData = {
  mrr: 45890,
  activeSubscriptions: 462,
  arpu: 99.33,
  churnRate: 4.2,
  revenueTrend: [
    { month: 'Jul', revenue: 38000 },
    { month: 'Aug', revenue: 39500 },
    { month: 'Sep', revenue: 41000 },
    { month: 'Oct', revenue: 40500 },
    { month: 'Nov', revenue: 42000 },
    { month: 'Dec', revenue: 44000 },
    { month: 'Jan', revenue: 43500 },
    { month: 'Feb', revenue: 44200 },
    { month: 'Mar', revenue: 45100 },
    { month: 'Apr', revenue: 44800 },
    { month: 'May', revenue: 45500 },
    { month: 'Jun', revenue: 45890 },
  ],
  planDistribution: [
    { planId: 'plan_starter', planName: 'Starter', subscribers: 210, color: '#4f46e5' },
    { planId: 'plan_pro', planName: 'Pro', subscribers: 182, color: '#10b981' },
    { planId: 'plan_enterprise', planName: 'Enterprise', subscribers: 70, color: '#f59e0b' },
  ],
  serviceModules: [
    { id: 'module_builder', name: 'AI Website Builder', description: 'Core website creation and hosting.' },
    { id: 'module_analytics', name: 'Advanced Analytics', description: 'In-depth visitor analytics and reporting.' },
    { id: 'module_support', name: 'Priority Support', description: '24/7 priority email and chat support.' },
    { id: 'module_api', name: 'API Access', description: 'Programmatic access to platform features.' },
  ],
  plans: [
    {
      id: 'plan_starter',
      name: 'Starter',
      description: 'For individuals and hobbyists getting started.',
      price: { monthly: 29, annually: 290 },
      features: ['1 Project', '1,000 AI credits/month', 'Basic image generation', 'Community support'],
      serviceModuleIds: ['module_builder'],
      isFeatured: false,
      isArchived: false,
    },
    {
      id: 'plan_pro',
      name: 'Pro',
      description: 'For professionals and small teams who need more power.',
      price: { monthly: 99, annually: 990 },
      features: ['10 Projects', '5,000 AI credits/month', 'Advanced generation tools', 'Commercial license'],
      serviceModuleIds: ['module_builder', 'module_analytics', 'module_support'],
      isFeatured: true,
      isArchived: false,
    },
    {
      id: 'plan_enterprise',
      name: 'Enterprise',
      description: 'For large organizations with custom needs.',
      price: { monthly: 499, annually: 4990 },
      features: ['Unlimited Projects', 'Unlimited AI credits', 'Custom model training', 'Team management'],
      serviceModuleIds: ['module_builder', 'module_analytics', 'module_support', 'module_api'],
      isFeatured: false,
      isArchived: false,
    },
     {
      id: 'plan_legacy',
      name: 'Legacy Basic',
      description: 'An old plan that is no longer offered.',
      price: { monthly: 19, annually: 190 },
      features: ['1 Project', '500 AI credits/month'],
      serviceModuleIds: ['module_builder'],
      isFeatured: false,
      isArchived: true,
    },
  ],
};

export const fetchBillingData = (): Promise<BillingData> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_DATA);
    }, 800); // Simulate network delay
  });
};
