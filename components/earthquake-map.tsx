"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { fetchEarthquakes } from "@/lib/api"
import type { EarthquakeData, Earthquake } from "@/lib/types"
import EarthquakeSidebar from "./earthquake-sidebar"
import EarthquakeDetails from "./earthquake-details"
import { useDebounce } from "@/hooks/use-debounce"

// Dynamically import the Map component with no SSR
const MapContainer = dynamic(() => import("./map-container"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-muted/20">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p>Loading map...</p>
      </div>
    </div>
  ),
})

// Iran's center coordinates
const IRAN_CENTER = {
  longitude: 53.688,
  latitude: 32.4279,
  zoom: 5,
}

// You'll need to get a Mapbox token: https://docs.mapbox.com/help/getting-started/access-tokens/
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

export default function EarthquakeMap() {
  const [viewState, setViewState] = useState(IRAN_CENTER)
  const [earthquakes, setEarthquakes] = useState<EarthquakeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEarthquake, setSelectedEarthquake] = useState<Earthquake | null>(null)
  const [timeRange, setTimeRange] = useState("day")
  const [minMagnitude, setMinMagnitude] = useState(2) // Lower default to show more earthquakes in Iran
  const [isHistorical, setIsHistorical] = useState(false)

  // Set default date range to past 90 days up to today
  const now = new Date()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  const [dateRange, setDateRange] = useState({
    startDate: ninetyDaysAgo.toISOString().split("T")[0],
    endDate: now.toISOString().split("T")[0], // today
  })

  // Debounce filter changes to prevent too many API calls
  const debouncedMagnitude = useDebounce(minMagnitude, 500)
  const debouncedDateRange = useDebounce(dateRange, 500)

  const { toast } = useToast()
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isInitialLoad = useRef(true)

  // Fetch earthquake data based on current filters
  const loadEarthquakeData = async (showToast = true) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchEarthquakes({
        timeRange: isHistorical ? "custom" : timeRange,
        minMagnitude: debouncedMagnitude,
        startDate: debouncedDateRange.startDate,
        endDate: debouncedDateRange.endDate,
      })

      // Check if we got valid data
      if (!data || !data.features) {
        throw new Error("Invalid data received from the server")
      }

      setEarthquakes(data)

      if (showToast && !isInitialLoad.current) {
        toast({
          title: "Data Updated",
          description: `Showing ${data.features.length} earthquakes in Iran${
            isHistorical
              ? ` (${debouncedDateRange.startDate} to ${debouncedDateRange.endDate})`
              : ` (last ${timeRange})`
          } with magnitude ≥ ${debouncedMagnitude}`,
          duration: 3000,
        })
      }

      isInitialLoad.current = false
    } catch (err) {
      console.error("Error fetching earthquake data:", err)

      // Set a more user-friendly error message
      const errorMessage = err.message || "Failed to load earthquake data. Please try again."
      setError(errorMessage)

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Initial data load
  useEffect(() => {
    loadEarthquakeData(false)

    // Set up auto-refresh for real-time data
    if (!isHistorical) {
      refreshTimerRef.current = setInterval(
        () => {
          loadEarthquakeData(false) // Don't show toast on auto-refresh
        },
        5 * 60 * 1000, // Refresh every 5 minutes
      )
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
      }
    }
  }, [timeRange, debouncedMagnitude, isHistorical, debouncedDateRange])

  // Create GeoJSON data for the map
  const geojsonData = useMemo(() => {
    if (!earthquakes) return null
    return {
      type: "FeatureCollection",
      features: earthquakes.features,
    }
  }, [earthquakes])

  // Handle filter changes
  const handleFilterChange = (filters) => {
    // Clear any existing refresh timer
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current)
      refreshTimerRef.current = null
    }

    setTimeRange(filters.timeRange)
    setMinMagnitude(filters.minMagnitude)
    setIsHistorical(filters.isHistorical)

    // Validate date range to ensure endDate is not in the future
    const now = new Date()
    const today = now.toISOString().split("T")[0]

    const validEndDate = filters.dateRange.endDate > today ? today : filters.dateRange.endDate

    setDateRange({
      startDate: filters.dateRange.startDate,
      endDate: validEndDate,
    })

    // Set up new refresh timer if not in historical mode
    if (!filters.isHistorical) {
      refreshTimerRef.current = setInterval(
        () => {
          loadEarthquakeData(false)
        },
        5 * 60 * 1000,
      )
    }
  }

  // Manual refresh handler
  const handleManualRefresh = () => {
    loadEarthquakeData(true)
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-full">
      <EarthquakeSidebar
        earthquakes={earthquakes?.features || []}
        onEarthquakeSelect={setSelectedEarthquake}
        selectedEarthquake={selectedEarthquake}
        onFilterChange={handleFilterChange}
        onRefresh={handleManualRefresh}
        filters={{
          timeRange,
          minMagnitude,
          isHistorical,
          dateRange,
        }}
        loading={loading}
        region="Iran"
        error={!!error}
      />

      <div className="flex-1 relative">
        {!MAPBOX_TOKEN && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
            <div className="text-center p-4 max-w-md">
              <h3 className="text-lg font-bold mb-2">Mapbox Token Required</h3>
              <p className="mb-4">
                Please add your Mapbox token as NEXT_PUBLIC_MAPBOX_TOKEN in your environment variables.
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="absolute top-4 right-4 bg-background/80 p-2 rounded-md z-10 flex items-center">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span>Loading data...</span>
          </div>
        )}

        {error && (
          <div className="absolute top-4 right-4 bg-destructive/90 text-destructive-foreground p-2 rounded-md z-10">
            {error}
            <Button variant="outline" size="sm" className="ml-2" onClick={() => loadEarthquakeData()}>
              Retry
            </Button>
          </div>
        )}

        <MapContainer
          mapboxToken={MAPBOX_TOKEN}
          geojsonData={geojsonData}
          viewState={viewState}
          setViewState={setViewState}
          selectedEarthquake={selectedEarthquake}
          setSelectedEarthquake={setSelectedEarthquake}
        />

        {selectedEarthquake && (
          <EarthquakeDetails earthquake={selectedEarthquake} onClose={() => setSelectedEarthquake(null)} />
        )}
      </div>
    </div>
  )
}

