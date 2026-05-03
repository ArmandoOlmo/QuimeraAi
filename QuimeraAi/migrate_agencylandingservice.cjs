const fs = require('fs');
const path = '/Users/armandoolmo/Desktop/QuimeraAi/QuimeraAi/services/agencyLandingService.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/import\s*\{\s*doc,\s*getDoc,\s*setDoc,\s*updateDoc,\s*deleteDoc,\s*collection,\s*query,\s*where,\s*getDocs,\s*serverTimestamp,\s*Timestamp,?\s*\}\s*from\s*'firebase\/firestore';\n/, "");
content = content.replace(/import \{ db \} from '\.\.\/firebase';\n/, "import { supabase } from '../supabase';\n");
content = content.replace(/const COLLECTION_NAME = 'agencyLandings';/, "const TABLE_NAME = 'agency_landings';");

// Rewrite getAgencyLanding
content = content.replace(
/export async function getAgencyLanding\(tenantId: string\): Promise<AgencyLandingConfig \| null> \{[\s\S]*?catch \(error\) \{[\s\S]*?throw error;\n    \}\n\}/,
`export async function getAgencyLanding(tenantId: string): Promise<AgencyLandingConfig | null> {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('tenant_id', tenantId)
            .single();
            
        if (error) {
            if (error.code === 'PGRST116') return null; // not found
            throw error;
        }

        if (!data) return null;

        // Map snake_case to camelCase
        return {
            id: data.id,
            tenantId: data.tenant_id,
            ...data
        } as AgencyLandingConfig;
    } catch (error) {
        console.error('Error fetching agency landing:', error);
        throw error;
    }
}`
);

// Rewrite getAgencyLandingById
content = content.replace(
/export async function getAgencyLandingById\(landingId: string\): Promise<AgencyLandingConfig \| null> \{[\s\S]*?catch \(error\) \{[\s\S]*?throw error;\n    \}\n\}/,
`export async function getAgencyLandingById(landingId: string): Promise<AgencyLandingConfig | null> {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('id', landingId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        if (!data) return null;

        return {
            id: data.id,
            tenantId: data.tenant_id,
            ...data
        } as AgencyLandingConfig;
    } catch (error) {
        console.error('Error fetching agency landing by ID:', error);
        throw error;
    }
}`
);

// Rewrite saveAgencyLanding
content = content.replace(
/export async function saveAgencyLanding\([\s\S]*?\): Promise<string> \{[\s\S]*?catch \(error\) \{[\s\S]*?throw error;\n    \}\n\}/,
`export async function saveAgencyLanding(
    tenantId: string,
    config: Partial<AgencyLandingConfig>,
    userId?: string
): Promise<string> {
    try {
        const existing = await getAgencyLanding(tenantId);
        
        const payload = {
            ...config,
            tenant_id: tenantId,
            updated_by: userId || null,
        };
        
        // Remove id and camelCase fields that are mapped to snake_case
        delete payload.id;
        delete payload.tenantId;

        if (existing?.id) {
            const { error } = await supabase
                .from(TABLE_NAME)
                .update(payload)
                .eq('id', existing.id);
                
            if (error) throw error;
            return existing.id;
        } else {
            const newConfig = createDefaultAgencyLandingConfig(tenantId);
            const insertPayload = {
                ...newConfig,
                ...payload,
            };
            delete insertPayload.id;
            delete insertPayload.tenantId;

            const { data, error } = await supabase
                .from(TABLE_NAME)
                .insert(insertPayload)
                .select()
                .single();
                
            if (error) throw error;
            return data.id;
        }
    } catch (error) {
        console.error('Error saving agency landing:', error);
        throw error;
    }
}`
);

// Rewrite saveAgencyLandingSections
content = content.replace(
/export async function saveAgencyLandingSections\([\s\S]*?\): Promise<void> \{[\s\S]*?catch \(error\) \{[\s\S]*?throw error;\n    \}\n\}/,
`export async function saveAgencyLandingSections(
    tenantId: string,
    sections: AgencyLandingSection[],
    userId?: string
): Promise<void> {
    try {
        const existing = await getAgencyLanding(tenantId);
        
        if (!existing?.id) {
            await saveAgencyLanding(tenantId, { sections }, userId);
            return;
        }

        const { error } = await supabase
            .from(TABLE_NAME)
            .update({
                sections,
                updated_by: userId || null,
            })
            .eq('id', existing.id);
            
        if (error) throw error;
    } catch (error) {
        console.error('Error saving agency landing sections:', error);
        throw error;
    }
}`
);

