/**
 * CRM Industry Presets
 * Provides default Kanban stages and custom fields for each industry type.
 */

import { CRMCustomStage, CRMCustomFieldDef, CRMIndustryType } from '../../types';

// =============================================================================
// STAGE PRESETS PER INDUSTRY
// =============================================================================

export const INDUSTRY_STAGES: Record<CRMIndustryType, CRMCustomStage[]> = {
    general: [
        { id: 'new', label: 'New Lead', color: 'bg-blue-500' },
        { id: 'contacted', label: 'Contacted', color: 'bg-yellow-500' },
        { id: 'qualified', label: 'Qualified', color: 'bg-purple-500' },
        { id: 'negotiation', label: 'Negotiation', color: 'bg-orange-500' },
        { id: 'won', label: 'Won', color: 'bg-green-500' },
        { id: 'lost', label: 'Lost', color: 'bg-red-500' },
    ],
    real_estate: [
        { id: 'new', label: 'New Inquiry', color: 'bg-blue-500' },
        { id: 'contacted', label: 'Showing Scheduled', color: 'bg-yellow-500' },
        { id: 'qualified', label: 'Offer Made', color: 'bg-purple-500' },
        { id: 'negotiation', label: 'Under Contract', color: 'bg-orange-500' },
        { id: 'won', label: 'Closed', color: 'bg-green-500' },
        { id: 'lost', label: 'Lost', color: 'bg-red-500' },
    ],
    auto_dealership: [
        { id: 'new', label: 'New Lead', color: 'bg-blue-500' },
        { id: 'contacted', label: 'Test Drive', color: 'bg-yellow-500' },
        { id: 'qualified', label: 'Financing', color: 'bg-purple-500' },
        { id: 'negotiation', label: 'Negotiation', color: 'bg-orange-500' },
        { id: 'won', label: 'Sold', color: 'bg-green-500' },
        { id: 'lost', label: 'Lost', color: 'bg-red-500' },
    ],
    insurance: [
        { id: 'new', label: 'New Prospect', color: 'bg-blue-500' },
        { id: 'contacted', label: 'Quote Sent', color: 'bg-yellow-500' },
        { id: 'qualified', label: 'Application', color: 'bg-purple-500' },
        { id: 'negotiation', label: 'Underwriting', color: 'bg-orange-500' },
        { id: 'won', label: 'Policy Bound', color: 'bg-green-500' },
        { id: 'lost', label: 'Declined', color: 'bg-red-500' },
    ],
    consulting: [
        { id: 'new', label: 'Lead', color: 'bg-blue-500' },
        { id: 'contacted', label: 'Discovery Call', color: 'bg-yellow-500' },
        { id: 'qualified', label: 'Proposal Sent', color: 'bg-purple-500' },
        { id: 'negotiation', label: 'Negotiation', color: 'bg-orange-500' },
        { id: 'won', label: 'Signed', color: 'bg-green-500' },
        { id: 'lost', label: 'Lost', color: 'bg-red-500' },
    ],
    healthcare: [
        { id: 'new', label: 'New Patient', color: 'bg-blue-500' },
        { id: 'contacted', label: 'Consultation', color: 'bg-yellow-500' },
        { id: 'qualified', label: 'Treatment Plan', color: 'bg-purple-500' },
        { id: 'negotiation', label: 'In Treatment', color: 'bg-orange-500' },
        { id: 'won', label: 'Completed', color: 'bg-green-500' },
        { id: 'lost', label: 'Cancelled', color: 'bg-red-500' },
    ],
    education: [
        { id: 'new', label: 'Inquiry', color: 'bg-blue-500' },
        { id: 'contacted', label: 'Info Sent', color: 'bg-yellow-500' },
        { id: 'qualified', label: 'Application', color: 'bg-purple-500' },
        { id: 'negotiation', label: 'Accepted', color: 'bg-orange-500' },
        { id: 'won', label: 'Enrolled', color: 'bg-green-500' },
        { id: 'lost', label: 'Withdrawn', color: 'bg-red-500' },
    ],
    custom: [
        { id: 'new', label: 'Stage 1', color: 'bg-blue-500' },
        { id: 'contacted', label: 'Stage 2', color: 'bg-yellow-500' },
        { id: 'qualified', label: 'Stage 3', color: 'bg-purple-500' },
        { id: 'negotiation', label: 'Stage 4', color: 'bg-orange-500' },
        { id: 'won', label: 'Stage 5', color: 'bg-green-500' },
        { id: 'lost', label: 'Stage 6', color: 'bg-red-500' },
    ],
};

// =============================================================================
// CUSTOM FIELD PRESETS PER INDUSTRY
// =============================================================================

