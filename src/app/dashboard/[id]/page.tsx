"use client"

import { useParams } from "next/navigation"
import dynamic from "next/dynamic"

const DashboardView = dynamic(
  () => import("@/components/dashboard-view").then((m) => m.DashboardView),
  { ssr: false },
)

export default function DashboardViewPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  return <DashboardView dashboardId={id} />
}
