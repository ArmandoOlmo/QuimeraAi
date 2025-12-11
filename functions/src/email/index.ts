/**
 * Email Module
 * Exporta todas las funciones de email
 */

// Email Service
export {
    sendEmail,
    sendBatchEmails,
    renderTemplate,
    getEmailApiKey,
    isValidEmail,
    filterValidEmails,
    formatCurrency,
    formatDate,
    formatDateTime,
} from './emailService';

export type {
    SendEmailParams,
    SendEmailResult,
    EmailConfig,
} from './emailService';

// Templates
export { getBaseTemplate } from './templates/base';
export { getOrderConfirmationTemplate } from './templates/orderConfirmation';
export { getOrderShippedTemplate } from './templates/orderShipped';
export { getOrderDeliveredTemplate } from './templates/orderDelivered';
export { getNewOrderAdminTemplate } from './templates/newOrderAdmin';
export { getLowStockAlertTemplate } from './templates/lowStockAlert';
export { getLeadNotificationTemplate } from './templates/leadNotification';
export { getWelcomeCustomerTemplate } from './templates/welcomeCustomer';

// Triggers
export { onLeadCreatedSendEmail, onLeadScoreUpdate } from './triggers/leadTriggers';

// Marketing
export { 
    sendCampaign, 
    sendCampaignToSegment,
    processScheduledCampaigns,
    sendTestEmail 
} from './marketing/campaignService';

