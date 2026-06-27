import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    MEDIA_GENERATOR_LAUNCH_EVENT,
    MEDIA_GENERATOR_LAUNCH_STORAGE_KEY,
    consumeMediaGeneratorLaunchRequest,
    dispatchMediaGeneratorLaunchRequest,
    peekMediaGeneratorLaunchRequest,
    readMediaGeneratorLaunchEvent,
    storeMediaGeneratorLaunchRequest,
} from '../../utils/mediaGeneratorLaunch';

describe('mediaGeneratorLaunch', () => {
    beforeEach(() => {
        window.sessionStorage.clear();
    });

    it('stores and consumes image launch requests without auto-starting by default', () => {
        const stored = storeMediaGeneratorLaunchRequest({
            mode: 'image',
            prompt: 'una casa en Puerto Rico',
            autoStart: false,
            projectId: 'project-1',
            source: 'global_assistant',
            options: {
                aspectRatio: '16:9',
                resolution: '4K',
                style: 'Photorealistic',
            },
        });

        expect(stored).toMatchObject({
            mode: 'image',
            prompt: 'una casa en Puerto Rico',
            autoStart: false,
            projectId: 'project-1',
            options: {
                aspectRatio: '16:9',
                resolution: '4K',
                style: 'Photorealistic',
            },
        });
        expect(window.sessionStorage.getItem(MEDIA_GENERATOR_LAUNCH_STORAGE_KEY)).toEqual(expect.any(String));

        expect(consumeMediaGeneratorLaunchRequest('image', 'wrong-project')).toBeNull();
        const consumed = consumeMediaGeneratorLaunchRequest('image', 'project-1');
        expect(consumed).toMatchObject({
            mode: 'image',
            prompt: 'una casa en Puerto Rico',
            autoStart: false,
        });
        expect(window.sessionStorage.getItem(MEDIA_GENERATOR_LAUNCH_STORAGE_KEY)).toBeNull();
    });

    it('peeks pending video requests without removing the prompt before the video panel mounts', () => {
        storeMediaGeneratorLaunchRequest({
            mode: 'video',
            prompt: 'reel vertical de una casa en Puerto Rico',
            autoStart: false,
            projectId: 'project-1',
            source: 'global_assistant',
            options: {
                aspectRatio: '9:16',
                resolution: '1080p',
            },
        });

        expect(peekMediaGeneratorLaunchRequest('project-1')).toMatchObject({
            mode: 'video',
            prompt: 'reel vertical de una casa en Puerto Rico',
            autoStart: false,
            options: {
                aspectRatio: '9:16',
                resolution: '1080p',
            },
        });
        expect(window.sessionStorage.getItem(MEDIA_GENERATOR_LAUNCH_STORAGE_KEY)).toEqual(expect.any(String));
        expect(consumeMediaGeneratorLaunchRequest('video', 'project-1')).toMatchObject({
            mode: 'video',
            prompt: 'reel vertical de una casa en Puerto Rico',
        });
    });

    it('dispatches a browser event the media generator can read', () => {
        const listener = vi.fn((event: Event) => readMediaGeneratorLaunchEvent(event));
        const request = storeMediaGeneratorLaunchRequest({
            mode: 'image',
            prompt: 'hotel boutique horizontal',
            autoStart: false,
            projectId: null,
            source: 'test',
        });

        expect(request).not.toBeNull();
        window.addEventListener(MEDIA_GENERATOR_LAUNCH_EVENT, listener);
        dispatchMediaGeneratorLaunchRequest(request!);
        window.removeEventListener(MEDIA_GENERATOR_LAUNCH_EVENT, listener);

        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener.mock.results[0].value).toMatchObject({
            mode: 'image',
            prompt: 'hotel boutique horizontal',
            autoStart: false,
        });
    });
});
