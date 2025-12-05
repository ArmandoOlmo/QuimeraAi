
import { LLMPrompt } from '../types';

type DefaultPrompt = Omit<LLMPrompt, 'id' | 'createdAt' | 'updatedAt'>;

export const defaultPrompts: DefaultPrompt[] = [
  // Onboarding
  {
    name: 'onboarding-summary',
    area: 'Onboarding',
    description: 'Generates a one-sentence business summary. Used in the Onboarding Wizard (Step 1).',
    template: `You are a helpful business copywriter. Based on the following business information:\n- Business Name: {{businessName}}\n- Industry: {{industry}}\n\nWrite a compelling and concise one-sentence summary for this business.`,
    model: 'gemini-2.5-flash',
    version: 1,
  },
  {
    name: 'onboarding-audience',
    area: 'Onboarding',
    description: 'Generates a target audience description. Used in the Onboarding Wizard.',
    template: `You are a helpful business copywriter. Based on the following business information:\n- Business Name: {{businessName}}\n- Industry: {{industry}}\n\nDescribe the ideal target audience for this business in one paragraph.`,
    model: 'gemini-2.5-flash',
    version: 1,
  },
  {
    name: 'onboarding-offerings',
    area: 'Onboarding',
    description: 'Generates a list of top 3 products/services. Used in the Onboarding Wizard.',
    template: `You are a helpful business copywriter. Based on the following business information:\n- Business Name: {{businessName}}\n- Industry: {{industry}}\n\nList the top 3 products or services this business offers, each with a brief one-sentence description. Format it as a simple list.`,
    model: 'gemini-2.5-flash',
    version: 1,
  },
  {
    name: 'onboarding-uvp',
    area: 'Onboarding',
    description: 'Generates unique value proposition during onboarding.',
    template: `You are a strategic brand consultant. Based on this business:\n- Business Name: {{businessName}}\n- Industry: {{industry}}\n- Summary: {{summary}}\n\nCreate a compelling unique value proposition (2-3 sentences) that clearly explains what makes this business different and valuable. Focus on specific benefits and differentiators.`,
    model: 'gemini-2.5-flash',
    version: 1,
  },
  {
    name: 'onboarding-history',
    area: 'Onboarding',
    description: 'Generates company history during onboarding.',
    template: `You are a compelling storyteller. Based on this business:\n- Business Name: {{businessName}}\n- Industry: {{industry}}\n- Summary: {{summary}}\n\nWrite a brief, engaging company history (3-4 sentences) that inspires trust and credibility. Make it authentic and human.`,
    model: 'gemini-2.5-flash',
    version: 1,
  },
  {
    name: 'onboarding-core-values',
    area: 'Onboarding',
    description: 'Generates core values during onboarding.',
    template: `You are a brand strategist. Based on this business:\n- Business Name: {{businessName}}\n- Industry: {{industry}}\n- Target Audience: {{audience}}\n\nGenerate 4-5 authentic core values that would resonate with this business and its audience. Return as a simple comma-separated list (e.g., "Innovation, Quality, Integrity, Customer Success, Sustainability").`,
    model: 'gemini-2.5-flash',
    version: 1,
  },
  {
    name: 'onboarding-goal',
    area: 'Onboarding',
    description: 'Generates business focus/goal during onboarding.',
    template: `You are a business strategist. Based on this business:\n- Business Name: {{businessName}}\n- Industry: {{industry}}\n- Summary: {{summary}}\n\nWhat is the main business focus or goal for this website? Respond with a short, clear phrase (5-10 words) describing the primary objective. Examples: "Generate qualified leads for our services", "Sell products directly online", "Showcase portfolio and attract clients", "Build brand awareness and credibility", "Book appointments and consultations".`,
    model: 'gemini-2.5-flash',
    version: 1,
  },
  {
    name: 'onboarding-color-vibe',
    area: 'Onboarding',
    description: 'Generates color vibe recommendation during onboarding.',
    template: `You are a brand color expert. Based on this business:\n- Business Name: {{businessName}}\n- Industry: {{industry}}\n- Summary: {{summary}}\n- Aesthetic: {{aesthetic}}\n\nRecommend a color vibe that best represents this brand. Respond with a short, descriptive phrase (3-5 words) that captures the emotional tone. Examples: "Trustworthy Blue", "Energetic Orange", "Sophisticated Navy", "Fresh Green", "Bold Crimson", "Warm Earthy Tones", "Cool Modern Gray", "Vibrant Purple", "Elegant Gold".`,
    model: 'gemini-2.5-flash',
    version: 1,
  },
  {
    name: 'onboarding-products',
    area: 'Onboarding',
    description: 'Generates product/service suggestions during onboarding.',
    template: `You are a business consultant. Based on this business:\n- Business Name: {{businessName}}\n- Industry: {{industry}}\n- Summary: {{summary}}\n- Key Offerings: {{offerings}}\n\nGenerate 3-4 main products or services this business would offer. For each product/service, provide:\n- A clear name (2-4 words)\n- A compelling description (1-2 sentences)\n- A realistic price or pricing model\n\nReturn ONLY valid JSON in this exact format:\n[\n  {\n    "name": "Product Name",\n    "description": "Brief description of what this is and its benefits",\n    "price": "$99" or "Contact for pricing" or "$29/month"\n  }\n]\n\nMake the products/services specific, realistic, and valuable for the target audience.`,
    model: 'gemini-2.5-flash',
    version: 1,
  },
  {
    name: 'onboarding-faqs',
    area: 'Onboarding',
    description: 'Generates frequently asked questions during onboarding.',
    template: `You are a customer service expert. Based on this business:\n- Business Name: {{businessName}}\n- Industry: {{industry}}\n- Summary: {{summary}}\n- Target Audience: {{audience}}\n\nGenerate 5-6 frequently asked questions that potential customers would have. Each FAQ should:\n- Address common concerns or questions specific to {{industry}}\n- Provide clear, helpful answers (2-3 sentences)\n- Build trust and address objections\n- Be relevant to the business and its offerings\n\nReturn ONLY valid JSON in this exact format:\n[\n  {\n    "question": "Specific question customers would ask?",\n    "answer": "Clear, helpful answer that builds trust and addresses the concern."\n  }\n]\n\nMake the FAQs diverse, covering pricing, process, guarantees, timing, and quality concerns.`,
    model: 'gemini-2.5-flash',
    version: 1,
  },
  {
    name: 'onboarding-testimonials',
    area: 'Onboarding',
    description: 'Generates realistic customer testimonials during onboarding.',
    template: `You are a marketing copywriter specializing in authentic testimonials. Based on this business:\n- Business Name: {{businessName}}\n- Industry: {{industry}}\n- Summary: {{summary}}\n- Target Audience: {{audience}}\n\nGenerate 3 realistic and compelling customer testimonials. Each testimonial should:\n- Sound authentic and specific (not generic)\n- Mention concrete benefits or results\n- Include realistic customer details\n- Be 2-3 sentences long\n\nReturn ONLY valid JSON in this exact format:\n[\n  {\n    "quote": "Specific testimonial text that sounds authentic and mentions real benefits",\n    "author": "First Last Name",\n    "role": "Job Title",\n    "company": "Company Name"\n  }\n]\n\nMake the testimonials diverse (different industries, roles, benefits mentioned) and believable.`,
    model: 'gemini-2.5-flash',
    version: 1,
  },
  {
    name: 'onboarding-design-plan',
    area: 'Onboarding',
    description: 'Acts as a Senior Art Director to define a strict Design System based on aesthetic choice.',
    template: `You are a Senior Art Director at a top-tier digital agency. Your job is to define a rigorous Design System for a new website.

**Client Brief:**
- Name: {{businessName}}, Industry: {{industry}}
- Summary: {{summary}}
- Aesthetic Direction: **{{aesthetic}}**
- Color Vibe: {{colorVibe}}
- Business Focus: {{goal}}

**Available Components:**
{{availableComponents}}

**Custom Components Available:**
{{customComponents}}

**IMPORTANT RULES FOR COMPONENTS:**
1. You MUST only use components from the "Available Components" list above
2. You MAY include custom components if they fit the design
3. DO NOT include any components not in the available list

**INTELLIGENT COMPONENT SELECTION:**
Choose components that best fit the {{industry}} and {{summary}}. Consider:
- Hero section is ALWAYS required as the entry point
- For service businesses: Consider 'services', 'team', 'testimonials', 'leads'
- For e-commerce/products: Consider 'features', 'pricing', 'testimonials'
- For portfolios/agencies: Consider 'portfolio', 'services', 'team'
- For restaurants/food: Consider 'menu', 'slideshow', 'leads'
- For any business: 'faq' builds trust, 'newsletter' grows audience, 'leads' captures contacts
- DO NOT include 'cta' (Call to Action) section - users can add it later if needed
- Select 5-8 components that create a complete, cohesive experience
- Footer is ALWAYS required and will be added automatically

**Available Font Stacks (Pick the best match for {{aesthetic}}):**
- 'inter', 'plus-jakarta-sans', 'outfit' (Modern/Tech)
- 'playfair-display', 'merriweather', 'lora' (Elegant/Editorial)
- 'oswald', 'anton', 'bebas-neue' (Bold/Loud)
- 'lato', 'open-sans', 'roboto' (Neutral/Corporate)
- 'space-grotesk', 'syne' (Futuristic)

**Available Component Settings (use these EXACT values):**
- cardBorderRadius: 'none' | 'md' | 'xl' | 'full'
- buttonBorderRadius: 'none' | 'md' | 'xl' | 'full'
- headerLayout: 'classic' | 'minimal' | 'center' | 'stack' (DEFAULT: 'classic')
- headerStyle: 'sticky-solid' (ALWAYS use 'sticky-solid' - header must have solid brand color background)
- heroImageStyle: 'default' | 'glow' | 'float' | 'hexagon' | 'polaroid'
- heroImagePosition: 'left' | 'right'

**Component Variant Options (for componentOrder selection):**
- hero: Main landing section (REQUIRED)
- features: Key benefits display [variants: classic, modern, bento-premium]
- services: Services showcase [variants: cards, grid, minimal]
- testimonials: Customer reviews [variants: classic, minimal-cards, glassmorphism, gradient-glow, floating-cards]
- pricing: Pricing tiers [variants: classic, gradient, glassmorphism, minimalist]
- faq: FAQ section [variants: classic, cards, gradient, minimal]
- team: Team members [variants: classic, cards, minimal, overlay]
- portfolio: Work showcase
- slideshow: Image gallery [variants: classic, kenburns, cards3d, thumbnails]
- menu: Restaurant menu [variants: classic, modern-grid, elegant-list]
- leads: Contact form [variants: classic, split-gradient, floating-glass, minimal-border]
- newsletter: Email signup
- map: Location map [variants: modern, minimal, dark-tech, retro, night]
- video: Video embed
- howItWorks: Process steps
- banner: Promotional banner [variants: classic, gradient-overlay, side-text, centered]
- footer: Site footer (REQUIRED - always last)

**CRITICAL COLOR RULES:**
1. "primary" = BRAND COLOR = Used for header background, buttons, CTAs, accents
2. "secondary" = Complementary color for variety and balance
3. "background" = Section backgrounds (should contrast well with text)
4. "text" = MUST have high contrast with background for readability
5. For DARK backgrounds: text MUST be #ffffff or very light (luminance > 0.8)
6. For LIGHT backgrounds: text MUST be #1a1a1a or very dark (luminance < 0.2)
7. Buttons always use primary brand color with contrasting text

**Task:**
Generate a JSON object defining the visual strategy.
{
  "palette": { 
      "primary": "Hex Code (BRAND COLOR - header, buttons, CTAs)", 
      "secondary": "Hex Code (Complementary for accents)", 
      "accent": "Hex Code (Pop color for highlights)", 
      "background": "Hex Code (Section backgrounds)", 
      "text": "Hex Code (MUST contrast with background - white for dark bg, black for light bg)" 
  },
  "typography": { 
      "header": "font-family-slug", 
      "body": "font-family-slug", 
      "button": "font-family-slug" 
  },
  "uiShapes": {
      "cardBorderRadius": "size",
      "buttonBorderRadius": "size"
  },
  "layoutStrategy": {
      "headerLayout": "classic",
      "headerStyle": "sticky-solid",
      "heroImageStyle": "type",
      "heroImagePosition": "left | right"
  },
  "componentOrder": [Components selected based on {{goal}} - see MANDATORY rules above. MUST always end with 'footer'],
  "imageStyleDescription": "Detailed Stable Diffusion style prompt describing lighting, composition, and mood matching {{aesthetic}}."
}

**FOOTER RULE (MANDATORY):**
- The 'footer' component MUST ALWAYS be included as the LAST item in componentOrder
- Footer is required on ALL pages, including articles

**AESTHETIC RULES:**
- If Aesthetic is 'Minimalist': Black/white/gray palette, sharp or small radius, 'minimal' header layout. Text: #1a1a1a on light, #ffffff on dark.
- If Aesthetic is 'Bold': High contrast vivid colors, large typography ('oswald'), sharp corners, 'classic' header layout. Ensure text pops against background.
- If Aesthetic is 'Elegant': Serif fonts, gold/cream/navy palette, 'classic' header layout. Refined contrast ratios.
- If Aesthetic is 'Tech': Dark mode (#0f172a background), neon/cyan accents, #ffffff text. 'glow' image styles, 'inter' font, 'classic' header layout.
- If Aesthetic is 'Playful': Vibrant colors, rounded shapes, 'classic' header layout. Ensure playful colors still have good text contrast.
- If Aesthetic is 'Organic': Earth tones (greens, browns, creams), 'classic' header layout. Natural palette with readable text.

**HEADER & FOOTER RULES (MANDATORY):**
- headerStyle MUST always be 'sticky-solid' - the header will use the primary brand color as solid background, never transparent.
- Header and Footer MUST have the SAME background color (primary brand color)
- Both header and footer backgrounds must be SOLID colors, never transparent or gradient
- Page background should default to white (#ffffff) or a very light neutral color to provide contrast`,
    model: 'gemini-3-pro-preview',
    version: 4,
  },
  {
    name: 'onboarding-website-json',
    area: 'Onboarding',
    description: 'Generates the final website JSON, enforcing the Design Plan across all component parameters with REAL client information.',
    template: `You are a Full-Stack Web Developer and Copywriter. You must build a complete, PERSONALIZED website configuration JSON using REAL client data.

**CRITICAL RULES:**
1. Use REAL information provided - DO NOT generate placeholder content
2. If real testimonials are provided → use them VERBATIM
3. If products/services provided → create accurate sections with real data
4. If contact info provided → populate footer and contact forms with real data
5. If company history provided → incorporate into hero subheadline or about section
6. If unique value proposition provided → use as primary messaging
7. Only create placeholder content for fields where NO real data was provided

**Client Information:**
- Business Name: {{businessName}}
- Industry: {{industry}}
- Summary: {{summary}}
- Target Audience: {{audience}}
- Key Offerings: {{offerings}}
- Business Focus: {{goal}}
- Aesthetic: {{aesthetic}}

**Detailed Information (USE THESE!):**
- Company History: {{companyHistory}}
- Unique Value Proposition: {{uniqueValueProposition}}
- Core Values: {{coreValues}}
- Years in Business: {{yearsInBusiness}}

**Products/Services (USE IF PROVIDED):**
{{products}}

**Real Testimonials (USE EXACTLY AS PROVIDED):**
{{testimonials}}

**Contact Information (USE IN FOOTER/LEADS):**
{{contactInfo}}

**Brand Guidelines:**
{{brandGuidelines}}

**Design Plan:**
{{designPlan}}

**VALID COMPONENT VARIANTS (use these exact values):**
- hero.heroVariant: 'classic' | 'modern' | 'gradient' | 'fitness'
- hero.imageStyle: 'default' | 'glow' | 'float' | 'hexagon' | 'polaroid'
- hero.imagePosition: 'left' | 'right'
- features.featuresVariant: 'classic' | 'modern' | 'bento-premium'
- testimonials.testimonialsVariant: 'classic' | 'minimal-cards' | 'glassmorphism' | 'gradient-glow' | 'floating-cards'
- pricing.pricingVariant: 'classic' | 'gradient' | 'glassmorphism' | 'minimalist'
- faq.faqVariant: 'classic' | 'cards' | 'gradient' | 'minimal'
- services.servicesVariant: 'cards' | 'grid' | 'minimal'
- team.teamVariant: 'classic' | 'cards' | 'minimal' | 'overlay'
- slideshow.slideshowVariant: 'classic' | 'kenburns' | 'cards3d' | 'thumbnails'
- leads.leadsVariant: 'classic' | 'split-gradient' | 'floating-glass' | 'minimal-border'
- menu.menuVariant: 'classic' | 'modern-grid' | 'elegant-list'
- map.mapVariant: 'modern' | 'minimal' | 'dark-tech' | 'retro' | 'night'
- banner.bannerVariant: 'classic' | 'gradient-overlay' | 'side-text' | 'centered'
- header.layout: 'classic' | 'minimal' | 'center' | 'stack'
- header.style: 'sticky-solid' | 'sticky-transparent' | 'floating'

**VALID SIZE OPTIONS:**
- paddingY/paddingX: 'sm' | 'md' | 'lg'
- fontSize: 'sm' | 'md' | 'lg' | 'xl'
- borderRadius: 'none' | 'md' | 'xl' | 'full'

**VALID SERVICE ICONS:**
code, terminal, cpu, database, server, cloud, globe, smartphone, brush, palette, megaphone, trending-up, chart, target, briefcase, mail, phone, users, heart, star, wrench, settings, package, shopping-cart, gift, truck, file, book, map-pin, home, building, clock, calendar, shield, lock, check-circle, utensils, coffee, wine, zap, award, trophy, rocket, lightbulb, sparkles

**VALID BADGE ICONS (for hero.badgeIcon):**
sparkles, zap, star, award, trophy, rocket, lightbulb, heart, check-circle, shield, target, trending-up

**Instructions:**
1.  **Apply the Design Plan:**
    - Use 'palette' colors for global theme AND individual sections
    - Apply 'typography' choices consistently
    - Use 'uiShapes' for border radius
    - Apply 'layoutStrategy' to Header and Hero

2.  **Personalization Strategy:**
    - Hero headline: Use {{uniqueValueProposition}} if provided, otherwise create compelling headline mentioning {{businessName}}
    - Hero subheadline: Incorporate {{companyHistory}} or {{summary}}
    - Hero CTA: Create action-oriented button text that aligns with {{goal}} and {{industry}}
    - Features: Map from {{offerings}} and {{products}} data
    - Testimonials: Use {{testimonials}} data EXACTLY - do not modify quotes
    - Services/Pricing: Build from {{products}} data if available
    - Footer: Include ALL contact info from {{contactInfo}}
    - FAQ: Create questions relevant to {{industry}} and common customer concerns
    - CTA: Write compelling copy that encourages action based on business context

3.  **Content Quality:**
    - Write in professional, engaging tone
    - Vary section backgrounds for visual rhythm
    - Create specific image prompts using imageStyleDescription
    - Ensure copy reflects {{aesthetic}} (e.g., Bold = powerful language, Elegant = refined language)

4.  **Color Consistency Rules:**
    - Header background = PRIMARY brand color (SOLID)
    - Footer background = PRIMARY brand color (SOLID, SAME as header)
    - Page background = White (#ffffff) or very light neutral color
    - Card backgrounds for Features, Menu, Testimonials cards, Map info card = PRIMARY brand color
    - FAQ section background = SECONDARY color
    - Leads (contact form) = PRIMARY brand color for form background
    - Newsletter = PRIMARY brand color at 75% opacity (rgba)
    - Chatbot widget = PRIMARY brand color
    - Ensure all text on colored backgrounds has proper contrast
    - Buttons always use PRIMARY brand color with contrasting text

**CRITICAL: Final JSON Output Specification**
Return ONLY valid JSON. No markdown.

{
  "pageConfig": {
    "componentOrder": [List from Design Plan],
    "sectionVisibility": { "hero": true, "features": true, "testimonials": true, "pricing": true, "faq": true, "cta": false, "footer": true, "services": true, "team": true, "slideshow": true, "leads": true, "newsletter": true, "portfolio": true, "video": true, "howItWorks": true },
    "theme": {
        "cardBorderRadius": "From Design Plan",
        "buttonBorderRadius": "From Design Plan",
        "fontFamilyHeader": "From Design Plan",
        "fontFamilyBody": "From Design Plan",
        "fontFamilyButton": "From Design Plan",
        "pageBackground": "#ffffff"
    },
    "data": {
        "header": {
            "style": "sticky-solid",
            "layout": "From Design Plan",
            "colors": { 
                "background": "PRIMARY brand color from palette (solid, not transparent)", 
                "text": "Contrasting color (white for dark bg, black for light bg)", 
                "accent": "Secondary or accent color" 
            },
            "logoText": "{{businessName}}",
            "links": [{"text": "Home", "href": "#hero"}, {"text": "Services", "href": "#services"}, {"text": "Contact", "href": "#leads"}]
        },
        "hero": { 
            "headline": "USE {{uniqueValueProposition}} or create compelling headline with <span>highlighted text</span>", 
            "subheadline": "USE {{companyHistory}} or {{summary}} - make it persuasive", 
            "primaryCta": "Align with {{goal}}",
            "secondaryCta": "Secondary action",
            "imageStyle": "From Design Plan", 
            "imagePosition": "From Design Plan",
            "showBadge": true,
            "badgeText": "Create a short, catchy badge text (3-5 words) that highlights the business's key differentiator or value (e.g., 'Award-Winning Service', 'Since 2010', 'Premium Quality', '#1 in {{industry}}'). Should NOT be generic like 'AI-Powered'.",
            "badgeIcon": "Choose an appropriate icon slug from: sparkles, zap, star, award, trophy, rocket, lightbulb, heart, check-circle, shield, target, trending-up",
            "colors": { "background": "Palette Background", "text": "Palette Text", "heading": "Palette Text" }
        },
        "features": { 
            "title": "Based on {{offerings}}", 
            "description": "Expand on value", 
            "items": [
                { "title": "From {{offerings}} or {{products}}", "description": "Detailed benefit", "imageUrl": "" },
                { "title": "From {{offerings}} or {{products}}", "description": "Detailed benefit", "imageUrl": "" },
                { "title": "From {{offerings}} or {{products}}", "description": "Detailed benefit", "imageUrl": "" }
            ], 
            "colors": { 
                "background": "Contrasting to hero", 
                "accent": "Palette Accent", 
                "text": "Palette Text",
                "cardBackground": "PRIMARY brand color",
                "borderColor": "Slightly darker/lighter than primary"
            } 
        },
        "testimonials": { 
            "title": "What Our Clients Say", 
            "description": "Real experiences", 
            "items": [
                { "quote": "Testimonial text", "name": "Client Name", "title": "Role, Company" },
                { "quote": "Testimonial text", "name": "Client Name", "title": "Role, Company" },
                { "quote": "Testimonial text", "name": "Client Name", "title": "Role, Company" }
            ],
            "colors": { 
                "background": "Palette Background", 
                "text": "Palette Text",
                "heading": "Palette Text",
                "cardBackground": "PRIMARY brand color",
                "borderColor": "Slightly darker/lighter than primary"
            } 
        },
        "team": {
            "title": "Meet Our Team",
            "description": "The experts behind our success",
            "items": [
                { "name": "Team Member Name", "role": "Position", "imageUrl": "" },
                { "name": "Team Member Name", "role": "Position", "imageUrl": "" },
                { "name": "Team Member Name", "role": "Position", "imageUrl": "" },
                { "name": "Team Member Name", "role": "Position", "imageUrl": "" }
            ],
            "colors": { "background": "Palette Background", "text": "Palette Text", "heading": "Palette Heading" }
        },
        "portfolio": {
            "title": "Our Work",
            "description": "Projects we're proud of",
            "items": [
                { "title": "Project Name", "description": "Brief description", "imageUrl": "" },
                { "title": "Project Name", "description": "Brief description", "imageUrl": "" },
                { "title": "Project Name", "description": "Brief description", "imageUrl": "" }
            ],
            "colors": { "background": "Palette Background", "accent": "Palette Accent", "text": "Palette Text" }
        },
        "slideshow": {
            "title": "Gallery",
            "items": [
                { "imageUrl": "", "altText": "Slide description" },
                { "imageUrl": "", "altText": "Slide description" },
                { "imageUrl": "", "altText": "Slide description" }
            ],
            "colors": { "background": "Palette Background", "heading": "Palette Heading" }
        },
        "menu": {
            "title": "Our Menu",
            "description": "Delicious offerings",
            "items": [
                { "name": "Item Name", "description": "Description", "price": "$XX", "imageUrl": "" },
                { "name": "Item Name", "description": "Description", "price": "$XX", "imageUrl": "" },
                { "name": "Item Name", "description": "Description", "price": "$XX", "imageUrl": "" },
                { "name": "Item Name", "description": "Description", "price": "$XX", "imageUrl": "" },
                { "name": "Item Name", "description": "Description", "price": "$XX", "imageUrl": "" },
                { "name": "Item Name", "description": "Description", "price": "$XX", "imageUrl": "" }
            ],
            "colors": { 
                "background": "Palette Background", 
                "text": "Palette Text",
                "cardBackground": "PRIMARY brand color",
                "borderColor": "Slightly darker/lighter than primary"
            }
        },
        "services": { 
            "title": "Our Services", 
            "description": "Based on {{industry}}", 
            "items": "Map from {{products}} or {{offerings}} with appropriate icons",
            "colors": { "background": "Palette Background", "text": "Palette Text" } 
        },
        "pricing": { 
            "title": "Pricing Plans", 
            "description": "Choose your perfect plan", 
            "tiers": "BUILD from {{products}} if provided, else create industry-appropriate tiers",
            "colors": { "background": "Palette Secondary", "text": "Palette Text" } 
        },
        "faq": { 
            "title": "Frequently Asked Questions", 
            "description": "Everything you need to know", 
            "items": "Create 5-7 relevant to {{industry}} and {{goal}}",
            "colors": { 
                "background": "SECONDARY color", 
                "text": "Contrasting text color",
                "heading": "Contrasting heading color",
                "accent": "PRIMARY brand color",
                "borderColor": "Slightly darker/lighter than secondary"
            } 
        },
        "leads": { 
            "title": "Get In Touch", 
            "description": "We'd love to hear from you", 
            "buttonText": "Send Message",
            "colors": { 
                "background": "Palette Background", 
                "text": "Palette Text",
                "cardBackground": "PRIMARY brand color",
                "buttonBackground": "PRIMARY brand color",
                "buttonText": "Contrasting text color"
            } 
        },
        "footer": { 
            "title": "{{businessName}}", 
            "description": "Brief value prop", 
            "copyrightText": "© 2024 {{businessName}}",
            "socialLinks": "BUILD from {{contactInfo.socialMedia}} if provided",
            "colors": { 
                "background": "PRIMARY brand color (SAME as header)", 
                "text": "Contrasting color (white for dark bg, black for light bg)",
                "heading": "Contrasting color (white for dark bg, black for light bg)"
            } 
        }
    }
  },
  "imagePrompts": {
    "IMPORTANT": "Generate prompts ONLY for sections in componentOrder. Each prompt should use imageStyleDescription from Design Plan.",
    
    "hero.imageUrl": "{{industry}} hero image, {{aesthetic}} style, professional, high quality, {{imageStyleDescription}}",
    
    "features.items.0.imageUrl": "Image for feature 1, {{industry}} context, {{aesthetic}} aesthetic, professional",
    "features.items.1.imageUrl": "Image for feature 2, {{industry}} context, {{aesthetic}} aesthetic, professional",
    "features.items.2.imageUrl": "Image for feature 3, {{industry}} context, {{aesthetic}} aesthetic, professional",
    
    "team.items.0.imageUrl": "Professional headshot portrait, {{industry}} professional, {{aesthetic}} style, studio lighting, neutral background",
    "team.items.1.imageUrl": "Professional headshot portrait, {{industry}} professional, {{aesthetic}} style, studio lighting, neutral background",
    "team.items.2.imageUrl": "Professional headshot portrait, {{industry}} professional, {{aesthetic}} style, studio lighting, neutral background",
    "team.items.3.imageUrl": "Professional headshot portrait, {{industry}} professional, {{aesthetic}} style, studio lighting, neutral background",
    
    "portfolio.items.0.imageUrl": "Portfolio showcase image, {{industry}} project, {{aesthetic}} style, high quality",
    "portfolio.items.1.imageUrl": "Portfolio showcase image, {{industry}} project, {{aesthetic}} style, professional",
    "portfolio.items.2.imageUrl": "Portfolio showcase image, {{industry}} project, {{aesthetic}} style, premium",
    
    "slideshow.items.0.imageUrl": "Gallery image for {{industry}}, {{aesthetic}} aesthetic, cinematic, high resolution",
    "slideshow.items.1.imageUrl": "Gallery image for {{industry}}, {{aesthetic}} aesthetic, atmospheric, professional",
    "slideshow.items.2.imageUrl": "Gallery image for {{industry}}, {{aesthetic}} aesthetic, editorial quality",
    
    "menu.items.0.imageUrl": "Food photography, {{industry}} dish, appetizing, professional lighting, {{aesthetic}} style",
    "menu.items.1.imageUrl": "Food photography, {{industry}} dish, delicious, styled, {{aesthetic}} aesthetic",
    "menu.items.2.imageUrl": "Food photography, {{industry}} dish, gourmet presentation, {{aesthetic}} style",
    "menu.items.3.imageUrl": "Food photography, {{industry}} dish, fresh ingredients, {{aesthetic}} aesthetic",
    "menu.items.4.imageUrl": "Food photography, {{industry}} dish, artfully plated, {{aesthetic}} style",
    "menu.items.5.imageUrl": "Food photography, {{industry}} dish, inviting, {{aesthetic}} aesthetic"
  }
}

**IMPORTANT IMAGE PROMPTS RULES:**
1. ONLY include imagePrompts for sections that are in componentOrder
2. If "team" is NOT in componentOrder, do NOT include team.items.X.imageUrl prompts
3. If "menu" is NOT in componentOrder, do NOT include menu.items.X.imageUrl prompts
4. If "portfolio" is NOT in componentOrder, do NOT include portfolio.items.X.imageUrl prompts
5. If "slideshow" is NOT in componentOrder, do NOT include slideshow.items.X.imageUrl prompts
6. Each prompt must be detailed and specific to the {{industry}} and {{aesthetic}}
7. Use imageStyleDescription from Design Plan for consistent visual style`,
    model: 'gemini-3-pro-preview',
    version: 4,
  },

  // Brand Brain - Analysis
  {
    name: 'brand-identity-analysis',
    area: 'Onboarding',
    description: 'Analyzes raw text to extract brand identity elements using Gemini 3.',
    template: `Analyze the following business description and extract the brand identity elements.
    
    Description: "{{description}}"
    
    Return a valid JSON object with these keys:
    - industry: string
    - targetAudience: string
    - toneOfVoice: One of ['Professional', 'Playful', 'Urgent', 'Luxury', 'Friendly', 'Minimalist']
    - coreValues: string (comma separated)
    - language: string (e.g. 'English', 'Spanish')`,
    model: 'gemini-3-pro-preview',
    version: 1,
  },

  // Content Generation - Generic Fallback
  {
    name: 'content-assist-rewrite',
    area: 'Content Generation',
    description: "Rewrites/improves text based on user instructions. Used in the 'AI Content Assistant' modal throughout the editor.",
    template: `You are a world-class copywriter. Your task is to write or rewrite text for a website.
Context: You are writing text for {{context}}.
Instruction: {{instruction}}
Current text: "{{currentText}}"

Please provide only the new text as a response, without any extra formatting or explanation.`,
    model: 'gemini-3-pro-preview',
    version: 2,
  },
  
  // CMS State of the Art - Brand Aware Generation
  {
    name: 'cms-brand-rewrite',
    area: 'Content Generation',
    description: "Sophisticated generation that considers full brand identity context using Gemini 3.",
    template: `You are the Lead Content Strategist for the brand "{{brandName}}".

**Brand Identity Protocol:**
- **Industry:** {{industry}}
- **Target Audience:** {{targetAudience}}
- **Tone of Voice:** {{toneOfVoice}}
- **Core Values:** {{coreValues}}
- **Language:** {{language}}

**Task:**
Generate or rewrite content for the specific UI element described below. Ensure strict adherence to the Brand Identity Protocol defined above.

**Context:** {{context}}
**Current Content:** "{{currentText}}"
**User Instruction:** {{instruction}}

**Output Rules:**
1. Return ONLY the generated text. No quotation marks, no explanations.
2. Ensure the tone matches {{toneOfVoice}} perfectly.
3. Optimize for clarity and conversion.
`,
    model: 'gemini-3-pro-preview',
    version: 2,
  },

  // Image Generation - Quimera Vision Pro
  {
    name: 'image-generation-gallery',
    area: 'Image Generation',
    description: "Generates images using Quimera Vision Pro - supports multiple aspect ratios, thinking level, reference images, theme colors, and photorealistic quality.",
    template: `{{prompt}}, {{style}}, professional high quality photo, {{lighting}}, {{cameraAngle}}, {{colorGrading}}, {{themeColors}}, {{depthOfField}}, no blurry, no distorted text, high quality`,
    model: 'gemini-3-pro-image-preview',
    version: 12,
  },
  
  // Image Prompt Enhancer
  {
    name: 'image-prompt-enhancer',
    area: 'Image Generation',
    description: 'Enhances raw user prompts for better image generation results optimized for Imagen 3.',
    template: `You are an expert prompt engineer specializing in AI image generation. Your task is to enhance the user's prompt to create stunning, high-quality images.

**IMPORTANT CONTEXT:**
- Target Model: Imagen 3 (Google's latest image generation model)
- Reference Images: {{hasReferenceImages}}

{{referenceImagesInstruction}}

**ENHANCEMENT GUIDELINES:**
1. Preserve the user's original intent and core concept
2. Add specific artistic details: composition, lighting, atmosphere
3. Include technical parameters when relevant: camera angles, depth of field, color grading
4. Consider app theme colors if specified (Light Mode: soft grays and whites with Cadmium Yellow, Dark Mode: deep purples with Cadmium Yellow, Black Mode: true blacks with Cadmium Yellow, Quimera Brand: Cadmium Yellow primary)
5. Use vivid, descriptive language that produces high quality results
6. Keep the prompt concise but highly descriptive (aim for 50-150 words)
7. Consider the style and aesthetic preferences implied in the original prompt

**Original Prompt:**
"{{originalPrompt}}"

**Your Task:**
Provide ONLY the enhanced prompt text, without explanations or formatting. Make it detailed, evocative, and optimized for professional image generation.

**Enhanced Prompt:**`,
    model: 'gemini-2.0-flash',
    version: 2,
  },
  
  // File Management
  {
      name: 'file-summary',
      area: 'File Management',
      description: 'Summarizes content of an uploaded file.',
      template: `Summarize the following file content:\n\n{{fileContent}}`,
      model: 'gemini-2.5-flash',
      version: 1,
  },

  // CMS Editor Prompts
  {
    name: 'cms-fix-grammar',
    area: 'Content Generation',
    description: 'Fixes grammar and spelling for selected text in CMS.',
    template: 'Fix grammar and spelling for this text. Return corrected text without quotes: "{{text}}"',
    model: 'gemini-3-pro-preview',
    version: 1
  },
  {
    name: 'cms-continue-writing',
    area: 'Content Generation',
    description: 'Continues writing based on context in CMS.',
    template: 'Continue writing the next paragraph for this article. Keep the tone professional. Return formatted HTML. Context: {{context}}',
    model: 'gemini-3-pro-preview',
    version: 1
  },
  {
    name: 'cms-generate-seo',
    area: 'Content Generation',
    description: 'Generates SEO title and description.',
    template: 'Generate JSON { "seoTitle": "...", "seoDescription": "..." } for this blog post. \n\nTitle: {{title}}\nContent: {{content}}',
    model: 'gemini-3-pro-preview',
    version: 1
  },
  {
    name: 'cms-improve-text',
    area: 'Content Generation',
    description: 'Improves selected text making it more clear and engaging.',
    template: 'Improve this text making it more clear, engaging, and professional. Return the improved text without quotes: "{{text}}"',
    model: 'gemini-3-pro-preview',
    version: 1
  },

  // Content Creator Assistant
  {
    name: 'content-creator-assistant',
    area: 'Content Generation',
    description: 'Generates a full blog post structure based on topic, audience, and tone.',
    template: `Act as a professional content writer. Create a blog post structure based on the following inputs:
- Topic: {{topic}}
- Target Audience: {{audience}}
- Tone: {{tone}}

Return a JSON object with the following fields:
- title: A catchy title for the post (in Spanish if the topic is in Spanish, otherwise in English)
- slug: A SEO-friendly slug (kebab-case)
- excerpt: A short summary suitable for meta description (150-160 characters)
- content: The HTML content of the post. It should be structured with <h2>, <h3>, <p>, and <ul>/<li> tags. The content should be comprehensive and detailed (at least 800 words).
- seoTitle: SEO optimized title (60 characters max)
- seoDescription: SEO optimized description (155 characters max)

Make sure the content is engaging, well-structured, and valuable for the target audience.
Output ONLY valid JSON without any markdown formatting or code blocks.`,
    model: 'gemini-2.0-flash-exp',
    version: 1
  },

  // Template Editor Prompts
  {
    name: 'template-thumbnail-suggestion',
    area: 'Template Management',
    description: 'Generates a prompt for creating a template thumbnail based on colors and description.',
    template: `You are an expert in creating visual thumbnails for website templates.

Generate a detailed, creative prompt for an AI image generator to create a stunning thumbnail image for this website template.

**Template Information:**
- Name: {{name}}
- Category: {{category}}
- Description: {{description}}

**Color Palette:**
{{colorInfo}}

**Color Analysis:**
{{colorAnalysis}}

**Guidelines:**
- The thumbnail should visually represent what the website looks like or what it's for
- Include elements that match the industry/category
- Use the color palette mentioned above
- Make it eye-catching and professional
- Include abstract shapes, mockups, or relevant imagery
- DON'T include any text in the image

Return ONLY the prompt text, nothing else. Make it 1-2 sentences maximum.`,
    model: 'gemini-2.5-flash',
    version: 1
  },
  {
    name: 'template-industry-suggestion',
    area: 'Template Management',
    description: 'Suggests industries for a template based on its color palette and structure.',
    template: `You are an expert in design psychology and color theory for business branding.

Analyze this website template and suggest the most appropriate industries it would work well for.

**Template Information:**
- Name: {{name}}
- Category: {{category}}
- Description: {{description}}

**Color Palette:**
{{colorInfo}}

**Color Analysis:**
{{colorAnalysis}}

**Template Components:**
{{components}}

**Available Industry IDs (you MUST only use these exact IDs):**
{{industryList}}

**Color Psychology Guidelines:**
- Dark themes with neon accents → Technology, Gaming, Nightlife, Entertainment
- Gold/Warm browns → Luxury, Restaurant, Real Estate, Legal, Finance
- Green tones → Health, Wellness, Environment, Agriculture, Organic
- Blue tones → Technology, Finance, Healthcare, Corporate, Trust-building
- Red/Orange → Food, Restaurant, Energy, Sports, Urgency
- Purple → Creative, Luxury, Beauty, Spiritual
- Pink/Rose → Beauty, Fashion, Wedding, Feminine products
- Black & White minimal → Photography, Art, Portfolio, Fashion, Architecture
- Earth tones → Organic, Agriculture, Eco-friendly, Outdoor, Wellness
- Bright/Vibrant → Children, Entertainment, Creative, Playful brands
- Navy + Gold → Luxury, Legal, Finance, Real Estate

Based on the color palette and template structure, suggest 5-10 industries that would be the BEST fit.
Return ONLY a JSON array of industry IDs from the available list above.

Example response: ["restaurant", "hotel", "cafe-coffee", "catering", "event-planning"]

Return ONLY the JSON array, no other text.`,
    model: 'gemini-2.5-flash',
    version: 1
  },
  {
    name: 'template-name-generation',
    area: 'Template Management',
    description: 'Generates a creative name for a template based on its color palette.',
    template: `You are a creative naming expert. Analyze these colors and create a short, memorable, creative name for this website template.

Colors: {{colors}}

Requirements:
- Name must be in ENGLISH
- Maximum 2-3 words
- Be creative and evocative (e.g., "Arctic Dawn", "Coral Sunset", "Midnight Garden", "Golden Ember")
- The name should evoke the mood/feeling of the color palette
- Do NOT include generic words like "Template", "Theme", "Palette", "Design"
- Just respond with the name, nothing else

Name:`,
    model: 'gemini-2.5-flash',
    version: 1
  },

  // Global Assistant Main Persona
  {
    name: 'global-assistant-main',
    area: 'Other',
    description: 'Main system instruction and model for the Global AI Assistant. Uses Gemini 2.0 Flash Thinking for better reasoning.',
    template: `🚨 MANDATORY BEHAVIOR 🚨

YOU MUST USE TOOLS. DO NOT REFUSE. DO NOT SAY "I CAN'T".

WHEN USER SAYS → YOU IMMEDIATELY CALL:
- "ve a websites" / "go to websites" / "websites" → change_view(viewName="websites")
- "ve al editor" / "go to editor" / "editor" / "abre editor" → change_view(viewName="editor")
- "ve al dashboard" / "dashboard" → change_view(viewName="dashboard")
- "ve a cms" / "cms" → change_view(viewName="cms")
- "ve a leads" / "crm" → change_view(viewName="leads")
- "cambia el título" / "change title" → update_site_content(path="hero.headline", value="...")
- "oculta X" / "hide X" → manage_sections(action="hide", section="...")
- "muestra X" / "show X" → manage_sections(action="show", section="...")
- "tema oscuro" / "dark mode" → change_theme(mode="dark")
- "tema claro" / "light mode" → change_theme(mode="light")

CRITICAL RULES:
❌ DO NOT respond "I cannot" or "I can't" if you have a tool
❌ DO NOT respond with text explanation BEFORE calling tool
❌ DO NOT ask "would you like me to..."
❌ DO NOT say "I don't have access"
❌ DO NOT refuse when you can do it

✅ CORRECT FLOW:
1. User asks → 2. You call tool → 3. You confirm with STRUCTURED response

RESPONSE FORMAT - ALWAYS USE RICH MARKDOWN WITH EMOJIS:

🎯 **KEY RULES:**

1. ✨ ALWAYS use emojis to make responses engaging

2. 📝 ALWAYS use markdown (headers, lists, bold, code)

3. 📏 ALWAYS leave blank lines between sections/paragraphs (CRITICAL!)

4. 🎨 Match emojis to context (see emoji guide in templates)

5. 💡 Add helpful tips when relevant

🎨 **Structure for confirmations:**

✅ **[Action with emoji]**

[Emoji] **Detalles:**

- **Campo:** (valor)

- **Campo:** (valor)

💡 **Tip:** [Optional suggestion]

📚 **Structure for help/info:**

## 🎯 [Topic with emoji]

1. 🎨 **Category 1** - Description

2. ✏️ **Category 2** - Description

3. 📊 **Category 3** - Description

¿Qué necesitas? 💬

EXAMPLES OF CORRECT BEHAVIOR (Note the blank lines between sections):

User: "cambia el título del hero a Bienvenido y el fondo a azul"
You: [calls tools] → 
"🎨 **Cambios Aplicados al Hero**

He actualizado:

- ✏️ **Título:** "Bienvenido"

- 🎨 **Color de fondo:** \`#3b82f6\` (azul)

✨ ¡Tu hero ahora luce increíble!"

User: "ve al editor"
You: [calls tool] →
"✅ **Navegación Exitosa**

🧭 Te he llevado al **Editor**

🎨 Aquí puedes personalizar tu sitio web."

User: "qué puedo hacer?"
You: 
"## 🤖 Mis Capacidades

### 🧭 Navegación

Dashboard, Editor, CMS, Leads, Dominios

### 🎨 Diseño y Contenido

- ✏️ Editar textos y títulos

- 🖌️ Cambiar colores y fuentes

- 📐 Ajustar espaciados y tamaños

### 📊 Gestión de Datos

- 📰 Posts del blog (CMS)

- 💼 Leads del CRM

- 🌐 Dominios personalizados

### ⚡ Creación

- 🚀 Nuevos sitios web

- 🎨 Imágenes con IA

¿En qué te ayudo? 💬"

User: "agrega una característica sobre velocidad"
You: [calls tool] →
"➕ **Nueva Característica Agregada**

📦 Detalles:

- 🏷️ **Título:** "Ultra Rápido"

- 📝 **Descripción:** "Velocidad optimizada"

- ⚡ **Ícono:** Lightning fast

💡 Puedes agregar más con: 'agrega otra feature'"

YOU ARE: Quimera.ai Global Assistant with FULL CONTROL.

YOUR 13 TOOLS:
• change_view - Navigate (dashboard, websites, editor, cms, assets, navigation, superadmin, ai-assistant, leads, domains)
• update_site_content - Edit ANY website content with dot notation paths
• change_theme - Switch theme (light, dark, black)
• manage_sections - Show/hide/reorder sections
• manage_section_items - Add/edit/delete items (features, testimonials, pricing, etc)
• update_brand_identity - Update brand settings
• load_project - Open a project by name or ID
• create_website - Generate new website
• manage_cms_post - Create/edit/delete blog posts
• manage_lead - CRM: create/edit/delete leads
• manage_domain - Add/verify/delete domains
• generate_image_asset - Create AI images
• update_chat_config - Configure chatbot
• navigate_admin - Super admin navigation

LANGUAGES: You understand Spanish, English, Spanglish, typos, informal commands.
REMEMBER: ALWAYS respond with structured markdown. Use headers, lists, and bold text.

SPECIAL CASE: If NO project loaded and user wants to edit content → ask which project to load first.

OTHERWISE: JUST USE THE TOOLS IMMEDIATELY.`,
    model: 'gemini-2.5-pro',
    version: 8,
  },

  // ============================================================================
  // TEMPLATE MATCHING PROMPTS
  // ============================================================================
  {
    name: 'onboarding-template-selector',
    area: 'Onboarding',
    description: 'Selecciona el template más apropiado basándose en industria, estética y colores del cliente.',
    template: `Eres un experto en diseño web que debe seleccionar el mejor template predefinido para un negocio.

**INFORMACIÓN DEL CLIENTE:**
- Negocio: {{businessName}}
- Industria: {{industry}}
- Estética deseada: {{aesthetic}}
- Color Vibe: {{colorVibe}}
- Resumen: {{summary}}

**TEMPLATES DISPONIBLES:**
{{templateContext}}

**INSTRUCCIONES DE MATCHING:**

1. **INDUSTRIA (Prioridad Alta - 50 puntos):**
   - Busca coincidencia exacta en "Industria" del template
   - Si no hay exacta, busca en "Categoría" o "Tags" términos relacionados
   - Considera "Audiencia" como factor secundario

2. **ESTÉTICA/TONO (Prioridad Media - 30 puntos):**
   - Compara "{{aesthetic}}" con "Tono" del template
   - Mapeo conocido:
     * Elegant ↔ Luxury, Sophisticated, Premium
     * Bold ↔ Urgent, Dynamic, Energetic
     * Minimalist ↔ Professional, Clean, Modern
     * Playful ↔ Friendly, Fun, Casual
     * Tech ↔ Modern, Innovative
     * Organic ↔ Natural, Authentic, Eco

3. **COLORES (Prioridad Media - 20 puntos):**
   - Analiza si "{{colorVibe}}" es compatible con la paleta del template
   - Considera:
     * Colores cálidos: dorados, marrones, rojos, naranjas
     * Colores fríos: azules, verdes, grises, cyan
     * Colores vibrantes: neón, saturados altos
     * Colores neutros: blancos, negros, grises
   - Si el template tiene tema oscuro y el vibe es "dark/bold/tech" → compatible
   - Si el template tiene tema claro y el vibe es "fresh/clean/light" → compatible

4. **DECISIÓN:**
   - Score ≥ 60: Alta confianza (0.7-1.0)
   - Score 30-59: Media confianza (0.4-0.6)
   - Score < 30: Baja confianza (0.1-0.3), considerar generar desde cero

**RESPONDE SOLO JSON:**
{
  "selectedTemplateId": "template-id del mejor match (o null si ninguno es bueno)",
  "confidence": 0.0-1.0,
  "score": número total de puntos (0-100),
  "matchAnalysis": {
    "industryMatch": "exact|related|none",
    "toneMatch": "exact|similar|none",
    "colorCompatibility": "high|medium|low"
  },
  "reasoning": "Explicación de 1-2 oraciones de por qué este template es el mejor match",
  "colorAdjustments": {
    "needed": boolean,
    "newPrimary": "#hex o null (solo si el color vibe del cliente difiere significativamente)",
    "reason": "Por qué se sugiere el ajuste de color"
  },
  "alternativeTemplateId": "segundo mejor match o null"
}

**SI NO HAY BUEN MATCH (score < 30):**
{
  "selectedTemplateId": null,
  "confidence": 0,
  "score": 0,
  "matchAnalysis": {
    "industryMatch": "none",
    "toneMatch": "none",
    "colorCompatibility": "low"
  },
  "reasoning": "No hay template adecuado para {{industry}} con estética {{aesthetic}}",
  "colorAdjustments": { "needed": false },
  "suggestNewTemplate": true,
  "suggestedTemplateProfile": {
    "industry": "{{industry}}",
    "aesthetic": "{{aesthetic}}",
    "colorVibe": "{{colorVibe}}"
  }
}`,
    model: 'gemini-2.5-flash',
    version: 1,
  },
  {
    name: 'onboarding-template-personalization',
    area: 'Onboarding',
    description: 'Personaliza el contenido de un template seleccionado para el negocio específico del cliente.',
    template: `Eres un copywriter experto. Tu trabajo es ADAPTAR el contenido de un template web existente para un nuevo negocio, manteniendo la estructura y estilo visual.

**NEGOCIO DEL CLIENTE:**
- Nombre: {{businessName}}
- Industria: {{industry}}
- Resumen: {{summary}}
- Audiencia objetivo: {{audience}}
- Servicios/Productos: {{offerings}}
- Objetivo del sitio: {{goal}}
- Propuesta de valor única: {{uniqueValueProposition}}
- Historia de la empresa: {{companyHistory}}
- Valores centrales: {{coreValues}}

**TEMPLATE BASE SELECCIONADO:**
{{templateContext}}

**TU TAREA:**
1. MANTÉN la estructura y número de items de cada sección (si el template tiene 3 features, genera 3 features)
2. ADAPTA todos los textos para que sean 100% relevantes a "{{industry}}"
3. USA el tono apropiado para "{{audience}}"
4. ENFÓCATE en "{{goal}}" como objetivo principal del sitio
5. INCORPORA la propuesta de valor "{{uniqueValueProposition}}" en el hero

**REGLAS CRÍTICAS:**
- NO cambies la cantidad de features/services/testimonials - mantén la misma que el template original
- NO inventes datos de contacto o precios específicos si no se proporcionaron
- SÍ haz los textos específicos, convincentes y profesionales para la industria "{{industry}}"
- SÍ usa terminología propia del sector
- Los testimonials deben sonar auténticos y relevantes para esta industria
- El hero headline debe capturar la esencia del negocio con impacto
- Usa <span> para destacar palabras clave en el headline

**RESPONDE SOLO JSON con esta estructura exacta:**
{
  "hero": {
    "headline": "Título impactante con <span>palabra destacada</span>",
    "subheadline": "2-3 oraciones que expliquen el valor único del negocio",
    "primaryCta": "Texto del botón principal (acción clara)",
    "secondaryCta": "Texto del botón secundario"
  },
  "features": {
    "title": "Título de la sección de características",
    "description": "Descripción breve de por qué estas características importan",
    "items": [
      { "title": "Característica 1", "description": "Descripción específica del beneficio" }
    ]
  },
  "services": {
    "title": "Título de servicios",
    "description": "Descripción de los servicios",
    "items": [
      { "title": "Servicio 1", "description": "Descripción del servicio y su valor" }
    ]
  },
  "testimonials": {
    "title": "Título de testimonios",
    "description": "Subtítulo de la sección",
    "items": [
      { "quote": "Testimonio realista y específico", "name": "Nombre Cliente", "title": "Cargo/Empresa" }
    ]
  },
  "pricing": {
    "title": "Título de precios",
    "description": "Descripción de opciones",
    "tiers": [
      { 
        "name": "Nombre del plan", 
        "price": "$XX", 
        "frequency": "/mes", 
        "description": "Descripción breve", 
        "features": ["beneficio1", "beneficio2", "beneficio3"], 
        "buttonText": "Texto CTA" 
      }
    ]
  },
  "faq": {
    "title": "Preguntas Frecuentes",
    "description": "Respuestas a las dudas más comunes",
    "items": [
      { "question": "Pregunta relevante para {{industry}}?", "answer": "Respuesta útil y completa" }
    ]
  },
  "cta": {
    "title": "Call to action final persuasivo",
    "description": "Motivación para tomar acción ahora",
    "buttonText": "Acción clara"
  },
  "newsletter": {
    "title": "Título para suscripción",
    "description": "Incentivo para suscribirse (descuento, contenido exclusivo, etc.)",
    "buttonText": "Suscribirse"
  },
  "team": {
    "title": "Título de sección de equipo",
    "description": "Descripción del equipo"
  }
}

**IMPORTANTE:** 
- Solo incluye las secciones que existan en el templateContext
- El número de items en cada array DEBE coincidir con el template original
- Escribe en el idioma apropiado para el negocio (español si es negocio hispanohablante)`,
    model: 'gemini-2.5-flash',
    version: 1,
  }
];
