"use client"

import type { CriticalPoint } from "@/lib/types"

interface ImageViewerProps {
  frame: string | null
  metadata: CriticalPoint | null
}

export function ImageViewer({ frame, metadata }: ImageViewerProps) {
  if (!frame && !metadata) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg">
        <p className="text-gray-500">Select a critical point to view the frame</p>
      </div>
    )
  }

  if (!frame) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">
        Frame at{" "}
        {metadata && (
          <>
            {metadata.videoTimestamp !== undefined
              ? formatDetailedTime(metadata.videoTimestamp)
              : formatDetailedTime(metadata.timestamp)}
          </>
        )}
      </h3>

      <div className="border rounded-lg overflow-hidden shadow-md">
        <div className="relative">
          <img src={frame || "/placeholder.svg"} alt={`Frame at ${metadata?.timestamp}`} className="w-full" />

          {/* Overlay key information for keyboard events */}
          {metadata && metadata.key && metadata.normalizedType === "Keyboard" && (
            <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-2 rounded-md">
              <div className="font-bold">{metadata.actionType}</div>
              <div>Key: {metadata.key}</div>
            </div>
          )}

          {/* Overlay button information for ButtonPress events */}
          {metadata && metadata.normalizedType === "ButtonPress" && (
            <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-2 rounded-md">
              <div className="font-bold">{metadata.actionType}</div>
              {metadata.coordinates && (
                <div>Position: ({metadata.coordinates.x}, {metadata.coordinates.y})</div>
              )}
            </div>
          )}

          {/* Overlay cursor position for MouseMove events */}
          {metadata && metadata.coordinates && metadata.normalizedType === "MouseMove" && (
            <>
              <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded-md">
                <div className="font-bold">{metadata.actionType}</div>
                <div>
                  Position: ({metadata.coordinates.x}, {metadata.coordinates.y})
                </div>
              </div>

              {/* Visual indicator of cursor position */}
              <div
                className="absolute w-6 h-6 rounded-full border-2 border-red-500 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{
                  left: `${(metadata.coordinates.x / 1920) * 100}%`,
                  top: `${(metadata.coordinates.y / 1080) * 100}%`,
                }}
              >
                <div className="absolute w-2 h-2 bg-red-500 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function formatDetailedTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`
}
