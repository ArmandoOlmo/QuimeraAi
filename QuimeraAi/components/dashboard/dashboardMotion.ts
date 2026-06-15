import type { Transition, Variants } from 'framer-motion';

const dashboardEase: Transition['ease'] = [0.22, 1, 0.36, 1];

export const dashboardContainerVariants: Variants = {
    hidden: { opacity: 1 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.14,
            delayChildren: 0.08,
        },
    },
};

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

export const dashboardCardVariants: Variants = {
    hidden: {
        opacity: 0,
        y: 24,
        scale: 0.955,
        filter: 'blur(8px)',
    },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
        transition: {
            duration: 0.66,
            ease: dashboardEase,
        },
    },
};

export const getDashboardSectionTransition = (index: number): Transition => ({
    duration: 0.72,
    delay: 0.28 + index * 0.12,
    ease: dashboardEase,
});
