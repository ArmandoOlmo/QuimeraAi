/**
 * LoadingScreen Component
 * Pantalla de carga con animación elegante
 */

import React from 'react';
import QuimeraLoader from '../components/ui/QuimeraLoader';

const LoadingScreen: React.FC = () => {
  return <QuimeraLoader fullScreen size="lg" text="Loading..." />;
};

export default LoadingScreen;
