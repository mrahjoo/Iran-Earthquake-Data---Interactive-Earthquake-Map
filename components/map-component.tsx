"use client"

import { useState, useEffect } from "react"
import type { Earthquake } from "@/lib/types"
import { Loader2 } from "lucide-react"

interface MapComponentProps {
  viewState: {
    longitude: number
    latitude: number
    zoom: number
  }
  setViewState: (viewState: any) => void
  mapboxToken: string
  geojsonData: any
  layerStyle: any
  selectedEarthquake: Earthquake | null
  setSelectedEarthquake: (earthquake: Earthquake | null) => void
}

export default function MapComponent({
  viewState,
  setViewState,
  mapboxToken,
  geojsonData,
  layerStyle,
  selectedEarthquake,
  setSelectedEarthquake,
}: MapComponentProps) {
  const [mapComponents, setMapComponents] = useState<{
    Map: any
    Source: any
    Layer: any
    Popup: any
    NavigationControl: any
    ScaleControl: any
  } | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load mapbox-gl only on the client side
  useEffect(() => {
    async function loadMapComponents() {
      try {
        if (typeof window !== "undefined") {
          // Import CSS first
          await import("mapbox-gl/dist/mapbox-gl.css")

          // Then import the components
          const reactMapGL = await import("react-map-gl")

          // Set all components at once to ensure they're loaded together
          setMapComponents({
            Map: reactMapGL.Map,
            Source: reactMapGL.Source,
            Layer: reactMapGL.Layer,
            Popup: reactMapGL.Popup,
            NavigationControl: reactMapGL.NavigationControl,
            ScaleControl: reactMapGL.ScaleControl,
          })
        }
      } catch (err) {
        console.error("Error loading map components:", err)
        setError("Failed to load map components. Please refresh the page.")
      } finally {
        setIsLoading(false)
      }
    }

    loadMapComponents()
  }, [])

  // Handle click on earthquake point
  const handleClick = (event) => {
    const { features } = event
    if (features && features.length > 0) {
      const clickedFeature = features[0]
      const properties = clickedFeature.properties

      // Find the full earthquake data
      const earthquake = geojsonData?.features.find((eq) => eq.id === properties.id)

      if (earthquake) {
        setSelectedEarthquake(earthquake)
      }
    }
  }

  // Loading state
  if (isLoading || !mapComponents) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-muted/20">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Loading map...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-destructive/10">
        <div className="text-center p-6 max-w-md">
          <h3 className="text-lg font-bold mb-2">Map Error</h3>
          <p className="mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }

  // Destructure map components for easier use
  const { Map, Source, Layer, Popup, NavigationControl, ScaleControl } = mapComponents

  return (
    <Map
      {...viewState}
      onMove={(evt) => setViewState(evt.viewState)}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      mapboxAccessToken={mapboxToken}
      interactiveLayerIds={["earthquakes"]}
      onClick={handleClick}
      style={{ width: "100%", height: "100%" }}
    >
      <NavigationControl position="top-right" />
      <ScaleControl position="bottom-right" />

      {geojsonData && (
        <Source type="geojson" data={geojsonData}>
          <Layer {...layerStyle} />
        </Source>
      )}

      {selectedEarthquake && (
        <Popup
          longitude={selectedEarthquake.geometry.coordinates[0]}
          latitude={selectedEarthquake.geometry.coordinates[1]}
          closeOnClick={false}
          onClose={() => setSelectedEarthquake(null)}
          className="z-10"
        >
          <div className="p-2">
            <h3 className="font-bold text-sm">
              M{selectedEarthquake.properties.mag.toFixed(1)} - {selectedEarthquake.properties.place}
            </h3>
            <p className="text-xs text-muted-foreground">
              {new Date(selectedEarthquake.properties.time).toLocaleString()}
            </p>
          </div>
        </Popup>
      )}
    </Map>
  )
}
