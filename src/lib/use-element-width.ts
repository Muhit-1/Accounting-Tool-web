import { useEffect, useRef, useState } from 'react'

// Width of an element in CSS pixels, kept up to date as it resizes. Charts use
// it to draw at their real size: an SVG stretched to fit its box would also
// stretch its text and height on a wide screen.
export function useElementWidth<T extends HTMLElement>(fallback = 600) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    setWidth(Math.round(element.getBoundingClientRect().width) || fallback)
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width)
      if (next > 0) setWidth(next)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [fallback])

  return { ref, width }
}
