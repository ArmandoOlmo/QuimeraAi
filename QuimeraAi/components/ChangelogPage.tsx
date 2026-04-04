/**
 * ChangelogPage
 * Página pública del changelog de Quimera AI
 * Diseño inspirado en Thumio con colores del tema de Quimera
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp,
  Link2,
  Share2,
  Twitter,
  Linkedin,
  MessageCircle,
  Calendar,
  Tag,
  X,
  Check,
  Sparkles,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { useChangelog } from '../hooks/useChangelog';
import { 
  ChangelogEntry, 
  ChangelogTag, 
  CHANGELOG_TAG_COLORS, 
  ChangelogFilters
} from '../types/changelog';

import MarketingLayout from './marketing/MarketingLayout';

interface ChangelogPageProps {
  onNavigateToHome: () => void;
  onNavigateToLogin: () => void;
  onNavigateToRegister: () => void;
}

// Tag Badge Component
const TagBadge: React.FC<{ tag: ChangelogTag; size?: 'sm' | 'md' }> = ({ tag, size = 'md' }) => {
  const { t } = useTranslation();
  const colors = CHANGELOG_TAG_COLORS[tag];
  
  return (
    <span 
      className={`
        inline-flex items-center gap-1 font-bold uppercase tracking-wide rounded-full border
        ${colors?.bg} ${colors?.text} ${colors?.border}
        ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'}
      `}
    >
      {t(`changelog.tags.${tag}`)}
    </span>
  );
};

// Entry Card Component
const EntryCard: React.FC<{
  entry: ChangelogEntry;
  isExpanded: boolean;
  onToggle: () => void;
  language: string;
}> = ({ entry, isExpanded, onToggle, language }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  
  const formattedDate = useMemo(() => {
    const date = new Date(entry.date);
    return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [entry.date, language]);

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/changelog#${entry.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying link:', err);
    }
  };

  const handleShare = (platform: 'twitter' | 'linkedin' | 'reddit') => {
    const url = `${window.location.origin}/changelog#${entry.slug}`;
    const text = `${entry.title} - Quimera AI Changelog`;
    
    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      reddit: `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
    };
    
    window.open(shareUrls[platform], '_blank', 'width=600,height=400');
  };

  return (
    <article 
      id={entry.slug}
      className="relative bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden hover:border-yellow-400/20 transition-all duration-300 group"
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      <div className="relative p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-gray-500 text-sm flex items-center gap-2">
              <Calendar size={14} />
              {formattedDate}
            </span>
            <TagBadge tag={entry.tag} />
            {entry.version && (
              <span className="text-gray-600 text-xs bg-white/5 px-2 py-1 rounded-full">
                v{entry.version}
              </span>
            )}
          </div>
          
          {/* Share Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopyLink}
              className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all relative group/btn"
              title={t('changelog.copyLink')}
            >
              {copied ? <Check size={18} className="text-green-400" /> : <Link2 size={18} />}
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs bg-gray-900 text-white px-2 py-1 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {copied ? t('changelog.copied') : t('changelog.copyLink')}
              </span>
            </button>
            <button
              onClick={() => handleShare('reddit')}
              className="p-2 rounded-lg text-gray-500 hover:text-[#FF4500] hover:bg-[#FF4500]/10 transition-all"
              title={t('changelog.shareReddit')}
            >
              <MessageCircle size={18} />
            </button>
            <button
              onClick={() => handleShare('twitter')}
              className="p-2 rounded-lg text-gray-500 hover:text-[#1DA1F2] hover:bg-[#1DA1F2]/10 transition-all"
              title={t('changelog.shareTwitter')}
            >
              <Twitter size={18} />
            </button>
            <button
              onClick={() => handleShare('linkedin')}
              className="p-2 rounded-lg text-gray-500 hover:text-[#0A66C2] hover:bg-[#0A66C2]/10 transition-all"
              title={t('changelog.shareLinkedin')}
            >
              <Linkedin size={18} />
            </button>
            <button
              onClick={onToggle}
              className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all ml-2"
              title={isExpanded ? t('changelog.collapse') : t('changelog.expand')}
            >
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl md:text-2xl font-bold text-white mb-3 group-hover:text-yellow-400 transition-colors">
          {language === 'en' && entry.title_en ? entry.title_en : entry.title}
        </h2>

        {/* Description */}
        <p className="text-gray-400 leading-relaxed mb-4">
          {language === 'en' && entry.description_en ? entry.description_en : entry.description}
        </p>

        {/* Expandable Content */}
        <div 
          className={`overflow-hidden transition-all duration-500 ${
            isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          {/* Features List */}
          {entry.features.length > 0 && (
            <ul className="space-y-3 mb-6">
              {entry.features.map((feature) => (
                <li key={feature.id} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-2 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-white">
                      {language === 'en' && feature.title_en ? feature.title_en : feature.title}
                    </span>
                    <span className="text-gray-400">
                      {' – '}{language === 'en' && feature.description_en ? feature.description_en : feature.description}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Image */}
          {entry.imageUrl && (
            <div className="mt-4 rounded-xl overflow-hidden border border-white/10">
              <img 
                src={entry.imageUrl} 
                alt={entry.imageAlt || entry.title}
                className="w-full h-auto"
                loading="lazy"
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

// Filter Dropdown Component
const FilterDropdown: React.FC<{
  selectedTags: ChangelogTag[];
  onTagToggle: (tag: ChangelogTag) => void;
  onClear: () => void;
  tagCounts: Record<ChangelogTag, number>;
}> = ({ selectedTags, onTagToggle, onClear, tagCounts }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  const allTags: ChangelogTag[] = ['new', 'improvement', 'fix', 'performance', 'security', 'breaking', 'deprecated', 'beta'];
  const activeTagsCount = selectedTags.length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-4 py-3 rounded-xl border transition-all
          ${activeTagsCount > 0 
            ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400' 
            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
          }
        `}
      >
        <Filter size={18} />
        <span className="hidden sm:inline">{t('changelog.filters')}</span>
        {activeTagsCount > 0 && (
          <span className="bg-yellow-400 text-black text-xs font-bold px-1.5 py-0.5 rounded-full">
            {activeTagsCount}
          </span>
        )}
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-72 bg-[#151515] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <span className="text-white font-semibold">{t('changelog.filterByType')}</span>
              {activeTagsCount > 0 && (
                <button
                  onClick={onClear}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  {t('changelog.clearAll')}
                </button>
              )}
            </div>
            <div className="p-2">
              {allTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                const colors = CHANGELOG_TAG_COLORS[tag];
                const count = tagCounts[tag];
                
                return (
                  <button
                    key={tag}
                    onClick={() => onTagToggle(tag)}
                    className={`
                      w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg transition-all
                      ${isSelected 
                        ? `${colors?.bg} ${colors?.text}` 
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                        isSelected 
                          ? `${colors?.border} ${colors?.bg}` 
                          : 'border-gray-600'
                      }`}>
                        {isSelected && <Check size={10} />}
                      </div>
                      <span className="font-medium">{t(`changelog.tags.${tag}`)}</span>
                    </div>
                    <span className="text-xs opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Main Changelog Page Component
const ChangelogPage: React.FC<ChangelogPageProps> = ({
  onNavigateToHome,
  onNavigateToLogin,
  onNavigateToRegister
}) => {
  const { t, i18n } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<ChangelogTag[]>([]);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 5;

  // Build filters
  const filters: ChangelogFilters = useMemo(() => ({
    search: searchTerm,
    tags: selectedTags,
  }), [searchTerm, selectedTags]);

  // Fetch changelog
  const { filteredEntries, isLoading, error, config, tagCounts } = useChangelog(filters);

  // Handle hash navigation (for direct links to entries)
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && filteredEntries.length > 0) {
      const entry = filteredEntries.find(e => e.slug === hash);
      if (entry) {
        setExpandedEntries(new Set([entry.id]));
        setTimeout(() => {
          const element = document.getElementById(hash);
          element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } else if (config.defaultExpanded && filteredEntries.length > 0) {
      // Expand first entry by default
      setExpandedEntries(new Set([filteredEntries[0].id]));
    }
  }, [filteredEntries, config.defaultExpanded]);

  // Pagination
  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredEntries.slice(start, start + entriesPerPage);
  }, [filteredEntries, currentPage, entriesPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTags]);

  // Toggle entry expansion
  const toggleEntry = useCallback((id: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Toggle tag filter
  const toggleTag = useCallback((tag: ChangelogTag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSelectedTags([]);
    setSearchTerm('');
  }, []);

  return (
    <MarketingLayout
      onNavigateToHome={onNavigateToHome}
      onNavigateToLogin={onNavigateToLogin}
      onNavigateToRegister={onNavigateToRegister}
    >
      {/* === MAIN CONTENT === */}
      <div>
        {/* Hero Section */}
        <section className="py-12 md:py-20 border-b border-white/5">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-400 text-sm font-medium uppercase tracking-wide">{t('changelog.updates')}</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black mb-4 bg-gradient-to-r from-white via-white to-gray-500 bg-clip-text text-transparent">
                Changelog
              </h1>
              <p className="text-lg md:text-xl text-gray-400 max-w-2xl">
                {t('changelog.subtitle')}
              </p>
            </div>
          </div>
        </section>

        {/* Filters Section */}
        <section className="py-6 sticky top-16 bg-[#0A0A0A]/95 backdrop-blur-sm z-30 border-b border-white/5">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('changelog.searchUpdates')}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/20 transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {/* Filter Dropdown */}
              <FilterDropdown
                selectedTags={selectedTags}
                onTagToggle={toggleTag}
                onClear={() => setSelectedTags([])}
                tagCounts={tagCounts}
              />
            </div>

            {/* Active Filters */}
            {(selectedTags.length > 0 || searchTerm) && (
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <span className="text-sm text-gray-500">{t('changelog.activeFilters')}</span>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-full text-sm text-gray-300 hover:bg-white/10"
                  >
                    "{searchTerm}"
                    <X size={14} />
                  </button>
                )}
                {selectedTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm ${CHANGELOG_TAG_COLORS[tag].bg} ${CHANGELOG_TAG_COLORS[tag].text}`}
                  >
                    {t(`changelog.tags.${tag}`)}
                    <X size={14} />
                  </button>
                ))}
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-500 hover:text-white ml-2"
                >
                  {t('changelog.clearAll')}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Entries List */}
        <section className="py-8">
          <div className="container mx-auto px-4 sm:px-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-10 h-10 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-500">{t('changelog.loadingUpdates')}</p>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-red-400 mb-4">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="text-yellow-400 hover:underline"
                >
                  {t('changelog.tryAgain')}
                </button>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{t('changelog.noResults')}</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || selectedTags.length > 0 
                    ? t('changelog.tryOtherSearch')
                    : t('changelog.noEntries')
                  }
                </p>
                {(searchTerm || selectedTags.length > 0) && (
                  <button
                    onClick={clearFilters}
                    className="text-yellow-400 hover:underline"
                  >
                    {t('changelog.clearFilters')}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {paginatedEntries.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    isExpanded={expandedEntries.has(entry.id)}
                    onToggle={() => toggleEntry(entry.id)}
                    language={i18n.language}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-12">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                    currentPage === 1
                      ? 'border-white/5 text-gray-600 cursor-not-allowed'
                      : 'border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <ArrowLeft size={18} />
                  <span className="hidden sm:inline">{t('changelog.previous')}</span>
                </button>
                
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-xl font-medium transition-all ${
                        page === currentPage
                          ? 'bg-yellow-400 text-black'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                    currentPage === totalPages
                      ? 'border-white/5 text-gray-600 cursor-not-allowed'
                      : 'border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <span className="hidden sm:inline">{t('changelog.next')}</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            )}

            {/* Results Count */}
            {filteredEntries.length > 0 && (
              <p className="text-center text-gray-500 text-sm mt-6">
                {t('changelog.showing', { start: ((currentPage - 1) * entriesPerPage) + 1, end: Math.min(currentPage * entriesPerPage, filteredEntries.length), total: filteredEntries.length })}
              </p>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 border-t border-white/5">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                {t('changelog.readyToCreate')}
              </h2>
              <p className="text-gray-400 mb-8">
                {t('changelog.joinThousands')}
              </p>
              <button
                onClick={onNavigateToRegister}
                className="inline-flex items-center gap-2 px-8 py-4 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 active:scale-[0.98] transition-all"
              >
                {t('changelog.startFree')}
                <ArrowRight size={20} />
              </button>
              <p className="text-gray-600 text-sm mt-3">{t('changelog.noCreditCard')}</p>
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
};

export default ChangelogPage;

