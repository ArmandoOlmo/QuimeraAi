/**
 * Dashboard Components - Barrel Export
 * 
 * Este archivo permite imports más limpios:
 * 
 * Antes:
 *   import Dashboard from './components/dashboard/Dashboard';
 *   import DashboardSidebar from './components/dashboard/DashboardSidebar';
 *   import LeadsDashboard from './components/dashboard/leads/LeadsDashboard';
 * 
 * Después:
 *   import { Dashboard, DashboardSidebar, LeadsDashboard } from './components/dashboard';
 */

// Main Dashboard Components
export { default as Dashboard } from './Dashboard';
export { default as DashboardSidebar } from './DashboardSidebar';
export { default as SuperAdminDashboard } from './SuperAdminDashboard';

// Project Components
export { default as ProjectCard } from './ProjectCard';
export { default as ProjectCardSkeleton } from './ProjectCardSkeleton';
export { default as ProjectListItem } from './ProjectListItem';

// UI Components
export { default as StatCard } from './StatCard';
export { default as FilterChip } from './FilterChip';
export { default as EmptyState } from './EmptyState';
export { default as FileHistory } from './FileHistory';
export { default as ProfileModal } from './ProfileModal';
export { default as UpgradeBanner } from './UpgradeBanner';

export { default as UserTemplates } from './UserTemplates';
export { default as AnalyticsWidget } from './AnalyticsWidget';
export { default as BulkActionsBar } from './BulkActionsBar';

// Feature Dashboards (re-exports)
export { default as SEODashboard } from './SEODashboard';

// Sub-module re-exports
export * from './leads';
export * from './admin';
export * from './ai';
export * from './appointments';
export * from './domains';
export * from './ecommerce';
export * from './email';
export * from './finance';
export * from './navigation';
export * from './seo';











