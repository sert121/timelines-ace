/**
 * TimeMapper creates a mapping between log file timestamps and video timestamps
 * This ensures that frames are extracted at the correct points in the video
 */
export class TimeMapper {
  private startLogTime: number
  private endLogTime: number
  private videoDuration: number

  constructor(logStartTime: number, logEndTime: number, videoDuration: number) {
    this.startLogTime = logStartTime
    this.endLogTime = logEndTime
    this.videoDuration = videoDuration
  }

  /**
   * Maps a log timestamp to a video timestamp
   * @param logTime The timestamp from the log file
   * @returns The corresponding timestamp in the video
   */
  public mapToVideoTime(logTime: number): number {
    // Calculate the log duration
    const logDuration = this.endLogTime - this.startLogTime

    // If log has zero duration, map everything to the start of the video
    if (logDuration === 0) return 0

    // Calculate the relative position in the log timeline (0 to 1)
    const relativePosition = (logTime - this.startLogTime) / logDuration

    // Map this relative position to the video timeline
    const videoTime = relativePosition * this.videoDuration

    // Ensure we don't exceed video bounds
    return Math.max(0, Math.min(videoTime, this.videoDuration))
  }

  /**
   * Maps a video timestamp to a log timestamp
   * @param videoTime The timestamp in the video
   * @returns The corresponding timestamp in the log file
   */
  public mapToLogTime(videoTime: number): number {
    // Calculate the log duration
    const logDuration = this.endLogTime - this.startLogTime

    // Calculate the relative position in the video timeline (0 to 1)
    const relativePosition = videoTime / this.videoDuration

    // Map this relative position to the log timeline
    return this.startLogTime + relativePosition * logDuration
  }

  /**
   * Checks if a log timestamp is within the video duration
   * @param logTime The timestamp from the log file
   * @returns True if the timestamp maps to a point within the video duration
   */
  public isWithinVideoDuration(logTime: number): boolean {
    const videoTime = this.mapToVideoTime(logTime)
    return videoTime >= 0 && videoTime <= this.videoDuration
  }
}
