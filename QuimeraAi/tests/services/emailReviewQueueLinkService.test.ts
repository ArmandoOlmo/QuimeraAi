import { describe, expect, it } from 'vitest';
import {
    buildEmailReviewQueueUrl,
    describeEmailReviewQueueFilter,
    hasEmailReviewQueueFilter,
    parseEmailReviewQueueParams,
} from '../../services/email/emailReviewQueueLinkService.ts';

describe('emailReviewQueueLinkService', () => {
    it('builds canonical review queue links scoped to project and source entity', () => {
        expect(buildEmailReviewQueueUrl({
            projectId: 'project-1',
            sourceModule: 'restaurants',
            sourceEntityType: 'restaurant_reservation',
            sourceEntityId: 'reservation-1',
        })).toBe('/email?projectId=project-1&tab=review&sourceModule=restaurants&sourceEntityType=restaurant_reservation&sourceEntityId=reservation-1');
    });

    it('parses review queue filters from URLSearchParams', () => {
        const parsed = parseEmailReviewQueueParams('?projectId=project-1&tab=review&sourceModule=chatcore&sourceEntityId=conv-1');

        expect(parsed).toMatchObject({
            projectId: 'project-1',
            tab: 'review',
            hasFilter: true,
            filters: {
                sourceModule: 'chatcore',
                sourceEntityId: 'conv-1',
            },
        });
        expect(hasEmailReviewQueueFilter(parsed.filters)).toBe(true);
        expect(describeEmailReviewQueueFilter(parsed.filters)).toBe('chatcore / conv-1');
    });

    it('keeps an unfiltered review link focused on the review tab', () => {
        const parsed = parseEmailReviewQueueParams(buildEmailReviewQueueUrl({ projectId: 'project-1' }).split('?')[1]);

        expect(parsed).toEqual({
            projectId: 'project-1',
            tab: 'review',
            filters: {},
            hasFilter: false,
        });
    });
});
