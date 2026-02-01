/**
 * Subscription Upgrade Email Template
 * Email enviado cuando un usuario actualiza su plan de suscripción
 */

export interface SubscriptionUpgradeParams {
    userName: string;
    userEmail: string;
    planName: string;
    planPrice: number;
    billingCycle: 'monthly' | 'annually';
    aiCredits: number;
    features: string[];
    dashboardUrl: string;
    supportEmail: string;
}

/**
 * Generate subscription upgrade confirmation email HTML
 */
export const getSubscriptionUpgradeTemplate = (params: SubscriptionUpgradeParams): string => {
    const {
        userName,
        planName,
        planPrice,
        billingCycle,
        aiCredits,
        features,
        dashboardUrl,
        supportEmail,
    } = params;

    const billingText = billingCycle === 'annually' ? 'año' : 'mes';
    const formattedPrice = `$${planPrice.toFixed(2)}/${billingText}`;

    const featuresList = features.map(f => `
        <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                <span style="color: #10b981; margin-right: 8px;">✓</span>
                <span style="color: #4b5563;">${f}</span>
            </td>
        </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>¡Bienvenido al Plan ${planName}!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                    
                    <!-- Header with Logo -->
                    <tr>
                        <td style="padding: 32px 40px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                            <img src="https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032" alt="Quimera AI" width="60" height="60" style="display: block; margin: 0 auto;">
                        </td>
                    </tr>
                    
                    <!-- Success Banner -->
                    <tr>
                        <td style="padding: 0;">
                            <div style="background: linear-gradient(135deg, #FACC15 0%, #EAB308 100%); padding: 40px; text-align: center;">
                                <span style="font-size: 56px; display: block; margin-bottom: 16px;">🎉</span>
                                <h1 style="color: #000000; margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">
                                    ¡Bienvenido al Plan ${planName}!
                                </h1>
                                <p style="color: rgba(0,0,0,0.7); margin: 0; font-size: 16px;">
                                    Tu suscripción ha sido activada exitosamente
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                                Hola <strong>${userName}</strong>,
                            </p>
                            
                            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                                ¡Gracias por actualizar tu plan! Tu suscripción al <strong>Plan ${planName}</strong> ya está activa y tienes acceso a todas las nuevas funcionalidades.
                            </p>
                            
                            <!-- Plan Details Box -->
                            <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
                                <h3 style="color: #1f2937; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">
                                    📋 Detalles de tu Plan
                                </h3>
                                
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                            <span style="color: #6b7280;">Plan:</span>
                                        </td>
                                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                                            <strong style="color: #1f2937;">${planName}</strong>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                            <span style="color: #6b7280;">Precio:</span>
                                        </td>
                                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                                            <strong style="color: #1f2937;">${formattedPrice}</strong>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                            <span style="color: #6b7280;">Créditos IA:</span>
                                        </td>
                                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                                            <strong style="color: #FACC15;">${aiCredits.toLocaleString()} /mes</strong>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0;">
                                            <span style="color: #6b7280;">Facturación:</span>
                                        </td>
                                        <td style="padding: 8px 0; text-align: right;">
                                            <strong style="color: #1f2937;">${billingCycle === 'annually' ? 'Anual' : 'Mensual'}</strong>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- Features -->
                            <div style="margin-bottom: 32px;">
                                <h3 style="color: #1f2937; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">
                                    ✨ Lo que incluye tu plan
                                </h3>
                                
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    ${featuresList}
                                </table>
                            </div>
                            
                            <!-- CTA Button -->
                            <div style="text-align: center; margin-bottom: 32px;">
                                <a href="${dashboardUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #FACC15 0%, #EAB308 100%); color: #000000; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px;">
                                    Ir a mi Dashboard
                                </a>
                            </div>
                            
                            <!-- Help Box -->
                            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px;">
                                <p style="color: #166534; margin: 0; font-size: 14px; line-height: 1.6;">
                                    <strong>¿Necesitas ayuda?</strong><br>
                                    Nuestro equipo de soporte está disponible para ayudarte a sacar el máximo provecho de tu nuevo plan. Escríbenos a <a href="mailto:${supportEmail}" style="color: #15803d;">${supportEmail}</a>
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #f3f4f6;">
                            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0 0 8px 0;">
                                Este email fue enviado porque actualizaste tu plan en Quimera AI.
                            </p>
                            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                                © ${new Date().getFullYear()} Quimera AI. Todos los derechos reservados.
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

/**
 * Get features list for a plan
 */
export const getPlanFeatures = (planId: string): string[] => {
    const features: Record<string, string[]> = {
        starter: [
            'Dominio personalizado incluido',
            '300 créditos de IA por mes',
            'Hasta 5 proyectos',
            'CMS para blog',
            'CRM básico',
            'Soporte por email',
        ],
        pro: [
            'Todo lo del plan Starter',
            '1,500 créditos de IA por mes',
            'Hasta 20 proyectos',
            'E-commerce completo',
            'Chatbot con IA',
            'Sin branding de Quimera',
            'Soporte prioritario',
        ],
        agency: [
            'Todo lo del plan Pro',
            '5,000 créditos de IA por mes',
            'Hasta 50 proyectos',
            'White-label completo',
            'Multi-tenancy (sub-clientes)',
            'API access',
            'Soporte dedicado',
        ],
        enterprise: [
            'Todo lo del plan Agency',
            'Créditos de IA ilimitados',
            'Proyectos ilimitados',
            'SLA garantizado',
            'Integraciones personalizadas',
            'Account Manager dedicado',
        ],
    };

    return features[planId] || features.starter;
};

/**
 * Get plan price
 */
export const getPlanPrice = (planId: string, billingCycle: 'monthly' | 'annually'): number => {
    const prices: Record<string, { monthly: number; annually: number }> = {
        starter: { monthly: 19, annually: 15 },
        pro: { monthly: 49, annually: 39 },
        agency: { monthly: 129, annually: 99 },
        enterprise: { monthly: 299, annually: 249 },
    };

    const plan = prices[planId] || prices.starter;
    return billingCycle === 'annually' ? plan.annually : plan.monthly;
};

/**
 * Get AI credits for a plan
 */
export const getPlanCredits = (planId: string): number => {
    const credits: Record<string, number> = {
        free: 30,
        starter: 300,
        pro: 1500,
        agency: 5000,
        enterprise: 25000, // Fixed: matches subscription.ts
    };

    return credits[planId] || credits.free;
};

