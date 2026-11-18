import { useLayoutEffect, useRef, useState } from 'react'

export interface IndicatorBox {
  x: number
  y: number
  w: number
  h: number
}

// Where the highlight of a menu or a tab strip should be: on the item marked as the current one (aria-current="page" or
// aria-selected="true"), measured inside the container. The container must be `position: relative`, so the numbers are
// its own. The highlight is then drawn by the caller as an absolutely placed box that glides (the .glide class in
// index.css) from one item to the next. It does not glide on the first draw, only when the page changes after that.
export function useSlidingIndicator<T extends HTMLElement>(dependency: unknown) {
  const ref = useRef<T>(null)
  const [box, setBox] = useState<IndicatorBox | null>(null)
  const [gliding, setGliding] = useState(false)

  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    const measure = () => {
      const el = root.querySelector<HTMLElement>('[aria-current="page"],[aria-selected="true"]')
      setBox(el ? { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight } : null)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    const frame = requestAnimationFrame(() => setGliding(true))
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [dependency])

  return { ref, box, gliding }
}
