import { supabase } from '../../supabase';
import {
    buildReviewedTransactionalEmailPayload,
    type ReviewedTransactionalEmailIntent,
} from './emailModuleIntentService.ts';

export async function dispatchReviewedTransactionalEmailIntent(input: ReviewedTransactionalEmailIntent) {
    if (!input.projectId) {
        throw new Error('projectId is required to dispatch a reviewed email intent');
    }

    const payload = buildReviewedTransactionalEmailPayload(input);
    const { data, error } = await supabase.functions.invoke('email-api', { body: payload });
    if (error) throw error;
    if (data && data.success === false) throw new Error(data.error || 'Email dispatch failed');
    return data;
}
