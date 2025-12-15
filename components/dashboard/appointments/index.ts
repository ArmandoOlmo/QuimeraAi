/**
 * Appointments Dashboard - Barrel Export
 */

export { default as AppointmentsDashboard } from './AppointmentsDashboard';
export { default as ProjectSelectorPage } from './ProjectSelectorPage';

// Components
export { default as AppointmentCard } from './components/AppointmentCard';
export { default as AppointmentDetailDrawer } from './components/AppointmentDetailDrawer';
export { default as CreateAppointmentModal } from './components/CreateAppointmentModal';
export { default as GoogleCalendarConnect } from './components/GoogleCalendarConnect';
export { default as LeadContactSelector } from './components/LeadContactSelector';
export { default as AIPreparationPanel } from './components/AIPreparationPanel';

// Views
export { default as AppointmentsListView } from './views/AppointmentsListView';
export { default as CalendarDayView } from './views/CalendarDayView';
export { default as CalendarMonthView } from './views/CalendarMonthView';
export { default as CalendarWeekView } from './views/CalendarWeekView';

// Hooks
export { useAppointments } from './hooks/useAppointments';
