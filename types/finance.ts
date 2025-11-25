export interface ExpenseRecord {
  id: string;
  date: string;        // YYYY-MM-DD
  supplier: string;    // Nombre de la empresa/tienda
  category: string;    // Ej: "Materiales", "Comida", "Transporte", "Servicios"
  subtotal: number;
  tax: number;         // IVA u otros impuestos
  total: number;
  currency: string;    // MXN, USD, etc.
  items?: string[];    // Lista opcional de ítems comprados
  confidence: number;  // Nivel de confianza de la IA (0-1)
  status: 'pending' | 'approved' | 'rejected';
  originalFileUrl?: string; // URL opcional de la imagen original
  createdAt: any;      // Timestamp de Firestore
}

