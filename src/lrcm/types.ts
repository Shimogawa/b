export interface Duration {
  startTime?: number
  endTime?: number
}

export interface TimedObject {
  text: string
  duration: Duration
}

export interface LyricElement {
  obj: TimedObject
  furi?: TimedObject[]
}
