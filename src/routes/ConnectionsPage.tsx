import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BOX_H, BOX_W, buildMap, edgeEnds } from '../lib/connections'
import { clampZoom, fitView, parseLayout, withLayout, zoomAt, Z_MAX, Z_MIN, Z_STEP, type MapView, type SavedLayout } from '../lib/connections-view'
import { useTables } from '../lib/tables'

const layoutKey = (businessId: string) => `connections-layout:v1:${businessId}`

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
    // the boxes simply start in their usual places next time
  }
}

type Drag = { kind: 'node'; id: string; startX: number; startY: number; originX: number; originY: number; moved: boolean } | { kind: 'pan'; startX: number; startY: number; originX: number; originY: number }

// How the sheets of a business connect: a blue arrow for every link column, a gold dashed arrow from every sheet that
// posts to the Cash book. It is a canvas: drag a box to move it (it stays where you put it), drag the background to
// move around, scroll or use + and − to zoom, Fit to see everything. The same facts are listed under "List".
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
  const [showList, setShowList] = useState(false)

  const map = useMemo(() => buildMap(tables ?? []), [tables])
  const nodes = useMemo(() => withLayout(map.nodes, moved), [map.nodes, moved])
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const named = useMemo(() => new Map((tables ?? []).map((t) => [t.id, t.name])), [tables])

  const fit = useCallback(() => {
    const box = canvas.current
    if (!box) return
    const { width, height } = box.getBoundingClientRect()
    setView(fitView(nodes, width, height))
  }, [nodes])

  // Show everything the first time the sheets are there.
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
    if ((event.target as HTMLElement).closest('[data-ctl]')) return
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-node]')
    canvas.current?.setPointerCapture(event.pointerId)
    if (target) {
      const node = byId.get(target.dataset.node ?? '')
      if (!node) return
      drag.current = { kind: 'node', id: node.id, startX: event.clientX, startY: event.clientY, originX: node.x, originY: node.y, moved: false }
    } else {
      drag.current = { kind: 'pan', startX: event.clientX, startY: event.clientY, originX: view.x, originY: view.y }
      setPanning(true)
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

  const links = map.edges.filter((e) => e.kind === 'link')
  const posts = map.edges.filter((e) => e.kind === 'post')
  let shift = 0

  return (
    <div className="relative h-[calc(100dvh-61px)] min-h-[420px] overflow-hidden bg-[#f7f9fc]">
      {isLoading ? (
        <p className="p-6 text-sm text-ink-soft">Loading…</p>
      ) : (
        <>
          <div
            ref={canvas}
            role="application"
            aria-label="Map of your sheets. Drag a box to move it, drag the background to move around, scroll to zoom."
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            style={{ backgroundImage: 'radial-gradient(var(--color-paper-line) 1px, transparent 1px)', backgroundSize: '22px 22px', touchAction: 'none' }}
            className={`absolute inset-0 ${panning ? 'cursor-grabbing' : 'cursor-grab'}`}
          >
            <div style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`, transformOrigin: '0 0' }} className="absolute top-0 left-0">
              <svg width="1" height="1" className="pointer-events-none absolute top-0 left-0 overflow-visible" aria-hidden>
                <defs>
                  <marker id="arrow-link" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
                    <path d="M0 0L9 4.5L0 9z" fill="var(--color-stamp)" />
                  </marker>
                  <marker id="arrow-post" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
                    <path d="M0 0L9 4.5L0 9z" fill="var(--color-brass)" />
                  </marker>
                </defs>
                {map.edges.map((edge) => {
                  const a = byId.get(edge.from)
                  const b = byId.get(edge.to)
                  if (!a || !b) return null
                  const post = edge.kind === 'post'
                  const e = edgeEnds(a, b, post ? ((shift++ % 3) - 1) * 10 : 0)
                  const color = post ? 'var(--color-brass)' : 'var(--color-stamp)'
                  return (
                    <g key={edge.id}>
                      <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={color} strokeWidth={2} strokeDasharray={post ? '6 4' : undefined} markerEnd={`url(#arrow-${edge.kind})`} />
                      <text x={e.mx} y={e.my - 5} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={color} stroke="#f7f9fc" strokeWidth={4} paintOrder="stroke">
                        {edge.label}
                      </text>
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
                  aria-label={`${n.name}, ${n.rows} ${n.rows === 1 ? 'row' : 'rows'}. Press Enter to open.`}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') open(n.id, n.ledger)
                  }}
                  style={{ left: n.x, top: n.y, width: BOX_W, height: BOX_H, borderTopColor: n.color }}
                  className={`absolute cursor-move rounded-[9px] border border-t-[5px] bg-white px-2.5 py-1.5 shadow-sm select-none hover:shadow-[0_0_0_3px_var(--color-stamp-soft)] ${n.ledger ? 'border-brass-line shadow-[0_0_0_2px_var(--color-brass-line)]' : 'border-paper-line'}`}
                >
                  <b className="block truncate text-[13px] leading-tight">{n.name}</b>
                  <span className="block truncate text-[11px] text-ink-soft">
                    {n.ledger ? 'the ledger' : `${n.rows} ${n.rows === 1 ? 'row' : 'rows'} · ${n.columns} columns`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div data-ctl className="absolute top-3 left-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-ledger border border-paper-line bg-white px-3 py-2 text-[12px] text-ink-soft shadow-sm">
            <span>
              <i className="mr-1.5 inline-block w-5 border-t-2 border-stamp align-middle" />
              Link between sheets
            </span>
            <span>
              <i className="mr-1.5 inline-block w-5 border-t-2 border-dashed border-brass align-middle" />
              Posts to the Cash book
            </span>
            <span className="hidden md:inline">Drag a box to move it · drag the background to pan · scroll to zoom</span>
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
            <div data-ctl className="absolute bottom-4 left-4 flex max-h-[60%] max-w-[380px] flex-col gap-2 overflow-auto">
              <section className="rounded-ledger border border-paper-line bg-white p-3.5 text-[13px] shadow-lg">
                <h2 className="mb-1 font-display text-[14px] font-bold">Links</h2>
                {links.length === 0 ? (
                  <p className="text-ink-soft">No links yet. Add a column of type “Link to table” to connect two sheets.</p>
                ) : (
                  <ul className="list-disc pl-5">
                    {links.map((e) => (
                      <li key={e.id}>
                        <b>{named.get(e.from)}</b> · {e.label} → <b>{named.get(e.to)}</b>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className="rounded-ledger border border-paper-line bg-white p-3.5 text-[13px] shadow-lg">
                <h2 className="mb-1 font-display text-[14px] font-bold">Posts to Cash book</h2>
                {posts.length === 0 ? (
                  <p className="text-ink-soft">No sheet posts to the Cash book. Open a sheet and choose “Posts to Cash book”.</p>
                ) : (
                  <ul className="list-disc pl-5">
                    {posts.map((e) => (
                      <li key={e.id}>
                        <b>{named.get(e.from)}</b> → Cash book, when {e.label}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </>
      )}
    </div>
  )
}
