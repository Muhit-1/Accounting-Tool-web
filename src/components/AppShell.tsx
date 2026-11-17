import { useEffect, useState } from 'react'
import { Outlet, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { markOpened, useBusiness } from '../lib/businesses'
import { useTables } from '../lib/tables'
import { BottomNav } from './shell/BottomNav'
import { SideMenu } from './shell/SideMenu'
import { TopBar } from './shell/TopBar'
import { Banner } from './Banner'
import { useNotice } from '../lib/support'

const OUTLINE_KEY = 'exin_outline_open'

function readOpen(): boolean {
  try {
    const saved = localStorage.getItem(OUTLINE_KEY)
    if (saved !== null) return saved !== '0'
  } catch {
    // no saved choice
  }
  return window.matchMedia('(min-width: 1024px)').matches
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
  const { data: notice } = useNotice()
  // The Workspace, the Connections map and the invoice editor use the whole page: no margins, one scroll.
  const fullBleed = businessId !== undefined && new RegExp(`^/businesses/${businessId}/(workspace|accounts/[^/]+|connections|invoices/new|invoices/[^/]+/edit)(/|$)`).test(location.pathname)
  const hasOutline = businessId !== undefined

  // The Home list is ordered by what you opened last.
  const tab = new URLSearchParams(location.search).get('tab') ?? undefined
  useEffect(() => {
    if (businessId) void markOpened(businessId, tab)
  }, [businessId, tab])

  // Hides or shows the list beside the rail (desktop). The choice is remembered in this browser.
  function setOutline(next: boolean) {
    setOpen(next)
    try {
      localStorage.setItem(OUTLINE_KEY, next ? '1' : '0')
    } catch {
      // a private window: the choice just is not remembered
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-paper">
      {notice?.maintenance && <Banner level="warning" text={notice.maintenance} />}
      {notice?.announcement && <Banner level={notice.announcement.level} text={notice.announcement.text} />}
      <TopBar businessId={businessId} canManage={canManage} />
      <div className="relative flex min-h-0 flex-1">
        {hasOutline && businessId && (
          <>
            {/* The left menu: a rail of four areas and the list of the chosen one. The rail's last button hides the list. */}
            <aside className="hidden flex-none md:flex">
              <SideMenu businessId={businessId} tableOnly={tableOnly} canManage={canManage} open={open} setOpen={setOutline} />
            </aside>
            {drawer && (
              <div className="fixed inset-x-0 top-14 bottom-0 z-40 md:hidden">
                <div className="absolute inset-0 bg-ink/40" onClick={() => setDrawer(false)} />
                <aside className="scrollbar-thin absolute inset-y-0 left-0 w-[272px] max-w-[85vw] overflow-y-auto bg-white shadow-xl">
                  <SideMenu layout="drawer" businessId={businessId} tableOnly={tableOnly} canManage={canManage} open setOpen={() => undefined} onNavigate={() => setDrawer(false)} />
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
