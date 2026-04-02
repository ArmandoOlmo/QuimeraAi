/**
 * Google Calendar Service
 * Full bidirectional sync with Google Calendar API
 * 
 * Push: Quimera → Google (all fields mapped)
 * Pull: Google → Quimera (import & reconcile)
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
// COLOR MAPPING: Quimera ↔ Google Calendar
// =============================================================================

// Google Calendar uses colorId 1-11 for events
const GOOGLE_COLOR_MAP: Record<string, { colorId: string; hex: string }> = {
    blue:    { colorId: '9',  hex: '#3F51B5' },
    violet:  { colorId: '1',  hex: '#7986CB' },
    emerald: { colorId: '2',  hex: '#33B679' },
    green:   { colorId: '2',  hex: '#33B679' },
    orange:  { colorId: '6',  hex: '#F4511E' },
    cyan:    { colorId: '7',  hex: '#039BE5' },
    yellow:  { colorId: '5',  hex: '#F6BF26' },
    pink:    { colorId: '4',  hex: '#E67C73' },
    red:     { colorId: '11', hex: '#DC2127' },
    purple:  { colorId: '3',  hex: '#8E24AA' },
    slate:   { colorId: '8',  hex: '#616161' },
};

// Reverse mapping: Google colorId → Quimera color name
const GOOGLE_COLOR_REVERSE: Record<string, string> = {
    '1':  'violet',
    '2':  'emerald',
    '3':  'purple',
    '4':  'pink',
    '5':  'yellow',
    '6':  'orange',
    '7':  'cyan',
    '8':  'slate',
    '9':  'blue',
    '10': 'green',
    '11': 'red',
};

// =============================================================================
// TYPES
// =============================================================================

interface GoogleCalendarEvent {
    id?: string;
    summary: string;
    description?: string;
    location?: string;
    start: {
        dateTime?: string;
        date?: string; // For all-day events
        timeZone?: string;
    };
    end: {
        dateTime?: string;
        date?: string; // For all-day events
        timeZone?: string;
    };
    attendees?: Array<{
        email: string;
        displayName?: string;
        responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
        organizer?: boolean;
        self?: boolean;
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
        entryPoints?: Array<{
            entryPointType: 'video' | 'phone' | 'sip' | 'more';
            uri?: string;
            label?: string;
            pin?: string;
            meetingCode?: string;
        }>;
        conferenceSolution?: {
            name: string;
            iconUri: string;
        };
        conferenceId?: string;
    };
    extendedProperties?: {
        private?: Record<string, string>;
        shared?: Record<string, string>;
    };
    colorId?: string;
    status?: string; // 'confirmed' | 'tentative' | 'cancelled'
    visibility?: string; // 'default' | 'public' | 'private'
    transparency?: string; // 'opaque' | 'transparent'
    htmlLink?: string;
    iCalUID?: string;
    etag?: string;
    created?: string;
    updated?: string;
    creator?: { email: string; displayName?: string };
    organizer?: { email: string; displayName?: string };
    recurrence?: string[];
    recurringEventId?: string;
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
 * @param forceConsent - Si es true, fuerza la pantalla de consentimiento
 */
