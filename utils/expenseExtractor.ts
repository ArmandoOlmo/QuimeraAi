/**
 * Expense Extractor using Gemini Vision API
 * 
 * NOTE: This functionality requires the Vision API which needs direct API access
 * or an extended proxy that supports image uploads. The current proxy only supports
 * text-based requests.
 * 
 * TODO: Extend the Gemini proxy to support multimodal (image + text) requests
 * for features like receipt scanning.
 */
import { ExpenseRecord } from '../types/finance';

export const extractExpenseFromReceipt = async (_file: File): Promise<Partial<ExpenseRecord>> => {
    // Vision API features require proxy extension to support image uploads
    // For now, return a placeholder that prompts manual entry
    console.warn('⚠️ Receipt scanning requires Vision API proxy extension. Manual entry required.');

    throw new Error(
        'La función de escaneo de recibos está temporalmente deshabilitada. ' +
        'Por favor, ingresa los datos del gasto manualmente.'
    );

    /* 
    // Original implementation (requires Vision API with direct access):
    const ai = await getGoogleGenAI();
    
    // Convertir archivo a base64
    const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            const base64 = result.includes(',') ? result.split(',')[1] : result;
            resolve(base64);
        };
        reader.readAsDataURL(file);
    });

    const prompt = `
    Analiza esta imagen/documento de una factura o recibo.
    Extrae la información en formato JSON estricto...
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{
            role: 'user',
            parts: [
                { inlineData: { mimeType: file.type, data: base64Data } },
                { text: prompt }
            ]
        }]
    });

    const textResponse = response?.text || '{}';
    const jsonString = textResponse.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonString);
    */
};

