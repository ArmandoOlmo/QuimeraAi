# AI Studio Chatbot Generation

## ES

AI Studio ahora puede terminar el merge del BusinessBlueprint con `chatbotBlueprint.engineVersion = "v2"`. Los borradores cross-module de chatbot mantienen los campos legacy y alimentan el contrato V2 sin activar runtime.

Flujo:

1. AI Studio deriva ecommerce, storefront, website ecommerce blocks, restaurant y cross-module drafts.
2. `mergeAiStudioBlueprint` toma el `chatbotBlueprint` derivado y lo normaliza a V2.
3. Si el chatbot existente está `userModified` o `lockedFromRegeneration`, se preserva y solo se normalizan defaults faltantes.
4. Knowledge sources y actions quedan en `needs_review`.
5. Copy generado para el blueprint incluye `ES:` y `EN:`.

Guardrails:

- AI Studio no habilita acciones públicas.
- AI Studio no activa checkout, order lookup, email subscribe, reservations, showings ni voice.
- AI Studio no inventa precios, inventario, políticas, disponibilidad, listados, reservas, reseñas ni asesoría legal/financiera.

## EN

AI Studio can now finish the BusinessBlueprint merge with `chatbotBlueprint.engineVersion = "v2"`. Chatbot cross-module drafts keep the legacy fields and feed the V2 contract without activating runtime behavior.

Flow:

1. AI Studio derives ecommerce, storefront, website ecommerce blocks, restaurant, and cross-module drafts.
2. `mergeAiStudioBlueprint` takes the derived `chatbotBlueprint` and normalizes it to V2.
3. If the existing chatbot is `userModified` or `lockedFromRegeneration`, it is preserved and only missing defaults are normalized.
4. Knowledge sources and actions remain in `needs_review`.
5. Blueprint-generated copy includes `ES:` and `EN:`.

Guardrails:

- AI Studio does not enable public actions.
- AI Studio does not activate checkout, order lookup, email subscribe, reservations, showings, or voice.
- AI Studio does not invent prices, inventory, policies, availability, listings, reservations, reviews, or legal/financial advice.
