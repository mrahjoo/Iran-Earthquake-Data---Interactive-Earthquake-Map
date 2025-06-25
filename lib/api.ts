import type { EarthquakeData } from "./types"

// Cache durations in milliseconds
const CACHE_DURATIONS = {
  hour: 5 * 60 * 1000, // 5 minutes
  day: 15 * 60 * 1000, // 15 minutes
  week: 60 * 60 * 1000, // 1 hour
  historical: 24 * 60 * 60 * 1000, // 24 hours
}

// Iran's bounding box (approximately)
// Format: [min longitude, min latitude, max longitude, max latitude]
// Iran roughly lies between 25°-40°N latitude and 44°-63°E longitude
const IRAN_BOUNDS = [44.0, 25.0, 63.0, 40.0]

interface FetchEarthquakesParams {
  timeRange: string
  minMagnitude: number
  startDate?: string
  endDate?: string
}

export async function fetchEarthquakes({
  timeRange,
  minMagnitude,
  startDate,
  endDate,
}: FetchEarthquakesParams): Promise<EarthquakeData> {
  // Create a cache key based on the parameters
  const cacheKey = `earthquake_data_${timeRange}_${minMagnitude}_${startDate || ""}_${endDate || ""}_iran`

  // Check if we have cached data
  const cachedData = getCachedData(cacheKey, timeRange === "custom" ? "historical" : timeRange)
  if (cachedData) {
    return cachedData
  }

  let url = ""

  try {
    // Ensure we're not requesting future dates
    const now = new Date()
    const today = now.toISOString().split("T")[0]

    // For historical data, use the USGS query API with bounds
    if (timeRange === "custom") {
      // Validate dates to ensure we're not requesting future data
      const validEndDate = endDate && new Date(endDate) > now ? today : endDate

      url = "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson"
      url += `&starttime=${startDate}`
      url += `&endtime=${validEndDate}`
      url += `&minmagnitude=${minMagnitude}`
      url += `&minlatitude=${IRAN_BOUNDS[1]}`
      url += `&maxlatitude=${IRAN_BOUNDS[3]}`
      url += `&minlongitude=${IRAN_BOUNDS[0]}`
      url += `&maxlongitude=${IRAN_BOUNDS[2]}`
      url += "&orderby=time" // Default is newest first
      url += "&limit=500" // Add a reasonable limit
    } else {
      // For real-time data, use the USGS feeds which are more reliable
      url = `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_${timeRange}.geojson`
    }

    console.log("Fetching earthquake data from:", url)

    // Add a timeout to the fetch request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "EarthquakeViewer/1.0",
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text().catch(() => "No error details available")
      console.error(`Server responded with ${response.status}: ${errorText}`)
      throw new Error(`Server responded with ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    // For real-time feeds, filter by bounds and magnitude
    if (timeRange !== "custom") {
      data.features = data.features.filter((feature) => {
        const [lon, lat] = feature.geometry.coordinates
        return (
          lon >= IRAN_BOUNDS[0] &&
          lon <= IRAN_BOUNDS[2] &&
          lat >= IRAN_BOUNDS[1] &&
          lat <= IRAN_BOUNDS[3] &&
          feature.properties.mag >= minMagnitude
        )
      })

      // Update metadata count
      data.metadata.count = data.features.length
    }

    // Cache the data
    cacheData(cacheKey, data, timeRange === "custom" ? "historical" : timeRange)

    return data
  } catch (error) {
    console.error(`Error fetching earthquake data from ${url}:`, error)

    // Try to provide more helpful error messages
    if (error.name === "AbortError") {
      throw new Error("Request timed out. The USGS server might be experiencing high load.")
    } else if (error.message.includes("Failed to fetch")) {
      throw new Error("Network error. Please check your internet connection and try again.")
    } else if (error.message.includes("400")) {
      // Check for specific API errors
      if (error.message.includes("orderby")) {
        console.warn("Invalid orderby parameter detected")
        throw new Error("API parameter error. Please try again with different settings.")
      } else if (timeRange === "custom") {
        console.warn("Date range error detected, likely invalid date parameters")
        throw new Error("Invalid date range. Please ensure your dates are valid and not in the future.")
      } else {
        throw new Error(`API error: ${error.message}`)
      }
    } else {
      // For other errors, try the real-time feed as a fallback for historical requests
      if (timeRange === "custom") {
        console.warn("Historical data request failed, falling back to real-time data")
        return fetchEarthquakes({ timeRange: "week", minMagnitude, startDate: undefined, endDate: undefined })
      } else {
        throw new Error(`Failed to fetch earthquake data: ${error.message}`)
      }
    }
  }
}

// Cache data in localStorage
function cacheData(key: string, data: EarthquakeData, timeRange: string): void {
  try {
    const cacheItem = {
      data,
      timestamp: Date.now(),
    }
    localStorage.setItem(key, JSON.stringify(cacheItem))
  } catch (error) {
    console.warn("Failed to cache earthquake data:", error)
  }
}

// Get cached data if it's still valid
function getCachedData(key: string, timeRange: string): EarthquakeData | null {
  try {
    if (typeof window === "undefined") return null

    const cachedItem = localStorage.getItem(key)
    if (!cachedItem) return null

    const { data, timestamp } = JSON.parse(cachedItem)
    const cacheDuration = CACHE_DURATIONS[timeRange] || CACHE_DURATIONS.day

    // Check if cache is still valid
    if (Date.now() - timestamp < cacheDuration) {
      return data
    }

    return null
  } catch (error) {
    console.warn("Failed to retrieve cached earthquake data:", error)
    return null
  }
}

// Fallback data generator for when the API fails
function generateFallbackData(minMagnitude: number): EarthquakeData {
  // Create a minimal valid EarthquakeData structure
  return {
    type: "FeatureCollection",
    metadata: {
      generated: Date.now(),
      url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
      title: "Fallback Earthquake Data",
      status: 200,
      api: "1.0.0",
      count: 0,
    },
    features: [],
  }
}
