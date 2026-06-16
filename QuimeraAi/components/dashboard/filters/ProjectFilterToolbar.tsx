import React from 'react';
import WebsiteCatalogToolbar, { type WebsiteCatalogToolbarProps } from './WebsiteCatalogToolbar';

export type ProjectFilterToolbarProps = WebsiteCatalogToolbarProps;

/**
 * @deprecated Use WebsiteCatalogToolbar — kept as alias for project selector pages.
 */
const ProjectFilterToolbar: React.FC<ProjectFilterToolbarProps> = (props) => (
    <WebsiteCatalogToolbar {...props} />
);

export default ProjectFilterToolbar;
