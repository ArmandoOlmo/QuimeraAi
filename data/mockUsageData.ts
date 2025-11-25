import { UsageData } from '../types';

const MOCK_DATA: UsageData = {
  totalUsers: 1482,
  newUsersThisMonth: 123,
  totalProjects: 3291,
  projectsThisMonth: 412,
  totalApiCalls: 156789,
  userGrowth: [
    { month: 'Jan', count: 80 },
    { month: 'Feb', count: 120 },
    { month: 'Mar', count: 110 },
    { month: 'Apr', count: 150 },
    { month: 'May', count: 210 },
    { month: 'Jun', count: 123 },
  ],
  apiCallsByModel: [
    { model: 'gemini-2.5-flash', count: 89345, color: '#4f46e5' },
    { model: 'gemini-2.5-pro', count: 42100, color: '#10b981' },
    { model: 'gemini-3.0-pro-image-001', count: 25344, color: '#a855f7' },
  ],
  topUsers: [
    { id: 'user1', name: 'Elena Petrova', email: 'elena@example.com', photoURL: 'https://picsum.photos/seed/user1/100', projectCount: 42 },
    { id: 'user2', name: 'Marcus Cole', email: 'marcus@example.com', photoURL: 'https://picsum.photos/seed/user2/100', projectCount: 38 },
    { id: 'user3', name: 'Aisha Khan', email: 'aisha@example.com', photoURL: 'https://picsum.photos/seed/user3/100', projectCount: 31 },
    { id: 'user4', name: 'David Chen', email: 'david@example.com', photoURL: 'https://picsum.photos/seed/user4/100', projectCount: 25 },
    { id: 'user5', name: 'Sophia Loren', email: 'sophia@example.com', photoURL: 'https://picsum.photos/seed/user5/100', projectCount: 22 },
  ],
  popularTemplates: [
    { id: 'template-corporate', name: 'Business Corporate', count: 890 },
    { id: 'template-portfolio', name: 'Creator Portfolio', count: 712 },
    { id: 'template-local-service', name: 'Local Service Pro', count: 654 },
  ],
};

export const fetchUsageData = (): Promise<UsageData> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_DATA);
    }, 1000); // Simulate network delay
  });
};