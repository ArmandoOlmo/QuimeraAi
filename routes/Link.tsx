/**
 * Link Component
 * Componente de enlace para navegación declarativa (Clean URLs)
 */

import React from 'react';
import { useRouter } from '../hooks/useRouter';
import { RouteParams, buildPath } from './config';

interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  params?: RouteParams;
  replace?: boolean;
  children: React.ReactNode;
}

const Link: React.FC<LinkProps> = ({
  to,
  params,
  replace: shouldReplace = false,
  children,
  onClick,
  className,
  ...rest
}) => {
  const { navigate, replace } = useRouter();

  const href = buildPath(to, params);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Allow modifier keys for opening in new tab
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }

    e.preventDefault();
    
    if (onClick) {
      onClick(e);
    }

    const path = buildPath(to, params);
    if (shouldReplace) {
      replace(path);
    } else {
      navigate(path);
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={className}
      {...rest}
    >
      {children}
    </a>
  );
};

export default Link;
