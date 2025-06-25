"use client"

import { useState, useEffect, useRef } from "react"
import type { Earthquake } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Clock,
  Filter,
  List,
  Maximize2,
  Minimize2,
  RefreshCw,
  Search,
  Sliders,
  Loader2,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { useVirtualizer } from "@tanstack/react-virtual"

interface EarthquakeSidebarProps {
  earthquakes: Earthquake[]
  onEarthquakeSelect: (earthquake: Earthquake | null) => void
  selectedEarthquake: Earthquake | null
  onFilterChange: (filters: any) => void
  onRefresh: () => void
  filters: {
    timeRange: string
    minMagnitude: number
    isHistorical: boolean
    dateRange: {
      startDate: string
      endDate: string
    }
  }
  loading: boolean
  region: string
  error: boolean
}

export default function EarthquakeSidebar({
  earthquakes,
  onEarthquakeSelect,
  selectedEarthquake,
  onFilterChange,
  onRefresh,
  filters,
  loading,
  region,
  error,
}: EarthquakeSidebarProps) {
  const [expanded, setExpanded] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("list")
  const [stats, setStats] = useState({
    total: 0,
    significant: 0,
    recent24h: 0,
    maxMagnitude: 0,
  })

  const parentRef = useRef<HTMLDivElement>(null)

  // Calculate statistics
  useEffect(() => {
    if (earthquakes.length === 0) return

    const now = Date.now()
    const last24h = now - 24 * 60 * 60 * 1000

    const significant = earthquakes.filter((eq) => eq.properties.mag >= 4.0).length
    const recent24h = earthquakes.filter((eq) => eq.properties.time >= last24h).length
    const maxMagnitude = Math.max(...earthquakes.map((eq) => eq.properties.mag))

    setStats({
      total: earthquakes.length,
      significant,
      recent24h,
      maxMagnitude,
    })
  }, [earthquakes])

  // Filter earthquakes by search term
  const filteredEarthquakes = earthquakes.filter((eq) => {
    if (!searchTerm) return true
    return eq.properties.place?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  // Sort earthquakes by time (most recent first)
  const sortedEarthquakes = [...filteredEarthquakes].sort((a, b) => b.properties.time - a.properties.time)

  // Virtual list for better performance with large datasets
  const rowVirtualizer = useVirtualizer({
    count: sortedEarthquakes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated height of each row
    overscan: 5,
  })

  // Format magnitude with color
  const formatMagnitude = (magnitude: number) => {
    let color = "bg-green-500"
    if (magnitude >= 2) color = "bg-yellow-500"
    if (magnitude >= 4) color = "bg-orange-500"
    if (magnitude >= 6) color = "bg-red-500"
    if (magnitude >= 8) color = "bg-red-700"

    return (
      <Badge variant="outline" className={cn("font-mono", color)}>
        {magnitude.toFixed(1)}
      </Badge>
    )
  }

  // Handle filter changes
  const handleTimeRangeChange = (value: string) => {
    onFilterChange({
      ...filters,
      timeRange: value,
    })
  }

  const handleMagnitudeChange = (value: number[]) => {
    onFilterChange({
      ...filters,
      minMagnitude: value[0],
    })
  }

  const handleHistoricalToggle = (checked: boolean) => {
    onFilterChange({
      ...filters,
      isHistorical: checked,
    })
  }

  const handleDateChange = (field: "startDate" | "endDate", value: string) => {
    // Validate end date to ensure it's not in the future
    if (field === "endDate") {
      const now = new Date()
      const today = now.toISOString().split("T")[0]

      if (value > today) {
        value = today
      }
    }

    // Ensure start date is not after end date
    if (field === "startDate" && value > filters.dateRange.endDate) {
      value = filters.dateRange.endDate
    }

    onFilterChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: value,
      },
    })
  }

  return (
    <div
      className={cn(
        "bg-card border-r border-border transition-all duration-300 flex flex-col z-10",
        expanded ? "w-full md:w-96" : "w-12",
      )}
    >
      <div className="flex items-center justify-between p-4 border-b">
        {expanded && <h2 className="text-lg font-bold">{region} Earthquake Data</h2>}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setExpanded(!expanded)}
          className={cn(!expanded && "mx-auto")}
        >
          {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      {expanded && (
        <>
          {/* Stats summary */}
          {stats.total > 0 && (
            <div className="grid grid-cols-2 gap-2 p-4 border-b">
              <div className="bg-muted/30 p-2 rounded-md">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{stats.total}</p>
              </div>
              <div className="bg-muted/30 p-2 rounded-md">
                <p className="text-xs text-muted-foreground">Last 24h</p>
                <p className="text-lg font-bold">{stats.recent24h}</p>
              </div>
              <div className="bg-muted/30 p-2 rounded-md">
                <p className="text-xs text-muted-foreground">Significant (≥4.0)</p>
                <p className="text-lg font-bold">{stats.significant}</p>
              </div>
              <div className="bg-muted/30 p-2 rounded-md">
                <p className="text-xs text-muted-foreground">Max Magnitude</p>
                <p className="text-lg font-bold">{stats.maxMagnitude.toFixed(1)}</p>
              </div>
            </div>
          )}

          <Tabs defaultValue="list" className="flex-1 flex flex-col" onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 mx-4 mt-4">
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
              <TabsTrigger value="filters" className="flex items-center gap-2">
                <Sliders className="h-4 w-4" />
                Filters
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="flex-1 flex flex-col p-4 pt-2">
              <div className="relative mb-4">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by location..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{filteredEarthquakes.length} earthquakes</span>
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" disabled={loading} onClick={onRefresh}>
                  <RefreshCw className={cn("h-3 w-3 mr-1", loading && "animate-spin")} />
                  Refresh
                </Button>
              </div>

              <div ref={parentRef} className="flex-1 overflow-auto">
                {sortedEarthquakes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {loading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <p>Loading earthquakes...</p>
                      </div>
                    ) : error ? (
                      <div className="flex flex-col items-center gap-2">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                        <p>Error loading data</p>
                        <Button variant="outline" size="sm" onClick={onRefresh} className="mt-2">
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Try Again
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <p>No earthquakes found</p>
                        <p className="text-xs">Try adjusting your filters</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const earthquake = sortedEarthquakes[virtualRow.index]
                      return (
                        <div
                          key={earthquake.id}
                          className={cn(
                            "absolute top-0 left-0 w-full p-3 rounded-md cursor-pointer transition-colors",
                            selectedEarthquake?.id === earthquake.id
                              ? "bg-primary/10 border-primary/20 border"
                              : "hover:bg-muted border border-transparent",
                          )}
                          style={{
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                          onClick={() => onEarthquakeSelect(earthquake)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {formatMagnitude(earthquake.properties.mag)}
                              <span className="text-xs text-muted-foreground">
                                {new Date(earthquake.properties.time).toLocaleString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  timeZoneName: "short", // Add timezone name
                                })}
                              </span>
                            </div>
                            {earthquake.properties.tsunami ? (
                              <Badge variant="destructive" className="text-[10px] h-5">
                                Tsunami
                              </Badge>
                            ) : null}
                          </div>
                          <div className="text-sm font-medium line-clamp-2">
                            {earthquake.properties.place || "Unknown location"}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>Depth: {earthquake.geometry.coordinates[2].toFixed(1)} km</span>
                            <span>•</span>
                            <span>Felt: {earthquake.properties.felt || 0} reports</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="filters" className="flex-1 p-4 pt-2">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Historical Data</Label>
                    <Switch checked={filters.isHistorical} onCheckedChange={handleHistoricalToggle} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {filters.isHistorical
                      ? "View earthquakes from a specific date range"
                      : "View recent earthquakes in real-time"}
                  </p>
                </div>

                {!filters.isHistorical ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Time Range</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant={filters.timeRange === "hour" ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleTimeRangeChange("hour")}
                          className="flex items-center gap-1"
                        >
                          <Clock className="h-3 w-3" />
                          Hour
                        </Button>
                        <Button
                          variant={filters.timeRange === "day" ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleTimeRangeChange("day")}
                          className="flex items-center gap-1"
                        >
                          <Clock className="h-3 w-3" />
                          Day
                        </Button>
                        <Button
                          variant={filters.timeRange === "week" ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleTimeRangeChange("week")}
                          className="flex items-center gap-1"
                        >
                          <Clock className="h-3 w-3" />
                          Week
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Date Range</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Start Date</Label>
                          <Input
                            type="date"
                            value={filters.dateRange.startDate}
                            onChange={(e) => handleDateChange("startDate", e.target.value)}
                            max={filters.dateRange.endDate}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">End Date</Label>
                          <Input
                            type="date"
                            value={filters.dateRange.endDate}
                            onChange={(e) => handleDateChange("endDate", e.target.value)}
                            min={filters.dateRange.startDate}
                            max={new Date().toISOString().split("T")[0]} // Limit to today
                          />
                          <p className="text-xs text-muted-foreground">
                            Cannot select future dates. All times are in UTC.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Minimum Magnitude</Label>
                    <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                      {filters.minMagnitude.toFixed(1)}
                    </span>
                  </div>
                  <Slider
                    defaultValue={[filters.minMagnitude]}
                    min={0}
                    max={9}
                    step={0.1}
                    onValueChange={handleMagnitudeChange}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span>9+</span>
                  </div>
                </div>

                <div className="pt-4">
                  <Button className="w-full" onClick={() => setActiveTab("list")}>
                    <Filter className="h-4 w-4 mr-2" />
                    Apply Filters
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