export const INDUSTRY_FIELDS: Record<CRMIndustryType, CRMCustomFieldDef[]> = {
    general: [
        { id: 'company', name: 'Company', type: 'text', placeholder: 'e.g. Acme Corp' },
        { id: 'job_title', name: 'Job Title', type: 'text', placeholder: 'e.g. CTO' },
        { id: 'industry', name: 'Industry', type: 'text', placeholder: 'e.g. Technology' },
    ],
    real_estate: [
        { id: 'property_interest', name: 'Property of Interest', type: 'text', placeholder: 'e.g. 123 Main St' },
        { id: 'budget', name: 'Budget', type: 'number', placeholder: 'e.g. 500000' },
        { id: 'property_type', name: 'Property Type', type: 'select', options: ['House', 'Apartment', 'Condo', 'Land', 'Commercial'] },
        { id: 'timeframe', name: 'Timeframe', type: 'select', options: ['Immediately', '1-3 Months', '3-6 Months', '6-12 Months', '12+ Months'] },
        { id: 'pre_approved', name: 'Pre-Approved', type: 'checkbox' },
    ],
    auto_dealership: [
        { id: 'vehicle_interest', name: 'Vehicle of Interest', type: 'text', placeholder: 'e.g. 2024 Toyota Camry' },
        { id: 'trade_in', name: 'Trade-In Vehicle', type: 'text', placeholder: 'e.g. 2019 Honda Civic' },
        { id: 'financing', name: 'Financing Needed', type: 'checkbox' },
        { id: 'budget', name: 'Budget', type: 'number', placeholder: 'e.g. 35000' },
        { id: 'purchase_type', name: 'Purchase Type', type: 'select', options: ['New', 'Used', 'Certified Pre-Owned', 'Lease'] },
    ],
    insurance: [
        { id: 'policy_type', name: 'Policy Type', type: 'select', options: ['Auto', 'Home', 'Life', 'Health', 'Business', 'Umbrella'] },
        { id: 'current_provider', name: 'Current Provider', type: 'text', placeholder: 'e.g. State Farm' },
        { id: 'renewal_date', name: 'Renewal Date', type: 'date' },
        { id: 'coverage_amount', name: 'Coverage Amount', type: 'number', placeholder: 'e.g. 250000' },
    ],
    consulting: [
        { id: 'company', name: 'Company', type: 'text', placeholder: 'e.g. Acme Corp' },
        { id: 'project_scope', name: 'Project Scope', type: 'text', placeholder: 'e.g. Digital Transformation' },
        { id: 'team_size', name: 'Team Size', type: 'number', placeholder: 'e.g. 25' },
        { id: 'engagement_type', name: 'Engagement Type', type: 'select', options: ['Retainer', 'Project-Based', 'Advisory', 'Workshop'] },
    ],
    healthcare: [
        { id: 'referral_source', name: 'Referral Source', type: 'text', placeholder: 'e.g. Dr. Smith' },
        { id: 'insurance_provider', name: 'Insurance Provider', type: 'text', placeholder: 'e.g. Blue Cross' },
        { id: 'service_needed', name: 'Service Needed', type: 'text', placeholder: 'e.g. Physical Therapy' },
        { id: 'urgency', name: 'Urgency', type: 'select', options: ['Routine', 'Urgent', 'Emergency'] },
    ],
    education: [
        { id: 'program_interest', name: 'Program of Interest', type: 'text', placeholder: 'e.g. MBA' },
        { id: 'start_term', name: 'Start Term', type: 'select', options: ['Fall 2025', 'Spring 2026', 'Summer 2026', 'Fall 2026'] },
        { id: 'financial_aid', name: 'Financial Aid Needed', type: 'checkbox' },
        { id: 'education_level', name: 'Education Level', type: 'select', options: ['High School', 'Associates', 'Bachelors', 'Masters', 'Doctorate'] },
    ],
    custom: [],
};

// =============================================================================
// INDUSTRY DISPLAY METADATA
// =============================================================================

export interface IndustryMeta {
    id: CRMIndustryType;
    labelKey: string;        // i18n key
    icon: string;            // Lucide icon name
    descriptionKey: string;  // i18n key
}

export const INDUSTRY_META: IndustryMeta[] = [
    { id: 'general', labelKey: 'leads.industry.general', icon: 'Briefcase', descriptionKey: 'leads.industry.generalDesc' },
    { id: 'real_estate', labelKey: 'leads.industry.realEstate', icon: 'Home', descriptionKey: 'leads.industry.realEstateDesc' },
    { id: 'auto_dealership', labelKey: 'leads.industry.autoDealership', icon: 'Car', descriptionKey: 'leads.industry.autoDealershipDesc' },
    { id: 'insurance', labelKey: 'leads.industry.insurance', icon: 'Shield', descriptionKey: 'leads.industry.insuranceDesc' },
    { id: 'consulting', labelKey: 'leads.industry.consulting', icon: 'LineChart', descriptionKey: 'leads.industry.consultingDesc' },
    { id: 'healthcare', labelKey: 'leads.industry.healthcare', icon: 'Heart', descriptionKey: 'leads.industry.healthcareDesc' },
    { id: 'education', labelKey: 'leads.industry.education', icon: 'GraduationCap', descriptionKey: 'leads.industry.educationDesc' },
    { id: 'custom', labelKey: 'leads.industry.custom', icon: 'Settings', descriptionKey: 'leads.industry.customDesc' },
];
