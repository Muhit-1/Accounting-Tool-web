import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { anchorOf, buildCardMap, edgeKeys, edgePath, HEAD_H, ROW_H, type CardEdge, type CardNode, type RowRole } from '../lib/connection-cards'
import { clampZoom, fitView, parseLayout, withLayout, zoomAt, Z_MAX, Z_MIN, Z_STEP, type MapView, type SavedLayout } from '../lib/connections-view'
import { useTables } from '../lib/tables'

const layoutKey = (businessId: string) => `connections-layout:v2:${businessId}`

function loadLayout(businessId: string): SavedLayout {
  try {
    return parseLayout(window.localStorage.getItem(layoutKey(businessId)))
  } catch {
    return {}
  }
}

function saveLayout(businessId: string, layout: SavedLayout) {
  try {
    window.localStorage.setItem(layoutKey(businessId), JSON.stringify(layout))
  } catch {
    // the cards simply start in their usual places next time
  }
}

type Drag = { kind: 'node'; id: string; startX: number; startY: number; originX: number; originY: number; moved: boolean } | { kind: 'pan'; startX: number; startY: number; originX: number; originY: number }

const COLOR = { link: 'var(--color-stamp)', derived: 'var(--color-stamp)', post: 'var(--color-brass)' } as const

const rowClass: Record<RowRole, string> = {
  none: '',
  link: 'border-l-[3px] border-l-stamp bg-stamp-soft/50',
  derived: 'border-l-[3px] border-l-stamp/60 bg-[#f6f9fe]',
  post: 'border-l-[3px] border-l-brass bg-brass-row',
}

