import { Link, useNavigate, useParams } from 'react-router-dom'
import { useBusiness } from '../lib/businesses'
import { BOX_H, BOX_W, buildMap, edgeEnds } from '../lib/connections'
import { useTables } from '../lib/tables'

// How the tables of a business connect: which columns link to other tables, and which tables post to the Cash book.
export function ConnectionsPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const navigate = useNavigate()
  const { data: business } = useBusiness(businessId)
  const { data: tables, isLoading } = useTables(businessId)
  if (!businessId) return null
  const map = buildMap(tables ?? [])
  const byId = new Map(map.nodes.map((n) => [n.id, n]))
  const named = new Map((tables ?? []).map((t) => [t.id, t.name]))
  const links = map.edges.filter((e) => e.kind === 'link')
  const posts = map.edges.filter((e) => e.kind === 'post')
  let shift = 0

  return (
    <>
      <div className="mb-5">
        <p className="mb-1.5 text-xs tracking-wider text-ink-soft uppercase">{business?.name ?? '…'}</p>
        <h1 className="font-display text-[28px] font-bold tracking-tight">Connections</h1>
        <p className="mt-1 text-sm text-ink-soft">Blue arrows are links between tables. Gold dashed arrows are tables that post to the Cash book.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto rounded-ledger border border-paper-line bg-white">
            <svg viewBox={`0 0 ${map.width} ${map.height}`} className="block w-full min-w-[720px]" role="img" aria-label="Map of your tables">
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
                const e = edgeEnds(a, b, post ? ((shift++ % 3) - 1) * 14 : 0)
                const color = post ? 'var(--color-brass)' : 'var(--color-stamp)'
                return (
                  <g key={edge.id}>
                    <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={color} strokeWidth={2} strokeDasharray={post ? '6 4' : undefined} markerEnd={`url(#arrow-${edge.kind})`} />
                    <text x={e.mx + (post ? 0 : 8)} y={e.my - 6} textAnchor={post ? 'middle' : 'start'} fontSize={11.5} fontWeight={600} fill={color} stroke="white" strokeWidth={4} paintOrder="stroke">
                      {edge.label}
                    </text>
                  </g>
                )
              })}
              {map.nodes.map((n) => (
                <g
                  key={n.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/businesses/${businessId}/workspace${n.ledger ? '' : `?tab=${n.id}`}`)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') navigate(`/businesses/${businessId}/workspace${n.ledger ? '' : `?tab=${n.id}`}`)
                  }}
                >
                  <rect x={n.x} y={n.y} width={BOX_W} height={BOX_H} rx={10} fill="white" stroke={n.ledger ? 'var(--color-brass)' : 'var(--color-paper-line)'} strokeWidth={n.ledger ? 2 : 1.2} />
                  <rect x={n.x} y={n.y} width={BOX_W} height={6} rx={3} fill={n.color} />
                  <text x={n.x + 14} y={n.y + 36} fontSize={14} fontWeight={700} fill="var(--color-ink)">
                    {n.name}
                  </text>
                  <text x={n.x + 14} y={n.y + 56} fontSize={11.5} fill="var(--color-ink-soft)">
                    {n.ledger ? 'the ledger · ' : ''}
                    {n.rows} {n.rows === 1 ? 'row' : 'rows'} · {n.columns} columns
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-ledger border border-paper-line bg-white p-4">
              <h2 className="mb-2 font-display text-[16px] font-bold">Links</h2>
              {links.length === 0 ? (
                <p className="text-sm text-ink-soft">No links yet. Add a column of type “Link to table” to connect two tables.</p>
              ) : (
                <ul className="list-disc pl-5 text-sm">
                  {links.map((e) => (
                    <li key={e.id}>
                      <b>{named.get(e.from)}</b> · {e.label} → <b>{named.get(e.to)}</b>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="rounded-ledger border border-paper-line bg-white p-4">
              <h2 className="mb-2 font-display text-[16px] font-bold">Posts to Cash book</h2>
              {posts.length === 0 ? (
                <p className="text-sm text-ink-soft">No table posts to the Cash book. Open a table and choose “Posts to Cash book”.</p>
              ) : (
                <ul className="list-disc pl-5 text-sm">
                  {posts.map((e) => (
                    <li key={e.id}>
                      <b>{named.get(e.from)}</b> → Cash book, when {e.label}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
          <p className="text-sm text-ink-soft">
            <Link to={`/businesses/${businessId}/workspace`} className="text-stamp underline">
              Back to your tables
            </Link>
          </p>
        </div>
      )}
    </>
  )
}
