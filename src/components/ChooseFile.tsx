import { Upload } from 'lucide-react'
import { useRef, type ChangeEvent } from 'react'
import { Button } from './Button'

// The "choose a file" part of every upload dialog: an upload icon, and one button that opens the browser's file picker
// (the plain input is hidden, so it does not look like a leftover of the page).
export function ChooseFile({
  accept,
  onChange,
  disabled,
  loading,
  label = 'Choose a file',
}: {
  accept: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  disabled?: boolean
  loading?: boolean
  label?: string
}) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <input ref={input} type="file" accept={accept} className="hidden" onChange={onChange} aria-label={label} />
      <Button type="button" onClick={() => input.current?.click()} disabled={disabled || loading}>
        <Upload width={17} height={17} strokeWidth={2} aria-hidden />
        {loading ? 'Reading…' : label}
      </Button>
    </>
  )
}

// The round upload icon that sits above the words of the drop zone.
export function UploadBadge() {
  return (
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-stamp-soft text-stamp" aria-hidden>
      <Upload width={22} height={22} strokeWidth={1.9} />
    </span>
  )
}
