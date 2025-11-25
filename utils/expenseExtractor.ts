import { getGoogleGenAI } from './genAiClient';
import { ExpenseRecord } from '../types/finance';

export const extractExpenseFromReceipt = async (file: File): Promise<Partial<ExpenseRecord>> => {
    const ai = await getGoogleGenAI();
    
    // Convertir archivo a base64
    const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            // Manejar tanto data:image/jpeg;base64, como raw base64 si fuera necesario, 
            // pero FileReader.readAsDataURL devuelve el prefijo.
            const base64 = result.includes(',') ? result.split(',')[1] : result;
            resolve(base64);
        };
        reader.readAsDataURL(file);
    });

    // Prompt optimizado para JSON
    const prompt = `
    Analiza esta imagen/documento de una factura o recibo.
    Extrae la siguiente información en formato JSON estricto:
    - date: fecha en formato YYYY-MM-DD (si no hay año, asume el actual)
    - supplier: nombre del proveedor o negocio
    - category: clasifícalo en una de estas categorías: [Inventario, Marketing, Oficina, Servicios, Viajes, Comidas, Nómina, Otros]
    - subtotal: monto antes de impuestos (número)
    - tax: monto de impuestos (número)
    - total: monto total (número)
    - currency: código de moneda (MXN, USD, EUR). Si no es claro, asume MXN si es en español, USD en inglés.
    - items: array de strings con los nombres de los productos principales (máximo 5)
    - confidence: un número del 0 al 1 indicando qué tan legible es el documento y qué tan seguro estás de los datos extraídos.
    
    Si algún campo no es visible, usa null o 0 según corresponda.
    Responde SOLO con el JSON, sin bloques de código markdown.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash', // Modelo rápido y económico
            contents: [{
                role: 'user',
                parts: [
                    { inlineData: { mimeType: file.type, data: base64Data } },
                    { text: prompt }
                ]
            }]
        });

        const textResponse = response?.text || '{}';
        
        // Limpiar el markdown ```json ... ``` si Gemini lo incluye
        const jsonString = textResponse.replace(/```json|```/g, '').trim();
        
        const parsedData = JSON.parse(jsonString);
        
        return parsedData;
    } catch (error) {
        console.error("Error extracting expense data with Gemini:", error);
        throw new Error("No se pudo procesar el documento. Intenta con una imagen más clara.");
    }
};