// Rewrite publishAgencyLanding
content = content.replace(
/export async function publishAgencyLanding\(tenantId: string\): Promise<void> \{[\s\S]*?catch \(error\) \{[\s\S]*?throw error;\n    \}\n\}/,
`export async function publishAgencyLanding(tenantId: string): Promise<void> {
    try {
        const existing = await getAgencyLanding(tenantId);
        
        if (!existing?.id) {
            throw new Error('Landing page not found');
        }

        const { error } = await supabase
            .from(TABLE_NAME)
            .update({
                isPublished: true,
                publishedAt: new Date().toISOString()
            })
            .eq('id', existing.id);
            
        if (error) throw error;
    } catch (error) {
        console.error('Error publishing agency landing:', error);
        throw error;
    }
}`
);

// Rewrite unpublishAgencyLanding
content = content.replace(
/export async function unpublishAgencyLanding\(tenantId: string\): Promise<void> \{[\s\S]*?catch \(error\) \{[\s\S]*?throw error;\n    \}\n\}/,
`export async function unpublishAgencyLanding(tenantId: string): Promise<void> {
    try {
        const existing = await getAgencyLanding(tenantId);
        
        if (!existing?.id) {
            throw new Error('Landing page not found');
        }

        const { error } = await supabase
            .from(TABLE_NAME)
            .update({
                isPublished: false,
            })
            .eq('id', existing.id);
            
        if (error) throw error;
    } catch (error) {
        console.error('Error unpublishing agency landing:', error);
        throw error;
    }
}`
);

// Rewrite deleteAgencyLanding
content = content.replace(
/export async function deleteAgencyLanding\(tenantId: string\): Promise<void> \{[\s\S]*?catch \(error\) \{[\s\S]*?throw error;\n    \}\n\}/,
`export async function deleteAgencyLanding(tenantId: string): Promise<void> {
    try {
        const existing = await getAgencyLanding(tenantId);
        
        if (!existing?.id) {
            return;
        }

        const { error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('id', existing.id);
            
        if (error) throw error;
    } catch (error) {
        console.error('Error deleting agency landing:', error);
        throw error;
    }
}`
);

// Rewrite isSubdomainAvailable
content = content.replace(
/export async function isSubdomainAvailable\(subdomain: string, excludeTenantId\?: string\): Promise<boolean> \{[\s\S]*?catch \(error\) \{[\s\S]*?throw error;\n    \}\n\}/,
`export async function isSubdomainAvailable(subdomain: string, excludeTenantId?: string): Promise<boolean> {
    try {
        const normalizedSubdomain = subdomain.toLowerCase().trim();
        
        const reserved = ['www', 'app', 'api', 'admin', 'dashboard', 'login', 'signup', 'register'];
        if (reserved.includes(normalizedSubdomain)) {
            return false;
        }

        // Supabase jsonb query for domain.subdomain
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('tenant_id')
            .eq('domain->>subdomain', normalizedSubdomain);
            
        if (error) throw error;
        
        if (!data || data.length === 0) {
            return true;
        }

        if (excludeTenantId) {
            return data.every(row => row.tenant_id === excludeTenantId);
        }

        return false;
    } catch (error) {
        console.error('Error checking subdomain availability:', error);
        throw error;
    }
}`
);

// Rewrite reserveSubdomain
content = content.replace(
/export async function reserveSubdomain\(tenantId: string, subdomain: string\): Promise<boolean> \{[\s\S]*?catch \(error\) \{[\s\S]*?throw error;\n    \}\n\}/,
`export async function reserveSubdomain(tenantId: string, subdomain: string): Promise<boolean> {
    try {
        const isAvailable = await isSubdomainAvailable(subdomain, tenantId);
        
        if (!isAvailable) {
            return false;
        }

        const existing = await getAgencyLanding(tenantId);
        
        if (!existing?.id) {
            await saveAgencyLanding(tenantId, {
                domain: { subdomain: subdomain.toLowerCase().trim() },
            });
        } else {
            const domain = {
                ...existing.domain,
                subdomain: subdomain.toLowerCase().trim()
            };
            const { error } = await supabase
                .from(TABLE_NAME)
                .update({ domain })
                .eq('id', existing.id);
                
            if (error) throw error;
        }

        return true;
    } catch (error) {
        console.error('Error reserving subdomain:', error);
        throw error;
    }
}`
);

