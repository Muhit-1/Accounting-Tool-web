// Hands a file to the browser's "save" flow.
export function downloadFile(content: BlobPart, fileName: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Give the download a moment to start before the address is released.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
