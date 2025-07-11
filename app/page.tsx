"use client"

import React, { useState, useRef, useCallback } from "react"
import mapboxgl from "mapbox-gl"

export default function Home() {
  const [jsonData, setJsonData] = useState<any>(null)
  const [visualizationReady, setVisualizationReady] = useState(false)
  const [activeTab, setActiveTab] = useState("upload")
  const [selectedCity, setSelectedCity] = useState("")
  const [dataFormat, setDataFormat] = useState("")
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [showVisualization, setShowVisualization] = useState(false)
  const [cityDataStatus, setCityDataStatus] = useState<{ [key: string]: boolean }>({})

  const addDebugInfo = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugInfo((prev) => [...prev, `[${timestamp}] ${message}`])
    console.log(`[DEBUG] ${message}`)
  }, [])

  const handleFileUpload = useCallback(
    async (fileContent: string) => {
      try {
        addDebugInfo("Starting file upload processing...")
        const parsedData = JSON.parse(fileContent)
        addDebugInfo(
          `JSON parsed successfully. Type: ${typeof parsedData}, Length: ${Array.isArray(parsedData) ? parsedData.length : "not array"}`,
        )

        setJsonData(parsedData)
        setVisualizationReady(true)
        addDebugInfo("File upload completed")
      } catch (error) {
        addDebugInfo(`JSON parsing failed: ${error}`)
        console.error("Error parsing JSON:", error)
        alert("Invalid JSON file. Please upload a valid JSON file.")
      }
    },
    [addDebugInfo],
  )

  const handleStartVisualization = () => {
    if (jsonData && selectedCity && dataFormat && (cityDataStatus[selectedCity] || selectedCity === "world")) {
      setShowVisualization(true)
      setActiveTab("visualization")
      addDebugInfo("Starting visualization...")
    }
  }

  const canStartVisualization =
    visualizationReady && selectedCity && dataFormat && (cityDataStatus[selectedCity] || selectedCity === "world")

  const RotatingText = () => {
    const text = "Upload your Google Maps location history and discover your real footprint across cities. "
    const radius = 120 // Increased radius to accommodate full text
    const circumference = 2 * Math.PI * radius
    const textLength = text.length
    const angleStep = 360 / textLength

    return (
      <div className="rotating-text">
        <svg viewBox="0 0 320 320">
          <defs>
            <path
              id="circle-path"
              d={`M 160,160 m -${radius},0 a ${radius},${radius} 0 1,1 ${radius * 2},0 a ${radius},${radius} 0 1,1 -${radius * 2},0`}
            />
          </defs>
          <text>
            <textPath href="#circle-path" startOffset="0%">
              {text}
            </textPath>
          </text>
        </svg>
      </div>
    )
  }

  const clearData = () => {
    setJsonData(null)
    setVisualizationReady(false)
    setCityDataStatus({})
  }

  return (
    <div className="container">
      <RotatingText />

      <header style={{ marginBottom: "60px" }}>
        <h1 className="main-title">my urban footprint</h1>
      </header>

      <div className="tabs">
        <button
          className={`tab-button ${activeTab === "upload" ? "active" : ""}`}
          onClick={() => setActiveTab("upload")}
        >
          upload data
        </button>
        <button
          className={`tab-button ${activeTab === "visualization" ? "active" : ""}`}
          onClick={() => setActiveTab("visualization")}
          disabled={!showVisualization}
        >
          your footprint
        </button>
      </div>

      {activeTab === "upload" && (
        <FileUploader
          onFileUpload={handleFileUpload}
          selectedCity={selectedCity}
          onCityChange={setSelectedCity}
          dataFormat={dataFormat}
          onDataFormatChange={setDataFormat}
          onDebug={addDebugInfo}
          canStartVisualization={canStartVisualization}
          onStartVisualization={handleStartVisualization}
          jsonData={jsonData}
          cityDataStatus={cityDataStatus}
          setCityDataStatus={setCityDataStatus}
          onClearData={clearData}
        />
      )}

      {activeTab === "visualization" && showVisualization && jsonData && (
        <MapboxVisualization
          data={jsonData}
          selectedCity={selectedCity}
          dataFormat={dataFormat}
          onDebug={addDebugInfo}
        />
      )}

      <footer className="footer">
        <div className="footer-content">
          <span>This app does not collect or store any personal data.</span>
          <span>
            Contact: <a href="mailto:saralee-sit@hotmail.com">saralee-sit@hotmail.com</a>
          </span>
          <span>© 2025 Saralee S. All rights reserved.</span>
        </div>
      </footer>
    </div>
  )
}

interface FileUploaderProps {
  onFileUpload: (fileContent: string) => void
  selectedCity: string
  onCityChange: (city: string) => void
  dataFormat: string
  onDataFormatChange: (format: string) => void
  onDebug: (message: string) => void
  canStartVisualization: boolean
  onStartVisualization: () => void
  jsonData: any
  cityDataStatus: { [key: string]: boolean }
  setCityDataStatus: (status: { [key: string]: boolean }) => void
  onClearData: () => void
}

