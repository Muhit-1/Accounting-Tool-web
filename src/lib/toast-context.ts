import { createContext, useContext } from 'react'

export interface ToastOptions {
  // Shows an "Undo" button; the toast stays a little longer.
  undo?: () => void
}

export type ShowToast = (message: string, options?: ToastOptions) => void

export const ToastContext = createContext<ShowToast | undefined>(undefined)

export function useToast(): ShowToast {
  const show = useContext(ToastContext)
  if (!show) throw new Error('useToast must be used inside ToastProvider')
  return show
}
