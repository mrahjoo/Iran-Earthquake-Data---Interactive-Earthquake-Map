"use client"

import type { Earthquake } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AlertTriangle, ArrowUpRight, Clock, ExternalLink, MapPin, Ruler, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface EarthquakeDetailsProps {
  earthquake: Earthquake
  onClose: () => void
}

export default function EarthquakeDetails({ earthquake, onClose }: EarthquakeDetailsProps) {
  const { properties, geometry } = earthquake

  // Format date
  const formattedDate = new Date(properties.time).toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  })

  // Get magnitude color
  const getMagnitudeColor = (mag: number) => {
    if (mag < 2) return "bg-green-500"
    if (mag < 4) return "bg-yellow-500"
    if (mag < 6) return "bg-orange-500"
    if (mag < 8) return "bg-red-500"
    return "bg-red-700"
  }

  // Format coordinates
  const formatCoordinates = (coords: number[]) => {
    return `${coords[1].toFixed(4)}°, ${coords[0].toFixed(4)}°`
  }

  return (
    <Card className="absolute bottom-4 right-4 w-full max-w-md p-4 shadow-lg z-20 bg-card/95 backdrop-blur-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge className={`${getMagnitudeColor(properties.mag)} text-white px-2 py-1`}>
              M{properties.mag.toFixed(1)}
            </Badge>
            {properties.tsunami === 1 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Tsunami Alert
              </Badge>
            )}
          </div>
          <h3 className="text-lg font-bold mt-1">{properties.place}</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{formattedDate}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>{formatCoordinates(geometry.coordinates)}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Ruler className="h-4 w-4 text-muted-foreground" />
          <span>Depth: {geometry.coordinates[2].toFixed(1)} km</span>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Significance</p>
            <p className="font-medium">{properties.sig || "N/A"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Felt Reports</p>
            <p className="font-medium">{properties.felt || 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <p className="font-medium capitalize">{properties.status || "Unknown"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Alert Level</p>
            <p className="font-medium capitalize">{properties.alert || "None"}</p>
          </div>
        </div>

        <Separator />

        <div className="flex justify-between">
          <Button variant="outline" size="sm" asChild>
            <a href={properties.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              USGS Event Page
            </a>
          </Button>

          {properties.detail && (
            <Button variant="outline" size="sm" asChild>
              <a href={properties.detail} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                Detailed Report
              </a>
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

