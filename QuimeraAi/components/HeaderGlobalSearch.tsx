import React, { useMemo } from 'react';
import { useSafeProject } from '../contexts/project';
import { GlobalSearch } from './ecommerce/search';

interface HeaderGlobalSearchProps {
  onProductClick: (productId: string) => void;
  onContentClick: (href: string) => void;
  placeholder?: string;
  primaryColor?: string;
  textColor?: string;
}

const resolveText = (text: any) => {
  if (!text) return '';
  if (typeof text === 'string') return text;
  if (typeof text === 'object' && text !== null) {
    return text.es || text.en || Object.values(text)[0] || '';
  }
  return String(text);
};

const HeaderGlobalSearch: React.FC<HeaderGlobalSearchProps> = ({
  onProductClick,
  onContentClick,
  placeholder,
  primaryColor,
  textColor,
}) => {
  const projectContext = useSafeProject();
  const storeId = projectContext?.activeProjectId || undefined;
  const pageData = projectContext?.data;

  const sections = useMemo(() => {
    const searchable: Array<{ id: string; title: string; href: string; description?: string }> = [];
    if (!pageData) return searchable;

    const sectionMap = [
      ['hero', pageData.hero?.headline, pageData.hero?.subheadline, '/'],
      ['features', pageData.features?.title, pageData.features?.subtitle, '#features'],
      ['services', pageData.services?.title, pageData.services?.subtitle, '#services'],
      ['testimonials', pageData.testimonials?.title, pageData.testimonials?.subtitle, '#testimonials'],
      ['pricing', pageData.pricing?.title, pageData.pricing?.subtitle, '#pricing'],
      ['faq', pageData.faq?.title, pageData.faq?.subtitle, '#faq'],
      ['portfolio', pageData.portfolio?.title, pageData.portfolio?.subtitle, '#portfolio'],
      ['team', pageData.team?.title, pageData.team?.subtitle, '#team'],
      ['cta', pageData.cta?.headline, pageData.cta?.subheadline, '#cta'],
    ];

    sectionMap.forEach(([id, title, description, href]) => {
      if (!title) return;
      searchable.push({
        id: String(id),
        title: resolveText(title),
        description: resolveText(description),
        href: String(href),
      });
    });

    searchable.push({
      id: 'store',
      title: 'Tienda',
      description: 'Ver todos los productos',
      href: '/tienda',
    });

    return searchable;
  }, [pageData]);

  return (
    <GlobalSearch
      storeId={storeId}
      onProductClick={onProductClick}
      onContentClick={onContentClick}
      placeholder={placeholder}
      primaryColor={primaryColor}
      textColor={textColor}
      sections={sections}
    />
  );
};

export default HeaderGlobalSearch;