// How the tables of a business connect, as a map of cards. Every table lists its columns; an arrow runs from a column
// to a column: blue for a link to another table, dotted blue for a look-up or roll-up, gold dashed for what a table
// posts to the Cash book. Hover an arrow and a sentence says what it means. Drag a card to move it (it stays where
// you put it), drag the background to move around, scroll or use + and − to zoom.
export function ConnectionsPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const navigate = useNavigate()
  const { data: tables, isLoading } = useTables(businessId)
  const canvas = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const fitted = useRef(false)

  const [moved, setMoved] = useState<SavedLayout>(() => (businessId ? loadLayout(businessId) : {}))
  const [view, setView] = useState<MapView>({ x: 20, y: 20, z: 1 })
  const [panning, setPanning] = useState(false)
  const [showList, setShowList] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  const [hover, setHover] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string | null>(null)

  const map = useMemo(() => buildCardMap(tables ?? []), [tables])
  const nodes = useMemo(() => withLayout(map.nodes, moved), [map.nodes, moved])
  const byId = useMemo(() => new Map<string, CardNode>(nodes.map((n) => [n.id, n])), [nodes])
  const edgeById = useMemo(() => new Map(map.edges.map((e) => [e.id, e])), [map.edges])
  const activeId = hover ?? pinned
  const active: CardEdge | undefined = activeId ? edgeById.get(activeId) : undefined
  const lit = useMemo(() => new Set(active ? edgeKeys(active) : []), [active])

  const fit = useCallback(() => {
    const box = canvas.current
    if (!box) return
    const { width, height } = box.getBoundingClientRect()
    setView(fitView(nodes, width, height))
  }, [nodes])

  // Show everything the first time the tables are there.
  useEffect(() => {
    if (fitted.current || nodes.length === 0) return
    fitted.current = true
    fit()
  }, [nodes, fit])

  // The wheel zooms around the pointer. It has to be a real listener: React's wheel handlers cannot stop the page scrolling.
  useEffect(() => {
    const box = canvas.current
    if (!box) return
    function onWheel(event: WheelEvent) {
      event.preventDefault()
      const rect = box!.getBoundingClientRect()
      setView((current) => zoomAt(current, event.deltaY < 0 ? 1.1 : 1 / 1.1, event.clientX - rect.left, event.clientY - rect.top))
    }
    box.addEventListener('wheel', onWheel, { passive: false })
    return () => box.removeEventListener('wheel', onWheel)
  }, [isLoading])

  if (!businessId) return null

  function zoomBy(factor: number) {
    const box = canvas.current?.getBoundingClientRect()
    setView((current) => zoomAt(current, factor, (box?.width ?? 0) / 2, (box?.height ?? 0) / 2))
  }

  function open(id: string, ledger: boolean) {
    navigate(`/businesses/${businessId}/workspace${ledger ? '' : `?tab=${id}`}`)
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('[data-ctl], [data-edge]')) return
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-node]')
    canvas.current?.setPointerCapture(event.pointerId)
    if (target) {
      const node = byId.get(target.dataset.node ?? '')
      if (!node) return
      drag.current = { kind: 'node', id: node.id, startX: event.clientX, startY: event.clientY, originX: node.x, originY: node.y, moved: false }
    } else {
      drag.current = { kind: 'pan', startX: event.clientX, startY: event.clientY, originX: view.x, originY: view.y }
      setPanning(true)
      setPinned(null)
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d) return
    const dx = event.clientX - d.startX
    const dy = event.clientY - d.startY
    if (d.kind === 'pan') {
      setView((current) => ({ ...current, x: d.originX + dx, y: d.originY + dy }))
      return
    }
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 4) return
    d.moved = true
    setMoved((current) => ({ ...current, [d.id]: { x: d.originX + dx / view.z, y: d.originY + dy / view.z } }))
  }

  function endDrag() {
    const d = drag.current
    drag.current = null
    setPanning(false)
    if (!d || d.kind !== 'node') return
    if (!d.moved) {
      const node = byId.get(d.id)
      if (node) open(node.id, node.ledger)
    } else if (businessId) {
      setMoved((current) => {
        saveLayout(businessId, current)
        return current
      })
    }
  }

  const sections: { kind: CardEdge['kind']; title: string; empty: string }[] = [
    { kind: 'link', title: 'Links', empty: 'No links yet. Add a “Link a table” column to connect two tables.' },
    { kind: 'derived', title: 'Comes from another table', empty: 'No look-up or roll-up columns yet.' },
    { kind: 'post', title: 'Posts to the Cash book', empty: 'No table posts to the Cash book. Open a table and choose “Posts to Cash book”.' },
  ]

  return (
    <div className="relative h-full min-h-[420px] overflow-hidden bg-[#f7f9fc]">
      {isLoading ? (
        <p className="p-6 text-sm text-ink-soft">Loading…</p>
      ) : (
        <>
          <div
            ref={canvas}
            role="application"
            aria-label="Map of your tables. Drag a card to move it, drag the background to move around, scroll to zoom, hover an arrow to read it."
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            style={{ backgroundImage: 'radial-gradient(var(--color-paper-line) 1px, transparent 1px)', backgroundSize: '22px 22px', touchAction: 'none' }}
            className={`absolute inset-0 ${panning ? 'cursor-grabbing' : 'cursor-grab'}`}
          >
            <div style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`, transformOrigin: '0 0' }} className="absolute top-0 left-0">
              <svg width="1" height="1" className="absolute top-0 left-0 overflow-visible" aria-hidden>
                <defs>
                  <marker id="arrow-blue" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
                    <path d="M0 0L9 4.5L0 9z" fill="var(--color-stamp)" />
                  </marker>
                  <marker id="arrow-gold" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
                    <path d="M0 0L9 4.5L0 9z" fill="var(--color-brass)" />
                  </marker>
                </defs>
                {map.edges.map((edge) => {
                  const a = byId.get(edge.from.node)
                  const b = byId.get(edge.to.node)
                  if (!a || !b) return null
                  const p1 = anchorOf(a, edge.from.row, b)
                  const p2 = anchorOf(b, edge.to.row, a)
                  const d = edgePath(p1, p2)
                  const color = COLOR[edge.kind]
                  const on = activeId === edge.id
                  const faded = activeId !== null && !on
                  return (
                    <g key={edge.id} style={{ opacity: faded ? 0.15 : 1, transition: 'opacity .12s' }}>
                      <path d={d} fill="none" stroke={color} strokeWidth={on ? 3 : 2} strokeDasharray={edge.kind === 'post' ? '6 4' : edge.kind === 'derived' ? '2 4' : undefined} strokeLinecap="round" markerEnd={`url(#${edge.kind === 'post' ? 'arrow-gold' : 'arrow-blue'})`} className="pointer-events-none" />
                      <path
                        data-edge
                        d={d}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={16}
                        style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                        onPointerEnter={() => setHover(edge.id)}
                        onPointerLeave={() => setHover(null)}
                        onClick={() => setPinned((current) => (current === edge.id ? null : edge.id))}
                      />
                      {edge.kind === 'post' && (
                        <text x={(p1.x + p2.x) / 2} y={(p1.y + p2.y) / 2 - 6} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={color} stroke="#f7f9fc" strokeWidth={4} paintOrder="stroke" className="pointer-events-none">
                          {edge.label}
                        </text>
                      )}
                    </g>
                  )
                })}
              </svg>
              {nodes.map((n) => (
                <div
                  key={n.id}
                  data-node={n.id}
                  role="link"
                  tabIndex={0}
                  aria-label={`${n.name}, ${n.ledger ? 'the Cash book' : `${n.rows} ${n.rows === 1 ? 'row' : 'rows'}`}. Press Enter to open.`}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') open(n.id, n.ledger)
                  }}
                  style={{ left: n.x, top: n.y, width: n.w, height: n.h }}
                  className={`absolute cursor-move overflow-hidden rounded-[10px] border bg-white shadow-sm select-none hover:shadow-[0_0_0_3px_var(--color-stamp-soft)] ${n.ledger ? 'border-brass shadow-[0_0_0_1px_var(--color-brass-line)]' : 'border-paper-line'}`}
                >
                  <div style={{ height: HEAD_H }} className={`flex items-center gap-2 border-b px-3 text-[13px] font-semibold ${n.ledger ? 'border-brass-line bg-brass-row text-brass' : `border-paper-edge bg-[#f7f9fc] text-ink ${lit.has(`${n.id}|`) ? 'bg-stamp-soft' : ''}`}`}>
                    <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: n.ledger ? 'var(--color-brass)' : n.color }} aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{n.name}</span>
                    <span className="flex-none text-[11px] font-normal text-ink-soft">{n.ledger ? 'locked' : `${n.rows} ${n.rows === 1 ? 'row' : 'rows'}`}</span>
                  </div>
                  {n.fields.map((r) => (
                    <div key={r.id} style={{ height: ROW_H }} className={`flex items-center gap-2 px-3 text-[12px] text-ink ${rowClass[r.role]} ${lit.has(`${n.id}|${r.id}`) ? 'ring-2 ring-stamp ring-inset' : ''}`}>
                      <span className="w-6 flex-none text-center text-[10.5px] font-semibold text-ink-soft" aria-hidden>
                        {r.glyph}
                      </span>
                      <span className="truncate">{r.name}</span>
                    </div>
                  ))}
                  {n.more > 0 && (
                    <div style={{ height: ROW_H }} className="flex items-center px-3 text-[11.5px] text-ink-soft">
                      + {n.more} more {n.more === 1 ? 'column' : 'columns'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div data-ctl className="absolute top-3 left-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-ledger border border-paper-line bg-white px-3 py-2 text-[12px] text-ink-soft shadow-sm">
            <span>
              <i className="mr-1.5 inline-block w-5 border-t-2 border-stamp align-middle" />
              Link
            </span>
            <span>
              <i className="mr-1.5 inline-block w-5 border-t-2 border-dotted border-stamp align-middle" />
              Look-up or roll-up
            </span>
            <span>
              <i className="mr-1.5 inline-block w-5 border-t-2 border-dashed border-brass align-middle" />
              Posts to the Cash book
            </span>
          </div>

          <div data-ctl aria-live="polite" className="absolute bottom-4 left-1/2 max-w-[min(560px,calc(100%-2rem))] -translate-x-1/2 rounded-full border border-paper-line bg-white px-4 py-2 text-center text-[13px] shadow-lg">
            {active ? <span className="font-medium text-ink">{active.sentence}</span> : <span className="text-ink-soft">Hover an arrow to read it. Drag a card to move it. Click a card to open the table.</span>}
          </div>

          <div data-ctl className="absolute right-4 bottom-4 flex items-center gap-1 rounded-ledger border border-paper-line bg-white p-1 shadow-lg">
            <button type="button" aria-label="Zoom out" disabled={view.z <= Z_MIN} onClick={() => zoomBy(1 / Z_STEP)} className="h-8 w-8 rounded-md text-[18px] text-ink-soft hover:bg-stamp-soft disabled:opacity-40">
              −
            </button>
            <span aria-live="polite" className="min-w-12 text-center text-[12.5px] font-semibold text-ink-soft">
              {Math.round(clampZoom(view.z) * 100)}%
            </span>
            <button type="button" aria-label="Zoom in" disabled={view.z >= Z_MAX} onClick={() => zoomBy(Z_STEP)} className="h-8 w-8 rounded-md text-[18px] text-ink-soft hover:bg-stamp-soft disabled:opacity-40">
              +
            </button>
            <button type="button" onClick={fit} className="rounded-md border border-paper-line px-2.5 py-1 text-[12.5px] font-semibold hover:bg-stamp-soft">
              Fit
            </button>
            <button type="button" aria-pressed={showList} onClick={() => setShowList((s) => !s)} className="rounded-md border border-paper-line px-2.5 py-1 text-[12.5px] font-semibold hover:bg-stamp-soft aria-pressed:bg-stamp-soft">
              List
            </button>
          </div>

          {showList && (
            <div data-ctl className="absolute top-16 left-3 flex max-h-[70%] max-w-[420px] flex-col gap-2 overflow-auto">
              {sections.map((s) => {
                const items = map.edges.filter((e) => e.kind === s.kind)
                return (
                  <section key={s.kind} className="rounded-ledger border border-paper-line bg-white p-3.5 text-[13px] shadow-lg">
                    <h2 className="mb-1 font-display text-[14px] font-bold">{s.title}</h2>
                    {items.length === 0 ? (
                      <p className="text-ink-soft">{s.empty}</p>
                    ) : (
                      <ul className="list-disc pl-5">
                        {items.map((e) => (
                          <li key={e.id}>{e.sentence}</li>
                        ))}
                      </ul>
                    )}
                  </section>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
