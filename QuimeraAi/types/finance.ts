// =============================================================================
// FINANCE & ACCOUNTING TYPES
// =============================================================================

// --- Existing Expense Types (preserved) ---

export interface ExpenseItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
  category?: string;
}

export interface ExpenseRecord {
  id: string;
  date: string;        // YYYY-MM-DD
  supplier: string;    // Nombre de la empresa/tienda
  category: string;    // Ej: "Materiales", "Comida", "Transporte", "Servicios"
  subtotal: number;
  tax: number;         // IVA u otros impuestos
  total: number;
  currency: string;    // MXN, USD, etc.
  items?: (string | ExpenseItem)[];    // Lista de ítems comprados
  confidence: number;  // Nivel de confianza de la IA (0-1)
  status: 'pending' | 'approved' | 'rejected';
  originalFileUrl?: string; // URL opcional de la imagen original
  createdAt: any;      // Timestamp de Firestore
}

// --- Accounting Module Types ---

/** Account types in a standard Chart of Accounts */
export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';

/** Transaction type */
export type TransactionType = 'income' | 'expense';

/** Invoice status lifecycle */
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

/** Chart of Accounts entry */
export interface AccountEntry {
  id: string;
  code: string;           // e.g. "1000", "4000"
  name: string;           // e.g. "Cash", "Sales Revenue"
  type: AccountType;
  balance: number;
  parentId?: string;      // For sub-accounts
  description?: string;
  isActive: boolean;
  createdAt: any;
}

/** Accounting Transaction */
export interface Transaction {
  id: string;
  date: string;             // YYYY-MM-DD
  description: string;
  amount: number;
  type: TransactionType;
  account: string;          // Account name or code
  category: string;         // Income/Expense category
  counterpartyId?: string;  // Vendor or Client ID
  counterpartyName?: string;
  reference?: string;       // Invoice #, receipt #, etc.
  notes?: string;
  currency: string;
  aiVerified: boolean;      // Whether AI has categorized this
  aiConfidence?: number;    // 0-1 confidence score
  aiSuggestedCategory?: string;
  aiSuggestedAccount?: string;
  status: 'pending' | 'verified' | 'reconciled';
  tags?: string[];
  createdAt: any;
  updatedAt?: any;
}

/** Invoice line item */
export interface InvoiceItem {
  id: string;
  productServiceId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;        // Percentage, e.g. 16 for 16%
  total: number;          // quantity * unitPrice * (1 + taxRate/100)
}

/** Invoice document */
export interface Invoice {
  id: string;
  invoiceNumber: string;     // Auto-generated, e.g. "INV-0001"
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
  clientPhone?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  issueDate: string;         // YYYY-MM-DD
  dueDate: string;           // YYYY-MM-DD
  paidDate?: string;
  paymentTerms: string;      // e.g. "Net 30", "Due on receipt"
  reminderNote?: string;     // Client-facing reminder
  notes?: string;            // Internal notes
  aiOptimized: boolean;      // Whether AI has optimized terms
  aiOptimizedTerms?: string; // AI-suggested payment terms
  aiOptimizedReminder?: string; // AI-suggested reminder text
  createdAt: any;
  updatedAt?: any;
}

/** Product or Service catalog item */
export interface ProductService {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  category: string;
  unit?: string;           // e.g. "hour", "unit", "project"
  taxable: boolean;
  taxRate?: number;        // Default tax rate percentage
  isActive: boolean;
  createdAt: any;
  updatedAt?: any;
}

/** Vendor / Supplier record */
export interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  category?: string;
  defaultAccount?: string;  // Default expense account
  taxId?: string;           // RFC, NIF, etc.
  notes?: string;
  totalSpent: number;       // Running total of payments
  lastTransactionDate?: string;
  isActive: boolean;
  createdAt: any;
  updatedAt?: any;
}

/** Financial report data structure */
export interface FinancialReport {
  type: 'profit_loss' | 'balance_sheet';
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  data: {
    income: { category: string; amount: number }[];
    expenses: { category: string; amount: number }[];
    totalIncome: number;
    totalExpenses: number;
    netIncome: number;
    // Balance Sheet specific
    assets?: { name: string; amount: number }[];
    liabilities?: { name: string; amount: number }[];
    equity?: { name: string; amount: number }[];
    totalAssets?: number;
    totalLiabilities?: number;
    totalEquity?: number;
  };
  aiNarrative?: string;    // AI-generated explanation
}

/** Cash flow summary for dashboard */
export interface CashFlowSummary {
  period: string;          // e.g. "2026-03"
  income: number;
  expenses: number;
  netCashFlow: number;
}

/** Overdue invoice summary */
export interface OverdueInvoiceSummary {
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  total: number;
  dueDate: string;
  daysOverdue: number;
}
