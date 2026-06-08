export function ResizeHandle({ onResize }: { onResize: (w: number) => void }) {
  return (
    <div
      className="w-1 shrink-0 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors"
      onMouseDown={(e) => {
        e.preventDefault()
        const startX = e.clientX
        const aside = (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement | null
        const startW = aside?.offsetWidth ?? 380
        const onMove = (ev: MouseEvent) => onResize(Math.max(200, Math.min(800, startW - (ev.clientX - startX))))
        const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp) }
        document.addEventListener("mousemove", onMove)
        document.addEventListener("mouseup", onUp)
      }}
    />
  )
}
