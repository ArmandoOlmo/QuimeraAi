/**
 * AutomationsTab — User Email Hub
 *
 * Re-exports the admin AutomationsTab since it's a pure presentational component
 * that receives all data/actions via props. The parent hook layer (useUserEmailActions)
 * already handles the user-scoped Firestore operations.
 *
 * We import types from our user types and re-export the admin component.
 */

export { default } from '../../../admin/email-hub/views/AutomationsTab';
