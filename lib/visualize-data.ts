/**
 * GPS Location Visualization - CSP Compliant Version
 * No external dependencies, no eval() usage
 */

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
}

export function visualizeData(data: any, container: HTMLElement, city = "nyc") {
  // Clear the container
  container.innerHTML = ""

  // Add debug info
  console.log("Visualization started:", {
    dataType: typeof data,
    dataLength: Array.isArray(data) ? data.length : "not array",
    city,
  })

  try {
    // Extract GPS points from the JSON data
    const gpsPoints = extractGPSPoints(data)
    console.log("GPS points extracted:", gpsPoints.length)

    if (gpsPoints.length === 0) {
      showDetailedError(container, "No GPS Points Found", [
        "No valid GPS coordinates were found in your data",
        "Expected format: geo:latitude,longitude",
        "Check that your JSON contains 'activity' objects with 'start' or 'end' fields",
        `Example: {"activity": {"start": "geo:40.7128,-74.0060"}}`,
      ])
      return
    }

    // Filter points to selected city
    const filteredPoints = filterToCity(gpsPoints, city)
    console.log("Filtered points:", filteredPoints.length, "for city:", city)

    if (filteredPoints.length === 0) {
      const cityInfo = CITY_BOUNDS[city as keyof typeof CITY_BOUNDS]
      showDetailedError(container, `No Points in ${cityInfo?.name || city.toUpperCase()} Area`, [
        `Found ${gpsPoints.length} GPS points total, but none are within the ${cityInfo?.name || city.toUpperCase()} area`,
        `${cityInfo?.name || city.toUpperCase()} bounds:`,
        `  Latitude: ${cityInfo?.lat_min} to ${cityInfo?.lat_max}`,
        `  Longitude: ${cityInfo?.lng_min} to ${cityInfo?.lng_max}`,
        "Try selecting a different city or check your coordinate data",
      ])
      return
    }

    // Create the map visualization
    createMapVisualization(filteredPoints, container, city)
    console.log("Visualization completed successfully")
  } catch (error) {
    console.error("Visualization error:", error)
    showDetailedError(container, "Technical Error", [
      "An error occurred while processing your data:",
      String(error),
      "Please check the browser console for more details",
    ])
  }
}

function extractGPSPoints(data: any[]): Array<{ lat: number; lng: number }> {
  const gpsPoints: Array<{ lat: number; lng: number }> = []

  if (!Array.isArray(data)) {
    console.warn("Data is not an array:", typeof data)
    return gpsPoints
  }

  data.forEach((item, index) => {
    if (typeof item === "object" && item !== null && item.activity) {
      const activity = item.activity

      // Check both start and end points
      const keys = ["start", "end"]
      keys.forEach((key) => {
        const latlng = activity[key]
        if (latlng) {
          const coords = extractLatLng(latlng)
          if (coords.lat !== null && coords.lng !== null) {
            gpsPoints.push({
              lat: coords.lat,
              lng: coords.lng,
            })
          }
        }
      })
    }
  })

  return gpsPoints
}

function extractLatLng(point: string): { lat: number | null; lng: number | null } {
  if (point && typeof point === "string") {
    // Match the geo: format
    const match = point.match(/geo:(-?\d+\.?\d*),(-?\d+\.?\d*)/)
    if (match) {
      return {
        lat: Number.parseFloat(match[1]),
        lng: Number.parseFloat(match[2]),
      }
    }
  }
  return { lat: null, lng: null }
}

function filterToCity(points: Array<{ lat: number; lng: number }>, city: string): Array<{ lat: number; lng: number }> {
  const bounds = CITY_BOUNDS[city as keyof typeof CITY_BOUNDS]
  if (!bounds) return points

  return points.filter(
    (point) =>
      point.lat >= bounds.lat_min &&
      point.lat <= bounds.lat_max &&
      point.lng >= bounds.lng_min &&
      point.lng <= bounds.lng_max,
  )
}

