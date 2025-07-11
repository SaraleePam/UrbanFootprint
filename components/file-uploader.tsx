"use client"

import type React from "react"

import { useState, useCallback, useRef } from "react"
import { Upload, FileJson, MapPin, AlertCircle, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface FileUploaderProps {
  onFileUpload: (fileContent: string) => void
  selectedCity: string
  onCityChange: (city: string) => void
}

export function FileUploader({ onFileUpload, selectedCity, onCityChange }: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragActive, setIsDragActive] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | "info" | null
    message: string
  }>({ type: null, message: "" })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dataFormat, setDataFormat] = useState("android-semantic") // Default to Android semantic

  const onDebug = (message: string) => {
    console.log(`[DEBUG] ${message}`)
  }

  const validateJsonStructure = (
    data: any,
  ): { isValid: boolean; message: string; pointCount: number; detectedFormat: string } => {
    const startTime = performance.now()
    onDebug("Starting JSON validation...")

    try {
      // Use ONLY the manually selected format - NO AUTO-DETECTION
      const selectedFormat = dataFormat
      onDebug(`Using MANUALLY SELECTED format: ${selectedFormat}`)

      if (selectedFormat === "android-semantic") {
        // New Android semanticSegments format validation
        onDebug(`Data type: ${typeof data}`)
        onDebug(`Data is array: ${Array.isArray(data)}`)
        onDebug(`Data keys: ${typeof data === "object" && data !== null ? Object.keys(data).join(", ") : "none"}`)

        if (typeof data !== "object" || data === null) {
          return {
            isValid: false,
            message: "Android semanticSegments JSON must be an object",
            pointCount: 0,
            detectedFormat: selectedFormat,
          }
        }

        if (!data.semanticSegments || !Array.isArray(data.semanticSegments)) {
          return {
            isValid: false,
            message: "No 'semanticSegments' array found in Android format. Found keys: " + Object.keys(data).join(", "),
            pointCount: 0,
            detectedFormat: selectedFormat,
          }
        }

        let validPoints = 0
        const sampleSize = Math.min(data.semanticSegments.length, 10)

        onDebug(`Checking first ${sampleSize} semantic segments for Android structure...`)

        for (let i = 0; i < sampleSize; i++) {
          const segment = data.semanticSegments[i]
          onDebug(`Segment ${i}: ${JSON.stringify(segment, null, 2).substring(0, 200)}...`)

          if (typeof segment === "object" && segment !== null) {
            // Check timelinePath points
            if (segment.timelinePath && Array.isArray(segment.timelinePath)) {
              onDebug(`Found timelinePath with ${segment.timelinePath.length} points`)
              segment.timelinePath.forEach((pathPoint: any, idx: number) => {
                if (pathPoint.point && typeof pathPoint.point === "string") {
                  onDebug(`Timeline point ${idx}: ${pathPoint.point}`)
                  // Check if it contains coordinates in format "13.7859183°, 100.5993268°"
                  if (pathPoint.point.includes("°") && pathPoint.point.includes(",")) {
                    validPoints++
                    onDebug(`Valid timeline point found: ${pathPoint.point}`)
                  }
                }
              })
            }

            // Check visit locations
            if (segment.visit && segment.visit.topCandidate && segment.visit.topCandidate.placeLocation) {
              const placeLocation = segment.visit.topCandidate.placeLocation
              if (placeLocation.latLng && typeof placeLocation.latLng === "string") {
                onDebug(`Visit location: ${placeLocation.latLng}`)
                if (placeLocation.latLng.includes("°") && placeLocation.latLng.includes(",")) {
                  validPoints++
                  onDebug(`Valid visit location found: ${placeLocation.latLng}`)
                }
              }
            }

            // Check activity start/end locations
            if (segment.activity) {
              if (segment.activity.start && segment.activity.start.latLng) {
                onDebug(`Activity start: ${segment.activity.start.latLng}`)
                if (segment.activity.start.latLng.includes("°") && segment.activity.start.latLng.includes(",")) {
                  validPoints++
                  onDebug(`Valid activity start found: ${segment.activity.start.latLng}`)
                }
              }
              if (segment.activity.end && segment.activity.end.latLng) {
                onDebug(`Activity end: ${segment.activity.end.latLng}`)
                if (segment.activity.end.latLng.includes("°") && segment.activity.end.latLng.includes(",")) {
                  validPoints++
                  onDebug(`Valid activity end found: ${segment.activity.end.latLng}`)
                }
              }
            }
          }
        }

        onDebug(`Total valid points found: ${validPoints}`)

        if (validPoints === 0) {
          return {
            isValid: false,
            message:
              "No valid GPS coordinates found in Android semanticSegments format. Expected format: '13.7859183°, 100.5993268°'",
            pointCount: 0,
            detectedFormat: selectedFormat,
          }
        }

        return {
          isValid: true,
          message: `Using Android semanticSegments format! Found ${validPoints} GPS coordinates in first ${sampleSize} segments. Total segments: ${data.semanticSegments.length}`,
          pointCount: validPoints,
          detectedFormat: selectedFormat,
        }
      } else if (selectedFormat === "ios") {
        // iOS format validation
        if (!Array.isArray(data)) {
          onDebug("Validation failed: Data is not an array")
          return {
            isValid: false,
            message: `Expected iOS array format but got ${typeof data}. If this is Android data, please select the correct Android format from the dropdown. Found keys: ${typeof data === "object" && data !== null ? Object.keys(data).join(", ") : "none"}`,
            pointCount: 0,
            detectedFormat: selectedFormat,
          }
        }

        if (data.length === 0) {
          onDebug("Validation failed: Array is empty")
          return { isValid: false, message: "JSON array is empty", pointCount: 0, detectedFormat: selectedFormat }
        }

        let validPoints = 0
        let hasActivityStructure = false
        const sampleSize = Math.min(data.length, 10)

        onDebug(`Checking first ${sampleSize} items for iOS structure...`)

        for (let i = 0; i < sampleSize; i++) {
          const item = data[i]
          if (typeof item === "object" && item !== null) {
            if (item.activity && typeof item.activity === "object") {
              hasActivityStructure = true
              const activity = item.activity

              if (activity.start && typeof activity.start === "string" && activity.start.includes("geo:")) {
                validPoints++
              }
              if (activity.end && typeof activity.end === "string" && activity.end.includes("geo:")) {
                validPoints++
              }
            }
          }
        }

        if (!hasActivityStructure) {
          return {
            isValid: false,
            message:
              'No \'activity\' objects found. Expected iOS structure: [{"activity": {"start": "geo:lat,lng", "end": "geo:lat,lng"}}]',
            pointCount: 0,
            detectedFormat: selectedFormat,
          }
        }

        if (validPoints === 0) {
          return {
            isValid: false,
            message: "No valid GPS coordinates found. Expected format: 'geo:latitude,longitude'",
            pointCount: 0,
            detectedFormat: selectedFormat,
          }
        }

        return {
          isValid: true,
          message: `Using iOS format! Found ${validPoints} GPS coordinates in first ${sampleSize} items. Total items: ${data.length}`,
          pointCount: validPoints,
          detectedFormat: selectedFormat,
        }
      } else {
        // Old Android format validation
        if (typeof data !== "object" || data === null) {
          return {
            isValid: false,
            message: "Android JSON must be an object",
            pointCount: 0,
            detectedFormat: selectedFormat,
          }
        }

        if (!data.timelineObjects || !Array.isArray(data.timelineObjects)) {
          return {
            isValid: false,
            message: "No 'timelineObjects' array found in Android format. Found keys: " + Object.keys(data).join(", "),
            pointCount: 0,
            detectedFormat: selectedFormat,
          }
        }

        let validPoints = 0
        const sampleSize = Math.min(data.timelineObjects.length, 10)

        onDebug(`Checking first ${sampleSize} timeline objects for Android structure...`)

        for (let i = 0; i < sampleSize; i++) {
          const item = data.timelineObjects[i]
          if (typeof item === "object" && item !== null) {
            if (item.placeVisit && item.placeVisit.location) {
              const location = item.placeVisit.location
              if (location.latitudeE7 && location.longitudeE7) {
                validPoints++
              }
            }
            if (item.activitySegment) {
              if (item.activitySegment.startLocation) {
                const startLoc = item.activitySegment.startLocation
                if (startLoc.latitudeE7 && startLoc.longitudeE7) {
                  validPoints++
                }
              }
              if (item.activitySegment.endLocation) {
                const endLoc = item.activitySegment.endLocation
                if (endLoc.latitudeE7 && endLoc.longitudeE7) {
                  validPoints++
                }
              }
            }
          }
        }

        if (validPoints === 0) {
          return {
            isValid: false,
            message: "No valid GPS coordinates found in Android format. Expected latitudeE7/longitudeE7 fields",
            pointCount: 0,
            detectedFormat: selectedFormat,
          }
        }

        return {
          isValid: true,
          message: `Using Android timelineObjects format! Found ${validPoints} GPS coordinates in first ${sampleSize} items. Total timeline objects: ${data.timelineObjects.length}`,
          pointCount: validPoints,
          detectedFormat: selectedFormat,
        }
      }

      const endTime = performance.now()
      onDebug(`Validation completed in ${(endTime - startTime).toFixed(2)}ms`)
    } catch (error) {
      onDebug(`Validation error: ${error}`)
      return { isValid: false, message: `Validation error: ${error}`, pointCount: 0, detectedFormat: dataFormat }
    }
  }

  const handleFile = useCallback(
    (file: File) => {
      if (!file) {
        setUploadStatus({ type: "error", message: "No file selected" })
        return
      }

      onDebug(`File selected: ${file.name}, size: ${file.size} bytes, type: ${file.type}`)

      if (file.type !== "application/json" && !file.name.endsWith(".json")) {
        setUploadStatus({ type: "error", message: "Please select a valid JSON file (.json)" })
        return
      }

      setIsUploading(true)
      setUploadProgress(0)
      setUploadStatus({ type: "info", message: "Reading file..." })

      const reader = new FileReader()

      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(progress)
        }
      }

      reader.onload = () => {
        setUploadProgress(100)
        setUploadStatus({ type: "info", message: "Parsing JSON..." })

        try {
          const content = reader.result as string
          onDebug(`File read successfully, content length: ${content.length} characters`)

          const parseStart = performance.now()
          const jsonData = JSON.parse(content)
          const parseEnd = performance.now()
          onDebug(`JSON parsing completed in ${(parseEnd - parseStart).toFixed(2)}ms`)

          setUploadStatus({ type: "info", message: `Validating data structure using ${dataFormat} format...` })

          const validation = validateJsonStructure(jsonData)

          if (validation.isValid) {
            setUploadStatus({ type: "success", message: validation.message })
            setTimeout(() => {
              setIsUploading(false)
              // Store the data with the selected format
              const dataWithFormat = { content: jsonData, format: dataFormat }
              onFileUpload(JSON.stringify(dataWithFormat))
            }, 1000)
          } else {
            setUploadStatus({ type: "error", message: validation.message })
            setIsUploading(false)
          }
        } catch (error) {
          setUploadStatus({ type: "error", message: `Invalid JSON format: ${error}` })
          setIsUploading(false)
        }
      }

      reader.onerror = () => {
        setIsUploading(false)
        setUploadStatus({ type: "error", message: "Error reading file" })
      }

      reader.readAsText(file)
    },
    [onFileUpload, dataFormat],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragActive(false)

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        handleFile(files[0])
      }
    },
    [handleFile],
  )

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFile(files[0])
      }
    },
    [handleFile],
  )

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const createSampleData = () => {
    onDebug(`Creating sample data for ${selectedCity} in ${dataFormat} format`)

    let sampleData
    if (dataFormat === "ios") {
      sampleData =
        selectedCity === "nyc"
          ? `[{"activity":{"start":"geo:40.7128,-74.0060","end":"geo:40.7589,-73.9851"}},{"activity":{"start":"geo:40.6892,-74.0445","end":"geo:40.7505,-73.9934"}},{"activity":{"start":"geo:40.7831,-73.9712","end":"geo:40.7282,-73.7949"}},{"activity":{"start":"geo:40.6782,-73.9442","end":"geo:40.7614,-73.9776"}}]`
          : `[{"activity":{"start":"geo:13.7563,100.5018","end":"geo:13.7280,100.5240"}},{"activity":{"start":"geo:13.7398,100.5398","end":"geo:13.7658,100.5378"}},{"activity":{"start":"geo:13.7200,100.4900","end":"geo:13.7800,100.5600"}},{"activity":{"start":"geo:13.7100,100.5100","end":"geo:13.7700,100.5500"}}]`
    } else if (dataFormat === "android-semantic") {
      // New Android semanticSegments format sample
      sampleData =
        selectedCity === "nyc"
          ? `{"semanticSegments":[{"timelinePath":[{"point":"40.7128°, -74.0060°","time":"2023-01-01T10:00:00.000Z"}]},{"visit":{"topCandidate":{"placeLocation":{"latLng":"40.7589°, -73.9851°"}}}},{"activity":{"start":{"latLng":"40.6892°, -74.0445°"},"end":{"latLng":"40.7505°, -73.9934°"}}},{"timelinePath":[{"point":"40.7831°, -73.9712°","time":"2023-01-01T12:00:00.000Z"}]}]}`
          : `{"semanticSegments":[{"timelinePath":[{"point":"13.7563°, 100.5018°","time":"2023-01-01T10:00:00.000Z"}]},{"visit":{"topCandidate":{"placeLocation":{"latLng":"13.7280°, 100.5240°"}}}},{"activity":{"start":{"latLng":"13.7398°, 100.5398°"},"end":{"latLng":"13.7658°, 100.5378°"}}},{"timelinePath":[{"point":"13.7200°, 100.4900°","time":"2023-01-01T12:00:00.000Z"}]}]}`
    } else {
      // Old Android format sample
      sampleData =
        selectedCity === "nyc"
          ? `{"timelineObjects":[{"placeVisit":{"location":{"latitudeE7":407128000,"longitudeE7":-740060000}}},{"activitySegment":{"startLocation":{"latitudeE7":406892000,"longitudeE7":-740445000},"endLocation":{"latitudeE7":407505000,"longitudeE7":-739934000}}},{"placeVisit":{"location":{"latitudeE7":407831000,"longitudeE7":-739712000}}},{"activitySegment":{"startLocation":{"latitudeE7":406782000,"longitudeE7":-739442000},"endLocation":{"latitudeE7":407614000,"longitudeE7":-739776000}}}]}`
          : `{"timelineObjects":[{"placeVisit":{"location":{"latitudeE7":137563000,"longitudeE7":1005018000}}},{"activitySegment":{"startLocation":{"latitudeE7":137398000,"longitudeE7":1005398000},"endLocation":{"latitudeE7":137658000,"longitudeE7":1005378000}}},{"placeVisit":{"location":{"latitudeE7":137200000,"longitudeE7":1004900000}}},{"activitySegment":{"startLocation":{"latitudeE7":137100000,"longitudeE7":1005100000},"endLocation":{"latitudeE7":137700000,"longitudeE7":1005500000}}}]}`
    }

    const blob = new Blob([sampleData], { type: "application/json" })
    const file = new File([blob], `sample-${selectedCity}-${dataFormat}-data.json`, { type: "application/json" })
    handleFile(file)
  }

  return (
    <div className="space-y-4">
      <Alert>
        <MapPin className="h-4 w-4" />
        <AlertDescription>
          This tool visualizes GPS location history data in JSON format. Choose between NYC or Bangkok area locations.
          Upload your location history JSON file to see your GPS points plotted on a map.
        </AlertDescription>
      </Alert>

      <div className="flex items-center gap-4">
        <label htmlFor="city-select" className="text-sm font-medium">
          Visualization Area:
        </label>
        <select
          value={selectedCity}
          onChange={(e) => onCityChange(e.target.value)}
          className="flex h-10 w-48 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="nyc">New York City (NYC)</option>
          <option value="bkk">Bangkok (BKK)</option>
        </select>
      </div>

      <div className="flex items-center gap-4">
        <label htmlFor="data-format" className="text-sm font-medium">
          Data Format (Manual Selection):
        </label>
        <select
          value={dataFormat}
          onChange={(e) => setDataFormat(e.target.value)}
          className="flex h-10 w-72 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="ios">iPhone/iOS Format (location-history.json)</option>
          <option value="android">Android Format (Timeline.json - old)</option>
          <option value="android-semantic">Android Format (semanticSegments - new)</option>
        </select>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileInputChange}
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center gap-2">
          {isDragActive ? (
            <>
              <Upload className="h-10 w-10 text-primary animate-pulse" />
              <p className="text-lg font-medium">Drop your location history JSON file here</p>
            </>
          ) : (
            <>
              <FileJson className="h-10 w-10 text-muted-foreground" />
              <p className="text-lg font-medium">Drag & drop your location history JSON file here</p>
              <p className="text-sm text-muted-foreground">or click to select a file</p>
              <p className="text-sm text-muted-foreground">
                Selected format:{" "}
                <strong>
                  {dataFormat === "android-semantic"
                    ? "Android semanticSegments"
                    : dataFormat === "android"
                      ? "Android timelineObjects"
                      : "iPhone/iOS"}
                </strong>
              </p>
            </>
          )}
        </div>
      </div>

      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Processing...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {uploadStatus.type && (
        <Alert
          className={
            uploadStatus.type === "error"
              ? "border-red-500 bg-red-50"
              : uploadStatus.type === "success"
                ? "border-green-500 bg-green-50"
                : "border-blue-500 bg-blue-50"
          }
        >
          {uploadStatus.type === "error" ? (
            <AlertCircle className="h-4 w-4 text-red-600" />
          ) : uploadStatus.type === "success" ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <MapPin className="h-4 w-4 text-blue-600" />
          )}
          <AlertDescription
            className={
              uploadStatus.type === "error"
                ? "text-red-800"
                : uploadStatus.type === "success"
                  ? "text-green-800"
                  : "text-blue-800"
            }
          >
            {uploadStatus.message}
          </AlertDescription>
        </Alert>
      )}

      <div className="text-sm text-muted-foreground space-y-2">
        <p>
          <strong>Test with sample data:</strong>
        </p>
        <button
          onClick={() => {
            createSampleData()
          }}
          className="text-blue-600 hover:text-blue-800 underline"
        >
          Click here to test with sample {selectedCity.toUpperCase()} data (
          {dataFormat === "android-semantic"
            ? "Android semanticSegments"
            : dataFormat === "android"
              ? "Android timelineObjects"
              : "iPhone/iOS"}{" "}
          format)
        </button>
      </div>
    </div>
  )
}
