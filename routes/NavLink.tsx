/**
 * NavLink Component
 * Link con soporte para estado activo (para navegación) - Clean URLs
 */

import React from 'react';
import { useRouter } from '../hooks/useRouter';
import { RouteParams, buildPath } from './config';

interface NavLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'children'> {
  to: string;
  params?: RouteParams;
  replace?: boolean;
  children: React.ReactNode | ((props: { isActive: boolean }) => React.ReactNode);
  activeClassName?: string;
  inactiveClassName?: string;
  exact?: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({
  to,
  params,
  replace: shouldReplace = false,
  children,
  onClick,
  className,
  activeClassName = '',
  inactiveClassName = '',
  exact = false,
  ...rest
}) => {
  const { path, navigate, replace } = useRouter();

  const targetPath = buildPath(to, params);
  
  const isActive = exact 
    ? path === targetPath 
    : path.startsWith(targetPath) || (targetPath !== '/' && path.startsWith(targetPath));

  const href = targetPath;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Allow modifier keys for opening in new tab
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }

    e.preventDefault();
    
    if (onClick) {
      onClick(e);
    }

    if (shouldReplace) {
      replace(targetPath);
    } else {
      navigate(targetPath);
    }
  };

  const computedClassName = [
    className,
    isActive ? activeClassName : inactiveClassName,
  ].filter(Boolean).join(' ');

  return (
    <a
      href={href}
      onClick={handleClick}
      className={computedClassName}
      aria-current={isActive ? 'page' : undefined}
      {...rest}
    >
      {typeof children === 'function' ? children({ isActive }) : children}
    </a>
  );
};

export default NavLink;
