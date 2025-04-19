"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import type { CriticalPoint } from "@/lib/types"
import type { TimeMapper } from "@/lib/time-mapper"

interface TimelineProps {
  criticalPoints: CriticalPoint[]
  onPointSelect: (point: CriticalPoint) => void
  selectedPoint?: CriticalPoint | null
  mode: "image" | "video"
  timeMapper?: TimeMapper | null
}

export function Timeline({ criticalPoints, onPointSelect, selectedPoint, mode, timeMapper }: TimelineProps) {
  const [duration, setDuration] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const timelineRef = useRef<HTMLDivElement>(null)
  const [hoveredPoint, setHoveredPoint] = useState<CriticalPoint | null>(null)

  // Calculate duration and start time based on critical points
  useEffect(() => {
    if (criticalPoints.length > 0) {
      // If we have video timestamps, use those for the timeline
      if (criticalPoints[0].videoTimestamp !== undefined) {
        const firstPoint = criticalPoints[0].videoTimestamp!
        const lastPoint = criticalPoints[criticalPoints.length - 1].videoTimestamp!
        setStartTime(firstPoint)
        setDuration(lastPoint - firstPoint + 5) // Add 5 seconds buffer
      } else {
        // Fall back to log timestamps
        const firstPoint = criticalPoints[0].timestamp
        const lastPoint = criticalPoints[criticalPoints.length - 1].timestamp
        setStartTime(firstPoint)
        setDuration(lastPoint - firstPoint + 5) // Add 5 seconds buffer
      }
    }
  }, [criticalPoints])

  // Calculate position based on relative time from the first point
  const getPositionPercent = (point: CriticalPoint) => {
    if (duration <= 0) return 0

    // Use video timestamp if available, otherwise use log timestamp
    const timestamp = point.videoTimestamp !== undefined ? point.videoTimestamp : point.timestamp
    return ((timestamp - startTime) / duration) * 100
  }

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (timelineRef.current && criticalPoints.length > 0) {
      const rect = timelineRef.current.getBoundingClientRect()
      const clickPosition = e.clientX - rect.left
      const clickPercent = clickPosition / rect.width
      const timestamp = startTime + clickPercent * duration

      // Find the nearest critical point
      let nearestPoint = criticalPoints[0]
      let minDistance = Math.abs(
        (nearestPoint.videoTimestamp !== undefined ? nearestPoint.videoTimestamp : nearestPoint.timestamp) - timestamp,
      )

      criticalPoints.forEach((point) => {
        const pointTime = point.videoTimestamp !== undefined ? point.videoTimestamp : point.timestamp
        const distance = Math.abs(pointTime - timestamp)
        if (distance < minDistance) {
          minDistance = distance
          nearestPoint = point
        }
      })

      onPointSelect(nearestPoint)
    }
  }

  if (mode === "image") {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium">
          Critical Points Timeline
          {criticalPoints.length > 0 && (
            <span className="text-sm text-gray-500 ml-2">({criticalPoints.length} points)</span>
          )}
        </h3>

        {/* Interactive timeline with dots */}
        <div className="relative w-full h-32 bg-white border rounded-lg p-4 mb-4">
          {/* The horizontal line */}
          <div className="absolute top-1/2 left-4 right-4 h-1 bg-gray-300 transform -translate-y-1/2"></div>

          {/* Time markers */}
          <div className="absolute bottom-2 left-4 right-4 flex justify-between text-xs text-gray-500">
            <span>{formatTime(startTime)}</span>
            <span>{formatTime(startTime + duration / 4)}</span>
            <span>{formatTime(startTime + duration / 2)}</span>
            <span>{formatTime(startTime + (duration * 3) / 4)}</span>
            <span>{formatTime(startTime + duration)}</span>
          </div>

          {/* Critical points as interactive dots */}
          {criticalPoints.map((point, index) => {
            const position = getPositionPercent(point)
            // Adjust position to account for padding
            const adjustedPosition = 4 + (position * (100 - 8)) / 100

            return (
              <div
                key={index}
                className={`absolute w-4 h-4 rounded-full -translate-x-1/2 -translate-y-1/2 top-1/2 cursor-pointer transition-all hover:scale-125 border-1.5 ${
                  selectedPoint && selectedPoint.timestamp === point.timestamp
                    ? "ring-1 ring-offset-2 ring-blue-400 z-30"
                    : "z-10"
                }`}
                style={{
                  left: `${adjustedPosition}%`,
                  backgroundColor: getActionColorHex(point.normalizedType || point.actionType),
                }}
                onClick={() => onPointSelect(point)}
                onMouseEnter={() => setHoveredPoint(point)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {(hoveredPoint === point || (selectedPoint && selectedPoint.timestamp === point.timestamp)) && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-2 rounded whitespace-nowrap z-40 shadow-lg min-w-[150px]">
                    <div className="font-bold">
                      {point.videoTimestamp !== undefined
                        ? `Video: ${formatTime(point.videoTimestamp)}`
                        : formatTime(point.timestamp)}
                    </div>
                    <div className="font-medium">{point.actionType}</div>
                    {point.coordinates && (
                      <div className="text-gray-300">
                        Position: ({point.coordinates.x}, {point.coordinates.y})
                      </div>
                    )}
                    {point.key && <div className="text-gray-300">Key: {point.key}</div>}
                    {index > 0 && (
                      <div className="text-gray-300 text-xs mt-1">
                        Time since previous:{" "}
                        {formatDuration(
                          (point.videoTimestamp !== undefined ? point.videoTimestamp : point.timestamp) -
                            (criticalPoints[index - 1].videoTimestamp !== undefined
                              ? criticalPoints[index - 1].videoTimestamp
                              : criticalPoints[index - 1].timestamp),
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* Transition lines between points */}
          {criticalPoints.map((point, index) => {
            if (index === 0) return null

            const prevPoint = criticalPoints[index - 1]
            const prevPosition = getPositionPercent(prevPoint)
            const currPosition = getPositionPercent(point)

            // Adjust positions to account for padding
            const adjustedPrevPos = 4 + (prevPosition * (100 - 8)) / 100
            const adjustedCurrPos = 4 + (currPosition * (100 - 8)) / 100

            // Only draw line if it's a transition between different normalized event types
            if (prevPoint.normalizedType !== point.normalizedType) {
              return (
                <div
                  key={`transition-${index}`}
                  className="absolute top-1/2 h-0.5 bg-blue-300 transform -translate-y-1/2 z-5"
                  style={{
                    left: `${adjustedPrevPos}%`,
                    width: `${adjustedCurrPos - adjustedPrevPos}%`,
                  }}
                />
              )
            }
            return null
          })}
        </div>

        {/* List of critical points */}
        <div className="mt-6 space-y-2">
          <h4 className="font-medium">Critical Points List</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
            {criticalPoints.map((point, index) => (
              <div
                key={index}
                className={`p-3 rounded-md cursor-pointer transition-colors ${
                  selectedPoint && selectedPoint.timestamp === point.timestamp
                    ? "bg-blue-100 border border-blue-300"
                    : "bg-gray-100 hover:bg-gray-400"
                }`}
                onClick={() => {
                  onPointSelect(point)
                  setHoveredPoint(null)
                }}
              >
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getActionColorHex(point.normalizedType || point.actionType) }}
                  ></div>
                  <span className="font-medium">
                    {point.videoTimestamp !== undefined
                      ? formatTime(point.videoTimestamp)
                      : formatTime(point.timestamp)}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {point.actionType} {point.coordinates ? `at (${point.coordinates.x}, ${point.coordinates.y})` : ""}
                  {point.key ? ` Key: ${point.key}` : ""}
                </div>
                {index > 0 && prevPointHasDifferentType(point, criticalPoints[index - 1]) && (
                  <div className="text-xs text-blue-600 mt-1">
                    Transition: {getNormalizedTypeName(criticalPoints[index - 1])} {"->"} {getNormalizedTypeName(point)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Video mode timeline
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">
        Video Time
        {criticalPoints.length > 0 && (
          <span className="text-sm text-gray-500 ml-2">({criticalPoints.length} points)</span>
        )}
      </h3>

      <div
        ref={timelineRef}
        className="relative h-16 bg-gray-200 rounded-md cursor-pointer border border-gray-200"
        onClick={handleTimelineClick}
      >
        {/* Timeline track - horizontal line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-300"></div>

        {/* Critical points */}
        {criticalPoints.map((point, index) => (
          <div
            key={index}
            className={`absolute w-4 h-4 rounded-full -translate-x-1/2 -translate-y-1/2 top-1/2 cursor-pointer transition-all ${
              selectedPoint && selectedPoint.timestamp === point.timestamp
                ? "w-5 h-5 border-4 border-blue-600 z-20" 
                : hoveredPoint === point
                  ? "scale-125 z-10"
                  : ""
            }`}
            style={{
              left: `${getPositionPercent(point)}%`,
              backgroundColor: getActionColorHex(point.normalizedType || point.actionType),
            }}
            onClick={(e) => {
              e.stopPropagation()
              onPointSelect(point);
              setHoveredPoint(point)
            }}
            onMouseEnter={() => setHoveredPoint(point)}
            onMouseLeave={() => setHoveredPoint(null)}
          >
            {(hoveredPoint === point || (selectedPoint && selectedPoint.timestamp === point.timestamp)) && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-30">
                {point.videoTimestamp !== undefined ? formatTime(point.videoTimestamp) : formatTime(point.timestamp)}:{" "}
                {point.actionType}
                {point.key ? ` (${point.key})` : ""}
              </div>
            )}
          </div>
        ))}

        {/* Time markers */}
        <div className="absolute inset-x-0 bottom-0 flex justify-between px-4 text-xs text-gray-500 mt-2">
          <span>{formatTime(startTime)}</span>
          <span>{formatTime(startTime + duration / 4)}</span>
          <span>{formatTime(startTime + duration / 2)}</span>
          <span>{formatTime(startTime + (duration * 3) / 4)}</span>
          <span>{formatTime(startTime + duration)}</span>
        </div>
      </div>
    </div>
  )
}

// Helper function to check if two points have different normalized types
function prevPointHasDifferentType(current: CriticalPoint, previous: CriticalPoint): boolean {
  return (current.normalizedType || current.actionType) !== (previous.normalizedType || previous.actionType)
}

// Helper function to get a display name for the normalized type
function getNormalizedTypeName(point: CriticalPoint): string {
  return point.normalizedType || point.actionType
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`
}

function formatDuration(seconds: number): string {
  if (seconds < 1) {
    return `${Math.floor(seconds * 1000)}ms`
  } else {
    const secs = Math.floor(seconds)
    const ms = Math.floor((seconds % 1) * 1000)
    return `${secs}s ${ms}ms`
  }
}

// Update the getActionColorHex function to handle normalized event types
function getActionColorHex(actionType: string): string {
  switch (actionType.toLowerCase()) {
    case "keyboard":
      return "#8b5cf6" // purple-500
    case "mousemove":
      return "#10b981" // green-500
    case "mouseaction":
      return "#ef4444" // red-500
    case "scroll":
      return "#f59e0b" // yellow-500
    // Legacy support for specific types
    case "keypress":
    case "keydown":
    case "keyup":
    case "keyrelease":
      return "#8b5cf6" // purple-500
    case "mousedown":
      return "#ef4444" // red-500
    case "mouseup":
      return "#dc2626" // red-600
    case "click":
      return "#b91c1c" // red-700
    default:
      return "#6b7280" // gray-500
  }
}
