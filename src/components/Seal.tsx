export function Seal({ size = 29 }: { size?: number }) {
  return (
    <span
      className="flex flex-none -rotate-6 items-center justify-center rounded-full border-[1.5px] border-stamp text-stamp"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={size * 0.52}
        height={size * 0.52}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 12l2 2 4-4" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    </span>
  )
}
