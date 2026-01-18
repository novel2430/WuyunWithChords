import { Beat, Range } from "@signal-app/core"
import type { BarSelection } from "./types"

export type SelectionInfo = {
  startBar: number
  endBar: number
  bars: number
  fromTick: number
  toTick: number
  barStartTicksAbs: number[]
  barEndTicksAbs: number[]
}

export function computeSelectionInfo(
  barSelection: BarSelection | null,
  measures: any[] | undefined,
  timebase: number | undefined
): SelectionInfo | null {
  if (!barSelection) return null
  if (!Array.isArray(measures) || measures.length === 0) return null
  if (typeof timebase !== "number") return null

  const from = barSelection.fromTick
  const to = barSelection.toTick
  const range = Range.create(from, to)

  const beats = Beat.createInRange(measures as any, timebase, range)

  // 每小节的起点 tick：beat === 0
  const barBeats = beats.filter((b: any) => b.beat === 0)
  const starts = barBeats.map((b: any) => b.tick as number).filter((t: any) => typeof t === "number")

  if (starts.length === 0) {
    return {
      startBar: 1,
      endBar: 1,
      bars: 1,
      fromTick: from,
      toTick: to,
      barStartTicksAbs: [from],
      barEndTicksAbs: [to],
    }
  }

  const startBar = (barBeats[0] as any).measure + 1
  const endBar = (barBeats[barBeats.length - 1] as any).measure + 1
  const bars = starts.length
  const ends = starts.slice(1).concat([to])

  return {
    startBar,
    endBar,
    bars,
    fromTick: from,
    toTick: to,
    barStartTicksAbs: starts,
    barEndTicksAbs: ends,
  }
}

