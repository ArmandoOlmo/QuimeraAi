import type { Transition, Variants } from 'framer-motion';
import {
    cardMotionContainerVariants,
    cardMotionEase,
    createCardMotionVariants,
} from '../../utils/cardMotion';

const dashboardEase: Transition['ease'] = cardMotionEase;

export const dashboardContainerVariants: Variants = cardMotionContainerVariants;

export const dashboardItemVariants: Variants = {
    hidden: {
        opacity: 0,
        y: 34,
        scale: 0.965,
        filter: 'blur(10px)',
    },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
        transition: {
            duration: 0.78,
            ease: dashboardEase,
        },
    },
};

export const dashboardCardVariants: Variants = createCardMotionVariants();

export const getDashboardSectionTransition = (index: number): Transition => ({
    duration: 0.72,
    delay: 0.28 + index * 0.12,
    ease: dashboardEase,
});

export {
    cardMotionContainerVariants,
    cardMotionDelayChildren,
    cardMotionHidden,
    cardMotionHover,
    cardMotionStagger,
    cardMotionToken,
    cardMotionTransition,
    cardMotionVariants,
    cardMotionViewport,
    cardMotionVisible,
    createCardMotionVariants,
} from '../../utils/cardMotion';
