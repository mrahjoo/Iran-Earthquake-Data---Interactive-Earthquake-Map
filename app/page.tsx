import EarthquakeMap from "@/components/earthquake-map"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Earthquake Viewer",
  description: "Real-time and historical earthquake data visualization",
}

export default function HomePage() {
  return (
    <main className="flex flex-col min-h-screen">
      <EarthquakeMap />
    </main>
  )
}

