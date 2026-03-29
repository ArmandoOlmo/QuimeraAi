import json
import re

with open('components/dashboard/admin/LandingPageEditor.tsx', 'r') as f:
    code = f.read()

# Replace component name
code = code.replace("export function LandingPageEditor() {", "export function AgencyLandingEditor({ onBack }: { onBack?: () => void }) {")

# Add imports for Agency Landing Service
code = code.replace("import { doc, setDoc, getDoc } from '../../../firebase';", 
                    "import { doc, setDoc, getDoc } from '../../../firebase';\nimport { getAgencyLanding, saveAgencyLanding, publishAgencyLanding, unpublishAgencyLanding } from '../../../services/agencyLandingService';")

# Change type to handle agency sections
code = code.replace("import { LandingSection } from '../../../types';", 
                    "import { AgencyLandingSection as LandingSection } from '../../../types/agencyLanding';")

# Replace loadConfiguration logic inside useEffect
load_logic_old = """            try {
                const settingsRef = doc(db, 'globalSettings', 'landingPage');
                const settingsSnap = await getDoc(settingsRef);

                if (settingsSnap.exists()) {"""
load_logic_new = """            try {
                if (!currentTenant?.id) return;
                const data = await getAgencyLanding(currentTenant.id);

                if (data) {"""
code = code.replace(load_logic_old, load_logic_new)

# Replace extract data logic
extract_logic_old = "                    const data = settingsSnap.data();"
extract_logic_new = "                    // data is already the object"
code = code.replace(extract_logic_old, extract_logic_new)

# Add useTenant hook if it doesn't exist
if "useTenant()" not in code:
    code = code.replace("const { t } = useTranslation();", "const { t } = useTranslation();\n    const { currentTenant } = useTenant();")
if "import { useTenant }" not in code:
    code = code.replace("import { useTranslation } from 'react-i18next';", "import { useTranslation } from 'react-i18next';\nimport { useTenant } from '../../../contexts/tenant';")

# Replace save logic inside handleSave
save_logic_old = """            const settingsRef = doc(db, 'globalSettings', 'landingPage');
            const payload = {
                sections: sections,
                lastUpdated: new Date().toISOString(),
            };
            await setDoc(settingsRef, payload, { merge: true });"""
save_logic_new = """            if (!currentTenant) return;
            const payload = {
                sections: sections,
                lastUpdated: new Date().toISOString(),
            };
            await saveAgencyLanding(currentTenant.id, payload);"""
code = code.replace(save_logic_old, save_logic_new)

# Replace UPDATE_WEBSITE message event listener and poster
code = code.replace("'UPDATE_WEBSITE'", "'UPDATE_AGENCY_LANDING'")

# Replace IFRAME URLs
code = code.replace('src="/public-preview"', 'src="/agency-landing-preview"')
code = code.replace('src={`/public-preview?previewKey=${previewKey}`}', 'src={`/agency-landing-preview?previewKey=${previewKey}`}')
code = code.replace('const previewUrl = `/public-preview?previewKey=${previewKey}`;', 'const previewUrl = `/agency-landing-preview?previewKey=${previewKey}`;')

# Change component title
code = code.replace("t('admin.webEditor', 'Web Editor')", "t('admin.agencyEditor', 'Agency Landing Editor')")

# Change Publish string logic
publish_old = """await publishWebsite(currentTenant.id);"""
code = code.replace('publishWebsite(', 'publishAgencyLanding(')

# Strip out specific E-COMMERCE COMPONENT_TYPES
ecommerce_sections = [
    "{ id: 'products', type: 'products', label: t('landingEditor.components.products', 'Productos'), icon: <ShoppingBag size={18} /> },",
    "{ id: 'heroShopping', type: 'heroShopping', label: t('landingEditor.components.heroShopping', 'Hero Tienda'), icon: <ShoppingBag size={18} /> },",
    "{ id: 'shoppingCart', type: 'shoppingCart', label: t('landingEditor.components.shoppingCart', 'Carrito / Productos'), icon: <ShoppingCart size={18} /> },",
]
for p in ecommerce_sections:
    code = code.replace(p, "")
# And if it spans lines, we might need a regex
code = re.sub(r"\{\s*id:\s*'products'.*?\},?", "", code, flags=re.DOTALL)
code = re.sub(r"\{\s*id:\s*'heroShopping'.*?\},?", "", code, flags=re.DOTALL)
code = re.sub(r"\{\s*id:\s*'shoppingCart'.*?\},?", "", code, flags=re.DOTALL)


# Write to AgencyLandingEditor
with open('components/dashboard/agency/landing/AgencyLandingEditor.tsx', 'w') as f:
    f.write(code)

print("Mapped AgencyLandingEditor successfully.")

# Now for PublicWebsitePreview -> AgencyLandingPreview
with open('components/PublicWebsitePreview.tsx', 'r') as f:
    preview = f.read()

preview = preview.replace("export function PublicWebsitePreview() {", "export function AgencyLandingPreview() {")
preview = preview.replace("'UPDATE_WEBSITE'", "'UPDATE_AGENCY_LANDING'")
preview = preview.replace("export default PublicWebsitePreview;", "export default AgencyLandingPreview;")

# Add useTenant for fallback? No, the preview uses message events from the Editor!
# Just rewrite destination
with open('components/AgencyLandingPreview.tsx', 'w') as f:
    f.write(preview)

print("Mapped AgencyLandingPreview successfully.")

# Now for LandingPage -> AgencyLandingPage
with open('components/LandingPage.tsx', 'r') as f:
    page = f.read()

page = page.replace("export function LandingPage() {", "export function AgencyLandingPage({ config }: { config: any }) {")
page = page.replace("export default LandingPage;", "export default AgencyLandingPage;")

# Remove E-commerce from LandingPage?
# We'll just leave them but they won't trigger if the Editor omits them.

with open('components/agency-landing/AgencyLandingPage.tsx', 'w') as f:
    f.write(page)

print("Mapped AgencyLandingPage successfully.")