function FileUploader({
  onFileUpload,
  selectedCity,
  onCityChange,
  dataFormat,
  onDataFormatChange,
  onDebug,
  canStartVisualization,
  onStartVisualization,
  jsonData,
  cityDataStatus,
  setCityDataStatus,
  onClearData,
}: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragActive, setIsDragActive] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | "info" | null
    message: string
  }>({
    type: null,
    message: "",
  })
  const [uploadedFileName, setUploadedFileName] = useState<string>("")
  const [uploadedFileSize, setUploadedFileSize] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const CITY_BOUNDS = {
    amsterdam: {
      lat_min: 52.3,
      lat_max: 52.4,
      lng_min: 4.8,
      lng_max: 5.0,
      name: "Amsterdam",
    },
    barcelona: {
      lat_min: 41.3,
      lat_max: 41.4,
      lng_min: 2.1,
      lng_max: 2.2,
      name: "Barcelona",
    },
    beijing: {
      lat_min: 39.8,
      lat_max: 40.0,
      lng_min: 116.3,
      lng_max: 116.5,
      name: "Beijing",
    },
    berlin: {
      lat_min: 52.4,
      lat_max: 52.6,
      lng_min: 13.3,
      lng_max: 13.5,
      name: "Berlin",
    },
    bkk: {
      lat_min: 13.6,
      lat_max: 13.9,
      lng_min: 100.3,
      lng_max: 100.7,
      name: "Bangkok",
    },
    copenhagen: {
      lat_min: 55.6,
      lat_max: 55.8,
      lng_min: 12.4,
      lng_max: 12.7,
      name: "Copenhagen",
    },
    delhi: {
      lat_min: 28.4,
      lat_max: 28.8,
      lng_min: 77.0,
      lng_max: 77.3,
      name: "Delhi",
    },
    helsinki: {
      lat_min: 60.1,
      lat_max: 60.2,
      lng_min: 24.9,
      lng_max: 25.0,
      name: "Helsinki",
    },
    hongkong: {
      lat_min: 22.2,
      lat_max: 22.4,
      lng_min: 114.1,
      lng_max: 114.3,
      name: "Hong Kong",
    },
    la: {
      lat_min: 33.7,
      lat_max: 34.3,
      lng_min: -118.7,
      lng_max: -118.0,
      name: "Los Angeles",
    },
    lisbon: {
      lat_min: 38.7,
      lat_max: 38.8,
      lng_min: -9.2,
      lng_max: -9.1,
      name: "Lisbon",
    },
    london: {
      lat_min: 51.4,
      lat_max: 51.6,
      lng_min: -0.2,
      lng_max: 0.1,
      name: "London",
    },
    melbourne: {
      lat_min: -37.9,
      lat_max: -37.7,
      lng_min: 144.9,
      lng_max: 145.0,
      name: "Melbourne",
    },
    mexico: {
      lat_min: 19.2,
      lat_max: 19.6,
      lng_min: -99.3,
      lng_max: -99.0,
      name: "Mexico City",
    },
    milan: {
      lat_min: 45.4,
      lat_max: 45.5,
      lng_min: 9.1,
      lng_max: 9.3,
      name: "Milan",
    },
    montreal: {
      lat_min: 45.4,
      lat_max: 45.6,
      lng_min: -73.7,
      lng_max: -73.5,
      name: "Montreal",
    },
    mumbai: {
      lat_min: 18.9,
      lat_max: 19.3,
      lng_min: 72.7,
      lng_max: 73.1,
      name: "Mumbai",
    },
    nyc: {
      lat_min: 40.5,
      lat_max: 41.0,
      lng_min: -74.25,
      lng_max: -73.75,
      name: "New York City",
    },
    osaka: {
      lat_min: 34.5,
      lat_max: 34.8,
      lng_min: 135.3,
      lng_max: 135.7,
      name: "Osaka",
    },
    paris: {
      lat_min: 48.8,
      lat_max: 48.9,
      lng_min: 2.2,
      lng_max: 2.5,
      name: "Paris",
    },
    prague: {
      lat_min: 50.0,
      lat_max: 50.1,
      lng_min: 14.4,
      lng_max: 14.5,
      name: "Prague",
    },
    rome: {
      lat_min: 41.8,
      lat_max: 41.9,
      lng_min: 12.4,
      lng_max: 12.6,
      name: "Rome",
    },
    saopaulo: {
      lat_min: -23.8,
      lat_max: -23.3,
      lng_min: -46.8,
      lng_max: -46.4,
      name: "São Paulo",
    },
    seoul: {
      lat_min: 37.4,
      lat_max: 37.7,
      lng_min: 126.8,
      lng_max: 127.2,
      name: "Seoul",
    },
    shanghai: {
      lat_min: 31.1,
      lat_max: 31.3,
      lng_min: 121.4,
      lng_max: 121.6,
      name: "Shanghai",
    },
    singapore: {
      lat_min: 1.2,
      lat_max: 1.4,
      lng_min: 103.8,
      lng_max: 104.0,
      name: "Singapore",
    },
    stockholm: {
      lat_min: 59.3,
      lat_max: 59.4,
      lng_min: 18.0,
      lng_max: 18.1,
      name: "Stockholm",
    },
    sydney: {
      lat_min: -33.9,
      lat_max: -33.8,
      lng_min: 151.1,
      lng_max: 151.3,
      name: "Sydney",
    },
    tokyo: {
      lat_min: 35.6,
      lat_max: 35.8,
      lng_min: 139.6,
      lng_max: 139.8,
      name: "Tokyo",
    },
    vienna: {
      lat_min: 48.1,
      lat_max: 48.3,
      lng_min: 16.3,
      lng_max: 16.4,
      name: "Vienna",
    },
    zurich: {
      lat_min: 47.3,
      lat_max: 47.4,
      lng_min: 8.5,
      lng_max: 8.6,
      name: "Zurich",
    },
  }

  const parseGeoString = (geoString: string): { lat: number; lng: number } | null => {
    if (!geoString || typeof geoString !== "string" || !geoString.startsWith("geo:")) {
      return null
    }

    const coords = geoString.substring(4)
    const parts = coords.split(",")

    if (parts.length !== 2) {
      return null
    }

    const lat = Number.parseFloat(parts[0])
    const lng = Number.parseFloat(parts[1])

    if (isNaN(lat) || isNaN(lng)) {
      return null
    }

    return { lat, lng }
  }

  const parseDegreeString = (degreeString: string): { lat: number; lng: number } | null => {
    if (!degreeString || typeof degreeString !== "string") {
      return null
    }

    const cleanString = degreeString.replace(/°/g, "").trim()
    const parts = cleanString.split(",")

    if (parts.length !== 2) {
      return null
    }

    const lat = Number.parseFloat(parts[0].trim())
    const lng = Number.parseFloat(parts[1].trim())

    if (isNaN(lat) || isNaN(lng)) {
      return null
    }

    return { lat, lng }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const checkCityDataPoints = useCallback((data: any, format: string) => {
    if (!data || !format) return {}

    const cityStatus: { [key: string]: boolean } = {}

    // Extract all GPS points from the data
    const gpsPoints: Array<{ lat: number; lng: number }> = []

    if (format === "android-semantic") {
      if (data.semanticSegments && Array.isArray(data.semanticSegments)) {
        data.semanticSegments.forEach((segment: any) => {
          if (typeof segment === "object" && segment !== null) {
            if (segment.timelinePath && Array.isArray(segment.timelinePath)) {
              segment.timelinePath.forEach((pathPoint: any) => {
                if (pathPoint.point && typeof pathPoint.point === "string") {
                  const coords = parseDegreeString(pathPoint.point)
                  if (coords) {
                    gpsPoints.push(coords)
                  }
                }
              })
            }

            if (segment.visit && segment.visit.topCandidate && segment.visit.topCandidate.placeLocation) {
              const placeLocation = segment.visit.topCandidate.placeLocation
              if (placeLocation.latLng && typeof placeLocation.latLng === "string") {
                const coords = parseDegreeString(placeLocation.latLng)
                if (coords) {
                  gpsPoints.push(coords)
                }
              }
            }

            if (segment.activity) {
              if (segment.activity.start && segment.activity.start.latLng) {
                const coords = parseDegreeString(segment.activity.start.latLng)
                if (coords) {
                  gpsPoints.push(coords)
                }
              }
              if (segment.activity.end && segment.activity.end.latLng) {
                const coords = parseDegreeString(segment.activity.end.latLng)
                if (coords) {
                  gpsPoints.push(coords)
                }
              }
            }
          }
        })
      }
    } else if (format === "ios") {
      if (Array.isArray(data)) {
        data.forEach((item) => {
          if (typeof item === "object" && item !== null && item.activity) {
            const activity = item.activity
            const keys = ["start", "end"]

            keys.forEach((key) => {
              const latlng = activity[key]
              if (latlng) {
                const coords = parseGeoString(latlng)
                if (coords) {
                  gpsPoints.push(coords)
                }
              }
            })
          }
        })
      }
    }

    // Check each city for data points
    Object.keys(CITY_BOUNDS).forEach((cityKey) => {
      const bounds = CITY_BOUNDS[cityKey as keyof typeof CITY_BOUNDS]
      const filteredPoints = gpsPoints.filter(
        (point) =>
          point.lat >= bounds.lat_min &&
          point.lat <= bounds.lat_max &&
          point.lng >= bounds.lng_min &&
          point.lng <= bounds.lng_max,
      )
      cityStatus[cityKey] = filteredPoints.length > 0
    })

    // World view is always available if there are any GPS points
    cityStatus["world"] = gpsPoints.length > 0

    return cityStatus
  }, [])

  const validateJsonStructure = (
    data: any,
  ): { isValid: boolean; message: string; pointCount: number; detectedFormat: string } => {
    const startTime = performance.now()
    onDebug("Starting JSON validation...")

    try {
      const selectedFormat = dataFormat
      onDebug(`Using MANUALLY SELECTED format: ${selectedFormat}`)

      if (selectedFormat === "android-semantic") {
        if (typeof data !== "object" || data === null) {
          return {
            isValid: false,
            message: "the data is not in the Android format",
            pointCount: 0,
            detectedFormat: selectedFormat,
          }
        }

        if (!data.semanticSegments || !Array.isArray(data.semanticSegments)) {
          return {
            isValid: false,
            message: "the data is not in the Android format",
            pointCount: 0,
            detectedFormat: selectedFormat,
          }
        }

        if (data.semanticSegments.length === 0) {
          return {
            isValid: false,
            message:
              "your file is empty - looks like you have your location history off or have the history auto-delete on",
            pointCount: 0,
            detectedFormat: selectedFormat,
          }
        }

        let validPoints = 0
        const sampleSize = Math.min(data.semanticSegments.length, 10)

        for (let i = 0; i < sampleSize; i++) {
          const segment = data.semanticSegments[i]
          if (typeof segment === "object" && segment !== null) {
            if (segment.timelinePath && Array.isArray(segment.timelinePath)) {
              segment.timelinePath.forEach((pathPoint: any) => {
                if (pathPoint.point && typeof pathPoint.point === "string") {
                  if (pathPoint.point.includes("°") && pathPoint.point.includes(",")) {
                    validPoints++
                  }
                }
              })
            }

            if (segment.visit && segment.visit.topCandidate && segment.visit.topCandidate.placeLocation) {
              const placeLocation = segment.visit.topCandidate.placeLocation
              if (placeLocation.latLng && typeof placeLocation.latLng === "string") {
                if (placeLocation.latLng.includes("°") && placeLocation.latLng.includes(",")) {
                  validPoints++
                }
              }
            }

            if (segment.activity) {
              if (segment.activity.start && segment.activity.start.latLng) {
                if (segment.activity.start.latLng.includes("°") && segment.activity.start.latLng.includes(",")) {
                  validPoints++
                }
              }
              if (segment.activity.end && segment.activity.end.latLng) {
                if (segment.activity.end.latLng.includes("°") && segment.activity.end.latLng.includes(",")) {
                  validPoints++
                }
              }
            }
          }
        }

        if (validPoints === 0) {
          return {
            isValid: false,
            message: "no valid gps coordinates found in Android format",
            pointCount: 0,
            detectedFormat: selectedFormat,
          }
        }

        // Check city data points after successful validation
        const cityStatus = checkCityDataPoints(data, selectedFormat)
        setCityDataStatus(cityStatus)

        return {
          isValid: true,
          message: `using Android format! found ${validPoints} gps coordinates in first ${sampleSize} segments. total segments: ${data.semanticSegments.length}`,
          pointCount: validPoints,
          detectedFormat: selectedFormat,
        }
      } else if (selectedFormat === "ios") {
        if (!Array.isArray(data)) {
          return {
            isValid: false,
            message: "the data is not in the iOS format",
            pointCount: 0,
            detectedFormat: selectedFormat,
          }
        }

        if (data.length === 0) {
          return {
            isValid: false,
            message:
              "your file is empty - looks like you have your location history off or have the history auto-delete on",
            pointCount: 0,
            detectedFormat: selectedFormat,
          }
        }

        let validPoints = 0
        let hasActivityStructure = false
        const sampleSize = Math.min(data.length, 10)

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
            message: "no 'activity' objects found. expected ios structure",
            pointCount: 0,
            detectedFormat: selectedFormat,
          }
        }

        if (validPoints === 0) {
          return {
            isValid: false,
            message: "no valid gps coordinates found. expected format: 'geo:latitude,longitude'",
            pointCount: 0,
            detectedFormat: selectedFormat,
          }
        }

        // Check city data points after successful validation
        const cityStatus = checkCityDataPoints(data, selectedFormat)
        setCityDataStatus(cityStatus)

        return {
          isValid: true,
          message: `using ios format! found ${validPoints} gps coordinates in first ${sampleSize} items. total items: ${data.length}`,
          pointCount: validPoints,
          detectedFormat: selectedFormat,
        }
      }

      const endTime = performance.now()
      onDebug(`Validation completed in ${(endTime - startTime).toFixed(2)}ms`)
      return { isValid: false, message: "unknown format", pointCount: 0, detectedFormat: dataFormat }
    } catch (error) {
      onDebug(`Validation error: ${error}`)
      return { isValid: false, message: `validation error: ${error}`, pointCount: 0, detectedFormat: dataFormat }
    }
  }

  // Re-check city data when city selection changes
  React.useEffect(() => {
    if (jsonData && dataFormat) {
      const cityStatus = checkCityDataPoints(jsonData.content || jsonData, dataFormat)
      setCityDataStatus(cityStatus)
    }
  }, [selectedCity, jsonData, dataFormat, checkCityDataPoints, setCityDataStatus])

  const handleFile = useCallback(
    (file: File) => {
      if (!file) {
        setUploadStatus({ type: "error", message: "no file selected" })
        return
      }

      if (file.type !== "application/json" && !file.name.endsWith(".json")) {
        setUploadStatus({ type: "error", message: "please select a valid json file (.json)" })
        return
      }

      // Store file info
      setUploadedFileName(file.name)
      setUploadedFileSize(formatFileSize(file.size))

      setIsUploading(true)
      setUploadProgress(0)
      setUploadStatus({ type: "info", message: "reading file..." })

      const reader = new FileReader()

      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(progress)
        }
      }

      reader.onload = () => {
        setUploadProgress(100)
        setUploadStatus({ type: "info", message: "parsing json..." })

        try {
          const content = reader.result as string
          const jsonData = JSON.parse(content)

          // Store the raw JSON data without format validation initially
          const dataWithFormat = { content: jsonData, format: dataFormat || "unknown" }
          onFileUpload(JSON.stringify(dataWithFormat))

          if (dataFormat) {
            setUploadStatus({ type: "info", message: `validating data structure using ${dataFormat} format...` })
            const validation = validateJsonStructure(jsonData)

            if (validation.isValid) {
              setUploadStatus({ type: "success", message: validation.message })
            } else {
              setUploadStatus({ type: "error", message: validation.message })
            }
          } else {
            setUploadStatus({
              type: "success",
              message: "JSON file uploaded successfully. Please select a data format to validate.",
            })
          }

          setIsUploading(false)
        } catch (error) {
          setUploadStatus({ type: "error", message: `invalid json format: ${error}` })
          setIsUploading(false)
        }
      }

      reader.onerror = () => {
        setIsUploading(false)
        setUploadStatus({ type: "error", message: "error reading file" })
      }

      reader.readAsText(file)
    },
    [onFileUpload, dataFormat, onDebug],
  )

  // Re-validate when format changes
  React.useEffect(() => {
    // run only when we have data + a chosen format
    if (!jsonData || !dataFormat) return

    // If jsonData is already wrapped with the same format, avoid re-upload to break the loop
    const isWrapped = typeof jsonData === "object" && jsonData !== null && "format" in jsonData
    const formatMatches = isWrapped && (jsonData as any).format === dataFormat

    // Determine the raw data to validate
    const actualData = isWrapped ? (jsonData as any).content : jsonData

    // Validate structure & update local feedback
    setUploadStatus({
      type: "info",
      message: `validating data structure using ${dataFormat} format...`,
    })

    const validation = validateJsonStructure(actualData)

    if (validation.isValid) {
      setUploadStatus({ type: "success", message: validation.message })

      /*  Only re-dispatch to the parent if
          1. the data was NOT wrapped yet  OR
          2. the wrapped format has changed.
          This prevents the “Maximum update depth exceeded” loop. */
      if (!formatMatches) {
        const dataWithFormat = { content: actualData, format: dataFormat }
        onFileUpload(JSON.stringify(dataWithFormat))
      }
    } else {
      setUploadStatus({ type: "error", message: validation.message })
    }
  }, [dataFormat, jsonData, onFileUpload])

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

  const handleRemoveFile = useCallback(() => {
    setUploadedFileName("")
    setUploadedFileSize("")
    setUploadStatus({ type: null, message: "" })
    onClearData()
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [onClearData])

  const hasDataForSelectedCity = selectedCity && (cityDataStatus[selectedCity] || selectedCity === "world")

  return (
    <div>
      <div className="section-card">
        <h3 className="section-title">HOW TO EXPORT YOUR DATA</h3>

        <div className="grid-responsive">
          <div>
            <h4 className="subsection-title">iPhone/iOS</h4>
            <ol className="instruction-list">
              <li>Open Google Maps app</li>
              <li>Tap your profile picture icon (top right)</li>
              <li>Go to Settings</li>
              <li>Select "Personal content"</li>
              <li>Tap "Export timeline data"</li>
              <li>Download the JSON file and upload it here</li>
            </ol>
          </div>

          <div>
            <h4 className="subsection-title">Android</h4>
            <ol className="instruction-list">
              <li>Open Google Maps app</li>
              <li>Tap your profile picture icon (top right)</li>
              <li>Go to Settings</li>
              <li>Select "Google location settings"</li>
              <li>Tap "Location service"</li>
              <li>Select "Timeline"</li>
              <li>Tap "Export your timeline data"</li>
              <li>Download the JSON file and upload it here</li>
            </ol>
          </div>
        </div>

        <p
          style={{
            fontSize: "14px",
            fontWeight: "300",
            color: "#666",
            marginTop: "24px",
            fontStyle: "italic",
            textAlign: "center",
          }}
        >
          Note: If you never allowed Google to record your location history, your data file will be empty and there
          won't be anything to visualize. Some users may also have auto-delete settings enabled, which can remove past
          data every few months. Sorry about that!
        </p>
      </div>

      <div className="section-card">
        <div className="grid-responsive" style={{ marginBottom: "32px" }}>
          <div className="form-group">
            <label className="form-label">DATA FORMAT</label>
            <select
              value={dataFormat}
              onChange={(e) => onDataFormatChange(e.target.value)}
              className="select"
              style={{
                borderColor: !dataFormat ? "#d63384" : "#1a1a1a",
                backgroundColor: !dataFormat ? "#fdf2f8" : "white",
              }}
            >
              <option value="">Select format</option>
              <option value="ios">iPhone/iOS format (location-history.json)</option>
              <option value="android-semantic">Android format (semanticSegments)</option>
            </select>
            {!dataFormat && <span className="required-indicator">required</span>}
          </div>

          <div className="form-group">
            <label className="form-label">VISUALIZATION AREA</label>
            <select
              value={selectedCity}
              onChange={(e) => onCityChange(e.target.value)}
              className="select"
              style={{
                borderColor: !selectedCity ? "#d63384" : "#1a1a1a",
                backgroundColor: !selectedCity ? "#fdf2f8" : "white",
              }}
            >
              <option value="">Select area</option>
              <option value="world">🌍 World Map (All GPS Points)</option>
              <option value="amsterdam">Amsterdam</option>
              <option value="barcelona">Barcelona</option>
              <option value="beijing">Beijing</option>
              <option value="berlin">Berlin</option>
              <option value="bkk">Bangkok</option>
              <option value="copenhagen">Copenhagen</option>
              <option value="delhi">Delhi</option>
              <option value="helsinki">Helsinki</option>
              <option value="hongkong">Hong Kong</option>
              <option value="la">Los Angeles</option>
              <option value="lisbon">Lisbon</option>
              <option value="london">London</option>
              <option value="melbourne">Melbourne</option>
              <option value="mexico">Mexico City</option>
              <option value="milan">Milan</option>
              <option value="montreal">Montreal</option>
              <option value="mumbai">Mumbai</option>
              <option value="nyc">New York City</option>
              <option value="osaka">Osaka</option>
              <option value="paris">Paris</option>
              <option value="prague">Prague</option>
              <option value="rome">Rome</option>
              <option value="saopaulo">São Paulo</option>
              <option value="seoul">Seoul</option>
              <option value="shanghai">Shanghai</option>
              <option value="singapore">Singapore</option>
              <option value="stockholm">Stockholm</option>
              <option value="sydney">Sydney</option>
              <option value="tokyo">Tokyo</option>
              <option value="vienna">Vienna</option>
              <option value="zurich">Zurich</option>
            </select>
            {!selectedCity && <span className="required-indicator">required</span>}
            {selectedCity && selectedCity !== "world" && !hasDataForSelectedCity && jsonData && (
              <p style={{ fontSize: "12px", color: "#d63384", marginTop: "4px" }}>
                No data points found for {CITY_BOUNDS[selectedCity as keyof typeof CITY_BOUNDS]?.name}. Try selecting a
                different city or use World Map to see all your GPS points.
              </p>
            )}
          </div>
        </div>

        {/* Upload Area - Changes based on whether file is uploaded */}
        {!uploadedFileName ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            className={`upload-area ${isDragActive ? "drag-active" : ""}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center">
              {isDragActive ? (
                <>
                  <div className="upload-icon">⬆️</div>
                  <p className="upload-text">drop your location history json file here</p>
                </>
              ) : (
                <>
                  <div className="upload-icon">⬆️</div>
                  <p className="upload-text">drag & drop your location history json file here</p>
                  <p className="upload-subtext">or click to select a file</p>
                  {dataFormat && (
                    <p className="upload-subtext" style={{ marginTop: "8px" }}>
                      selected format: {dataFormat === "android-semantic" ? "android" : "iphone/ios"}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <div
            className="upload-area"
            style={{ backgroundColor: "#f5f5f5", borderColor: "#1a1a1a", borderWidth: "3px" }}
          >
            <div className="flex flex-col items-center justify-center">
              <div style={{ fontSize: "32px", marginBottom: "16px", color: "#1a1a1a" }}>✅</div>
              <p className="upload-text" style={{ color: "#1a1a1a", fontWeight: "400" }}>
                File uploaded successfully
              </p>
              <p className="upload-subtext" style={{ marginTop: "8px", fontWeight: "400", color: "#1a1a1a" }}>
                <strong>{uploadedFileName}</strong>
              </p>
              <p className="upload-subtext" style={{ marginTop: "4px", color: "#666" }}>
                Size: {uploadedFileSize}
              </p>
              <button
                onClick={handleRemoveFile}
                style={{
                  marginTop: "16px",
                  padding: "8px 16px",
                  backgroundColor: "transparent",
                  border: "2px solid #1a1a1a",
                  borderRadius: "0",
                  color: "#1a1a1a",
                  fontSize: "12px",
                  fontWeight: "400",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#1a1a1a"
                  e.currentTarget.style.color = "white"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent"
                  e.currentTarget.style.color = "#1a1a1a"
                }}
              >
                Remove File
              </button>
            </div>
          </div>
        )}

        {isUploading && (
          <div style={{ marginTop: "24px" }}>
            <div className="flex justify-between text-sm" style={{ marginBottom: "8px" }}>
              <span>processing...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          </div>
        )}

        {uploadStatus.type && <div className={`alert alert-${uploadStatus.type}`}>{uploadStatus.message}</div>}
      </div>

      <div className="section-card">
        <h3 className="section-title">READY TO VISUALIZE?</h3>
        <p style={{ fontSize: "14px", fontWeight: "300", color: "#666", marginBottom: "24px" }}>
          Make sure you have completed all requirements:
        </p>
        <ul className="checklist" style={{ marginBottom: "32px" }}>
          <li>
            <span className="status-icon" style={{ color: hasDataForSelectedCity ? "#28a745" : "#d63384" }}>
              {hasDataForSelectedCity ? "✓" : "×"}
            </span>
            JSON file is uploaded and not empty
          </li>
          <li>
            <span className="status-icon" style={{ color: dataFormat ? "#28a745" : "#d63384" }}>
              {dataFormat ? "✓" : "×"}
            </span>
            Data format selected
          </li>
          <li>
            <span className="status-icon" style={{ color: selectedCity ? "#28a745" : "#d63384" }}>
              {selectedCity ? "✓" : "×"}
            </span>
            Visualization area selected
          </li>
        </ul>
        <button
          onClick={onStartVisualization}
          disabled={!canStartVisualization}
          className="button"
          style={{
            backgroundColor: canStartVisualization ? "#1a1a1a" : "#e5e5e5",
            color: canStartVisualization ? "white" : "#999",
            padding: "16px 32px",
            fontSize: "16px",
            cursor: canStartVisualization ? "pointer" : "not-allowed",
          }}
        >
          start visualization
        </button>
        {!canStartVisualization && (
          <p style={{ fontSize: "14px", color: "#d63384", marginTop: "12px", fontWeight: "300" }}>
            please complete all requirements above to start visualization
          </p>
        )}
      </div>
    </div>
  )
}

interface MapboxVisualizationProps {
  data: any
  selectedCity: string
  dataFormat: string
  onDebug: (message: string) => void
}

function MapboxVisualization({ data, selectedCity, dataFormat, onDebug }: MapboxVisualizationProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const [isRendering, setIsRendering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processingTime, setProcessingTime] = useState<number>(0)
  const [pointCount, setPointCount] = useState<number>(0)

  const parseGeoString = (geoString: string): { lat: number; lng: number } | null => {
    if (!geoString || typeof geoString !== "string" || !geoString.startsWith("geo:")) {
      return null
    }

    const coords = geoString.substring(4)
    const parts = coords.split(",")

    if (parts.length !== 2) {
      return null
    }

    const lat = Number.parseFloat(parts[0])
    const lng = Number.parseFloat(parts[1])

    if (isNaN(lat) || isNaN(lng)) {
      return null
    }

    return { lat, lng }
  }

  const parseDegreeString = (degreeString: string): { lat: number; lng: number } | null => {
    if (!degreeString || typeof degreeString !== "string") {
      return null
    }

    const cleanString = degreeString.replace(/°/g, "").trim()
    const parts = cleanString.split(",")

    if (parts.length !== 2) {
      return null
    }

    const lat = Number.parseFloat(parts[0].trim())
    const lng = Number.parseFloat(parts[1].trim())

    if (isNaN(lat) || isNaN(lng)) {
      return null
    }

    return { lat, lng }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const checkCityDataPoints = useCallback((data: any, format: string) => {
    if (!data || !format) return {}

    const cityStatus: { [key: string]: boolean } = {}

    // Extract all GPS points from the data
    const gpsPoints: Array<{ lat: number; lng: number }> = []

    if (format === "android-semantic") {
      if (data.semanticSegments && Array.isArray(data.semanticSegments)) {
        data.semanticSegments.forEach((segment: any) => {
          if (typeof segment === "object" && segment !== null) {
            if (segment.timelinePath && Array.isArray(segment.timelinePath)) {
              segment.timelinePath.forEach((pathPoint: any) => {
                if (pathPoint.point && typeof pathPoint.point === "string") {
                  const coords = parseDegreeString(pathPoint.point)
                  if (coords) {
                    gpsPoints.push(coords)
                  }
                }
              })
            }

            if (segment.visit && segment.visit.topCandidate && segment.visit.topCandidate.placeLocation) {
              const placeLocation = segment.visit.topCandidate.placeLocation
              if (placeLocation.latLng && typeof placeLocation.latLng === "string") {
                const coords = parseDegreeString(placeLocation.latLng)
                if (coords) {
                  gpsPoints.push(coords)
                }
              }
            }

            if (segment.activity) {
              if (segment.activity.start && segment.activity.start.latLng) {
                const coords = parseDegreeString(segment.activity.start.latLng)
                if (coords) {
                  gpsPoints.push(coords)
                }
              }
              if (segment.activity.end && segment.activity.end.latLng) {
                const coords = parseDegreeString(segment.activity.end.latLng)
                if (coords) {
                  gpsPoints.push(coords)
                }
              }
            }
          }
        })
      }
    } else if (format === "ios") {
      if (Array.isArray(data)) {
        data.forEach((item) => {
          if (typeof item === "object" && item !== null && item.activity) {
            const activity = item.activity
            const keys = ["start", "end"]

            keys.forEach((key) => {
              const latlng = activity[key]
              if (latlng) {
                const coords = parseGeoString(latlng)
                if (coords) {
                  gpsPoints.push(coords)
                }
              }
            })
          }
        })
      }
    }

    // Check each city for data points
    Object.keys(CITY_BOUNDS).forEach((cityKey) => {
      const bounds = CITY_BOUNDS[cityKey as keyof typeof CITY_BOUNDS]
      const filteredPoints = gpsPoints.filter(
        (point) =>
          point.lat >= bounds.lat_min &&
          point.lat <= bounds.lat_max &&
          point.lng >= bounds.lng_min &&
          point.lng <= bounds.lng_max,
      )
      cityStatus[cityKey] = filteredPoints.length > 0
    })

    // World view is always available if there are any GPS points
    cityStatus["world"] = gpsPoints.length > 0

    return cityStatus
  }, [])

  const validateJsonStructure = (
    data: any,
  ): { isValid: boolean; message: string; pointCount: number; detectedFormat: string } => {
    const startTime = performance.now()
    onDebug("Starting JSON validation...")

    try {
      const selectedFormat = dataFormat
      onDebug(`Using MANUALLY SELECTED format: ${selectedFormat}`)

      if (selectedFormat === "android-semantic") {
        if (typeof data !== "object" || data === null) {
          return {
            isValid: false,
            message: "the data is not in the Android format",
            pointCount: 0,
            detectedFormat: selectedFormat,
          }
        }

        if (!data.semanticSegments || !Array.isArray(data.semanticSegments)) {
          return {
            isValid: false,
            message: "the data is not in the Android format",
            pointCount: 0,
            detectedFormat: selectedFormat,
          }
        }

        if (data.semanticSegments.length === 0) {
          return {
            isValid: false,
            message:
              "your file is empty - looks like you have your location history off or have the history auto-delete on",
            pointCount: 0,
            detectedFormat: selectedFormat,
          }
        }

        let validPoints = 0
        const sampleSize = Math.min(data.semanticSegments.length, 10)

        for (let i = 0; i < sampleSize; i++) {
          const segment = data.semanticSegments[i]
          if (typeof segment === "object" && segment !== null) {
            if (segment.timelinePath && Array.isArray(segment.timelinePath)) {
              segment.timelinePath.forEach((pathPoint: any) => {
                if (pathPoint.point && typeof pathPoint.point === "string") {
                  if (pathPoint.point.includes("°") && pathPoint.point.includes(",")) {
                    validPoints++
                  }
                }
              })
            }

            if (segment.visit && segment.visit.topCandidate && segment.visit.topCandidate.placeLocation) {
              const placeLocation = segment.visit.topCandidate.placeLocation
              if (placeLocation.latLng && typeof placeLocation.latLng === "string") {
                if (placeLocation.latLng.includes("°") && placeLocation.latLng.includes(",")) {
                  validPoints++
                }
              }
            }

            if (segment.activity) {
              if (segment.activity.start && segment.activity.start.latLng) {
                if (segment.activity.start.latLng.includes("°") && segment.activity.start.latLng.includes(",")) {
                  validPoints++
                }
              }
              if (segment.activity.end && segment.activity.end.latLng) {
                if (segment.activity.end.latLng.includes("°") && segment.activity.end.latLng.includes(",")) {
                  validPoints++
                }
              }
            }
          }
        }

        if (validPoints === 0) {
          return {
            isValid: false,
            message: "no valid gps coordinates found in Android format",
            pointCount: 0,
            detectedFormat: selectedFormat,
          }
        }

        // Check city data points after successful validation
        const cityStatus = checkCityDataPoints(data, selectedFormat)
        setCityDataStatus(cityStatus)

        return {
          isValid: true,
          message: `using Android format! found ${validPoints} gps coordinates in first ${sampleSize} segments. total segments: ${data.semanticSegments.length}`,
          pointCount: validPoints,
          detectedFormat: selectedFormat,
        }
      } else if (selectedFormat === "ios") {
        if (!Array.isArray(data)) {
          return {
            isValid: false,
            message: "the data is not in the iOS format",
            pointCount: 0,
            detectedFormat: selectedFormat,
          }
        }

        if (data.length === 0) {
          return {
            isValid: false,
            message:
              "your file is empty - looks like you have your location history off or have the history auto-delete on",
            pointCount: 0,
            detectedFormat: selectedFormat,
          }
        }

        let validPoints = 0
        let hasActivityStructure = false
        const sampleSize = Math.min(data.length, 10)

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
            message: "no 'activity' objects found. expected ios structure",
            pointCount: 0,
            detectedFormat: selectedFormat,
          }
        }

        if (validPoints === 0) {
          return {
            isValid: false,
            message: "no valid gps coordinates found. expected format: 'geo:latitude,longitude'",
            pointCount: 0,
            detectedFormat: selectedFormat,
          }
        }

        // Check city data points after successful validation
        const cityStatus = checkCityDataPoints(data, selectedFormat)
        setCityDataStatus(cityStatus)

        return {
          isValid: true,
          message: `using ios format! found ${validPoints} gps coordinates in first ${sampleSize} items. total items: ${data.length}`,
          pointCount: validPoints,
          detectedFormat: selectedFormat,
        }
      }

      const endTime = performance.now()
      onDebug(`Validation completed in ${(endTime - startTime).toFixed(2)}ms`)
      return { isValid: false, message: "unknown format", pointCount: 0, detectedFormat: dataFormat }
    } catch (error) {
      onDebug(`Validation error: ${error}`)
      return { isValid: false, message: `validation error: ${error}`, pointCount: 0, detectedFormat: dataFormat }
    }
  }

  const downloadMapScreenshot = useCallback(() => {
    if (map.current && mapContainer.current) {
      try {
        onDebug("Starting map screenshot download...")

        // Wait for map to be fully loaded and rendered
        map.current.once("idle", () => {
          try {
            // Get the map canvas
            const mapCanvas = map.current.getCanvas()

            // Create a new canvas for the final image
            const finalCanvas = document.createElement("canvas")
            const finalCtx = finalCanvas.getContext("2d")

            if (!finalCtx) {
              onDebug("Failed to get canvas context")
              return
            }

            // Set canvas size to match map canvas
            finalCanvas.width = mapCanvas.width
            finalCanvas.height = mapCanvas.height

            // Fill with white background first
            finalCtx.fillStyle = "white"
            finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height)

            // Draw the map
            finalCtx.drawImage(mapCanvas, 0, 0)

            // Add watermark text
            finalCtx.fillStyle = "rgba(26, 26, 26, 0.8)"
            finalCtx.font = "14px Inter, sans-serif"
            finalCtx.textAlign = "right"
            finalCtx.textBaseline = "bottom"
            finalCtx.fillText("Urban Footprint — Saralee S", finalCanvas.width - 20, finalCanvas.height - 20)

            // Convert to blob and download
            finalCanvas.toBlob((blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob)
                const link = document.createElement("a")
                link.download = `urban-footprint-${selectedCity}-${new Date().toISOString().split("T")[0]}.png`
                link.href = url
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                URL.revokeObjectURL(url)
                onDebug("Map screenshot downloaded successfully")
              } else {
                onDebug("Failed to create blob from canvas")
              }
            }, "image/png")
          } catch (error) {
            onDebug(`Error in screenshot capture: ${error}`)
            console.error("Screenshot capture error:", error)
          }
        })

        // Trigger a repaint to ensure the map is fully rendered
        map.current.triggerRepaint()
      } catch (error) {
        onDebug(`Error downloading screenshot: ${error}`)
        console.error("Screenshot error:", error)
        alert("Failed to download screenshot. Please try again.")
      }
    } else {
      onDebug("Map or container not available for screenshot")
      alert("Map not ready for screenshot. Please wait for the map to fully load.")
    }
  }, [selectedCity, onDebug])

  const createMapboxVisualization = (data: any, city: string, format: string) => {
    const startTime = performance.now()
    onDebug(`Starting Mapbox visualization for ${city}...`)

    let actualData = data
    let detectedFormat = format

    if (typeof data === "object" && data !== null && "content" in data && "format" in data) {
      actualData = (data as any).content
      detectedFormat = (data as any).format as string
      onDebug(`Detected data format (object wrapper): ${detectedFormat}`)
    }

    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data)
        if (parsed && parsed.content && parsed.format) {
          actualData = parsed.content
          detectedFormat = parsed.format
          onDebug(`Detected data format (string wrapper): ${detectedFormat}`)
        }
      } catch {
        onDebug("Input string is raw data – no wrapper detected")
      }
    }

    const CITY_BOUNDS = {
      amsterdam: {
        lat_min: 52.3,
        lat_max: 52.4,
        lng_min: 4.8,
        lng_max: 5.0,
        name: "Amsterdam",
        center: [4.9, 52.35],
        zoom: 11,
      },
      barcelona: {
        lat_min: 41.3,
        lat_max: 41.4,
        lng_min: 2.1,
        lng_max: 2.2,
        name: "Barcelona",
        center: [2.15, 41.35],
        zoom: 11,
      },
      beijing: {
        lat_min: 39.8,
        lat_max: 40.0,
        lng_min: 116.3,
        lng_max: 116.5,
        name: "Beijing",
        center: [116.4, 39.9],
        zoom: 10,
      },
      berlin: {
        lat_min: 52.4,
        lat_max: 52.6,
        lng_min: 13.3,
        lng_max: 13.5,
        name: "Berlin",
        center: [13.4, 52.5],
        zoom: 10,
      },
      bkk: {
        lat_min: 13.6,
        lat_max: 13.9,
        lng_min: 100.3,
        lng_max: 100.7,
        name: "Bangkok",
        center: [100.5, 13.75],
        zoom: 10,
      },
      copenhagen: {
        lat_min: 55.6,
        lat_max: 55.8,
        lng_min: 12.4,
        lng_max: 12.7,
        name: "Copenhagen",
        center: [12.55, 55.7],
        zoom: 11,
      },
      delhi: {
        lat_min: 28.4,
        lat_max: 28.8,
        lng_min: 77.0,
        lng_max: 77.3,
        name: "Delhi",
        center: [77.15, 28.6],
        zoom: 10,
      },
      helsinki: {
        lat_min: 60.1,
        lat_max: 60.2,
        lng_min: 24.9,
        lng_max: 25.0,
        name: "Helsinki",
        center: [24.95, 60.15],
        zoom: 11,
      },
      hongkong: {
        lat_min: 22.2,
        lat_max: 22.4,
        lng_min: 114.1,
        lng_max: 114.3,
        name: "Hong Kong",
        center: [114.2, 22.3],
        zoom: 11,
      },
      la: {
        lat_min: 33.7,
        lat_max: 34.3,
        lng_min: -118.7,
        lng_max: -118.0,
        name: "Los Angeles",
        center: [-118.25, 34.05],
        zoom: 9,
      },
      lisbon: {
        lat_min: 38.7,
        lat_max: 38.8,
        lng_min: -9.2,
        lng_max: -9.1,
        name: "Lisbon",
        center: [-9.15, 38.75],
        zoom: 11,
      },
      london: {
        lat_min: 51.4,
        lat_max: 51.6,
        lng_min: -0.2,
        lng_max: 0.1,
        name: "London",
        center: [-0.05, 51.5],
        zoom: 10,
      },
      melbourne: {
        lat_min: -37.9,
        lat_max: -37.7,
        lng_min: 144.9,
        lng_max: 145.0,
        name: "Melbourne",
        center: [144.95, -37.8],
        zoom: 10,
      },
      mexico: {
        lat_min: 19.2,
        lat_max: 19.6,
        lng_min: -99.3,
        lng_max: -99.0,
        name: "Mexico City",
        center: [-99.15, 19.4],
        zoom: 10,
      },
      milan: {
        lat_min: 45.4,
        lat_max: 45.5,
        lng_min: 9.1,
        lng_max: 9.3,
        name: "Milan",
        center: [9.2, 45.45],
        zoom: 11,
      },
      montreal: {
        lat_min: 45.4,
        lat_max: 45.6,
        lng_min: -73.7,
        lng_max: -73.5,
        name: "Montreal",
        center: [-73.6, 45.5],
        zoom: 10,
      },
      mumbai: {
        lat_min: 18.9,
        lat_max: 19.3,
        lng_min: 72.7,
        lng_max: 73.1,
        name: "Mumbai",
        center: [72.9, 19.1],
        zoom: 10,
      },
      nyc: {
        lat_min: 40.5,
        lat_max: 41.0,
        lng_min: -74.25,
        lng_max: -73.75,
        name: "New York City",
        center: [-74.0, 40.75],
        zoom: 10,
      },
      osaka: {
        lat_min: 34.5,
        lat_max: 34.8,
        lng_min: 135.3,
        lng_max: 135.7,
        name: "Osaka",
        center: [135.5, 34.65],
        zoom: 10,
      },
      paris: {
        lat_min: 48.8,
        lat_max: 48.9,
        lng_min: 2.2,
        lng_max: 2.5,
        name: "Paris",
        center: [2.35, 48.85],
        zoom: 11,
      },
      prague: {
        lat_min: 50.0,
        lat_max: 50.1,
        lng_min: 14.4,
        lng_max: 14.5,
        name: "Prague",
        center: [14.45, 50.05],
        zoom: 11,
      },
      rome: {
        lat_min: 41.8,
        lat_max: 41.9,
        lng_min: 12.4,
        lng_max: 12.6,
        name: "Rome",
        center: [12.5, 41.85],
        zoom: 11,
      },
      saopaulo: {
        lat_min: -23.8,
        lat_max: -23.3,
        lng_min: -46.8,
        lng_max: -46.4,
        name: "São Paulo",
        center: [-46.6, -23.55],
        zoom: 10,
      },
      seoul: {
        lat_min: 37.4,
        lat_max: 37.7,
        lng_min: 126.8,
        lng_max: 127.2,
        name: "Seoul",
        center: [127.0, 37.55],
        zoom: 10,
      },
      shanghai: {
        lat_min: 31.1,
        lat_max: 31.3,
        lng_min: 121.4,
        lng_max: 121.6,
        name: "Shanghai",
        center: [121.5, 31.2],
        zoom: 10,
      },
      singapore: {
        lat_min: 1.2,
        lat_max: 1.4,
        lng_min: 103.8,
        lng_max: 104.0,
        name: "Singapore",
        center: [103.9, 1.3],
        zoom: 11,
      },
      stockholm: {
        lat_min: 59.3,
        lat_max: 59.4,
        lng_min: 18.0,
        lng_max: 18.1,
        name: "Stockholm",
        center: [18.05, 59.35],
        zoom: 11,
      },
      sydney: {
        lat_min: -33.9,
        lat_max: -33.8,
        lng_min: 151.1,
        lng_max: 151.3,
        name: "Sydney",
        center: [151.2, -33.85],
        zoom: 10,
      },
      tokyo: {
        lat_min: 35.6,
        lat_max: 35.8,
        lng_min: 139.6,
        lng_max: 139.8,
        name: "Tokyo",
        center: [139.7, 35.7],
        zoom: 10,
      },
      vienna: {
        lat_min: 48.1,
        lat_max: 48.3,
        lng_min: 16.3,
        lng_max: 16.4,
        name: "Vienna",
        center: [16.35, 48.2],
        zoom: 11,
      },
      world: {
        lat_min: -90,
        lat_max: 90,
        lng_min: -180,
        lng_max: 180,
        name: "World Map",
        center: [0, 20],
        zoom: 1.5,
      },
      zurich: {
        lat_min: 47.3,
        lat_max: 47.4,
        lng_min: 8.5,
        lng_max: 8.6,
        name: "Zurich",
        center: [8.55, 47.35],
        zoom: 11,
      },
    }

    try {
      const gpsPoints: Array<{ lat: number; lng: number }> = []
      onDebug(`Input data type: ${typeof actualData}, format: ${detectedFormat}`)

      if (detectedFormat === "android-semantic") {
        if (actualData.semanticSegments && Array.isArray(actualData.semanticSegments)) {
          onDebug(`Processing ${actualData.semanticSegments.length} Android semantic segments...`)

          actualData.semanticSegments.forEach((segment: any, index: number) => {
            if (typeof segment === "object" && segment !== null) {
              if (segment.timelinePath && Array.isArray(segment.timelinePath)) {
                segment.timelinePath.forEach((pathPoint: any) => {
                  if (pathPoint.point && typeof pathPoint.point === "string") {
                    const coords = parseDegreeString(pathPoint.point)
                    if (coords) {
                      gpsPoints.push(coords)
                    }
                  }
                })
              }

              if (segment.visit && segment.visit.topCandidate && segment.visit.topCandidate.placeLocation) {
                const placeLocation = segment.visit.topCandidate.placeLocation
                if (placeLocation.latLng && typeof placeLocation.latLng === "string") {
                  const coords = parseDegreeString(placeLocation.latLng)
                  if (coords) {
                    gpsPoints.push(coords)
                  }
                }
              }

              if (segment.activity) {
                if (segment.activity.start && segment.activity.start.latLng) {
                  const coords = parseDegreeString(segment.activity.start.latLng)
                  if (coords) {
                    gpsPoints.push(coords)
                  }
                }
                if (segment.activity.end && segment.activity.end.latLng) {
                  const coords = parseDegreeString(segment.activity.end.latLng)
                  if (coords) {
                    gpsPoints.push(coords)
                  }
                }
              }
            }
          })
        }
      } else if (detectedFormat === "ios") {
        if (Array.isArray(actualData)) {
          onDebug(`Processing ${actualData.length} iOS items...`)

          actualData.forEach((item, index) => {
            if (typeof item === "object" && item !== null && item.activity) {
              const activity = item.activity
              const keys = ["start", "end"]

              keys.forEach((key) => {
                const latlng = activity[key]
                if (latlng) {
                  const coords = parseGeoString(latlng)
                  if (coords) {
                    gpsPoints.push(coords)
                  }
                }
              })
            }
          })
        }
      }

      onDebug(`Extracted ${gpsPoints.length} GPS points`)

      if (gpsPoints.length === 0) {
        const errorMsg = "no valid gps points found in the data"
        onDebug(errorMsg)
        throw new Error(errorMsg)
      }

      const bounds = CITY_BOUNDS[city as keyof typeof CITY_BOUNDS]
      let filteredPoints = gpsPoints

      // Filter points only if not world view
      if (city !== "world") {
        filteredPoints = gpsPoints.filter(
          (point) =>
            point.lat >= bounds.lat_min &&
            point.lat <= bounds.lat_max &&
            point.lng >= bounds.lng_min &&
            point.lng <= bounds.lng_max,
        )

        onDebug(`Filtered to ${filteredPoints.length} points within ${bounds.name}`)

        if (filteredPoints.length === 0) {
          const errorMsg = `no gps points found within ${bounds.name} area. found ${gpsPoints.length} total points.`
          onDebug(errorMsg)
          throw new Error(errorMsg)
        }
      } else {
        onDebug(`Using all ${filteredPoints.length} GPS points for world map`)
      }

      if (!map.current && mapContainer.current) {
        onDebug("Initializing Mapbox map...")

        mapboxgl.accessToken =
          "pk.eyJ1Ijoic2FyYWxlZXBhbSIsImEiOiJjbDZmNmx6dzcwMGg2M2RsNHhheDJmemloIn0.DpnokxAspCF3nNXUKWAB3g"

        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/saraleepam/cl6faiz6y002a14ouopihymrp",
          center: bounds.center,
          zoom: bounds.zoom,
        })

        map.current.on("load", () => {
          onDebug("Mapbox map loaded successfully")
        })
      }

      if (map.current) {
        onDebug("Adding GPS points to Mapbox map...")

        map.current.on("load", () => {
          if (map.current.getSource("gps-points")) {
            map.current.removeLayer("gps-points-layer")
            map.current.removeSource("gps-points")
          }

          const geojsonData = {
            type: "FeatureCollection",
            features: filteredPoints.map((point, index) => ({
              type: "Feature",
              properties: {
                id: index,
                description: `gps point ${index + 1}<br>lat: ${point.lat.toFixed(6)}<br>lng: ${point.lng.toFixed(6)}`,
              },
              geometry: {
                type: "Point",
                coordinates: [point.lng, point.lat],
              },
            })),
          }

          map.current.addSource("gps-points", {
            type: "geojson",
            data: geojsonData,
          })

          map.current.addLayer({
            id: "gps-points-layer",
            type: "circle",
            source: "gps-points",
            paint: {
              "circle-radius": 4,
              "circle-color": "#d63384",
              "circle-opacity": 0.8,
            },
          })

          // Add popup on hover
          map.current.on("mouseenter", "gps-points-layer", (e: any) => {
            if (e.features.length > 0) {
              const feature = e.features[0]
              if (feature.properties && feature.properties.description) {
                new mapboxgl.Popup()
                  .setLngLat([e.lngLat.lng, e.lngLat.lat])
                  .setHTML(feature.properties.description)
                  .addTo(map.current)
              }
            }
          })

          map.current.on("mouseleave", "gps-points-layer", () => {
            // Reset cursor after leaving a point
            if (map.current) {
              map.current.getCanvas().style.cursor = ""
            }
          })
        })
      }

      setPointCount(filteredPoints.length)
      const endTime = performance.now()
      const renderTime = endTime - startTime
      setProcessingTime(renderTime)
      onDebug(`Mapbox visualization completed in ${renderTime.toFixed(2)}ms`)
    } catch (err: any) {
      setError(err.message || "an error occurred during map visualization")
      onDebug(`Mapbox visualization error: ${err.message}`)
    } finally {
      setIsRendering(false)
    }
  }

  React.useEffect(() => {
    if (data && selectedCity && dataFormat && mapContainer.current) {
      setIsRendering(true)
      setError(null)
      createMapboxVisualization(data, selectedCity, dataFormat)
    }

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [data, selectedCity, dataFormat, onDebug])

  return (
    <div>
      {isRendering && <div className="loading-overlay">rendering map...</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div ref={mapContainer} className="map-container" />

      <div className="map-controls">
        <button onClick={downloadMapScreenshot} className="button">
          download screenshot
        </button>
        <div className="map-info">
          {processingTime > 0 && (
            <p>
              rendering time: <strong>{processingTime.toFixed(2)}ms</strong>
            </p>
          )}
          {pointCount > 0 && (
            <p>
              gps points: <strong>{pointCount}</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
