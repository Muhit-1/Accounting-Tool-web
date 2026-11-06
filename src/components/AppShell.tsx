import { useEffect, useState } from 'react'
import { Outlet, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { markOpened, useBusiness } from '../lib/businesses'
import { useTables } from '../lib/tables'
import { BottomNav } from './shell/BottomNav'
import { Outline } from './shell/Outline'
import { IconMenu } from './icons'
import { TopBar } from './shell/TopBar'

const OUTLINE_KEY = 'exin_outline_open'

function readOpen(): boolean {
  try {
    return localStorage.getItem(OUTLINE_KEY) !== '0'
  } catch {
    return true
  }
}

// The page frame: a white top bar (business, search, Share, account), a light outline on the left (money, tables,
// reports, connections, sharing) and the page. The tables are tabs at the bottom of the sheet, as in a spreadsheet.
// On a phone the outline is a drawer.
export function AppShell() {
  const { businessId } = useParams<{ businessId?: string }>()
  const location = useLocation()
  const { user } = useAuth()
  const { data: business } = useBusiness(businessId)
  // Someone who was given only some tables (no Cash book among them) gets a menu of just those.
  const { data: tableList } = useTables(businessId)
  const tableOnly = tableList !== undefined && !tableList.some((t) => t.kind === 'LEDGER')
  const canManage = Boolean(business && user && business.ownerId === user.id)
  const [open, setOpen] = useState(readOpen)
  const [drawer, setDrawer] = useState(false)
  // The Workspace, the Connections map and the invoice editor use the whole page: no margins, one scroll.
  const fullBleed = businessId !== undefined && new RegExp(`^/businesses/${businessId}/(workspace|accounts|connections|invoices/new|invoices/[^/]+/edit)(/|$)`).test(location.pathname)
  const hasOutline = businessId !== undefined

  // The Home list is ordered by what you opened last.
  const tab = new URLSearchParams(location.search).get('tab') ?? undefined
  useEffect(() => {
    if (businessId) void markOpened(businessId, tab)
  }, [businessId, tab])

  function toggle() {
    if (window.matchMedia('(min-width: 768px)').matches) {
      setOpen((current) => {
        const next = !current
        try {
          localStorage.setItem(OUTLINE_KEY, next ? '1' : '0')
        } catch {
          // a private window: the choice just is not remembered
        }
        return next
      })
    } else {
      setDrawer((current) => !current)
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-paper">
      <TopBar businessId={businessId} canManage={canManage} />
      <div className="relative flex min-h-0 flex-1">
        {hasOutline && businessId && (
          <>
            {/* The left menu. Its own button (top left of the menu) hides it down to a thin strip and shows it again. */}
            <aside className={`hidden flex-none flex-col border-r border-paper-line bg-white md:flex ${open ? 'w-[236px]' : 'w-14'}`}>
              <div className="flex h-12 flex-none items-center px-2">
                <button
                  type="button"
                  onClick={toggle}
                  aria-label={open ? 'Hide the menu' : 'Show the menu'}
                  aria-expanded={open}
                  title={open ? 'Hide the menu' : 'Show the menu'}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft hover:bg-paper"
                >
                  <IconMenu width={21} height={21} />
                </button>
              </div>
              {open && (
                <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
                  <Outline businessId={businessId} tableOnly={tableOnly} canManage={canManage} />
                </div>
              )}
            </aside>
            {drawer && (
              <div className="fixed inset-x-0 top-14 bottom-0 z-40 md:hidden">
                <div className="absolute inset-0 bg-ink/40" onClick={() => setDrawer(false)} />
                <aside className="scrollbar-thin absolute inset-y-0 left-0 w-[272px] max-w-[85vw] overflow-y-auto bg-white shadow-xl">
                  <Outline businessId={businessId} tableOnly={tableOnly} canManage={canManage} onNavigate={() => setDrawer(false)} />
                </aside>
              </div>
            )}
          </>
        )}
        <main className={`scrollbar-thin min-w-0 flex-1 ${fullBleed ? 'overflow-auto bg-white' : 'overflow-y-auto bg-paper px-5 pt-8 pb-14 md:px-10'}`}>
          <Outlet />
        </main>
      </div>
      {hasOutline && businessId && <BottomNav businessId={businessId} tableOnly={tableOnly} onMore={() => setDrawer(true)} />}
    </div>
  )
}
