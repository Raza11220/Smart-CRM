import { useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { EmptyState, IconButton, Select } from '../ui/primitives'
export interface Column<T> { key: string; label: string; render: (record: T) => ReactNode; sort?: (record: T) => string | number; className?: string }
export function DataTable<T extends { id: string }>({ records, columns, label = 'records', onRowClick }: { records: T[]; columns: Column<T>[]; label?: string; onRowClick?: (record: T) => void }) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [sort, setSort] = useState<{ key: string; desc: boolean }>({ key: '', desc: false })
  const sorter = columns.find(c => c.key === sort.key)?.sort
  const ordered = sorter ? [...records].sort((a, b) => { const av = sorter(a); const bv = sorter(b); return (typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))) * (sort.desc ? -1 : 1) }) : records
  const pages = Math.max(1, Math.ceil(records.length / pageSize))
  const currentPage = Math.min(page, pages)
  const shown = ordered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  return <><div className="table-scroll"><table><thead><tr>{columns.map(c => <th key={c.key} scope="col" aria-sort={c.sort ? sort.key === c.key ? sort.desc ? 'descending' : 'ascending' : 'none' : undefined} className={c.className}>{c.sort ? <button className="sort-button" onClick={() => setSort({ key: c.key, desc: sort.key === c.key ? !sort.desc : false })}>{c.label}{sort.key === c.key ? sort.desc ? <ArrowDown size={13} /> : <ArrowUp size={13} /> : <ChevronsUpDown size={12} />}</button> : c.label}</th>)}</tr></thead><tbody>{shown.map(record => <tr key={record.id} className={onRowClick ? 'clickable-row' : ''}>{columns.map((c, i) => <td key={c.key} className={c.className}>{i === 0 && onRowClick ? <button className="table-record-link" onClick={() => onRowClick(record)}>{c.render(record)}</button> : c.render(record)}</td>)}</tr>)}</tbody></table>{!records.length && <EmptyState />}</div><div className="table-footer"><span>Showing <b>{records.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, records.length)}</b> of <b>{records.length}</b> {label}</span><div className="pagination"><Select label="Rows per page" value={String(pageSize)} onChange={v => { setPageSize(Number(v)); setPage(1) }} options={['8', '15', '25', '50']} /><IconButton aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></IconButton>{Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(n => <button aria-current={currentPage === n ? 'page' : undefined} className={`page-number ${currentPage === n ? 'active' : ''}`} key={n} onClick={() => setPage(n)}>{n}</button>)}<IconButton aria-label="Next page" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></IconButton></div></div></>
}
