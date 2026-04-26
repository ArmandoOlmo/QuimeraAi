import { addDoc, collection, serverTimestamp } from '../../firebase';
import { db } from '../../firebase';
import { generateContentViaProxy, extractTextFromResponse } from '../../utils/geminiProxyClient';
import {
  AiGeneratedRestaurantMenu,
  AiRestaurantMenuInput,
  DietaryTag,
  RestaurantMarketingOutput,
  RestaurantMenuItem,
  RestaurantReviewTemplate,
  RestaurantAnalyticsEvent,
} from '../../types/restaurants';
import { getAnalyticsEventsPath, getMarketingOutputsPath, getReviewTemplatesPath, getRestaurantTenantId, RestaurantScope } from './restaurantPaths';

const cleanJsonResponse = (text: string) => {
  const stripped = text.replace(/```json\n?|```/g, '').trim();
  const first = stripped.indexOf('{');
  const last = stripped.lastIndexOf('}');
  return first >= 0 && last >= 0 ? stripped.slice(first, last + 1) : stripped;
};

const normalizeTags = (tags: unknown): DietaryTag[] => {
  const allowed: DietaryTag[] = ['vegan', 'vegetarian', 'glutenFree', 'spicy', 'keto', 'dairyFree', 'nutFree'];
  return Array.isArray(tags) ? tags.filter((tag): tag is DietaryTag => allowed.includes(tag as DietaryTag)) : [];
};

export async function generateRestaurantMenuWithAI(scope: RestaurantScope, restaurantId: string, input: AiRestaurantMenuInput) {
  const prompt = `Genera un menu profesional completo para un restaurante basado en esta informacion: ${JSON.stringify(input)}.
Incluye categorias, platos, descripciones comerciales, precios sugeridos, ingredientes, alergenos, tags dietarios, platos destacados y recomendaciones de upsell.
No uses lorem ipsum. Devuelve JSON valido con esta forma exacta:
{
  "categories": [
    {
      "name": "Appetizers",
      "items": [
        {
          "name": "string",
          "description": "string",
          "category": "string",
          "price": 12.5,
          "currency": "USD",
          "dietaryTags": ["vegetarian"],
          "allergens": ["dairy"],
          "ingredients": ["ingredient"],
          "preparationTime": 15,
          "isAvailable": true,
          "isFeatured": false,
          "upsellItems": ["drink or side"]
        }
      ]
    }
  ]
}`;

  const response = await generateContentViaProxy(restaurantId, prompt, 'gemini-2.5-flash', {
    temperature: 0.7,
    maxOutputTokens: 8192,
  }, scope.userId);
  const parsed = JSON.parse(cleanJsonResponse(extractTextFromResponse(response))) as AiGeneratedRestaurantMenu;
  const items = (parsed.categories || []).flatMap((category, categoryIndex) =>
    (category.items || []).map((item, itemIndex) => ({
      ...item,
      category: item.category || category.name,
      currency: item.currency || 'USD',
      dietaryTags: normalizeTags(item.dietaryTags),
      allergens: item.allergens || [],
      ingredients: item.ingredients || [],
      upsellItems: item.upsellItems || [],
      isAvailable: item.isAvailable ?? true,
      isFeatured: item.isFeatured ?? itemIndex === 0,
      aiGenerated: true,
      position: categoryIndex * 100 + itemIndex,
    }))
  );
  await trackRestaurantEvent(scope, restaurantId, 'ai_menu_generated');
  return items;
}

export async function runDishAssistant(
  scope: RestaurantScope,
  restaurantId: string,
  action: string,
  dish: Partial<RestaurantMenuItem>,
  language = 'es'
) {
  const prompt = `Eres un asistente experto para restaurantes. Accion: ${action}. Idioma: ${language}.
Plato: ${JSON.stringify(dish)}.
Devuelve una respuesta util y lista para usar. Si la accion pide tags, upsells o precio, devuelve JSON valido.`;
  const response = await generateContentViaProxy(restaurantId, prompt, 'gemini-2.5-flash', {
    temperature: 0.6,
    maxOutputTokens: 2048,
  }, scope.userId);
  await trackRestaurantEvent(scope, restaurantId, 'ai_description_generated', { action });
  return extractTextFromResponse(response).trim();
}

export async function generateRestaurantMarketingCopy(
  scope: RestaurantScope,
  restaurantId: string,
  type: RestaurantMarketingOutput['type'],
  context: string
) {
  const prompt = `Genera copy profesional para restaurante. Tipo: ${type}. Contexto: ${context}. No uses lorem ipsum.`;
  const response = await generateContentViaProxy(restaurantId, prompt, 'gemini-2.5-flash', {
    temperature: 0.75,
    maxOutputTokens: 2048,
  }, scope.userId);
  const output = extractTextFromResponse(response).trim();
  await addDoc(collection(db, getMarketingOutputsPath(scope, restaurantId)), {
    tenantId: getRestaurantTenantId(scope),
    restaurantId,
    type,
    prompt,
    output,
    createdAt: serverTimestamp(),
    createdBy: scope.userId,
  });
  return output;
}

export async function generateReservationMessage(scope: RestaurantScope, restaurantId: string, action: string, context: string) {
  const prompt = `Genera un mensaje breve y profesional para reserva de restaurante. Tipo: ${action}. Contexto: ${context}.`;
  const response = await generateContentViaProxy(restaurantId, prompt, 'gemini-2.5-flash', { temperature: 0.5 }, scope.userId);
  return extractTextFromResponse(response).trim();
}

export async function generateReviewTemplate(
  scope: RestaurantScope,
  restaurantId: string,
  type: RestaurantReviewTemplate['type'],
  context: string
) {
  const prompt = `Genera una plantilla para reviews de restaurante. Tipo: ${type}. Contexto: ${context}. Tono profesional y humano.`;
  const response = await generateContentViaProxy(restaurantId, prompt, 'gemini-2.5-flash', { temperature: 0.55 }, scope.userId);
  const content = extractTextFromResponse(response).trim();
  await addDoc(collection(db, getReviewTemplatesPath(scope, restaurantId)), {
    tenantId: getRestaurantTenantId(scope),
    restaurantId,
    type,
    title: type,
    content,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return content;
}

export async function trackRestaurantEvent(
  scope: RestaurantScope,
  restaurantId: string,
  eventName: RestaurantAnalyticsEvent['eventName'],
  metadata: Record<string, unknown> = {}
) {
  await addDoc(collection(db, getAnalyticsEventsPath(scope, restaurantId)), {
    tenantId: getRestaurantTenantId(scope),
    restaurantId,
    eventName,
    metadata,
    createdAt: serverTimestamp(),
  });
}
