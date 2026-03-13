/**
 * Table — reusable data table with optional empty state and loading skeleton.
 *
 * Usage:
 *   <Table
 *     columns={[{ key: 'name', label: 'Name' }, { key: 'score', label: 'Score', render: v => <Badge>{v}</Badge> }]}
 *     rows={students}
 *     keyField="id"
 *     loading={loading}
 *     emptyMessage="No students found"
 *     emptyIcon={<GraduationCap />}
 *   />
 */

import { Spinner } from './Spinner'

export function Table({
  columns = [],
  rows = [],
  keyField = 'id',
  loading = false,
  emptyMessage = 'No records found',
  emptyIcon = null,
  onRowClick,
  rowClassName,
}) {
  return (
    <div className="table-wrap">
      <table className="table-base">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={col.width ? { width: col.width } : {}}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            // Skeleton rows
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {columns.map(col => (
                  <td key={col.key}>
                    <div className="h-4 bg-surface-border rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <div className="flex flex-col items-center justify-center py-12 text-ink-muted gap-2">
                  {emptyIcon && <div className="opacity-30 mb-1">{emptyIcon}</div>}
                  <p className="text-sm">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            rows.map(row => (
              <tr
                key={row[keyField]}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`${onRowClick ? 'cursor-pointer' : ''} ${rowClassName ? rowClassName(row) : ''}`}
              >
                {columns.map(col => (
                  <td key={col.key}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Simple pagination controls
 */
export function Pagination({ page, pageSize, total, onChange }) {
  const totalPages = Math.ceil(total / pageSize)
  const start      = page * pageSize + 1
  const end        = Math.min((page + 1) * pageSize, total)

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between mt-3 text-sm text-ink-muted">
      <span>Showing {start}–{end} of {total}</span>
      <div className="flex gap-2">
        <button className="btn-outline py-1 px-3"
                disabled={page === 0}
                onClick={() => onChange(page - 1)}>
          ← Prev
        </button>
        <span className="flex items-center px-2 font-medium text-ink">
          {page + 1} / {totalPages}
        </span>
        <button className="btn-outline py-1 px-3"
                disabled={page >= totalPages - 1}
                onClick={() => onChange(page + 1)}>
          Next →
        </button>
      </div>
    </div>
  )
}
