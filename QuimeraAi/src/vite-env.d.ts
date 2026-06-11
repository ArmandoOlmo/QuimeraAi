/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_GOOGLE_CLIENT_ID: string;
    readonly VITE_GOOGLE_CLIENT_SECRET: string;
    readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly VITE_AI_PROXY_URL?: string;
    readonly VITE_VIDEO_PROXY_URL?: string;
    readonly VITE_MCP_API_BASE_URL?: string;
    // Security: Owner/Admin email from environment variable
    readonly VITE_OWNER_EMAIL: string;
    readonly MODE: string;
    readonly DEV: boolean;
    readonly PROD: boolean;
    readonly SSR: boolean;
    [key: string]: string | boolean | undefined;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}








