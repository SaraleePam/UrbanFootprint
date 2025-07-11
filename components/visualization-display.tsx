"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, RefreshCw, AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface VisualizationDisplayProps {
  data: any
  visualizeFunction: (data: any, element: HTMLElement, city: string) => void
  selectedCity: string
}

export function VisualizationDisplay({ data, visualizeFunction, selectedCity }: VisualizationDisplayProps) {
  const visualizationRef = useRef<HTMLDivElement>(null)
  const [isRendering, setIsRendering] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (visualizationRef.current && data) {
      try {
        setIsRendering(true)
        setError(null)

        // Clear previous visualization
        visualizationRef.current.innerHTML = ""

        // Apply the visualization function
        visualizeFunction(data, visualizationRef.current, selectedCity)

        setIsRendering(false)
      } catch (err) {
        setError("Error rendering visualization. Check console for details.")
        setIsRendering(false)
        console.error("Visualization error:", err)
      }
    }
  }, [data, visualizeFunction, selectedCity])

  const handleDownload = async () => {
    if (visualizationRef.current) {
      try {
        const svgElement = visualizationRef.current.querySelector("svg")
        if (svgElement) {
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")
          if (!ctx) return

          canvas.width = svgElement.clientWidth || 800
          canvas.height = svgElement.clientHeight || 600

          const svgData = new XMLSerializer().serializeToString(svgElement)
          const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
          const svgUrl = URL.createObjectURL(svgBlob)

          const img = new Image()
          img.crossOrigin = "anonymous"
          img.onload = () => {
            ctx.fillStyle = "white"
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(img, 0, 0)

            const link = document.createElement("a")
            link.download = `gps-visualization-${selectedCity}-${new Date().toISOString().split("T")[0]}.png`
            link.href = canvas.toDataURL("image/png")
            link.click()

            URL.revokeObjectURL(svgUrl)
          }
          img.src = svgUrl
        }
      } catch (err) {
        console.error("Error downloading image:", err)
        alert("Failed to download image. Please try again.")
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Visualization Result</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (visualizationRef.current && data) {
                setIsRendering(true)
                setTimeout(() => {
                  visualizationRef.current!.innerHTML = ""
                  visualizeFunction(data, visualizationRef.current!, selectedCity)
                  setIsRendering(false)
                }, 100)
              }
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="default" size="sm" onClick={handleDownload} disabled={isRendering || !!error}>
            <Download className="h-4 w-4 mr-2" />
            Download PNG
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {isRendering ? (
            <div className="flex flex-col justify-center items-center h-[400px] gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Processing GPS data...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col justify-center items-center h-[400px] gap-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <p className="text-red-500 text-center">{error}</p>
            </div>
          ) : (
            <div ref={visualizationRef} className="visualization-container min-h-[400px] w-full"></div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
