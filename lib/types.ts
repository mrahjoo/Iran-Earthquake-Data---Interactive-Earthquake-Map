export interface EarthquakeProperties {
  mag: number
  place: string
  time: number
  updated: number
  tz: number | null
  url: string
  detail: string
  felt: number | null
  cdi: number | null
  mmi: number | null
  alert: string | null
  status: string
  tsunami: number
  sig: number
  net: string
  code: string
  ids: string
  sources: string
  types: string
  nst: number | null
  dmin: number | null
  rms: number
  gap: number | null
  magType: string
  type: string
  title: string
}

export interface Earthquake {
  type: string
  properties: EarthquakeProperties
  geometry: {
    type: string
    coordinates: number[]
  }
  id: string
}

export interface EarthquakeData {
  type: string
  metadata: {
    generated: number
    url: string
    title: string
    status: number
    api: string
    count: number
  }
  features: Earthquake[]
}
