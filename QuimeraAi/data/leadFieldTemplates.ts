import { CustomFieldDefinition } from '../components/dashboard/leads/CustomFieldsManager';

export interface LeadFieldTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    fields: Omit<CustomFieldDefinition, 'id'>[];
}

export const LEAD_FIELD_TEMPLATES: LeadFieldTemplate[] = [
    {
        id: 'real_estate',
        name: 'Real Estate / Inmobiliaria',
        description: 'Para agentes inmobiliarios y desarrolladores',
        icon: '🏠',
        fields: [
            { name: 'Property Type', type: 'select', options: ['House', 'Apartment', 'Land', 'Commercial', 'Industrial'], required: false },
            { name: 'Min Budget', type: 'number', required: false },
            { name: 'Max Budget', type: 'number', required: false },
            { name: 'Preferred Location', type: 'text', required: false },
            { name: 'Bedrooms', type: 'number', required: false },
            { name: 'Bathrooms', type: 'number', required: false },
            { name: 'Min Square Feet', type: 'number', required: false },
            { name: 'Move Date', type: 'date', required: false },
            { name: 'Pre-Approved', type: 'checkbox', required: false },
            { name: 'Needs Financing', type: 'checkbox', required: false },
        ]
    },
    {
        id: 'b2b_saas',
        name: 'B2B SaaS',
        description: 'Para empresas de software y servicios',
        icon: '💼',
        fields: [
            { name: 'Company Size', type: 'select', options: ['1-10', '11-50', '51-200', '201-500', '500+'], required: false },
            { name: 'Decision Role', type: 'select', options: ['Decision Maker', 'Influencer', 'End User', 'Gatekeeper'], required: false },
            { name: 'Annual Budget', type: 'number', required: false },
            { name: 'Current Solution', type: 'text', required: false },
            { name: 'Pain Points', type: 'text', required: false },
            { name: 'Renewal Date', type: 'date', required: false },
            { name: 'Needs Demo', type: 'checkbox', required: false },
            { name: 'Trial Started', type: 'checkbox', required: false },
            { name: 'Department', type: 'select', options: ['IT', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations'], required: false },
        ]
    },
    {
        id: 'automotive',
        name: 'Automotive',
        description: 'Para concesionarias y vendedores de autos',
        icon: '🚗',
        fields: [
            { name: 'Vehicle Type', type: 'select', options: ['Sedan', 'SUV', 'Pickup', 'Sports', 'Electric', 'Hybrid'], required: false },
            { name: 'Preferred Brand', type: 'text', required: false },
            { name: 'Desired Year', type: 'number', required: false },
            { name: 'Budget', type: 'number', required: false },
            { name: 'Has Trade-In', type: 'checkbox', required: false },
            { name: 'Trade-In Brand', type: 'text', required: false },
            { name: 'Trade-In Model', type: 'text', required: false },
            { name: 'Trade-In Year', type: 'number', required: false },
            { name: 'Needs Financing', type: 'checkbox', required: false },
            { name: 'Purchase Date', type: 'date', required: false },
        ]
    },
    {
        id: 'insurance',
        name: 'Insurance',
        description: 'Para agentes de seguros',
        icon: '🛡️',
        fields: [
            { name: 'Insurance Type', type: 'select', options: ['Life', 'Auto', 'Home', 'Health', 'Business', 'Travel'], required: false },
            { name: 'Current Coverage', type: 'text', required: false },
            { name: 'Monthly Premium', type: 'number', required: false },
            { name: 'Renewal Date', type: 'date', required: false },
            { name: 'Dependents', type: 'number', required: false },
            { name: 'Pre-existing Conditions', type: 'text', required: false },
            { name: 'Desired Coverage', type: 'number', required: false },
            { name: 'Needs Quote', type: 'checkbox', required: false },
        ]
    },
    {
        id: 'education',
        name: 'Education',
        description: 'Para instituciones educativas y cursos',
        icon: '🎓',
        fields: [
            { name: 'Program of Interest', type: 'text', required: false },
            { name: 'Education Level', type: 'select', options: ['High School', 'Undergraduate', 'Graduate', 'Masters', 'PhD', 'Short Course'], required: false },
            { name: 'Study Area', type: 'text', required: false },
            { name: 'Preferred Start Date', type: 'date', required: false },
            { name: 'Modality', type: 'select', options: ['In-Person', 'Online', 'Hybrid'], required: false },
            { name: 'Needs Scholarship', type: 'checkbox', required: false },
            { name: 'Previous Experience', type: 'text', required: false },
            { name: 'Application Sent', type: 'checkbox', required: false },
        ]
    },
    {
        id: 'healthcare',
        name: 'Healthcare',
        description: 'Para clínicas, hospitales y servicios médicos',
        icon: '⚕️',
        fields: [
            { name: 'Service Type', type: 'select', options: ['Consultation', 'Surgery', 'Treatment', 'Emergency', 'Checkup'], required: false },
            { name: 'Specialty Required', type: 'text', required: false },
            { name: 'Preferred Date', type: 'date', required: false },
            { name: 'Has Insurance', type: 'checkbox', required: false },
            { name: 'Insurance Provider', type: 'text', required: false },
            { name: 'Symptoms/Condition', type: 'text', required: false },
            { name: 'First Visit', type: 'checkbox', required: false },
            { name: 'Referred By', type: 'text', required: false },
        ]
    },
    {
        id: 'fitness',
        name: 'Fitness / Gym',
        description: 'Para gimnasios, entrenadores y estudios',
        icon: '💪',
        fields: [
            { name: 'Fitness Goal', type: 'select', options: ['Weight Loss', 'Muscle Gain', 'Maintenance', 'Competition', 'Rehabilitation'], required: false },
            { name: 'Experience Level', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'], required: false },
            { name: 'Membership Type', type: 'select', options: ['Monthly', 'Quarterly', 'Annual', 'Single Class'], required: false },
            { name: 'Preferred Schedule', type: 'text', required: false },
            { name: 'Needs Trainer', type: 'checkbox', required: false },
            { name: 'Medical Conditions', type: 'text', required: false },
            { name: 'Visited Facility', type: 'checkbox', required: false },
        ]
    },
    {
        id: 'events',
        name: 'Events / Catering',
        description: 'Para servicios de catering y eventos',
        icon: '🍽️',
        fields: [
            { name: 'Event Type', type: 'select', options: ['Wedding', 'Corporate', 'Birthday', 'Anniversary', 'Other'], required: false },
            { name: 'Event Date', type: 'date', required: false },
            { name: 'Number of Guests', type: 'number', required: false },
            { name: 'Budget Per Person', type: 'number', required: false },
            { name: 'Food Type', type: 'select', options: ['Buffet', 'Plated', 'Canapés', 'BBQ', 'Other'], required: false },
            { name: 'Dietary Restrictions', type: 'text', required: false },
            { name: 'Needs Decoration', type: 'checkbox', required: false },
            { name: 'Needs Music/DJ', type: 'checkbox', required: false },
            { name: 'Visited Venue', type: 'checkbox', required: false },
        ]
    },
    {
        id: 'construction',
        name: 'Construction',
        description: 'Para constructoras y contratistas',
        icon: '🏗️',
        fields: [
            { name: 'Project Type', type: 'select', options: ['New Construction', 'Remodeling', 'Extension', 'Repair'], required: false },
            { name: 'Project Area', type: 'text', required: false },
            { name: 'Square Footage', type: 'number', required: false },
            { name: 'Total Budget', type: 'number', required: false },
            { name: 'Desired Start Date', type: 'date', required: false },
            { name: 'Has Plans', type: 'checkbox', required: false },
            { name: 'Has Permit', type: 'checkbox', required: false },
            { name: 'Needs Financing', type: 'checkbox', required: false },
            { name: 'Top Priority', type: 'text', required: false },
        ]
    }
];

