import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBusinessSummaries } from '../../lib/businesses'
import { useBusinessSearch } from '../../lib/search'
import { IconSearch } from '../icons'

interface Hit {
  key: string
  group: 'Tables' | 'Rows' | 'Cash book' | 'Invoices' | 'Actions' | 'Businesses'
  label: string
  sub?: string
  tag?: string
  color?: string | null
  to: string
}

const GROUPS: Hit['group'][] = ['Businesses', 'Tables', 'Rows', 'Cash book', 'Invoices', 'Actions']

const money = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 })

// One search box for the top bar. Inside a business it finds tables, rows, Cash book entries, invoices and
// actions (only inside what the person may open: the API decides). On the Home screen it finds businesses.
export function SearchBox({ businessId, canManage }: { businessId?: string; canManage: boolean }) {
  const navigate = useNavigate()
  const input = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const { data: summaries } = useBusinessSummaries()
  const { data: found, isFetching } = useBusinessSearch(businessId, debounced)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(text), 250)
    return () => window.clearTimeout(timer)
  }, [text])

  // "/" or Alt+/ jumps to the search, like in a spreadsheet.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const typing = (event.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable="true"]')
      if ((event.key === '/' && !typing) || (event.key === '/' && event.altKey)) {
        event.preventDefault()
        input.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const hits = useMemo<Hit[]>(() => {
    const needle = text.trim().toLowerCase()
    const out: Hit[] = []
    if (!businessId) {
      for (const b of summaries ?? []) {
        if (needle === '' || b.name.toLowerCase().includes(needle)) {
          out.push({ key: `b-${b.id}`, group: 'Businesses', label: b.name, sub: b.role === 'OWNER' ? b.currency : `Shared by ${b.ownerName ?? 'someone'}`, to: `/businesses/${b.id}/workspace` })
        }
      }
      return out.slice(0, 12)
    }
    const base = `/businesses/${businessId}`
    if (found && debounced.trim() === text.trim()) {
      for (const t of found.tables) out.push({ key: `t-${t.id}`, group: 'Tables', label: t.name, color: t.color, to: t.kind === 'LEDGER' ? `${base}/workspace` : `${base}/workspace?tab=${t.id}` })
      for (const r of found.rows) out.push({ key: `r-${r.rowId}`, group: 'Rows', label: r.title, sub: `${r.field}: ${r.value}`, tag: r.tableName, color: r.tableColor, to: `${base}/workspace?tab=${r.tableId}&row=${r.rowId}` })
      for (const e of found.entries)
        out.push({ key: `e-${e.id}`, group: 'Cash book', label: e.memo || e.counterparty || 'Entry', sub: `${e.direction === 'IN' ? '+' : '−'}${money(e.amount)} · ${e.date.slice(0, 10)}`, tag: 'Cash book', to: `${base}/workspace` })
      for (const i of found.invoices) out.push({ key: `i-${i.id}`, group: 'Invoices', label: `#${i.number} · ${i.client}`, sub: `${money(i.total)} · ${i.status.toLowerCase()}`, tag: 'Invoices', to: `${base}/invoices/${i.id}` })
    }
    const actions: [string, string][] = [
      ['Invoices', `${base}/invoices`],
      ['Connections', `${base}/connections`],
      ['Fund statement', `${base}/statement`],
      ['Monthly view', `${base}/monthly`],
      ...(canManage
        ? ([
            ['New table', `${base}/workspace?do=templates`],
            ['Upload a sheet', `${base}/workspace?do=upload`],
            ['Share this business', `${base}/sharing`],
            ['Lock a period', `${base}/settings`],
            ['Settings', `${base}/settings`],
          ] as [string, string][])
        : []),
    ]
    for (const [label, to] of actions) if (needle === '' || label.toLowerCase().includes(needle)) out.push({ key: `a-${label}`, group: 'Actions', label, to })
    return out.slice(0, 14)
  }, [text, debounced, businessId, summaries, found, canManage])

  const ordered = useMemo(() => GROUPS.flatMap((g) => hits.filter((h) => h.group === g)), [hits])
  const index = Math.min(active, Math.max(ordered.length - 1, 0))

  function go(hit: Hit | undefined) {
    if (!hit) return
    navigate(hit.to)
    setOpen(false)
    setText('')
    setDebounced('')
    input.current?.blur()
  }

  const searching = businessId && text.trim().length >= 2 && (isFetching || debounced.trim() !== text.trim())

  return (
    <div className="relative w-full max-w-[560px]">
      <label className="relative block">
        <IconSearch width={17} height={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-soft" />
        <input
          ref={input}
          type="search"
          value={text}
          role="combobox"
          aria-expanded={open}
          aria-controls="top-search-results"
          aria-label={businessId ? 'Search tables, rows and actions' : 'Search your businesses'}
          autoComplete="off"
          placeholder={businessId ? 'Search tables, rows and actions' : 'Search your businesses'}
          onChange={(event) => {
            setText(event.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setActive((i) => Math.min(i + 1, ordered.length - 1))
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActive((i) => Math.max(i - 1, 0))
            } else if (event.key === 'Enter') {
              event.preventDefault()
              go(ordered[index])
            } else if (event.key === 'Escape') {
              setOpen(false)
              input.current?.blur()
            }
          }}
          className="h-10 w-full rounded-full border border-transparent bg-[#eaf0f8] pr-14 pl-10 text-[14px] text-ink placeholder:text-ink-soft focus:border-stamp focus:bg-white focus:shadow-[0_2px_10px_rgba(15,42,74,0.12)] focus:outline-none"
        />
        <kbd className="pointer-events-none absolute top-1/2 right-3.5 hidden -translate-y-1/2 rounded border border-paper-line bg-white px-1.5 text-[11px] font-medium text-ink-soft md:block">/</kbd>
      </label>

      {open && (
        <div id="top-search-results" role="listbox" className="absolute top-full left-0 z-50 mt-1.5 max-h-[420px] w-full overflow-auto rounded-[12px] border border-paper-line bg-white py-1.5 shadow-[0_12px_32px_rgba(15,42,74,0.18)]">
          {ordered.length === 0 && <div className="px-4 py-3 text-[13px] text-ink-soft">{searching ? 'Searching…' : text.trim().length < 2 && businessId ? 'Type two letters to search.' : 'Nothing found.'}</div>}
          {GROUPS.map((group) => {
            const items = ordered.filter((h) => h.group === group)
            if (items.length === 0) return null
            return (
              <div key={group}>
                <div className="px-4 pt-2 pb-1 text-[11px] font-semibold tracking-[0.06em] text-ink-soft uppercase">{group}</div>
                {items.map((hit) => {
                  const i = ordered.indexOf(hit)
                  return (
                    <button
                      key={hit.key}
                      type="button"
                      role="option"
                      aria-selected={i === index}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => go(hit)}
                      onMouseEnter={() => setActive(i)}
                      className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13.5px] ${i === index ? 'bg-stamp-soft' : ''}`}
                    >
                      {hit.color !== undefined && <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: hit.color ?? 'var(--color-stamp)' }} aria-hidden />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-ink">{hit.label}</span>
                        {hit.sub && <span className="block truncate text-[12px] text-ink-soft">{hit.sub}</span>}
                      </span>
                      {hit.tag && <span className="flex-none rounded-md bg-paper px-2 py-0.5 text-[11px] font-semibold text-stamp">{hit.tag}</span>}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
