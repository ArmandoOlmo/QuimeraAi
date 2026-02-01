/**
 * Google Calendar Service
 * Servicio para integración con Google Calendar API
 * 
 * NOTA: Esta implementación requiere configurar las credenciales de Google Cloud
 * en el proyecto de Firebase y obtener el Client ID de OAuth 2.0
 */

import { Appointment, GoogleCalendarSync, GoogleCalendarConfig } from '../types';

// =============================================================================
// CONSTANTS
// =============================================================================

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const SCOPES = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

// Debug logging only in development
const isDev = import.meta.env.DEV;

if (isDev) {
    console.log('🔑 Google Calendar credentials status:');
    console.log('  - hasClientId:', !!GOOGLE_CLIENT_ID);
    console.log('  - hasApiKey:', !!GOOGLE_API_KEY);
}

if (!GOOGLE_CLIENT_ID && isDev) {
    console.warn('⚠️ VITE_GOOGLE_CLIENT_ID no está configurado. La sincronización con Google Calendar no funcionará.');
}
if (!GOOGLE_API_KEY && isDev) {
    console.warn('⚠️ VITE_GOOGLE_API_KEY no está configurado. Algunas funciones podrían no funcionar.');
}

// =============================================================================
// TYPES
// =============================================================================

interface GoogleCalendarEvent {
    id?: string;
    summary: string;
    description?: string;
    location?: string;
    start: {
        dateTime: string;
        timeZone: string;
    };
    end: {
        dateTime: string;
        timeZone: string;
    };
    attendees?: Array<{
        email: string;
        displayName?: string;
        responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
    }>;
    reminders?: {
        useDefault: boolean;
        overrides?: Array<{
            method: 'email' | 'popup';
            minutes: number;
        }>;
    };
    conferenceData?: {
        createRequest?: {
            requestId: string;
            conferenceSolutionKey: {
                type: 'hangoutsMeet';
            };
        };
    };
    colorId?: string;
    status?: string;
    htmlLink?: string;
    iCalUID?: string;
    etag?: string;
}

interface GoogleApiResponse<T> {
    result: T;
    status: number;
}

// =============================================================================
// STATE
// =============================================================================

let gapiInited = false;
let gisInited = false;
let tokenClient: any = null;
let accessToken: string | null = null;

// Storage key for persisting connection state
const STORAGE_KEY = 'quimera_google_calendar_connected';

/**
 * Guarda el estado de conexión
 */
const saveConnectionState = (connected: boolean): void => {
    try {
        if (connected) {
            localStorage.setItem(STORAGE_KEY, 'true');
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    } catch (e) {
        console.warn('Could not save connection state:', e);
    }
};

/**
 * Obtiene el estado de conexión guardado
 */
export const getSavedConnectionState = (): boolean => {
    try {
        return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch (e) {
        return false;
    }
};

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Carga los scripts de Google API
 */
export const loadGoogleApiScripts = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        console.log('📦 Loading Google API scripts...');
        
        // Check if already loaded
        if (window.gapi && window.google?.accounts) {
            console.log('✅ Google API scripts already loaded');
            resolve();
            return;
        }
        
        // Load GAPI
        const gapiScript = document.createElement('script');
        gapiScript.src = 'https://apis.google.com/js/api.js';
        gapiScript.async = true;
        gapiScript.defer = true;
        gapiScript.onload = () => {
            console.log('✅ GAPI script loaded');
            // Load GIS
            const gisScript = document.createElement('script');
            gisScript.src = 'https://accounts.google.com/gsi/client';
            gisScript.async = true;
            gisScript.defer = true;
            gisScript.onload = () => {
                console.log('✅ GIS script loaded');
                resolve();
            };
            gisScript.onerror = (e) => {
                console.error('❌ Error loading GIS script:', e);
                reject(new Error('Error loading Google Identity Services'));
            };
            document.head.appendChild(gisScript);
        };
        gapiScript.onerror = (e) => {
            console.error('❌ Error loading GAPI script:', e);
            reject(new Error('Error loading Google API'));
        };
        document.head.appendChild(gapiScript);
    });
};

