"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { FileUploader } from "@/components/file-uploader"
import { Timeline } from "@/components/timeline"
import { VideoPlayer } from "@/components/video-player"
import { ImageViewer } from "@/components/image-viewer"
import { parseLogFile } from "@/lib/log-parser"
import { extractFrameFromVideo } from "@/lib/video-utils"
import { TimeMapper } from "@/lib/time-mapper"
import type { CriticalPoint } from "@/lib/types"
import { ChevronLeft, ChevronRight } from "lucide-react"

export default function TimelineAnalyzer() {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [logFile, setLogFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [criticalPoints, setCriticalPoints] = useState<CriticalPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentMode, setCurrentMode] = useState<"image" | "video">("image")
  const [selectedPoint, setSelectedPoint] = useState<CriticalPoint | null>(null)
  const [frames, setFrames] = useState<Map<number, string>>(new Map())
  const [isExtractingFrames, setIsExtractingFrames] = useState(false)
  const [extractionProgress, setExtractionProgress] = useState(0)
  const [timeMapper, setTimeMapper] = useState<TimeMapper | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Reset function to clear all states
  const handleReset = useCallback(() => {
    setVideoFile(null)
    setLogFile(null)
    setVideoUrl(null)
    setCriticalPoints([])
    setIsLoading(false)
    setCurrentMode("image")
    setSelectedPoint(null)
    setFrames(new Map())
    setIsExtractingFrames(false)
    setExtractionProgress(0)
    setTimeMapper(null)
    
    // Clean up video URL if it exists
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl)
    }
  }, [videoUrl])

  // Process the uploaded files
  useEffect(() => {
    if (videoFile && logFile) {
      setIsLoading(true)

      // Create object URL for video
      const url = URL.createObjectURL(videoFile)
      setVideoUrl(url)

      // Parse log file
      const reader = new FileReader()
      reader.onload = async (e) => {
        if (e.target?.result) {
          const content = e.target.result as string
          const points = await parseLogFile(content)

          // Wait for video metadata to load to get duration
          if (videoRef.current) {
            if (videoRef.current.readyState < 1) {
              await new Promise<void>((resolve) => {
                const handleMetadata = () => {
                  videoRef.current?.removeEventListener("loadedmetadata", handleMetadata)
                  resolve()
                }
                videoRef.current.addEventListener("loadedmetadata", handleMetadata)
              })
            }

            // Create time mapper
            if (points.length > 0) {
              const videoDuration = videoRef.current.duration
              const logStartTime = points[0].timestamp
              const logEndTime = points[points.length - 1].timestamp

              const mapper = new TimeMapper(logStartTime, logEndTime, videoDuration)
              setTimeMapper(mapper)

              // Map log timestamps to video timestamps
              const mappedPoints = points.map((point) => ({
                ...point,
                videoTimestamp: mapper.mapToVideoTime(point.timestamp),
              }))

              setCriticalPoints(mappedPoints)

              // Select the first point by default
              if (mappedPoints.length > 0) {
                setSelectedPoint(mappedPoints[0])
              }
            } else {
              setCriticalPoints([])
            }
          }

          setIsLoading(false)
        }
      }
      reader.readAsText(logFile)

      return () => {
        URL.revokeObjectURL(url)
      }
    }
  }, [videoFile, logFile])

  // Extract frames for all critical points once video is loaded
  useEffect(() => {
    const extractAllFrames = async () => {
      if (!videoRef.current || !videoUrl || criticalPoints.length === 0) return

      setIsExtractingFrames(true)
      setExtractionProgress(0)

      const newFrames = new Map<number, string>()

      // Wait for video metadata to load
      if (videoRef.current.readyState < 1) {
        await new Promise<void>((resolve) => {
          const handleMetadata = () => {
            videoRef.current?.removeEventListener("loadedmetadata", handleMetadata)
            resolve()
          }
          videoRef.current.addEventListener("loadedmetadata", handleMetadata)
        })
      }

      // Extract frames for each critical point
      for (let i = 0; i < criticalPoints.length; i++) {
        const point = criticalPoints[i]
        // Use the mapped video timestamp for extraction
        const videoTime = point.videoTimestamp !== undefined ? point.videoTimestamp : point.timestamp

        // Skip points that map beyond the video duration
        if (videoTime > videoRef.current.duration) {
          console.warn(`Skipping point at ${videoTime}s as it exceeds video duration ${videoRef.current.duration}s`)
          continue
        }

        const frame = await extractFrameFromVideo(videoRef.current, videoTime)
        newFrames.set(point.timestamp, frame) // Store with original timestamp as key

        // Update progress
        setExtractionProgress(Math.round(((i + 1) / criticalPoints.length) * 100))
      }

      setFrames(newFrames)
      setIsExtractingFrames(false)
    }

    if (!isLoading && criticalPoints.length > 0 && videoUrl) {
      extractAllFrames()
    }
  }, [isLoading, criticalPoints, videoUrl])

  // Handle point selection in image mode
  const handlePointSelect = useCallback((point: CriticalPoint) => {
    setSelectedPoint(point)
  }, [])

  // Handle video seek in video mode
  const handleSeek = useCallback((point: CriticalPoint) => {
    if (videoRef.current) {
      // Use the mapped video timestamp for seeking
      const videoTime = point.videoTimestamp !== undefined ? point.videoTimestamp : point.timestamp
      videoRef.current.currentTime = videoTime
    }
  }, [])

  // Move the handlePreviousPoint and handleNextPoint functions to use useCallback to avoid dependency issues
  const handlePreviousPoint = useCallback(() => {
    if (!selectedPoint || criticalPoints.length === 0) return

    const currentIndex = criticalPoints.findIndex((point) => point.timestamp === selectedPoint.timestamp)
    if (currentIndex > 0) {
      handlePointSelect(criticalPoints[currentIndex - 1])
    }
  }, [selectedPoint, criticalPoints, handlePointSelect])

  const handleNextPoint = useCallback(() => {
    if (!selectedPoint || criticalPoints.length === 0) return

    const currentIndex = criticalPoints.findIndex((point) => point.timestamp === selectedPoint.timestamp)
    if (currentIndex < criticalPoints.length - 1) {
      handlePointSelect(criticalPoints[currentIndex + 1])
    }
  }, [selectedPoint, criticalPoints, handlePointSelect])

  // Add keyboard event listener for arrow key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentMode === "image") {
        if (e.key === "ArrowLeft") {
          handlePreviousPoint()
        } else if (e.key === "ArrowRight") {
          handleNextPoint()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [currentMode, handlePreviousPoint, handleNextPoint])

  // Get the current frame for the selected point
  const getCurrentFrame = useCallback(() => {
    if (!selectedPoint) return null
    return frames.get(selectedPoint.timestamp) || null
  }, [selectedPoint, frames])

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Timelines</h1>

      <div className="relative">


        {!videoFile || !logFile ? (
          <FileUploader onVideoUpload={setVideoFile} onLogUpload={setLogFile} />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setCurrentMode("image")}
                  className={`px-4 py-2 rounded-md ${
                    currentMode === "image" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800"
                  }`}
                >
                  Image Mode
                </button>
                <button
                  onClick={() => setCurrentMode("video")}
                  className={`px-4 py-2 rounded-md ${
                    currentMode === "video" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800"
                  }`}
                >
                  Video Mode
                </button>
              </div>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                New Conversion
              </button>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : isExtractingFrames ? (
              <div className="flex flex-col justify-center items-center h-64">
                <div className="mb-4 text-lg font-medium">Extracting frames from video...</div>
                <div className="w-full max-w-md bg-gray-200 rounded-full h-4 mb-2">
                  <div
                    className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                    style={{ width: `${extractionProgress}%` }}
                  ></div>
                </div>
                <div className="text-sm text-gray-600">{extractionProgress}% complete</div>
              </div>
            ) : (
              <>
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h3 className="text-sm font-medium mb-2">Event Type Legend</h3>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: "#8b5cf6" }}></div>
                      <span className="text-sm">Keyboard Events</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: "#10b981" }}></div>
                      <span className="text-sm">Mouse Movement</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: "#ef4444" }}></div>
                      <span className="text-sm">Mouse Actions</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: "#f59e0b" }}></div>
                      <span className="text-sm">Scroll</span>
                    </div>
                  </div>
                </div>

                {currentMode === "image" ? (
                  <div className="space-y-6">
                    {/* Frame viewer and details at the top */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      <div>
                        <ImageViewer frame={getCurrentFrame()} metadata={selectedPoint} />
                      </div>
                      <div>
                        {selectedPoint && (
                          <div className="bg-gray-50 p-4 rounded-lg h-full">
                            <h3 className="text-lg font-medium mb-4">Event Details</h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-gray-600 font-medium">Log Timestamp:</div>
                              <div>{formatDetailedTime(selectedPoint.timestamp)}</div>

                              <div className="text-gray-600 font-medium">Video Timestamp:</div>
                              <div>
                                {selectedPoint.videoTimestamp !== undefined
                                  ? formatDetailedTime(selectedPoint.videoTimestamp)
                                  : "Not mapped"}
                              </div>

                              <div className="text-gray-600 font-medium">Event Type:</div>
                              <div className="font-medium">{selectedPoint.actionType}</div>

                              <div className="text-gray-600 font-medium">Category:</div>
                              <div>{selectedPoint.normalizedType || selectedPoint.actionType}</div>

                              {selectedPoint.coordinates && (
                                <>
                                  <div className="text-gray-600 font-medium">Coordinates:</div>
                                  <div>
                                    X: {selectedPoint.coordinates.x}, Y: {selectedPoint.coordinates.y}
                                  </div>
                                </>
                              )}

                              {selectedPoint.key && (
                                <>
                                  <div className="text-gray-600 font-medium">Key:</div>
                                  <div>{selectedPoint.key}</div>
                                </>
                              )}

                              {selectedPoint.target && (
                                <>
                                  <div className="text-gray-600 font-medium">Target Element:</div>
                                  <div>{selectedPoint.target}</div>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Navigation controls */}
                    <div className="flex justify-center items-center space-x-4 mb-4">
                      <button
                        onClick={handlePreviousPoint}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!selectedPoint || criticalPoints.indexOf(selectedPoint) === 0}
                      >
                        <ChevronLeft className="mr-1" size={18} /> Previous
                      </button>
                      <div className="text-sm text-gray-600">
                        {selectedPoint && criticalPoints.length > 0 ? (
                          <>
                            Point {criticalPoints.indexOf(selectedPoint) + 1} of {criticalPoints.length}
                          </>
                        ) : (
                          <>No points selected</>
                        )}
                      </div>
                      <button
                        onClick={handleNextPoint}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!selectedPoint || criticalPoints.indexOf(selectedPoint) === criticalPoints.length - 1}
                      >
                        Next <ChevronRight className="ml-1" size={18} />
                      </button>
                    </div>

                    {/* Timeline below the frame */}
                    <div className="w-full">
                      <Timeline
                        criticalPoints={criticalPoints}
                        onPointSelect={handlePointSelect}
                        selectedPoint={selectedPoint}
                        mode="image"
                        timeMapper={timeMapper}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <VideoPlayer videoUrl={videoUrl!} videoRef={videoRef} />
                    <Timeline
                      criticalPoints={criticalPoints}
                      onPointSelect={handleSeek}
                      mode="video"
                      timeMapper={timeMapper}
                    />
                  </div>
                )}
              </>
            )}

            {/* Video element for frame extraction */}
            {videoUrl && <video ref={videoRef} src={videoUrl} className="hidden" preload="auto" />}
          </div>
        )}
      </div>
    </div>
  )
}

// Add this helper function at the bottom of the file
function formatDetailedTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`
}
