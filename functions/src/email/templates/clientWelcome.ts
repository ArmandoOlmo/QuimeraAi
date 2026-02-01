/**
 * Client Welcome Email Template
 * Sent when a new sub-client is provisioned by an agency
 */

export interface ClientWelcomeData {
  userName: string;
  clientName: string;
  agencyName: string;
  agencyLogo?: string;
  agencyPrimaryColor?: string;
  inviteLink: string;
  setupSteps?: string[];
}

/**
 * Generate HTML email template for client welcome
 */
export function getClientWelcomeTemplate(data: ClientWelcomeData): string {
  const primaryColor = data.agencyPrimaryColor || '#3B82F6';
  const setupSteps = data.setupSteps || [
    'Completa tu perfil personal',
    'Explora tu dashboard personalizado',
    'Revisa las herramientas disponibles',
    'Contacta a tu agencia para soporte',
  ];

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a ${data.clientName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f4f4f5;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }

    .header {
      background-color: ${primaryColor};
      background: linear-gradient(135deg, ${primaryColor} 0%, ${adjustColor(primaryColor, -20)} 100%);
      padding: 40px 30px;
      text-align: center;
    }

    .header img {
      max-width: 150px;
      height: auto;
      margin-bottom: 20px;
    }

    .header h1 {
      color: #ffffff;
      font-size: 28px;
      font-weight: 600;
      margin: 0;
    }

    .content {
      padding: 40px 30px;
    }

    .content h2 {
      color: #1f2937;
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 20px;
    }

    .content p {
      color: #4b5563;
      font-size: 16px;
      margin-bottom: 20px;
    }

    .welcome-box {
      background-color: #f9fafb;
      border-left: 4px solid ${primaryColor};
      padding: 20px;
      margin: 30px 0;
      border-radius: 4px;
    }

    .welcome-box p {
      margin: 0;
      color: #374151;
    }

    .steps {
      margin: 30px 0;
    }

    .steps ol {
      padding-left: 20px;
    }

    .steps li {
      color: #4b5563;
      font-size: 15px;
      margin-bottom: 12px;
      padding-left: 10px;
    }

    .steps li::marker {
      color: ${primaryColor};
      font-weight: 600;
    }

    .cta-button {
      display: inline-block;
      background-color: ${primaryColor};
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
      transition: background-color 0.2s;
    }

    .cta-button:hover {
      background-color: ${adjustColor(primaryColor, -10)};
    }

    .button-container {
      text-align: center;
      margin: 30px 0;
    }

    .info-box {
      background-color: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      padding: 16px;
      margin: 20px 0;
    }

    .info-box p {
      color: #1e40af;
      font-size: 14px;
      margin: 0;
    }

    .footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }

    .footer p {
      color: #6b7280;
      font-size: 14px;
      margin: 5px 0;
    }

    .footer a {
      color: ${primaryColor};
      text-decoration: none;
    }

    .divider {
      height: 1px;
      background-color: #e5e7eb;
      margin: 30px 0;
    }

    @media only screen and (max-width: 600px) {
      .content {
        padding: 30px 20px;
      }

      .header {
        padding: 30px 20px;
      }

      .header h1 {
        font-size: 24px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      ${data.agencyLogo ? `<img src="${data.agencyLogo}" alt="${data.agencyName}" />` : ''}
      <h1>¡Bienvenido a ${data.clientName}!</h1>
    </div>

    <!-- Content -->
    <div class="content">
      <p>Hola <strong>${data.userName}</strong>,</p>

      <div class="welcome-box">
        <p>
          <strong>${data.agencyName}</strong> ha creado un workspace personalizado para <strong>${data.clientName}</strong>.
          Tu plataforma ya está lista con todas las herramientas que necesitas para gestionar tu presencia digital.
        </p>
      </div>

      <h2>🚀 Primeros Pasos</h2>
      <div class="steps">
        <ol>
          ${setupSteps.map((step) => `<li>${step}</li>`).join('')}
        </ol>
      </div>

      <div class="button-container">
        <a href="${data.inviteLink}" class="cta-button">
          Acceder a Mi Dashboard →
        </a>
      </div>

      <div class="info-box">
        <p>
          <strong>💡 Consejo:</strong> Este enlace expira en 7 días.
          Si tienes problemas para acceder, contacta a ${data.agencyName}.
        </p>
      </div>

      <div class="divider"></div>

      <h2>¿Qué puedes hacer en tu dashboard?</h2>
      <p>Tu nueva plataforma incluye:</p>
      <ul style="color: #4b5563; font-size: 15px; padding-left: 20px;">
        <li style="margin-bottom: 8px;">📊 Panel de análisis en tiempo real</li>
        <li style="margin-bottom: 8px;">🎨 Editor visual de sitios web</li>
        <li style="margin-bottom: 8px;">👥 Gestión de leads y CRM</li>
        <li style="margin-bottom: 8px;">🛍️ Herramientas de e-commerce</li>
        <li style="margin-bottom: 8px;">📧 Marketing por email</li>
        <li style="margin-bottom: 8px;">🤖 Chatbots con IA</li>
      </ul>

      <div class="divider"></div>

      <p style="font-size: 14px; color: #6b7280;">
        Si tienes preguntas o necesitas ayuda, no dudes en contactar directamente a
        <strong>${data.agencyName}</strong> o responder a este email.
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p><strong>Powered by ${data.agencyName}</strong></p>
      <p style="margin-top: 10px;">
        Este email fue enviado a ${data.userName} como parte del proceso de onboarding.
      </p>
      <p style="margin-top: 15px; font-size: 12px;">
        © ${new Date().getFullYear()} ${data.agencyName}. Todos los derechos reservados.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text version for email clients that don't support HTML
 */
export function getClientWelcomeTextVersion(data: ClientWelcomeData): string {
  const setupSteps = data.setupSteps || [
    'Completa tu perfil personal',
    'Explora tu dashboard personalizado',
    'Revisa las herramientas disponibles',
    'Contacta a tu agencia para soporte',
  ];

  return `
¡Bienvenido a ${data.clientName}!

Hola ${data.userName},

${data.agencyName} ha creado un workspace personalizado para ${data.clientName}.
Tu plataforma ya está lista con todas las herramientas que necesitas para gestionar tu presencia digital.

PRIMEROS PASOS:

${setupSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

ACCEDER A TU DASHBOARD:
${data.inviteLink}

(Este enlace expira en 7 días)

¿QUÉ PUEDES HACER EN TU DASHBOARD?

- Panel de análisis en tiempo real
- Editor visual de sitios web
- Gestión de leads y CRM
- Herramientas de e-commerce
- Marketing por email
- Chatbots con IA

Si tienes preguntas o necesitas ayuda, contacta directamente a ${data.agencyName}.

---
Powered by ${data.agencyName}
© ${new Date().getFullYear()} ${data.agencyName}. Todos los derechos reservados.
  `.trim();
}

/**
 * Helper function to adjust color brightness
 */
function adjustColor(color: string, amount: number): string {
  // Simple color adjustment (works with hex colors)
  const clamp = (num: number) => Math.min(Math.max(num, 0), 255);

  let usePound = false;
  if (color[0] === '#') {
    color = color.slice(1);
    usePound = true;
  }

  const num = parseInt(color, 16);
  let r = clamp((num >> 16) + amount);
  let g = clamp(((num >> 8) & 0x00ff) + amount);
  let b = clamp((num & 0x0000ff) + amount);

  return (
    (usePound ? '#' : '') +
    (r << 16 | g << 8 | b).toString(16).padStart(6, '0')
  );
}

/**
 * Get email subject line
 */
export function getClientWelcomeSubject(data: ClientWelcomeData): string {
  return `¡Bienvenido a ${data.clientName}! Tu plataforma está lista 🚀`;
}
