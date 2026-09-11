export function Seal({ size = 29 }: { size?: number }) {
  return (
    <span
      className="flex flex-none items-center justify-center rounded-[8px] bg-stamp text-white"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={size * 0.52}
        height={size * 0.52}
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 8.5 10 3l7 5.5" />
        <path d="M4.5 8v7a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V8" />
        <path d="M8 16v-4h4v4" />
      </svg>
    </span>
  )
}