/**
 * Inicializa el cliente GAPI
 */
export const initializeGapiClient = async (): Promise<void> => {
    if (gapiInited) {
        console.log('✅ GAPI client already initialized');
        return;
    }
    
    console.log('🔧 Initializing GAPI client...');
    
    if (!GOOGLE_API_KEY) {
        console.warn('⚠️ GOOGLE_API_KEY not set - some features may not work');
    }
    
    await new Promise<void>((resolve, reject) => {
        window.gapi.load('client', async () => {
            try {
                console.log('📡 Loading GAPI client with discovery doc...');
                await window.gapi.client.init({
                    apiKey: GOOGLE_API_KEY,
                    discoveryDocs: [DISCOVERY_DOC],
                });
                gapiInited = true;
                console.log('✅ GAPI client initialized successfully');
                resolve();
            } catch (error: any) {
                console.error('❌ Error initializing GAPI client:');
                console.error('  - message:', error?.message);
                console.error('  - details:', error?.details);
                console.error('  - error object:', JSON.stringify(error, null, 2));
                reject(error);
            }
        });
    });
};

/**
 * Inicializa el cliente de tokens OAuth
 */
export const initializeTokenClient = (
    onTokenReceived: (token: string) => void,
    onError: (error: Error) => void
): void => {
    if (gisInited) {
        console.log('✅ Token client already initialized');
        return;
    }
    
    console.log('🔐 Initializing token client...');
    
    if (!GOOGLE_CLIENT_ID) {
        console.error('❌ GOOGLE_CLIENT_ID not configured! Add VITE_GOOGLE_CLIENT_ID to your .env.local file');
        onError(new Error('Google Client ID no configurado. Reinicia el servidor después de configurar VITE_GOOGLE_CLIENT_ID en .env.local'));
        return;
    }
    
    try {
        console.log('🔑 Using Client ID:', GOOGLE_CLIENT_ID.substring(0, 15) + '...');
        
        tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: SCOPES,
            callback: (response: any) => {
                if (response.error) {
                    console.error('❌ Token callback error:', response.error);
                    onError(new Error(response.error));
                    return;
                }
                console.log('✅ Token received successfully');
                accessToken = response.access_token;
                onTokenReceived(response.access_token);
            },
        });
        
        gisInited = true;
        console.log('✅ Token client initialized successfully');
    } catch (error: any) {
        console.error('❌ Error initializing token client:', error);
        onError(error);
    }
};

// =============================================================================
// AUTHENTICATION
// =============================================================================

/**
 * Solicita autorización del usuario
 */
export const requestAuthorization = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            reject(new Error('Token client not initialized. Please reload the page.'));
            return;
        }
        
        console.log('🔐 Requesting Google authorization...');
        
        // Set up one-time callback
        const originalCallback = tokenClient.callback;
        tokenClient.callback = (response: any) => {
            tokenClient.callback = originalCallback;
            
            if (response.error) {
                console.error('❌ Google auth error:', response.error);
                saveConnectionState(false);
                reject(new Error(response.error));
                return;
            }
            
            console.log('✅ Google authorization successful!');
            accessToken = response.access_token;
            saveConnectionState(true);
            resolve(response.access_token);
        };
        
        // Request access token - always prompt consent for reliability
        try {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } catch (e: any) {
            console.error('❌ Error requesting access token:', e);
            reject(new Error('Error al abrir la ventana de autorización. Por favor, permite las ventanas emergentes.'));
        }
    });
};

/**
 * Revoca el acceso
 */
export const revokeAccess = (): void => {
    console.log('🔓 Revoking Google access...');
    saveConnectionState(false);
    
    if (accessToken) {
        try {
            window.google.accounts.oauth2.revoke(accessToken, () => {
                accessToken = null;
                console.log('✅ Google access revoked');
            });
        } catch (e) {
            console.warn('Error revoking token:', e);
            accessToken = null;
        }
    }
};

