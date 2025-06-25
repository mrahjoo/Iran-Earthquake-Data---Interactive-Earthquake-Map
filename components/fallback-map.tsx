"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"

export default function FallbackMap() {
  const [retrying, setRetrying] = useState(false)

  const handleRetry = () => {
    setRetrying(true)
    window.location.reload()
  }

  return (
    <div className="flex items-center justify-center w-full h-full bg-muted/20">
      <div className="text-center p-6 max-w-md">
        <div className="mb-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-bold">Loading Map</h3>
          <p className="text-muted-foreground mt-2">The map is taking longer than expected to load.</p>
        </div>

        {!retrying && (
          <button onClick={handleRetry} className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
            Retry Loading
          </button>
        )}
      </div>
    </div>
  )
}

