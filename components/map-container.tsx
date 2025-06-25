"use client"

import { useEffect, useRef, useState } from "react"
import Script from "next/script"
import { Loader2 } from "lucide-react"
import type { Earthquake } from "@/lib/types"

// Iran's center coordinates and zoom level
const IRAN_CENTER = [53.688, 32.4279]
const IRAN_ZOOM = 5
const IRAN_BOUNDS = [
  [44.0, 25.0], // Southwest coordinates
  [63.0, 40.0], // Northeast coordinates
]

interface MapContainerProps {
  mapboxToken: string
  geojsonData: any
  viewState: {
    longitude: number
    latitude: number
    zoom: number
  }
  setViewState: (viewState: any) => void
  selectedEarthquake: Earthquake | null
  setSelectedEarthquake: (earthquake: Earthquake | null) => void
}

export default function MapContainer({
  mapboxToken,
  geojsonData,
  viewState,
  setViewState,
  selectedEarthquake,
  setSelectedEarthquake,
}: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapboxLoaded, setMapboxLoaded] = useState(false)
  const popupRef = useRef<any>(null)
  const eventListenersRef = useRef<{ [key: string]: any }>({})
  const iranBoundaryRef = useRef<any>(null)

  // Initialize map when the mapbox script is loaded
  useEffect(() => {
    if (!mapboxLoaded || !mapContainer.current) return
    if (map.current) return // Prevent multiple initializations

    // Initialize the map
    const mapboxgl = window.mapboxgl
    mapboxgl.accessToken = mapboxToken

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12", // Light theme
      center: IRAN_CENTER,
      zoom: IRAN_ZOOM,
      maxBounds: [
        [IRAN_BOUNDS[0][0] - 2, IRAN_BOUNDS[0][1] - 2], // Southwest with padding
        [IRAN_BOUNDS[1][0] + 2, IRAN_BOUNDS[1][1] + 2], // Northeast with padding
      ],
    })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right")
    map.current.addControl(new mapboxgl.ScaleControl(), "bottom-right")

    // Add Iran border outline
    map.current.on("load", () => {
      // Fetch Iran GeoJSON boundary
      fetch("https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson")
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to fetch country boundaries: ${response.status}`)
          }
          return response.json()
        })
        .then((data) => {
          // Find Iran in the countries
          const iran = data.features.find(
            (feature) => feature.properties.ADMIN === "Iran" || feature.properties.ISO_A3 === "IRN",
          )

          if (iran) {
            // Add Iran boundary source and layer
            map.current.addSource("iran-boundary", {
              type: "geojson",
              data: iran,
            })

            map.current.addLayer({
              id: "iran-boundary-fill",
              type: "fill",
              source: "iran-boundary",
              paint: {
                "fill-color": "#f8f9fa",
                "fill-opacity": 0.1,
              },
            })

            map.current.addLayer({
              id: "iran-boundary-line",
              type: "line",
              source: "iran-boundary",
              paint: {
                "line-color": "#3b82f6",
                "line-width": 2,
              },
            })

            // Store reference to remove later if needed
            iranBoundaryRef.current = iran

            // Fit map to Iran bounds
            const bounds = new mapboxgl.LngLatBounds()
            iran.geometry.coordinates[0].forEach((coord) => {
              bounds.extend(coord)
            })

            map.current.fitBounds(bounds, {
              padding: 20,
              maxZoom: 7,
            })
          } else {
            console.warn("Iran boundary not found in GeoJSON data")
            // Use a fallback bounding box for Iran
            const fallbackBounds = new mapboxgl.LngLatBounds(
              [IRAN_BOUNDS[0][0], IRAN_BOUNDS[0][1]],
              [IRAN_BOUNDS[1][0], IRAN_BOUNDS[1][1]],
            )

            map.current.fitBounds(fallbackBounds, {
              padding: 20,
              maxZoom: 7,
            })
          }
        })
        .catch((error) => {
          console.error("Error fetching Iran boundary:", error)
          // Use a fallback bounding box for Iran
          const fallbackBounds = new mapboxgl.LngLatBounds(
            [IRAN_BOUNDS[0][0], IRAN_BOUNDS[0][1]],
            [IRAN_BOUNDS[1][0], IRAN_BOUNDS[1][1]],
          )

          map.current.fitBounds(fallbackBounds, {
            padding: 20,
            maxZoom: 7,
          })
        })

      // Add a "home" button to reset the view to Iran
      const homeButton = document.createElement("button")
      homeButton.className = "mapboxgl-ctrl-icon mapboxgl-ctrl-home"
      homeButton.innerHTML = "<span>🏠</span>"
      homeButton.style.fontSize = "16px"
      homeButton.style.padding = "0 5px"
      homeButton.addEventListener("click", () => {
        if (iranBoundaryRef.current) {
          // Fit to Iran boundary if available
          const bounds = new mapboxgl.LngLatBounds()
          iranBoundaryRef.current.geometry.coordinates[0].forEach((coord) => {
            bounds.extend(coord)
          })

          map.current.fitBounds(bounds, {
            padding: 20,
            maxZoom: 7,
          })
        } else {
          // Fallback to center coordinates
          map.current.flyTo({
            center: IRAN_CENTER,
            zoom: IRAN_ZOOM,
            essential: true,
          })
        }
      })

      const homeButtonContainer = document.createElement("div")
      homeButtonContainer.className = "mapboxgl-ctrl mapboxgl-ctrl-group"
      homeButtonContainer.appendChild(homeButton)

      document.querySelector(".mapboxgl-ctrl-top-right")?.appendChild(homeButtonContainer)

      setMapLoaded(true)
    })

    // Handle map move events (debounced)
    let moveTimeout: NodeJS.Timeout
    const moveHandler = () => {
      clearTimeout(moveTimeout)
      moveTimeout = setTimeout(() => {
        if (!map.current) return
        const center = map.current.getCenter()
        setViewState({
          longitude: center.lng,
          latitude: center.lat,
          zoom: map.current.getZoom(),
        })
      }, 100) // Debounce for 100ms
    }

    map.current.on("move", moveHandler)
    eventListenersRef.current["move"] = moveHandler

    // Clean up on unmount
    return () => {
      clearTimeout(moveTimeout)
      if (map.current) {
        // Remove event listeners
        Object.keys(eventListenersRef.current).forEach((event) => {
          if (eventListenersRef.current[event]) {
            map.current.off(event, eventListenersRef.current[event])
          }
        })

        // Remove any custom controls
        const homeButton = document.querySelector(".mapboxgl-ctrl-home")
        if (homeButton) {
          const container = homeButton.parentElement
          if (container) {
            container.remove()
          }
        }

        map.current.remove()
        map.current = null
      }
    }
  }, [mapboxLoaded, mapboxToken, setViewState])

  // Update map when viewState changes from outside (but only for significant changes)
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Only update if the change is significant (to avoid loops)
    const currentCenter = map.current.getCenter()
    const currentZoom = map.current.getZoom()

    const lonDiff = Math.abs(currentCenter.lng - viewState.longitude)
    const latDiff = Math.abs(currentCenter.lat - viewState.latitude)
    const zoomDiff = Math.abs(currentZoom - viewState.zoom)

    if (lonDiff > 0.5 || latDiff > 0.5 || zoomDiff > 0.5) {
      map.current.flyTo({
        center: [viewState.longitude, viewState.latitude],
        zoom: viewState.zoom,
        essential: true,
      })
    }
  }, [viewState.longitude, viewState.latitude, viewState.zoom, mapLoaded])

  // Add earthquake data to the map
  useEffect(() => {
    if (!map.current || !mapLoaded || !geojsonData) return

    // Create a function to safely remove layers and sources
    const cleanupLayersAndSources = () => {
      // Check and remove layers first (in the correct order)
      const layers = ["earthquake-labels", "earthquakes", "cluster-count", "clusters"]

      layers.forEach((layer) => {
        if (map.current.getLayer(layer)) {
          map.current.removeLayer(layer)
        }
      })

      // Then remove the source
      if (map.current.getSource("earthquakes")) {
        map.current.removeSource("earthquakes")
      }
    }

    // Wrap in a try-catch to handle any errors
    try {
      // Clean up existing layers and sources
      cleanupLayersAndSources()

      // Add the GeoJSON source
      map.current.addSource("earthquakes", {
        type: "geojson",
        data: geojsonData,
        cluster: true,
        clusterMaxZoom: 10, // Max zoom to cluster points
        clusterRadius: 50, // Radius of each cluster when clustering points
      })

      // Add a layer for the clusters
      map.current.addLayer({
        id: "clusters",
        type: "circle",
        source: "earthquakes",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": ["step", ["get", "point_count"], "#51bbd6", 10, "#f1f075", 30, "#f28cb1"],
          "circle-radius": ["step", ["get", "point_count"], 20, 10, 30, 30, 40],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      })

      // Add a layer for the cluster counts
      map.current.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "earthquakes",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 12,
        },
        paint: {
          "text-color": "#ffffff",
        },
      })

      // Add the circle layer for individual earthquakes
      map.current.addLayer({
        id: "earthquakes",
        type: "circle",
        source: "earthquakes",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "mag"], 0, 4, 2, 6, 4, 12, 6, 18, 8, 24, 10, 30],
          "circle-color": [
            "interpolate",
            ["linear"],
            ["get", "mag"],
            0,
            "#2ecc71",
            2,
            "#f1c40f",
            4,
            "#e67e22",
            6,
            "#e74c3c",
            8,
            "#c0392b",
          ],
          "circle-opacity": 0.8,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        },
      })

      // Add labels for significant earthquakes (mag >= 4.5)
      map.current.addLayer({
        id: "earthquake-labels",
        type: "symbol",
        source: "earthquakes",
        filter: ["all", ["!", ["has", "point_count"]], [">=", ["get", "mag"], 4.5]],
        layout: {
          "text-field": "{mag}",
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 12,
          "text-offset": [0, -1.5],
        },
        paint: {
          "text-color": "#000000",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1,
        },
      })

      // Set up event handlers
      // Add click event for clusters
      const clusterClickHandler = (e) => {
        const features = map.current.queryRenderedFeatures(e.point, {
          layers: ["clusters"],
        })
        const clusterId = features[0].properties.cluster_id
        map.current.getSource("earthquakes").getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return

          map.current.easeTo({
            center: features[0].geometry.coordinates,
            zoom: zoom,
          })
        })
      }

      // Add click event for individual earthquakes
      const earthquakeClickHandler = (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0]
          const earthquake = geojsonData.features.find((eq) => eq.id === feature.properties.id)

          if (earthquake) {
            setSelectedEarthquake(earthquake)
          }
        }
      }

      // Mouse enter/leave handlers
      const mouseEnterClustersHandler = () => {
        map.current.getCanvas().style.cursor = "pointer"
      }

      const mouseLeaveClustersHandler = () => {
        map.current.getCanvas().style.cursor = ""
      }

      const mouseEnterEarthquakesHandler = () => {
        map.current.getCanvas().style.cursor = "pointer"
      }

      const mouseLeaveEarthquakesHandler = () => {
        map.current.getCanvas().style.cursor = ""
      }

      // Remove previous event listeners if they exist
      if (eventListenersRef.current["click-clusters"]) {
        map.current.off("click", "clusters", eventListenersRef.current["click-clusters"])
      }

      if (eventListenersRef.current["click-earthquakes"]) {
        map.current.off("click", "earthquakes", eventListenersRef.current["click-earthquakes"])
      }

      // Add new event listeners
      map.current.on("click", "clusters", clusterClickHandler)
      map.current.on("click", "earthquakes", earthquakeClickHandler)
      map.current.on("mouseenter", "clusters", mouseEnterClustersHandler)
      map.current.on("mouseleave", "clusters", mouseLeaveClustersHandler)
      map.current.on("mouseenter", "earthquakes", mouseEnterEarthquakesHandler)
      map.current.on("mouseleave", "earthquakes", mouseLeaveEarthquakesHandler)

      // Store references to event handlers for cleanup
      eventListenersRef.current["click-clusters"] = clusterClickHandler
      eventListenersRef.current["click-earthquakes"] = earthquakeClickHandler
      eventListenersRef.current["mouseenter-clusters"] = mouseEnterClustersHandler
      eventListenersRef.current["mouseleave-clusters"] = mouseLeaveClustersHandler
      eventListenersRef.current["mouseenter-earthquakes"] = mouseEnterEarthquakesHandler
      eventListenersRef.current["mouseleave-earthquakes"] = mouseLeaveEarthquakesHandler
    } catch (error) {
      console.error("Error adding earthquake data to map:", error)
    }

    // Clean up on unmount or when dependencies change
    return () => {
      // We'll handle cleanup in the main useEffect
    }
  }, [geojsonData, mapLoaded, setSelectedEarthquake])

  // Handle selected earthquake popup
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Remove existing popup if any
    if (popupRef.current) {
      popupRef.current.remove()
      popupRef.current = null
    }

    // Add popup for selected earthquake
    if (selectedEarthquake) {
      const coordinates = selectedEarthquake.geometry.coordinates.slice()
      const magnitude = selectedEarthquake.properties.mag
      const place = selectedEarthquake.properties.place
      const time = new Date(selectedEarthquake.properties.time).toLocaleString()

      // Create popup
      popupRef.current = new window.mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(`
          <div class="p-2">
            <h3 class="font-bold text-sm">M${magnitude.toFixed(1)} - ${place}</h3>
            <p class="text-xs text-muted-foreground">${time}</p>
          </div>
        `)
        .addTo(map.current)

      // Fly to the earthquake location
      map.current.flyTo({
        center: coordinates,
        zoom: Math.max(map.current.getZoom(), 8),
        essential: true,
      })
    }
  }, [selectedEarthquake, mapLoaded])

  return (
    <>
      <Script
        src="https://api.mapbox.com/mapbox-gl-js/v3.10.0/mapbox-gl.js"
        onLoad={() => setMapboxLoaded(true)}
        strategy="afterInteractive"
      />
      <link href="https://api.mapbox.com/mapbox-gl-js/v3.10.0/mapbox-gl.css" rel="stylesheet" />

      <div ref={mapContainer} className="w-full h-full">
        {!mapboxLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/20 z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p>Loading Mapbox...</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
