import type { TargetAndTransition, Transition, Variants } from 'framer-motion';

export const cardMotionEase: Transition['ease'] = [0.22, 1, 0.36, 1];

export const cardMotionHidden: TargetAndTransition = {
  opacity: 0,
  y: 24,
  scale: 0.955,
  filter: 'blur(8px)',
};

export const cardMotionVisible: TargetAndTransition = {
  opacity: 1,
  y: 0,
  scale: 1,
  filter: 'blur(0px)',
};

export const cardMotionTransition: Transition = {
  duration: 0.66,
  ease: cardMotionEase,
};

export const cardMotionHover: TargetAndTransition = {
  y: -2,
  transition: {
    duration: 0.22,
    ease: cardMotionEase,
  },
};

export const cardMotionStagger = 0.08;
export const cardMotionDelayChildren = 0.08;
export const cardMotionViewport = { once: true, amount: 0.18 };

export const createCardMotionVariants = (delay = 0): Variants => {
  const visible: TargetAndTransition = {
    ...cardMotionVisible,
    transition: {
      ...cardMotionTransition,
      delay,
    },
  };

  return {
    hidden: cardMotionHidden,
    visible,
    show: visible,
  };
};

export const cardMotionVariants = createCardMotionVariants();

export const cardMotionContainerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: cardMotionStagger,
      delayChildren: cardMotionDelayChildren,
    },
  },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: cardMotionStagger,
      delayChildren: cardMotionDelayChildren,
    },
  },
};

export const cardMotionToken = {
  hidden: cardMotionHidden,
  visible: cardMotionVisible,
  transition: cardMotionTransition,
  hover: cardMotionHover,
  stagger: cardMotionStagger,
  delayChildren: cardMotionDelayChildren,
  viewport: cardMotionViewport,
};
