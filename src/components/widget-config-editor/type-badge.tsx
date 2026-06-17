export function TypeBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary ml-1.5 align-middle">
      {label}
    </span>
  )
}
