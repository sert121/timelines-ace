export async function extractFrameFromVideo(video: HTMLVideoElement, timestamp: number): Promise<string> {
  return new Promise((resolve) => {
    // Set the video to the specified timestamp
    video.currentTime = timestamp

    // Wait for the video to update to the new time
    video.addEventListener(
      "seeked",
      () => {
        // Create a canvas element to draw the video frame
        const canvas = document.createElement("canvas")
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        // Draw the current frame to the canvas
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

          // Convert the canvas to a data URL
          const dataUrl = canvas.toDataURL("image/jpeg", 0.95)
          resolve(dataUrl)
        } else {
          // Fallback if canvas context is not available
          resolve("")
        }
      },
      { once: true },
    )
  })
}
