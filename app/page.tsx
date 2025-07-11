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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const CITY_BOUNDS = {
    nyc: {
      lat_min: 40.5,
      lat_max: 41.0,
      lng_min: -74.25,
      lng_max: -73.75,
      name: "New York City",
    },
    bkk: {
      lat_min: 13.6,
      lat_max: 13.9,
      lng_min: 100.3,
      lng_max: 100.7,
      name: "Bangkok",
    },
    la: {
      lat_min: 33.7,
      lat_max: 34.3,
      lng_min: -118.7,
      lng_max: -118.0,
      name: "Los Angeles",
    },
    osaka: {
      lat_min: 34.5,
      lat_max: 34.8,
      lng_min: 135.3,
      lng_max: 135.7,
      name: "Osaka",
    },
    mexico: {
      lat_min: 19.2,
      lat_max: 19.6,
      lng_min: -99.3,
      lng_max: -99.0,
      name: "Mexico City",
    },
    copenhagen: {
      lat_min: 55.6,
      lat_max: 55.8,
      lng_min: 12.4,
      lng_max: 12.7,
      name: "Copenhagen",
    },
    seoul: {
      lat_min: 37.4,
      lat_max: 37.7,
      lng_min: 126.8,
      lng_max: 127.2,
      name: "Seoul",
    },
    paris: {
      lat_min: 48.8,
      lat_max: 48.9,
      lng_min: 2.2,
      lng_max: 2.5,
      name: "Paris",
    },
    milan: {
      lat_min: 45.4,
      lat_max: 45.5,
      lng_min: 9.1,
      lng_max: 9.3,
      name: "Milan",
    },
    mumbai: {
      lat_min: 18.9,
      lat_max: 19.3,
      lng_min: 72.7,
      lng_max: 73.1,
      name: "Mumbai",
    },
    saopaulo: {
      lat_min: -23.8,
      lat_max: -23.3,
      lng_min: -46.8,
      lng_max: -46.4,
      name: "São Paulo",
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
            message: "the file is empty",
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
          return { isValid: false, message: "the file is empty", pointCount: 0, detectedFormat: selectedFormat }
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
    if (jsonData && dataFormat) {
      const actualData = jsonData.content || jsonData
      setUploadStatus({ type: "info", message: `validating data structure using ${dataFormat} format...` })

      const validation = validateJsonStructure(actualData)

      if (validation.isValid) {
        setUploadStatus({ type: "success", message: validation.message })
        // Update the stored data with new format
        const dataWithFormat = { content: actualData, format: dataFormat }
        onFileUpload(JSON.stringify(dataWithFormat))
      } else {
        setUploadStatus({ type: "error", message: validation.message })
      }
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
              <option value="nyc">New York City</option>
              <option value="la">Los Angeles</option>
              <option value="bkk">Bangkok</option>
              <option value="osaka">Osaka</option>
              <option value="mexico">Mexico City</option>
              <option value="copenhagen">Copenhagen</option>
              <option value="seoul">Seoul</option>
              <option value="paris">Paris</option>
              <option value="milan">Milan</option>
              <option value="mumbai">Mumbai</option>
              <option value="saopaulo">São Paulo</option>
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
                <div className="upload-icon">📁</div>
                <p className="upload-text">drop your location history json file here</p>
              </>
            ) : (
              <>
                <div className="upload-icon">📍</div>
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
      nyc: {
        lat_min: 40.5,
        lat_max: 41.0,
        lng_min: -74.25,
        lng_max: -73.75,
        name: "New York City",
        center: [-74.0, 40.75],
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
      la: {
        lat_min: 33.7,
        lat_max: 34.3,
        lng_min: -118.7,
        lng_max: -118.0,
        name: "Los Angeles",
        center: [-118.25, 34.05],
        zoom: 9,
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
      mexico: {
        lat_min: 19.2,
        lat_max: 19.6,
        lng_min: -99.3,
        lng_max: -99.0,
        name: "Mexico City",
        center: [-99.15, 19.4],
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
      seoul: {
        lat_min: 37.4,
        lat_max: 37.7,
        lng_min: 126.8,
        lng_max: 127.2,
        name: "Seoul",
        center: [127.0, 37.55],
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
      milan: {
        lat_min: 45.4,
        lat_max: 45.5,
        lng_min: 9.1,
        lng_max: 9.3,
        name: "Milan",
        center: [9.2, 45.45],
        zoom: 11,
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
      saopaulo: {
        lat_min: -23.8,
        lat_max: -23.3,
        lng_min: -46.8,
        lng_max: -46.4,
        name: "São Paulo",
        center: [-46.6, -23.55],
        zoom: 10,
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
              "circle-radius": city === "world" ? 1.5 : 2,
              "circle-color": "rgba(0, 0, 0, 0)",
              "circle-opacity": 1,
              "circle-stroke-color": city === "world" ? "rgba(255, 69, 0, 0.7)" : "rgba(26, 26, 26, 0.5)",
              "circle-stroke-width": city === "world" ? 0.8 : 1,
              "circle-stroke-opacity": 1,
            },
          })

          // Auto-fit bounds for world view
          if (city === "world" && filteredPoints.length > 0) {
            const coordinates = filteredPoints.map((point) => [point.lng, point.lat])
            const bounds = coordinates.reduce((bounds, coord) => {
              return bounds.extend(coord)
            }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]))
            map.current.fitBounds(bounds, { padding: 50, maxZoom: 10 })
          }

          map.current.on("click", "gps-points-layer", (e: any) => {
            const coordinates = e.features[0].geometry.coordinates.slice()
            const description = e.features[0].properties.description

            new mapboxgl.Popup().setLngLat(coordinates).setHTML(description).addTo(map.current)
          })

          map.current.on("mouseenter", "gps-points-layer", () => {
            map.current.getCanvas().style.cursor = "pointer"
          })

          map.current.on("mouseleave", "gps-points-layer", () => {
            map.current.getCanvas().style.cursor = ""
          })

          onDebug(`Added ${filteredPoints.length} points to Mapbox map`)
        })
      }

      const endTime = performance.now()
      const totalTime = endTime - startTime
      onDebug(`Mapbox visualization completed in ${totalTime.toFixed(2)}ms`)

      return { pointCount: filteredPoints.length, processingTime: totalTime }
    } catch (error) {
      const errorMsg = `error creating mapbox visualization: ${error}`
      onDebug(errorMsg)
      throw new Error(errorMsg)
    }
  }

  React.useEffect(() => {
    onDebug("Starting Mapbox visualization creation...")
    if (data && mapContainer.current) {
      try {
        setIsRendering(true)
        setError(null)

        const result = createMapboxVisualization(data, selectedCity, dataFormat)
        setPointCount(result.pointCount)
        setProcessingTime(result.processingTime)
        setIsRendering(false)
        onDebug("Mapbox visualization creation completed")
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "error creating visualization"
        setError(errorMsg)
        setIsRendering(false)
        onDebug(`${errorMsg}`)
        console.error("Mapbox visualization error:", err)
      }
    }
  }, [
    data,
    selectedCity,
    dataFormat,
    mapContainer,
    onDebug,
    setError,
    setIsRendering,
    setPointCount,
    setProcessingTime,
  ])

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <h3 style={{ fontSize: "24px", fontWeight: "300", textTransform: "uppercase", margin: 0 }}>
          {selectedCity === "world" ? "Your Global Location Footprint" : "Your location footprint"}
        </h3>
        <button
          onClick={downloadMapScreenshot}
          disabled={isRendering || !!error}
          className="button"
          style={{
            backgroundColor: isRendering || error ? "#e5e5e5" : "#1a1a1a",
            color: isRendering || error ? "#999" : "white",
            padding: "12px 24px",
            fontSize: "14px",
            cursor: isRendering || error ? "not-allowed" : "pointer",
            maxWidth: "200px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "16px" }}>💾</span>
          save map
        </button>
      </div>

      {processingTime > 0 && (
        <div className="section-card" style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", gap: "32px", fontSize: "14px", fontWeight: "300" }}>
            <span>
              <strong>GPS points:</strong> {pointCount.toLocaleString()}
            </span>
            <span>
              <strong>Processing time:</strong> {processingTime.toFixed(0)}ms
            </span>
            {selectedCity === "world" && (
              <span>
                <strong>View:</strong> Global Coverage
              </span>
            )}
          </div>
        </div>
      )}

      <div style={{ backgroundColor: "white", border: "3px solid #1a1a1a", overflow: "hidden" }}>
        {isRendering ? (
          <div className="flex flex-col justify-center items-center" style={{ height: "600px" }}>
            <div className="spinner" style={{ marginBottom: "16px" }}></div>
            <p style={{ fontSize: "14px", fontWeight: "300", color: "#666" }}>
              {selectedCity === "world" ? "Loading your global footprint..." : "Loading your location footprint..."}
            </p>
            <p style={{ fontSize: "14px", fontWeight: "300", color: "#666" }}>Mapping your GPS history</p>
          </div>
        ) : error ? (
          <div className="flex flex-col justify-center items-center" style={{ height: "600px" }}>
            <div style={{ fontSize: "32px", marginBottom: "16px" }}>⚠</div>
            <p style={{ color: "#d63384", textAlign: "center", fontSize: "14px", fontWeight: "300" }}>{error}</p>
          </div>
        ) : (
          <div>
            <div ref={mapContainer} style={{ width: "100%", height: "600px" }} />
            <div style={{ padding: "24px", fontSize: "14px", color: "#666", fontWeight: "300" }}>
              <p>
                Interactive map: Zoom with mouse wheel, pan by dragging, click GPS points for details
                {selectedCity === "world" && " • Orange dots show your global travel history"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
