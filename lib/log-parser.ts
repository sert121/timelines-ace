import type { CriticalPoint } from "./types"

// Helper function to normalize event types into broader categories
function normalizeEventType(actionType: string): string {
  // Normalize to lowercase for consistent comparison
  const type = actionType.toLowerCase()

  // Group keyboard-related events
  if (type.includes("key")) {
    return "Keyboard"
  }

  // Group mouse movement events
  if (type === "mousemove") {
    return "MouseMove"
  }

  // Group other mouse events
  if (type === "mousedown" || type === "mouseup" || type === "click") {
    return "MouseAction"
  }

  // Group scroll events
  if (type === "scroll") {
    return "Scroll"
  }

  // Default case - keep original
  return actionType
}

export async function parseLogFile(content: string): Promise<CriticalPoint[]> {
  // Split the log file into lines
  const lines = content.split("\n").filter((line) => line.trim() !== "")

  // Parse each line into a log entry
  const logEntries: CriticalPoint[] = []

  for (const line of lines) {
    try {
      // Try parsing as JSON first
      try {
        const jsonEntry = JSON.parse(line)
        if (jsonEntry.timestamp !== undefined && jsonEntry.actionType !== undefined) {
          const entry: CriticalPoint = {
            timestamp: Number.parseFloat(jsonEntry.timestamp),
            actionType: jsonEntry.actionType,
            // Store the normalized type for grouping
            normalizedType: normalizeEventType(jsonEntry.actionType),
          }

          if (jsonEntry.x !== undefined && jsonEntry.y !== undefined) {
            entry.coordinates = { x: jsonEntry.x, y: jsonEntry.y }
          }

          if (jsonEntry.key) {
            entry.key = jsonEntry.key
          }

          if (jsonEntry.target) {
            entry.target = jsonEntry.target
          }

          logEntries.push(entry)
          continue
        }
      } catch (e) {
        // Not JSON, continue with other parsing methods
      }

      // Parse SystemTime format: SystemTime { tv_sec: X, tv_nsec: Y }: ActionType Data
      const systemTimeMatch = line.match(
        /SystemTime\s*{\s*tv_sec:\s*(\d+),\s*tv_nsec:\s*(\d+)\s*}:\s*(\w+)(?:\s+(.+))?/,
      )
      if (systemTimeMatch) {
        const [, secStr, nsecStr, actionType, data] = systemTimeMatch

        // Convert to seconds (seconds + nanoseconds/1e9)
        const sec = Number.parseInt(secStr, 10)
        const nsec = Number.parseInt(nsecStr, 10)
        const timestamp = sec + nsec / 1e9

        const entry: CriticalPoint = {
          timestamp,
          actionType,
          // Store the normalized type for grouping
          normalizedType: normalizeEventType(actionType),
        }

        // Handle different data formats based on action type
        if (actionType === "MouseMove" && data) {
          const [x, y] = data.split(",").map((coord) => Number.parseInt(coord.trim(), 10))
          if (!isNaN(x) && !isNaN(y)) {
            entry.coordinates = { x, y }
          }
        } else if ((actionType === "KeyPress" || actionType === "KeyRelease") && data) {
          entry.key = data.trim()
        }

        logEntries.push(entry)
        continue
      }

      // Try parsing common log formats
      // Format: [timestamp] action_type (x, y)
      const bracketMatch = line.match(/\[(\d+\.\d+)\]\s+(\w+)(?:\s+$$(\d+),\s*(\d+)$$)?/)
      if (bracketMatch) {
        const [, timestamp, actionType, x, y] = bracketMatch
        const entry: CriticalPoint = {
          timestamp: Number.parseFloat(timestamp),
          actionType,
          normalizedType: normalizeEventType(actionType),
        }

        if (x && y) {
          entry.coordinates = { x: Number.parseInt(x), y: Number.parseInt(y) }
        }

        logEntries.push(entry)
        continue
      }

      // Format: timestamp action_type x y
      const spaceMatch = line.match(/(\d+\.\d+)\s+(\w+)(?:\s+(\d+)\s+(\d+))?/)
      if (spaceMatch) {
        const [, timestamp, actionType, x, y] = spaceMatch
        const entry: CriticalPoint = {
          timestamp: Number.parseFloat(timestamp),
          actionType,
          normalizedType: normalizeEventType(actionType),
        }

        if (x && y) {
          entry.coordinates = { x: Number.parseInt(x), y: Number.parseInt(y) }
        }

        logEntries.push(entry)
        continue
      }
    } catch (e) {
      console.error("Error parsing log line:", line, e)
    }
  }

  // Sort entries by timestamp
  logEntries.sort((a, b) => a.timestamp - b.timestamp)

  // Group events by normalized type and identify ONLY transitions
  const criticalPoints: CriticalPoint[] = []

  // Add the very first event as a critical point
  if (logEntries.length > 0) {
    criticalPoints.push(logEntries[0])
  }

  // Find transitions between normalized event types
  let currentType = logEntries.length > 0 ? logEntries[0].normalizedType : null

  for (let i = 1; i < logEntries.length; i++) {
    const current = logEntries[i]

    // If there's a transition between normalized event types
    if (current.normalizedType !== currentType) {
      // Add the last event of the previous type
      // Find the last event of the previous type
      let lastOfPreviousType = null
      for (let j = i - 1; j >= 0; j--) {
        if (logEntries[j].normalizedType === currentType) {
          lastOfPreviousType = logEntries[j]
          break
        }
      }

      if (lastOfPreviousType && !criticalPoints.some((p) => p.timestamp === lastOfPreviousType.timestamp)) {
        criticalPoints.push(lastOfPreviousType)
      }

      // Add the first event of the new type
      criticalPoints.push(current)

      // Update current type
      currentType = current.normalizedType
    }
  }

  // Add the very last event as a critical point if it's not already added
  if (logEntries.length > 0) {
    const lastEntry = logEntries[logEntries.length - 1]
    if (!criticalPoints.some((p) => p.timestamp === lastEntry.timestamp)) {
      criticalPoints.push(lastEntry)
    }
  }

  // Sort by timestamp to ensure proper order
  criticalPoints.sort((a, b) => a.timestamp - b.timestamp)

  return criticalPoints
}
