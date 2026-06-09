export function SnakeSpinner({ size = 12 }: { size?: number }) {
  const s = size - 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ animation: "snake 1.2s linear infinite" }}>
      <rect x="1" y="1" width={s} height={s} rx="1" fill="none" stroke="currentColor" className="text-muted-foreground/20" strokeWidth="1.5" />
      <rect x="1" y="1" width={s} height={s} rx="1" fill="none" stroke="currentColor" className="text-muted-foreground/80" strokeWidth="1.5" strokeDasharray="2 2.5" strokeLinecap="round" />
    </svg>
  )
}
