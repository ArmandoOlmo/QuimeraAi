import { useMemo, useState, useCallback } from 'react';
import { FileRecord } from '../types';
import { 
    searchFiles, 
    filterFilesByType, 
    sortFiles, 
    SortOption, 
    SortOrder, 
    FileTypeFilter 
} from '../utils/fileHelpers';

interface UseAssetLibraryOptions {
    files: FileRecord[];
    itemsPerPage?: number;
}

export const useAssetLibrary = ({ files, itemsPerPage = 20 }: UseAssetLibraryOptions) => {
    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<FileTypeFilter>('all');
    const [sortBy, setSortBy] = useState<SortOption>('date');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    
    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);

    // Filtered and sorted files
    const processedFiles = useMemo(() => {
        let result = [...files];
        
        // Search
        if (searchQuery) {
            result = searchFiles(result, searchQuery);
        }
        
        // Filter by type
        result = filterFilesByType(result, typeFilter);
        
        // Sort
        result = sortFiles(result, sortBy, sortOrder);
        
        return result;
    }, [files, searchQuery, typeFilter, sortBy, sortOrder]);

    // Paginated files
    const paginatedFiles = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return processedFiles.slice(startIndex, endIndex);
    }, [processedFiles, currentPage, itemsPerPage]);

    // Pagination info
    const totalPages = Math.ceil(processedFiles.length / itemsPerPage);
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    // Selection handlers
    const toggleSelection = useCallback((id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }, []);

    const selectAll = useCallback(() => {
        const allIds = new Set(processedFiles.map(f => f.id));
        setSelectedIds(allIds);
    }, [processedFiles]);

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    const toggleSelectionMode = useCallback(() => {
        setIsSelectionMode(prev => !prev);
        if (isSelectionMode) {
            clearSelection();
        }
    }, [isSelectionMode, clearSelection]);

    const isSelected = useCallback((id: string) => {
        return selectedIds.has(id);
    }, [selectedIds]);

    // Get selected files
    const selectedFiles = useMemo(() => {
        return processedFiles.filter(f => selectedIds.has(f.id));
    }, [processedFiles, selectedIds]);

    // Pagination handlers
    const goToPage = useCallback((page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    }, [totalPages]);

    const nextPage = useCallback(() => {
        if (hasNextPage) {
            setCurrentPage(prev => prev + 1);
        }
    }, [hasNextPage]);

    const prevPage = useCallback(() => {
        if (hasPrevPage) {
            setCurrentPage(prev => prev - 1);
        }
    }, [hasPrevPage]);

    // Reset pagination when filters change
    const resetPagination = useCallback(() => {
        setCurrentPage(1);
    }, []);

    // Filter/Sort handlers that also reset pagination
    const handleSearchChange = useCallback((query: string) => {
        setSearchQuery(query);
        resetPagination();
    }, [resetPagination]);

    const handleTypeFilterChange = useCallback((filter: FileTypeFilter) => {
        setTypeFilter(filter);
        resetPagination();
    }, [resetPagination]);

    const handleSortChange = useCallback((sort: SortOption, order?: SortOrder) => {
        setSortBy(sort);
        if (order) {
            setSortOrder(order);
        }
        resetPagination();
    }, [resetPagination]);

    const toggleSortOrder = useCallback(() => {
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    }, []);

    // Stats
    const stats = useMemo(() => ({
        total: files.length,
        filtered: processedFiles.length,
        selected: selectedIds.size,
        images: files.filter(f => f.type.startsWith('image/')).length,
        documents: files.filter(f => !f.type.startsWith('image/')).length,
    }), [files, processedFiles, selectedIds]);

    return {
        // Data
        files: paginatedFiles,
        allFiles: processedFiles,
        selectedFiles,
        stats,
        
        // Search & Filter
        searchQuery,
        typeFilter,
        sortBy,
        sortOrder,
        setSearchQuery: handleSearchChange,
        setTypeFilter: handleTypeFilterChange,
        setSortBy: handleSortChange,
        toggleSortOrder,
        
        // Selection
        selectedIds,
        isSelectionMode,
        toggleSelection,
        selectAll,
        clearSelection,
        toggleSelectionMode,
        isSelected,
        
        // Pagination
        currentPage,
        totalPages,
        hasNextPage,
        hasPrevPage,
        goToPage,
        nextPage,
        prevPage,
    };
};

