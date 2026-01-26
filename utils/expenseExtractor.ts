import { ExpenseRecord } from '../types/finance';
import { generateMultimodalContentViaProxy, extractTextFromResponse } from './geminiProxyClient';

export const extractExpenseFromReceipt = async (
    file: File,
    projectId: string,
    userId?: string
): Promise<Partial<ExpenseRecord>> => {
    // 1. Convert file to base64
    const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            // Remove data Url prefix (e.g. data:image/jpeg;base64,)
            const base64 = result.includes(',') ? result.split(',')[1] : result;
            resolve(base64);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });

    // 2. Prepare Prompt
    const prompt = `
    Analiza esta imagen o documento (recibo/factura).
    Extrae la información clave y devuélvela en formato JSON estricto con la siguiente estructura:
    {
        "date": "YYYY-MM-DD",
        "supplier": "Nombre del proveedor",
        "category": "Categoría sugerida (Oficina, Marketing, Inventario, Comidas, Transporte, Servicios, Nómina, Otros)",
        "subtotal": 0.00,
        "tax": 0.00,
        "total": 0.00,
        "currency": "MXN",
        "items": [
            { "description": "Nombre del item", "quantity": 1, "unitPrice": 0.00, "total": 0.00 }
        ],
        "confidence": 0.95
    }

    Reglas:
    - Si no encuentras fecha, usa la fecha de hoy.
    - Si no encuentras desglose de impuestos, asume 0 o cálculalo si es obvio.
    - Confidence debe ser un número entre 0 y 1 indicando qué tan legible fue el documento.
    - Responde SOLO con el JSON válido, sin markdown.
    `;

    try {
        // 3. Call Gemini Multimodal Proxy
        const response = await generateMultimodalContentViaProxy(
            projectId,
            prompt,
            [{ mimeType: file.type, data: base64Data }],
            'gemini-2.5-flash', // Matching model used in FinanceDashboard
            { temperature: 0.1 },
            userId
        );

        // 4. Parse Response
        const textResponse = extractTextFromResponse(response);
        const jsonString = textResponse.replace(/^```json\s*|\s*```$/g, '').trim();

        const data = JSON.parse(jsonString);

        // Basic validation/sanitization
        return {
            date: data.date || new Date().toISOString().split('T')[0],
            supplier: data.supplier || 'Desconocido',
            category: data.category || 'Otros',
            subtotal: Number(data.subtotal) || 0,
            tax: Number(data.tax) || 0,
            total: Number(data.total) || 0,
            currency: data.currency || 'MXN',
            items: Array.isArray(data.items) ? data.items : [],
            confidence: Number(data.confidence) || 0.5
        };

    } catch (error) {
        console.error('Error extracting expense data:', error);
        throw new Error('No se pudo procesar el recibo. Intente nuevamente o ingrese los datos manualmente.');
    }
};
