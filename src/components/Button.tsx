import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const variants: Record<Variant, string> = {
  primary: 'bg-stamp text-white hover:bg-stamp/90',
  ghost: 'border border-paper-line text-ink hover:bg-black/[0.03]',
  danger: 'bg-rust text-white hover:bg-rust/90',
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-ledger px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
