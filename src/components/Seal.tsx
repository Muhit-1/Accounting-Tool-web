// The Exin Finance mark: a mint tile with three ledger lines (Logo and assest/exin icon.png, drawn here as a vector so
// it is sharp at every size). Its colours are the brand's own, the same in every theme. The favicon is the same drawing.
export function Seal({ size = 29 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="flex-none" aria-hidden="true" focusable="false">
      <rect width="100" height="100" rx="10" fill="#5fdcb0" />
      <g fill="#2d1e00">
        <rect x="21.7" y="29.2" width="56.6" height="8.4" rx="4.2" />
        <rect x="21.7" y="49.1" width="42.9" height="8.4" rx="4.2" />
        <rect x="21.7" y="69" width="56.6" height="8.4" rx="4.2" />
      </g>
    </svg>
  )
}
