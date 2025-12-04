/**
 * Appointments Module
 * Exportación centralizada de todos los componentes de gestión de citas
 */

// Main Dashboard
export { default as AppointmentsDashboard } from './AppointmentsDashboard';

// Views
export { CalendarWeekView } from './views/CalendarWeekView';
export { CalendarMonthView } from './views/CalendarMonthView';
export { CalendarDayView } from './views/CalendarDayView';
export { AppointmentsListView } from './views/AppointmentsListView';

// Components
export { AppointmentCard } from './components/AppointmentCard';
export { CreateAppointmentModal } from './components/CreateAppointmentModal';
export { AppointmentDetailDrawer } from './components/AppointmentDetailDrawer';
export { LeadContactSelector } from './components/LeadContactSelector';
export { AIPreparationPanel } from './components/AIPreparationPanel';
export { GoogleCalendarConnect } from './components/GoogleCalendarConnect';

// Hooks
export { useAppointments } from './hooks/useAppointments';

// Utils
export * from './utils/appointmentHelpers';





