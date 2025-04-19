"use client"

import type React from "react"

import { useState } from "react"
import { Upload } from "lucide-react"

interface FileUploaderProps {
  onVideoUpload: (file: File) => void
  onLogUpload: (file: File) => void
}

export function FileUploader({ onVideoUpload, onLogUpload }: FileUploaderProps) {
  const [videoName, setVideoName] = useState<string | null>(null)
  const [logName, setLogName] = useState<string | null>(null)

  const handleVideoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("video/")) {
      onVideoUpload(file)
      setVideoName(file.name)
    }
  }

  const handleLogDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      onLogUpload(file)
      setLogName(file.name)
    }
  }

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onVideoUpload(e.target.files[0])
      setVideoName(e.target.files[0].name)
    }
  }

  const handleLogChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onLogUpload(e.target.files[0])
      setLogName(e.target.files[0].name)
    }
  }

  const preventDefault = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center ${
          videoName ? "border-green-500 bg-green-50" : "border-gray-300"
        }`}
        onDrop={handleVideoDrop}
        onDragOver={preventDefault}
        onDragEnter={preventDefault}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-3 bg-blue-50 rounded-full">
            <Upload className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-medium">Upload Screen Recording</h3>
          {videoName ? (
            <p className="text-green-600 font-medium">{videoName}</p>
          ) : (
            <p className="text-sm text-gray-500">Drag and drop your video file here, or click to browse</p>
          )}
          <input type="file" id="video-upload" className="hidden" accept="video/*" onChange={handleVideoChange} />
          <label
            htmlFor="video-upload"
            className="px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 transition-colors"
          >
            {videoName ? "Change Video" : "Select Video"}
          </label>
        </div>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center ${
          logName ? "border-green-500 bg-green-50" : "border-gray-300"
        }`}
        onDrop={handleLogDrop}
        onDragOver={preventDefault}
        onDragEnter={preventDefault}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-3 bg-blue-50 rounded-full">
            <Upload className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-medium">Upload Log File</h3>
          {logName ? (
            <p className="text-green-600 font-medium">{logName}</p>
          ) : (
            <p className="text-sm text-gray-500">Drag and drop your log file here, or click to browse</p>
          )}
          <input type="file" id="log-upload" className="hidden" accept=".log,.txt,.json" onChange={handleLogChange} />
          <label
            htmlFor="log-upload"
            className="px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 transition-colors"
          >
            {logName ? "Change Log" : "Select Log"}
          </label>
        </div>
      </div>
    </div>
  )
}
