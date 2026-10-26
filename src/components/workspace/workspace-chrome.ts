import { createContext, useContext } from 'react'

// The Workspace keeps its tabs and toolbar pinned to the top while the sheet scrolls under them. The page gives the
// grid two things: the element its toolbar is drawn into (up there, with the tabs), and how tall the pinned part is,
// so the column headers can stick right under it.
export interface WorkspaceChrome {
  toolbarHost: HTMLElement | null
}

export const WorkspaceChromeContext = createContext<WorkspaceChrome>({ toolbarHost: null })

export const useWorkspaceChrome = () => useContext(WorkspaceChromeContext)
