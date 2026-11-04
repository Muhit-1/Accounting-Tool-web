import { createContext, useContext } from 'react'

// The Workspace keeps its toolbar pinned to the top while the sheet scrolls under it. The page gives the grid
// things to draw into up there: the element for its toolbar, and one under it for the formula bar and the money strip.
// It also says how tall the pinned part is (--ws-top), so the column headers can stick right under it.
export interface WorkspaceChrome {
  toolbarHost: HTMLElement | null
  barHost: HTMLElement | null
}

export const WorkspaceChromeContext = createContext<WorkspaceChrome>({ toolbarHost: null, barHost: null })

export const useWorkspaceChrome = () => useContext(WorkspaceChromeContext)