/**
 * Verifica si el usuario está autenticado
 */
export const isAuthenticated = (): boolean => {
    return !!accessToken;
};

// =============================================================================
// CALENDAR OPERATIONS
// =============================================================================

/**
 * Obtiene la lista de calendarios del usuario
 */
export const getCalendarList = async (): Promise<any[]> => {
    if (!accessToken) throw new Error('Not authenticated');
    
    const response = await window.gapi.client.calendar.calendarList.list();
    return response.result.items || [];
};

/**
 * Crea un evento en Google Calendar
 */
export const createCalendarEvent = async (
    appointment: Appointment,
    calendarId: string = 'primary',
    createMeetLink: boolean = false
): Promise<GoogleCalendarEvent> => {
    if (!accessToken) throw new Error('Not authenticated');
    
    const event: GoogleCalendarEvent = {
        summary: appointment.title,
        description: appointment.description,
        location: appointment.location?.address || appointment.location?.meetingUrl,
        start: {
            dateTime: new Date(appointment.startDate.seconds * 1000).toISOString(),
            timeZone: appointment.timezone,
        },
        end: {
            dateTime: new Date(appointment.endDate.seconds * 1000).toISOString(),
            timeZone: appointment.timezone,
        },
        attendees: appointment.participants.map(p => ({
            email: p.email,
            displayName: p.name,
        })),
        reminders: {
            useDefault: false,
            overrides: appointment.reminders
                .filter(r => r.enabled)
                .map(r => ({
                    method: r.type === 'email' ? 'email' as const : 'popup' as const,
                    minutes: r.minutesBefore,
                })),
        },
    };
    
    // Add conference data if requested
    if (createMeetLink) {
        event.conferenceData = {
            createRequest: {
                requestId: `quimera-${appointment.id}`,
                conferenceSolutionKey: {
                    type: 'hangoutsMeet',
                },
            },
        };
    }
    
    const response = await window.gapi.client.calendar.events.insert({
        calendarId,
        resource: event,
        conferenceDataVersion: createMeetLink ? 1 : 0,
        sendUpdates: 'all',
    });
    
    return response.result;
};

/**
 * Actualiza un evento en Google Calendar
 */
export const updateCalendarEvent = async (
    eventId: string,
    appointment: Appointment,
    calendarId: string = 'primary'
): Promise<GoogleCalendarEvent> => {
    if (!accessToken) throw new Error('Not authenticated');
    
    const event: GoogleCalendarEvent = {
        summary: appointment.title,
        description: appointment.description,
        location: appointment.location?.address || appointment.location?.meetingUrl,
        start: {
            dateTime: new Date(appointment.startDate.seconds * 1000).toISOString(),
            timeZone: appointment.timezone,
        },
        end: {
            dateTime: new Date(appointment.endDate.seconds * 1000).toISOString(),
            timeZone: appointment.timezone,
        },
        attendees: appointment.participants.map(p => ({
            email: p.email,
            displayName: p.name,
        })),
    };
    
    const response = await window.gapi.client.calendar.events.update({
        calendarId,
        eventId,
        resource: event,
        sendUpdates: 'all',
    });
    
    return response.result;
};

/**
 * Elimina un evento de Google Calendar
 */
export const deleteCalendarEvent = async (
    eventId: string,
    calendarId: string = 'primary'
): Promise<void> => {
    if (!accessToken) throw new Error('Not authenticated');
    
    await window.gapi.client.calendar.events.delete({
        calendarId,
        eventId,
        sendUpdates: 'all',
    });
};

/**
 * Obtiene eventos de Google Calendar en un rango de fechas
 */
export const getCalendarEvents = async (
    timeMin: Date,
    timeMax: Date,
    calendarId: string = 'primary'
): Promise<GoogleCalendarEvent[]> => {
    if (!accessToken) throw new Error('Not authenticated');
    
    const response = await window.gapi.client.calendar.events.list({
        calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 250,
    });
    
    return response.result.items || [];
};