function createMapVisualization(points: Array<{ lat: number; lng: number }>, container: HTMLElement, city: string) {
  const cityInfo = CITY_BOUNDS[city as keyof typeof CITY_BOUNDS]

  // Create the main container
  const mapContainer = document.createElement("div")
  mapContainer.style.width = "100%"
  mapContainer.style.height = "600px"
  mapContainer.style.position = "relative"
  mapContainer.style.backgroundColor = "#f0f0f0"
  container.appendChild(mapContainer)

  // Add title
  const title = document.createElement("h3")
  title.textContent = `GPS Location History - ${cityInfo.name} Area`
  title.style.textAlign = "center"
  title.style.margin = "0 0 20px 0"
  title.style.fontSize = "18px"
  title.style.fontWeight = "bold"
  container.insertBefore(title, mapContainer)

  // Add statistics
  const stats = document.createElement("div")
  stats.innerHTML = `
    <p><strong>Total GPS Points:</strong> ${points.length.toLocaleString()}</p>
    <p><strong>City:</strong> ${cityInfo.name}</p>
    <p><strong>Bounds:</strong> ${cityInfo.lat_min}°-${cityInfo.lat_max}°N, ${Math.abs(cityInfo.lng_max)}°-${Math.abs(cityInfo.lng_min)}°${cityInfo.lng_min < 0 ? "W" : "E"}</p>
  `
  stats.style.textAlign = "center"
  stats.style.marginBottom = "20px"
  stats.style.fontSize = "14px"
  container.insertBefore(stats, mapContainer)

  // Create SVG for the map
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute("width", "100%")
  svg.setAttribute("height", "100%")
  svg.style.border = "1px solid #ccc"
  mapContainer.appendChild(svg)

  // Calculate bounds for scaling
  const bounds = calculateBounds(points)
  const padding = 0.01

  const mapBounds = {
    minLat: Math.max(bounds.minLat - padding, cityInfo.lat_min),
    maxLat: Math.min(bounds.maxLat + padding, cityInfo.lat_max),
    minLng: Math.max(bounds.minLng - padding, cityInfo.lng_min),
    maxLng: Math.min(bounds.maxLng + padding, cityInfo.lng_max),
  }

  // Create scaling functions
  const width = mapContainer.clientWidth
  const height = 600

  const scaleX = (lng: number) => ((lng - mapBounds.minLng) / (mapBounds.maxLng - mapBounds.minLng)) * width
  const scaleY = (lat: number) => height - ((lat - mapBounds.minLat) / (mapBounds.maxLat - mapBounds.minLat)) * height

  // Draw city outline
  drawCityOutline(svg, scaleX, scaleY, city)

  // Draw GPS points
  points.forEach((point) => {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle")
    circle.setAttribute("cx", scaleX(point.lng).toString())
    circle.setAttribute("cy", scaleY(point.lat).toString())
    circle.setAttribute("r", "2")
    circle.setAttribute("fill", "rgba(255, 0, 0, 0.7)")
    circle.setAttribute("stroke", "rgba(200, 0, 0, 0.9)")
    circle.setAttribute("stroke-width", "0.5")

    // Add hover effect
    circle.addEventListener("mouseenter", () => {
      circle.setAttribute("r", "4")
      circle.setAttribute("fill", "red")

      // Show tooltip
      const tooltip = document.createElement("div")
      tooltip.textContent = `Lat: ${point.lat.toFixed(6)}, Lng: ${point.lng.toFixed(6)}`
      tooltip.style.position = "absolute"
      tooltip.style.background = "rgba(0,0,0,0.8)"
      tooltip.style.color = "white"
      tooltip.style.padding = "5px"
      tooltip.style.borderRadius = "3px"
      tooltip.style.fontSize = "12px"
      tooltip.style.pointerEvents = "none"
      tooltip.style.zIndex = "1000"
      tooltip.id = "tooltip"

      const rect = circle.getBoundingClientRect()
      const containerRect = mapContainer.getBoundingClientRect()
      tooltip.style.left = rect.left - containerRect.left + 10 + "px"
      tooltip.style.top = rect.top - containerRect.top - 30 + "px"

      mapContainer.appendChild(tooltip)
    })

    circle.addEventListener("mouseleave", () => {
      circle.setAttribute("r", "2")
      circle.setAttribute("fill", "rgba(255, 0, 0, 0.7)")

      const tooltip = document.getElementById("tooltip")
      if (tooltip) {
        tooltip.remove()
      }
    })

    svg.appendChild(circle)
  })

  // Add legend
  const legend = document.createElement("div")
  legend.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; margin-top: 10px; gap: 20px;">
      <div style="display: flex; align-items: center;">
        <div style="width: 10px; height: 10px; background-color: rgba(255, 0, 0, 0.7); border-radius: 50%; margin-right: 5px;"></div>
        <span style="font-size: 12px;">GPS Points (${points.length.toLocaleString()})</span>
      </div>
      <div style="display: flex; align-items: center;">
        <div style="width: 10px; height: 10px; background-color: rgba(200, 200, 200, 0.3); border: 1px solid rgba(100, 100, 100, 0.8); margin-right: 5px;"></div>
        <span style="font-size: 12px;">${cityInfo.name} Areas</span>
      </div>
    </div>
  `
  container.appendChild(legend)
}

function calculateBounds(points: Array<{ lat: number; lng: number }>) {
  return points.reduce(
    (bounds, point) => ({
      minLat: Math.min(bounds.minLat, point.lat),
      maxLat: Math.max(bounds.maxLat, point.lat),
      minLng: Math.min(bounds.minLng, point.lng),
      maxLng: Math.max(bounds.maxLng, point.lng),
    }),
    {
      minLat: Number.POSITIVE_INFINITY,
      maxLat: Number.NEGATIVE_INFINITY,
      minLng: Number.POSITIVE_INFINITY,
      maxLng: Number.NEGATIVE_INFINITY,
    },
  )
}

function drawCityOutline(
  svg: SVGElement,
  scaleX: (lng: number) => number,
  scaleY: (lat: number) => number,
  city: string,
) {
  if (city === "nyc") {
    const nycOutlines = [
      [
        [-74.0479, 40.6829],
        [-73.9067, 40.6829],
        [-73.9067, 40.882],
        [-74.0479, 40.882],
      ],
      [
        [-74.0421, 40.5707],
        [-73.8331, 40.5707],
        [-73.8331, 40.7395],
        [-74.0421, 40.7395],
      ],
      [
        [-73.9626, 40.5431],
        [-73.7004, 40.5431],
        [-73.7004, 40.8007],
        [-73.9626, 40.8007],
      ],
      [
        [-73.9339, 40.7855],
        [-73.7654, 40.7855],
        [-73.7654, 40.9176],
        [-73.9339, 40.9176],
      ],
      [
        [-74.2591, 40.496],
        [-74.0522, 40.496],
        [-74.0522, 40.6514],
        [-74.2591, 40.6514],
      ],
    ]
    drawOutlines(svg, scaleX, scaleY, nycOutlines)
  } else if (city === "bkk") {
    const bkkOutlines = [
      [
        [100.45, 13.7],
        [100.55, 13.7],
        [100.55, 13.8],
        [100.45, 13.8],
      ],
      [
        [100.52, 13.8],
        [100.58, 13.8],
        [100.58, 13.85],
        [100.52, 13.85],
      ],
      [
        [100.4, 13.72],
        [100.48, 13.72],
        [100.48, 13.78],
        [100.4, 13.78],
      ],
      [
        [100.55, 13.72],
        [100.62, 13.72],
        [100.62, 13.78],
        [100.55, 13.78],
      ],
      [
        [100.48, 13.68],
        [100.53, 13.68],
        [100.53, 13.74],
        [100.48, 13.74],
      ],
    ]
    drawOutlines(svg, scaleX, scaleY, bkkOutlines)
  }
}

function drawOutlines(
  svg: SVGElement,
  scaleX: (lng: number) => number,
  scaleY: (lat: number) => number,
  outlines: number[][][],
) {
  outlines.forEach((outline) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    let pathData = ""

    outline.forEach((coord, index) => {
      const x = scaleX(coord[0])
      const y = scaleY(coord[1])

      if (index === 0) {
        pathData += `M ${x} ${y}`
      } else {
        pathData += ` L ${x} ${y}`
      }
    })

    pathData += " Z"

    path.setAttribute("d", pathData)
    path.setAttribute("fill", "rgba(200, 200, 200, 0.3)")
    path.setAttribute("stroke", "rgba(100, 100, 100, 0.8)")
    path.setAttribute("stroke-width", "1")

    svg.appendChild(path)
  })
}

function showDetailedError(container: HTMLElement, title: string, messages: string[]) {
  const errorDiv = document.createElement("div")
  errorDiv.style.padding = "20px"
  errorDiv.style.textAlign = "left"
  errorDiv.style.color = "#dc3545"
  errorDiv.style.backgroundColor = "#f8d7da"
  errorDiv.style.border = "1px solid #f5c6cb"
  errorDiv.style.borderRadius = "4px"
  errorDiv.style.fontFamily = "monospace"
  errorDiv.style.fontSize = "14px"

  const titleEl = document.createElement("h4")
  titleEl.textContent = title
  titleEl.style.margin = "0 0 10px 0"
  titleEl.style.color = "#721c24"
  errorDiv.appendChild(titleEl)

  messages.forEach((message) => {
    const p = document.createElement("p")
    p.textContent = message
    p.style.margin = "5px 0"
    errorDiv.appendChild(p)
  })

  container.appendChild(errorDiv)
}
