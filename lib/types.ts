export interface Coordinates {
  x: number
  y: number
}

export interface CriticalPoint {
  timestamp: number // Original timestamp from log
  videoTimestamp?: number // Mapped timestamp for video
  actionType: string
  normalizedType?: string // Added for grouping similar events
  coordinates?: Coordinates
  key?: string
  target?: string
}
