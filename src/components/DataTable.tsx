// File: d:\Robo_Mob\Robo-Controller\smartmove\src\components\DataTable.tsx

import React from 'react';
import { Inbox } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Column descriptor for DataTable.
 *
 * @template T  The row data type.
 *
 * - `key`    – either a keyof T (for a direct property lookup) or any string
 *              when a custom `render` function is provided.
 * - `label`  – displayed in the sticky table header.
 * - `render` – optional custom renderer; receives the full row object.
 */
export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Safely retrieve a value from a row by an arbitrary key string. */
function getCellValue<T>(row: T, key: keyof T | string): React.ReactNode {
  const value = (row as Record<string, unknown>)[key as string];
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// Number of skeleton rows to render while loading
const SKELETON_ROWS = 5;

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Animated loading skeleton — shown when `loading` is true. */
const SkeletonRows = <T,>({ columns }: { columns: Column<T>[] }) => (
  <>
    {Array.from({ length: SKELETON_ROWS }).map((_, rowIdx) => (
      <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
        {columns.map((col) => (
          <td key={String(col.key)} className="px-4 py-3">
            <div
              className="h-4 rounded animate-pulse"
              style={{
                backgroundColor: '#e5e7eb',
                // Vary widths for a more natural skeleton appearance
                width: `${55 + ((rowIdx * columns.indexOf(col) + 7) % 4) * 12}%`,
              }}
            />
          </td>
        ))}
      </tr>
    ))}
  </>
);

/** Empty-state row — shown when data is an empty array. */
const EmptyRow = <T,>({
  columns,
  message,
}: {
  columns: Column<T>[];
  message: string;
}) => (
  <tr>
    <td colSpan={columns.length} className="py-16 text-center">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <Inbox size={40} strokeWidth={1.25} />
        <span className="text-sm">{message}</span>
      </div>
    </td>
  </tr>
);

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * DataTable – a generic, reusable table with:
 * - Sticky navy header
 * - Alternating (striped) row backgrounds
 * - Row hover highlight
 * - Loading skeleton (animated pulse)
 * - Empty-state illustration
 */
function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No records found.',
}: DataTableProps<T>): React.ReactElement {
  return (
    <div className="rounded-xl shadow-sm overflow-hidden border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          {/* ── Sticky header ── */}
          <thead>
            <tr style={{ backgroundColor: '#0f2044' }}>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="
                    sticky top-0 z-10
                    px-4 py-3
                    text-left text-xs font-semibold uppercase tracking-wider
                    text-white whitespace-nowrap
                    first:rounded-tl-xl last:rounded-tr-xl
                  "
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody>
            {loading ? (
              <SkeletonRows columns={columns} />
            ) : data.length === 0 ? (
              <EmptyRow columns={columns} message={emptyMessage} />
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className={[
                    'transition-colors duration-100 cursor-default',
                    rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50',
                    'hover:bg-blue-50',
                  ].join(' ')}
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className="
                        px-4 py-3
                        text-gray-700
                        border-b border-gray-100
                        whitespace-nowrap
                      "
                    >
                      {col.render
                        ? col.render(row)
                        : getCellValue(row, col.key)}
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

export default DataTable;
