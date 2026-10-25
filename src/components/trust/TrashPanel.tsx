import { ApiError } from '../../lib/api-client'
import { useRestoreFromTrash, useTrash } from '../../lib/trust'
import { useToast } from '../../lib/toast-context'
import { Button } from '../Button'
import { Panel } from '../Panel'

const messageOf = (err: unknown) => (err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')

function ago(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
}

function Item({ title, hint, when, onRestore, busy }: { title: string; hint?: string; when: string; onRestore: () => void; busy: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-paper-edge px-5 py-3 last:border-b-0">
      <div className="min-w-0">
        <div className="truncate text-[14px] font-medium">{title}</div>
        <div className="truncate text-[12px] text-ink-soft">
          {hint ? `${hint} · ` : ''}deleted {ago(when)}
        </div>
      </div>
      <Button variant="ghost" onClick={onRestore} disabled={busy}>
        Restore
      </Button>
    </li>
  )
}

// Settings → Trash: what was deleted in the last 30 days, with a way back.
export function TrashPanel({ businessId }: { businessId: string }) {
  const toast = useToast()
  const { data, isLoading, error } = useTrash(businessId)
  const restore = useRestoreFromTrash(businessId)

  function bringBack(item: Parameters<typeof restore.mutate>[0], what: string) {
    restore.mutate(item, {
      onSuccess: () => toast(`${what} is back.`),
      onError: (err) => toast(messageOf(err)),
    })
  }

  const empty = data && data.tables.length + data.fields.length + data.rows.length === 0
  return (
    <Panel title="Trash">
      <p className="border-b border-paper-edge px-5 py-3 text-[13px] text-ink-soft">Deleted tables, columns and rows stay here for {data?.days ?? 30} days, then they are gone for good.</p>
      {error ? (
        <p className="px-5 py-6 text-sm text-rust">Could not load the Trash.</p>
      ) : isLoading || !data ? (
        <p className="px-5 py-6 text-sm text-ink-soft">Loading…</p>
      ) : empty ? (
        <p className="px-5 py-6 text-sm text-ink-soft">The Trash is empty.</p>
      ) : (
        <>
          {data.tables.length > 0 && (
            <>
              <h3 className="bg-paper-edge px-5 py-1.5 text-[11px] font-semibold tracking-wider text-ink-soft uppercase">Tables</h3>
              <ul>
                {data.tables.map((t) => (
                  <Item key={t.id} title={t.name} when={t.deletedAt} busy={restore.isPending} onRestore={() => bringBack({ kind: 'table', id: t.id }, `“${t.name}”`)} />
                ))}
              </ul>
            </>
          )}
          {data.fields.length > 0 && (
            <>
              <h3 className="bg-paper-edge px-5 py-1.5 text-[11px] font-semibold tracking-wider text-ink-soft uppercase">Columns</h3>
              <ul>
                {data.fields.map((f) => (
                  <Item key={f.id} title={f.name} hint={`in ${f.tableName}`} when={f.deletedAt} busy={restore.isPending} onRestore={() => bringBack({ kind: 'field', id: f.id, tableId: f.tableId }, `“${f.name}”`)} />
                ))}
              </ul>
            </>
          )}
          {data.rows.length > 0 && (
            <>
              <h3 className="bg-paper-edge px-5 py-1.5 text-[11px] font-semibold tracking-wider text-ink-soft uppercase">Rows</h3>
              <ul>
                {data.rows.map((r) => (
                  <Item
                    key={r.id}
                    title={r.preview || `Row ${r.number}`}
                    hint={`row ${r.number} of ${r.tableName}`}
                    when={r.deletedAt}
                    busy={restore.isPending}
                    onRestore={() => bringBack({ kind: 'row', id: r.id, tableId: r.tableId }, `Row ${r.number}`)}
                  />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </Panel>
  )
}