// Rewrite getAgencyLandingBySubdomain
content = content.replace(
/export async function getAgencyLandingBySubdomain\(subdomain: string\): Promise<AgencyLandingConfig \| null> \{[\s\S]*?catch \(error\) \{[\s\S]*?throw error;\n    \}\n\}/,
`export async function getAgencyLandingBySubdomain(subdomain: string): Promise<AgencyLandingConfig | null> {
    try {
        const normalizedSubdomain = subdomain.toLowerCase().trim();
        
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('domain->>subdomain', normalizedSubdomain)
            .eq('isPublished', true)
            .single();
            
        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        if (!data) return null;

        return {
            id: data.id,
            tenantId: data.tenant_id,
            ...data
        } as AgencyLandingConfig;
    } catch (error) {
        console.error('Error fetching agency landing by subdomain:', error);
        throw error;
    }
}`
);

// Rewrite getAgencyLandingByCustomDomain
content = content.replace(
/export async function getAgencyLandingByCustomDomain\(domain: string\): Promise<AgencyLandingConfig \| null> \{[\s\S]*?catch \(error\) \{[\s\S]*?throw error;\n    \}\n\}/,
`export async function getAgencyLandingByCustomDomain(domain: string): Promise<AgencyLandingConfig | null> {
    try {
        const normalizedDomain = domain.toLowerCase().trim();
        
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('domain->>customDomain', normalizedDomain)
            .eq('isPublished', true)
            .single();
            
        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        if (!data) return null;

        return {
            id: data.id,
            tenantId: data.tenant_id,
            ...data
        } as AgencyLandingConfig;
    } catch (error) {
        console.error('Error fetching agency landing by custom domain:', error);
        throw error;
    }
}`
);

// Rewrite updateAgencyTheme
content = content.replace(
/export async function updateAgencyTheme\([\s\S]*?\): Promise<void> \{[\s\S]*?catch \(error\) \{[\s\S]*?throw error;\n    \}\n\}/,
`export async function updateAgencyTheme(
    tenantId: string,
    theme: Partial<AgencyLandingConfig['theme']>
): Promise<void> {
    try {
        const existing = await getAgencyLanding(tenantId);
        
        if (!existing?.id) {
            throw new Error('Landing page not found');
        }

        const updatedTheme = {
            ...existing.theme,
            ...theme,
            globalColors: {
                ...existing.theme?.globalColors,
                ...theme.globalColors,
            },
        };

        const { error } = await supabase
            .from(TABLE_NAME)
            .update({ theme: updatedTheme })
            .eq('id', existing.id);
            
        if (error) throw error;
    } catch (error) {
        console.error('Error updating agency theme:', error);
        throw error;
    }
}`
);

// Rewrite updateAgencyBranding
content = content.replace(
/export async function updateAgencyBranding\([\s\S]*?\): Promise<void> \{[\s\S]*?catch \(error\) \{[\s\S]*?throw error;\n    \}\n\}/,
`export async function updateAgencyBranding(
    tenantId: string,
    branding: Partial<AgencyLandingConfig['branding']>
): Promise<void> {
    try {
        const existing = await getAgencyLanding(tenantId);
        
        if (!existing?.id) {
            throw new Error('Landing page not found');
        }

        const updatedBranding = {
            ...existing.branding,
            ...branding,
        };

        const { error } = await supabase
            .from(TABLE_NAME)
            .update({ branding: updatedBranding })
            .eq('id', existing.id);
            
        if (error) throw error;
    } catch (error) {
        console.error('Error updating agency branding:', error);
        throw error;
    }
}`
);

// Rewrite updateAgencySEO
content = content.replace(
/export async function updateAgencySEO\([\s\S]*?\): Promise<void> \{[\s\S]*?catch \(error\) \{[\s\S]*?throw error;\n    \}\n\}/,
`export async function updateAgencySEO(
    tenantId: string,
    seo: Partial<AgencyLandingConfig['seo']>
): Promise<void> {
    try {
        const existing = await getAgencyLanding(tenantId);
        
        if (!existing?.id) {
            throw new Error('Landing page not found');
        }

        const updatedSEO = {
            ...existing.seo,
            ...seo,
        };

        const { error } = await supabase
            .from(TABLE_NAME)
            .update({ seo: updatedSEO })
            .eq('id', existing.id);
            
        if (error) throw error;
    } catch (error) {
        console.error('Error updating agency SEO:', error);
        throw error;
    }
}`
);

fs.writeFileSync(path, content);
console.log('Migrated agencyLandingService.ts');