export const requestAuthorization = (forceConsent: boolean = false): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            reject(new Error('Token client not initialized. Please reload the page.'));
            return;
        }
        
        const promptType = forceConsent ? 'consent' : '';
        console.log(`🔐 Requesting Google authorization (prompt: ${promptType || 'silent'})...`);
        
        // Set up one-time callback
        const originalCallback = tokenClient.callback;
        tokenClient.callback = (response: any) => {
            tokenClient.callback = originalCallback;
            
            if (response.error) {
                console.error('❌ Google auth error:', response.error, response.error_description);
                // If silent auth fails, don't clear state - let caller handle it
                if (forceConsent) {
                    saveConnectionState(false);
                }
                reject(new Error(response.error));
                return;
            }
            
            console.log('✅ Google authorization successful!');
            accessToken = response.access_token;
            
            // Set the token on the GAPI client so calendar requests work
            if (window.gapi?.client) {
                window.gapi.client.setToken({ access_token: response.access_token });
            }
            
            saveConnectionState(true);
            resolve(response.access_token);
        };
        
        // Request access token
        try {
            tokenClient.requestAccessToken({ prompt: promptType });
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
// FIELD MAPPING HELPERS
// =============================================================================

/**
 * Build a rich description that encodes Quimera metadata
 */
const buildGoogleDescription = (appointment: Appointment): string => {
    const parts: string[] = [];

    // User description first
    if (appointment.description) {
        parts.push(appointment.description);
    }

    // Notes (public ones only)
    const publicNotes = appointment.notes?.filter(n => !n.isPrivate && n.content);
    if (publicNotes && publicNotes.length > 0) {
        parts.push('');
        parts.push('📝 Notes:');
        publicNotes.forEach(note => {
            const prefix = note.aiGenerated ? '🤖 ' : '• ';
            parts.push(`${prefix}${note.content}`);
        });
    }

    // Tags
    if (appointment.tags && appointment.tags.length > 0) {
        parts.push('');
        parts.push(`🏷️ ${appointment.tags.map(t => `#${t}`).join(' ')}`);
    }

    return parts.join('\n');
};

/**
 * Parse description back — extract user description (strip metadata)
 */
const parseGoogleDescription = (description?: string): { userDescription: string; tags: string[] } => {
    if (!description) return { userDescription: '', tags: [] };

    const lines = description.split('\n');
    const userLines: string[] = [];
    const tags: string[] = [];
    let inNotesSection = false;

    for (const line of lines) {
        // Detect notes section
        if (line.startsWith('📝 Notes:')) {
            inNotesSection = true;
            continue;
        }

        // Detect tags line
        if (line.startsWith('🏷️')) {
            const tagMatches = line.match(/#(\w+)/g);
            if (tagMatches) {
                tags.push(...tagMatches.map(t => t.replace('#', '')));
            }
            continue;
        }

        // If in notes section, skip note lines
        if (inNotesSection && (line.startsWith('• ') || line.startsWith('🤖 '))) {
            continue;
        }

        // Reset notes section on empty line after notes
        if (inNotesSection && line.trim() === '') {
            inNotesSection = false;
            continue;
        }

        if (!inNotesSection) {
            userLines.push(line);
        }
    }

    // Trim trailing empty lines from user description
    while (userLines.length > 0 && userLines[userLines.length - 1].trim() === '') {
        userLines.pop();
    }

    return {
        userDescription: userLines.join('\n'),
        tags,
    };
};

/**
 * Map Quimera color to Google colorId
 */
const quimeraColorToGoogleId = (color?: string): string | undefined => {
    if (!color) return undefined;
    return GOOGLE_COLOR_MAP[color]?.colorId;
};

/**
 * Map Google colorId to Quimera color name
 */
const googleColorIdToQuimera = (colorId?: string): string | undefined => {
    if (!colorId) return undefined;
    return GOOGLE_COLOR_REVERSE[colorId];
};

/**
 * Extract Google Meet URL from conferenceData
 */
const extractMeetUrl = (conferenceData?: GoogleCalendarEvent['conferenceData']): string | undefined => {
    if (!conferenceData?.entryPoints) return undefined;
    const videoEntry = conferenceData.entryPoints.find(ep => ep.entryPointType === 'video');
    return videoEntry?.uri;
};

/**
 * Map Quimera appointment status to Google event status
 */
const quimeraStatusToGoogleStatus = (status: string): string => {
    switch (status) {
        case 'cancelled': return 'cancelled';
        case 'confirmed':
        case 'completed':
        case 'in_progress':
            return 'confirmed';
        default: return 'confirmed';
    }
};

/**
 * Build reminder overrides from Quimera reminders
 */
const buildGoogleReminders = (reminders?: Appointment['reminders']): GoogleCalendarEvent['reminders'] => {
    if (!reminders || reminders.length === 0) {
        return { useDefault: true };
    }

    const enabledReminders = reminders.filter(r => r.enabled);
    if (enabledReminders.length === 0) {
        return { useDefault: true };
    }

    return {
        useDefault: false,
        overrides: enabledReminders.map(r => ({
            method: r.type === 'email' ? 'email' as const : 'popup' as const,
            minutes: r.minutesBefore,
        })),
    };
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
 * Crea un evento en Google Calendar with full field mapping
 */
export const createCalendarEvent = async (
    appointment: Appointment,
    calendarId: string = 'primary',
    createMeetLink: boolean = false
): Promise<GoogleCalendarEvent> => {
    if (!accessToken) throw new Error('Not authenticated');
    
    const event: GoogleCalendarEvent = {
        summary: appointment.title,
        description: buildGoogleDescription(appointment),
        status: quimeraStatusToGoogleStatus(appointment.status),
        start: {},
        end: {},
        reminders: buildGoogleReminders(appointment.reminders),
        // Store Quimera metadata in extendedProperties for clean round-trip
        extendedProperties: {
            private: {
                quimeraId: appointment.id,
                quimeraProjectId: appointment.projectId || '',
                quimeraType: appointment.type || '',
                quimeraPriority: appointment.priority || '',
                quimeraStatus: appointment.status || '',
                quimeraOrganizerId: appointment.organizerId || '',
            },
        },
    };

    // Date handling: all-day vs timed
    if (appointment.allDay) {
        // All-day events use date format (YYYY-MM-DD)
        const startDate = new Date(appointment.startDate.seconds * 1000);
        const endDate = new Date(appointment.endDate.seconds * 1000);
        // Google all-day end date is exclusive, so add 1 day
        endDate.setDate(endDate.getDate() + 1);
        event.start = { date: startDate.toISOString().split('T')[0] };
        event.end = { date: endDate.toISOString().split('T')[0] };
    } else {
        event.start = {
            dateTime: new Date(appointment.startDate.seconds * 1000).toISOString(),
            timeZone: appointment.timezone,
        };
        event.end = {
            dateTime: new Date(appointment.endDate.seconds * 1000).toISOString(),
            timeZone: appointment.timezone,
        };
    }

    // Location mapping
    if (appointment.location) {
        if (appointment.location.type === 'physical' && appointment.location.address) {
            const locationParts = [appointment.location.address];
            if (appointment.location.city) locationParts.push(appointment.location.city);
            if (appointment.location.state) locationParts.push(appointment.location.state);
            if (appointment.location.country) locationParts.push(appointment.location.country);
            event.location = locationParts.join(', ');
            if (appointment.location.roomName) {
                event.location += ` (${appointment.location.roomName})`;
            }
        } else if (appointment.location.meetingUrl && !createMeetLink) {
            // Only set URL as location if we're NOT creating a Meet link
            event.location = appointment.location.meetingUrl;
        } else if (appointment.location.type === 'phone' && appointment.location.phoneNumber) {
            event.location = `Tel: ${appointment.location.phoneNumber}`;
        }
    }

    // Attendees
    if (appointment.participants && appointment.participants.length > 0) {
        event.attendees = appointment.participants
            .filter(p => p.email) // Only include participants with email
            .map(p => ({
                email: p.email,
                displayName: p.name,
                responseStatus: p.status === 'accepted' ? 'accepted' as const :
                               p.status === 'declined' ? 'declined' as const :
                               p.status === 'tentative' ? 'tentative' as const :
                               'needsAction' as const,
            }));
    }

    // Color mapping
    const colorId = quimeraColorToGoogleId(appointment.color);
    if (colorId) {
        event.colorId = colorId;
    }
    
    // Add conference data if requested
    if (createMeetLink) {
        event.conferenceData = {
            createRequest: {
                requestId: `quimera-${appointment.id}-${Date.now()}`,
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
 * Actualiza un evento en Google Calendar with full field mapping
 */
export const updateCalendarEvent = async (
    eventId: string,
    appointment: Appointment,
    calendarId: string = 'primary'
): Promise<GoogleCalendarEvent> => {
    if (!accessToken) throw new Error('Not authenticated');
    
    const event: GoogleCalendarEvent = {
        summary: appointment.title,
        description: buildGoogleDescription(appointment),
        status: quimeraStatusToGoogleStatus(appointment.status),
        start: {},
        end: {},
        reminders: buildGoogleReminders(appointment.reminders),
        extendedProperties: {
            private: {
                quimeraId: appointment.id,
                quimeraProjectId: appointment.projectId || '',
                quimeraType: appointment.type || '',
                quimeraPriority: appointment.priority || '',
                quimeraStatus: appointment.status || '',
                quimeraOrganizerId: appointment.organizerId || '',
            },
        },
    };

    // Date handling
    if (appointment.allDay) {
        const startDate = new Date(appointment.startDate.seconds * 1000);
        const endDate = new Date(appointment.endDate.seconds * 1000);
        endDate.setDate(endDate.getDate() + 1);
        event.start = { date: startDate.toISOString().split('T')[0] };
        event.end = { date: endDate.toISOString().split('T')[0] };
    } else {
        event.start = {
            dateTime: new Date(appointment.startDate.seconds * 1000).toISOString(),
            timeZone: appointment.timezone,
        };
        event.end = {
            dateTime: new Date(appointment.endDate.seconds * 1000).toISOString(),
            timeZone: appointment.timezone,
        };
    }

    // Location
    if (appointment.location) {
        if (appointment.location.type === 'physical' && appointment.location.address) {
            const locationParts = [appointment.location.address];
            if (appointment.location.city) locationParts.push(appointment.location.city);
            if (appointment.location.state) locationParts.push(appointment.location.state);
            if (appointment.location.country) locationParts.push(appointment.location.country);
            event.location = locationParts.join(', ');
        } else if (appointment.location.meetingUrl) {
            event.location = appointment.location.meetingUrl;
        } else if (appointment.location.type === 'phone' && appointment.location.phoneNumber) {
            event.location = `Tel: ${appointment.location.phoneNumber}`;
        }
    }

    // Attendees
    if (appointment.participants && appointment.participants.length > 0) {
        event.attendees = appointment.participants
            .filter(p => p.email)
            .map(p => ({
                email: p.email,
                displayName: p.name,
                responseStatus: p.status === 'accepted' ? 'accepted' as const :
                               p.status === 'declined' ? 'declined' as const :
                               p.status === 'tentative' ? 'tentative' as const :
                               'needsAction' as const,
            }));
    }

    // Color
    const colorId = quimeraColorToGoogleId(appointment.color);
    if (colorId) {
        event.colorId = colorId;
    }
    
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
 * Convert a Google Calendar event to a full Quimera Appointment (partial)
 * Enhanced version with full field mapping
 */
export const googleEventToAppointment = (event: GoogleCalendarEvent): Partial<Appointment> => {
    // Parse dates — handle both all-day and timed events
    const isAllDay = !!event.start.date && !event.start.dateTime;
    let startSeconds: number;
    let endSeconds: number;
    let timezone: string;

    if (isAllDay) {
        // All-day events: date is YYYY-MM-DD
        startSeconds = new Date(event.start.date + 'T00:00:00').getTime() / 1000;
        // Google's all-day end date is exclusive, subtract 1 day for Quimera
        const endDate = new Date(event.end.date + 'T23:59:59');
        endDate.setDate(endDate.getDate() - 1);
        endSeconds = endDate.getTime() / 1000;
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } else {
        startSeconds = new Date(event.start.dateTime!).getTime() / 1000;
        endSeconds = new Date(event.end.dateTime!).getTime() / 1000;
        timezone = event.start.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    // Extract metadata from extendedProperties (clean round-trip)
    const extProps = event.extendedProperties?.private || {};
    const quimeraType = extProps.quimeraType || 'video_call';
    const quimeraPriority = extProps.quimeraPriority || 'medium';
    const quimeraStatus = extProps.quimeraStatus || 'scheduled';

    // Parse description — extract user text and tags
    const { userDescription, tags: descTags } = parseGoogleDescription(event.description);

    // Extract Google Meet link from conferenceData
    const meetUrl = extractMeetUrl(event.conferenceData);

    // Build location
    let locationType: 'virtual' | 'physical' | 'phone' = 'virtual';
    let locationData: Partial<Appointment['location']> = { type: 'virtual' };

    if (meetUrl) {
        locationData = {
            type: 'virtual',
            meetingUrl: meetUrl,
            platform: 'google_meet',
        };
    } else if (event.location) {
        if (event.location.startsWith('http')) {
            locationData = {
                type: 'virtual',
                meetingUrl: event.location,
            };
        } else if (event.location.startsWith('Tel:')) {
            locationData = {
                type: 'phone',
                phoneNumber: event.location.replace('Tel: ', ''),
            };
        } else {
            locationData = {
                type: 'physical',
                address: event.location,
            };
        }
    }

    // Map attendees to participants
    const participants = event.attendees?.map((a, i) => ({
        id: `google-${a.email}-${i}`,
        type: 'external' as const,
        name: a.displayName || a.email.split('@')[0],
        email: a.email,
        role: (a.organizer ? 'host' : 'attendee') as 'host' | 'attendee',
        status: a.responseStatus === 'accepted' ? 'accepted' as const :
                a.responseStatus === 'declined' ? 'declined' as const :
                a.responseStatus === 'tentative' ? 'tentative' as const :
                'pending' as const,
    })) || [];

    // Map color
    const quimeraColor = googleColorIdToQuimera(event.colorId);

    // Build reminders from Google's overrides
    const reminders = event.reminders?.overrides?.map((r, i) => ({
        id: `google-reminder-${i}`,
        type: (r.method === 'email' ? 'email' : 'push') as 'email' | 'push',
        minutesBefore: r.minutes,
        sent: false,
        enabled: true,
    })) || [];

    return {
        title: event.summary || 'Sin título',
        description: userDescription || undefined,
        type: quimeraType as Appointment['type'],
        status: quimeraStatus as Appointment['status'],
        priority: quimeraPriority as Appointment['priority'],
        startDate: { seconds: startSeconds, nanoseconds: 0 },
        endDate: { seconds: endSeconds, nanoseconds: 0 },
        timezone,
        allDay: isAllDay || undefined,
        location: locationData as Appointment['location'],
        participants,
        reminders: reminders as Appointment['reminders'],
        tags: descTags.length > 0 ? descTags : undefined,
        color: quimeraColor,
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
 * Enhanced: extracts Meet URL back into location
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
                // Update existing event
                event = await updateCalendarEvent(existingEventId, appointment, calendarId);
            } else {
                // Create new (event was deleted in Google)
                event = await createCalendarEvent(appointment, calendarId, createMeetLink);
            }
        } else {
            // Create new
            event = await createCalendarEvent(appointment, calendarId, createMeetLink);
        }

        // Extract Meet URL from the created/updated event
        const meetUrl = extractMeetUrl(event.conferenceData);
        
        const syncResult: GoogleCalendarSync = {
            enabled: true,
            googleEventId: event.id,
            googleCalendarId: calendarId,
            syncStatus: 'synced',
            lastSyncAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
            htmlLink: event.htmlLink,
            iCalUID: event.iCalUID,
            etag: event.etag,
        };

        // Return extra info for the caller to update location if needed
        if (meetUrl) {
            (syncResult as any)._meetUrl = meetUrl;
        }
        
        return syncResult;
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

/**
 * Import events from Google Calendar into Quimera
 * Returns partial appointments for events that don't already exist in Quimera
 */
export const importGoogleEvents = async (
    existingAppointments: Appointment[],
    calendarId: string = 'primary',
    daysBack: number = 30,
    daysForward: number = 90
): Promise<{
    newEvents: Partial<Appointment>[];
    updatedEvents: { appointmentId: string; updates: Partial<Appointment> }[];
    stats: { total: number; new: number; updated: number; unchanged: number };
}> => {
    if (!accessToken) throw new Error('Not authenticated');

    // Calculate date range
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - daysBack);
    timeMin.setHours(0, 0, 0, 0);

    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + daysForward);
    timeMax.setHours(23, 59, 59, 999);

    console.log(`📥 Importing Google Calendar events from ${timeMin.toLocaleDateString()} to ${timeMax.toLocaleDateString()}...`);

    const googleEvents = await getCalendarEvents(timeMin, timeMax, calendarId);
    console.log(`📅 Found ${googleEvents.length} events in Google Calendar`);

    // Build lookup maps
    const byGoogleEventId = new Map<string, Appointment>();
    const byICalUID = new Map<string, Appointment>();

    existingAppointments.forEach(apt => {
        if (apt.googleSync?.googleEventId) {
            byGoogleEventId.set(apt.googleSync.googleEventId, apt);
        }
        if (apt.googleSync?.iCalUID) {
            byICalUID.set(apt.googleSync.iCalUID, apt);
        }
    });

    const newEvents: Partial<Appointment>[] = [];
    const updatedEvents: { appointmentId: string; updates: Partial<Appointment> }[] = [];
    let unchanged = 0;

    for (const gEvent of googleEvents) {
        // Skip cancelled events
        if (gEvent.status === 'cancelled') continue;

        // Try to find existing Quimera appointment
        let existingApt = gEvent.id ? byGoogleEventId.get(gEvent.id) : undefined;
        if (!existingApt && gEvent.iCalUID) {
            existingApt = byICalUID.get(gEvent.iCalUID);
        }

        // Also check by extendedProperties.quimeraId
        const quimeraId = gEvent.extendedProperties?.private?.quimeraId;
        if (!existingApt && quimeraId) {
            existingApt = existingAppointments.find(a => a.id === quimeraId);
        }

        if (existingApt) {
            // Check if Google event was modified since last sync (compare etag)
            if (existingApt.googleSync?.etag && existingApt.googleSync.etag === gEvent.etag) {
                unchanged++;
                continue; // No changes
            }

            // Google event was modified — pull changes into Quimera
            const partialUpdate = googleEventToAppointment(gEvent);
            
            // Don't override certain Quimera-only fields
            delete partialUpdate.type; // Preserve Quimera type unless from extendedProperties
            delete partialUpdate.priority;
            delete partialUpdate.status;

            // Restore type/priority/status from extendedProperties if they exist
            const extProps = gEvent.extendedProperties?.private;
            if (extProps?.quimeraType) partialUpdate.type = extProps.quimeraType as any;
            if (extProps?.quimeraPriority) partialUpdate.priority = extProps.quimeraPriority as any;
            if (extProps?.quimeraStatus) partialUpdate.status = extProps.quimeraStatus as any;

            updatedEvents.push({
                appointmentId: existingApt.id,
                updates: partialUpdate,
            });
        } else {
            // New event from Google — import into Quimera
            const newApt = googleEventToAppointment(gEvent);
            newEvents.push(newApt);
        }
    }

    console.log(`📊 Import results: ${newEvents.length} new, ${updatedEvents.length} updated, ${unchanged} unchanged`);

    return {
        newEvents,
        updatedEvents,
        stats: {
            total: googleEvents.length,
            new: newEvents.length,
            updated: updatedEvents.length,
            unchanged,
        },
    };
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