/**
 * Obtiene un evento específico
 */
export const getCalendarEvent = async (
    eventId: string,
    calendarId: string = 'primary'
): Promise<GoogleCalendarEvent | null> => {
    if (!accessToken) throw new Error('Not authenticated');
    
    try {
        const response = await window.gapi.client.calendar.events.get({
            calendarId,
            eventId,
        });
        return response.result;
    } catch {
        return null;
    }
};

// =============================================================================
// SYNC UTILITIES
// =============================================================================

/**
 * Convierte un evento de Google Calendar a formato Appointment parcial
 */
export const googleEventToAppointment = (event: GoogleCalendarEvent): Partial<Appointment> => {
    return {
        title: event.summary || 'Sin título',
        description: event.description,
        startDate: {
            seconds: new Date(event.start.dateTime).getTime() / 1000,
            nanoseconds: 0,
        },
        endDate: {
            seconds: new Date(event.end.dateTime).getTime() / 1000,
            nanoseconds: 0,
        },
        timezone: event.start.timeZone,
        location: event.location ? {
            type: event.location.startsWith('http') ? 'virtual' : 'physical',
            address: event.location.startsWith('http') ? undefined : event.location,
            meetingUrl: event.location.startsWith('http') ? event.location : undefined,
        } : { type: 'virtual' },
        participants: event.attendees?.map((a, i) => ({
            id: `google-${i}`,
            type: 'external' as const,
            name: a.displayName || a.email.split('@')[0],
            email: a.email,
            role: 'attendee' as const,
            status: a.responseStatus === 'accepted' ? 'accepted' as const :
                    a.responseStatus === 'declined' ? 'declined' as const :
                    a.responseStatus === 'tentative' ? 'tentative' as const :
                    'pending' as const,
        })) || [],
        googleSync: {
            enabled: true,
            googleEventId: event.id,
            syncStatus: 'synced',
            htmlLink: event.htmlLink,
            iCalUID: event.iCalUID,
            etag: event.etag,
        },
    };
};

/**
 * Sincroniza una cita específica con Google Calendar
 */
export const syncAppointmentToGoogle = async (
    appointment: Appointment,
    calendarId: string = 'primary',
    createMeetLink: boolean = false
): Promise<GoogleCalendarSync> => {
    if (!accessToken) throw new Error('Not authenticated');
    
    const existingEventId = appointment.googleSync?.googleEventId;
    
    try {
        let event: GoogleCalendarEvent;
        
        if (existingEventId) {
            // Check if event still exists
            const existing = await getCalendarEvent(existingEventId, calendarId);
            if (existing) {
                // Update
                event = await updateCalendarEvent(existingEventId, appointment, calendarId);
            } else {
                // Create new (event was deleted in Google)
                event = await createCalendarEvent(appointment, calendarId, createMeetLink);
            }
        } else {
            // Create new
            event = await createCalendarEvent(appointment, calendarId, createMeetLink);
        }
        
        return {
            enabled: true,
            googleEventId: event.id,
            googleCalendarId: calendarId,
            syncStatus: 'synced',
            lastSyncAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
            htmlLink: event.htmlLink,
            iCalUID: event.iCalUID,
            etag: event.etag,
        };
    } catch (error: any) {
        return {
            enabled: true,
            googleEventId: existingEventId,
            googleCalendarId: calendarId,
            syncStatus: 'error',
            errorMessage: error.message,
            lastSyncAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
        };
    }
};

// =============================================================================
// TYPE DECLARATIONS FOR GOOGLE APIs
// =============================================================================

declare global {
    interface Window {
        gapi: any;
        google: {
            accounts: {
                oauth2: {
                    initTokenClient: (config: any) => any;
                    revoke: (token: string, callback: () => void) => void;
                };
            };
        };
    }
}


