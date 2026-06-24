import * as React from 'react';
import { cn } from '@/utils';
import { EmptyState } from './Feedback';

export interface TableColumn<T> {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

export interface TableProps<T> extends React.HTMLAttributes<HTMLDivElement> {
  columns: TableColumn<T>[];
  data: T[];
  getRowId: (row: T, index: number) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function Table<T>({
  columns,
  data,
  getRowId,
  loading = false,
  emptyTitle = 'No records',
  emptyDescription,
  className,
  ...props
}: TableProps<T>) {
  return (
    <div className={cn('overflow-hidden rounded-[var(--q-radius-xl)] border border-border-subtle bg-q-surface shadow-[var(--q-shadow-card)]', className)} {...props}>
      <div className="overflow-auto quimera-ds-scrollbar">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-q-surface-overlay text-xs font-semibold uppercase tracking-wide text-q-text-muted">
            <tr>
              {columns.map((column) => (
                <th key={column.id} className={cn('border-b border-border-subtle px-4 py-3', column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-q-text-muted">
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-6">
                  <EmptyState title={emptyTitle} description={emptyDescription} className="border-0 shadow-none" />
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr key={getRowId(row, index)} className="border-b border-border-subtle last:border-b-0 hover:bg-q-surface-overlay/70">
                  {columns.map((column) => (
                    <td key={column.id} className={cn('px-4 py-3 align-middle text-q-text', column.className)}>
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
