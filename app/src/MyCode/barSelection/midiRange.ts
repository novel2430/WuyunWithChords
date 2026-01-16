// src/MyCode/barSelection/midiRange.ts
import { NoteDraft } from "./types"
import { TrackEvent, isNoteEvent } from "@signal-app/core"

export function extractNotesInRange(
  events: readonly TrackEvent[],
  fromTick: number,
  toTick: number,
): NoteDraft[] {
  const out: NoteDraft[] = []

  for (const ev of events) {
    if (!isNoteEvent(ev)) continue

    const a = ev.tick
    const b = ev.tick + ev.duration
    const start = Math.max(a, fromTick)
    const end = Math.min(b, toTick)
    if (end <= start) continue

    const { id: _id, ...rest } = ev
    out.push({
      ...rest,
      tick: start - fromTick,         // 转相对 tick
      duration: end - start,          // 裁剪到选区内
    })
  }

  return out
}

export function notesIntersectRangeIds(
  events: readonly TrackEvent[],
  fromTick: number,
  toTick: number,
): number[] {
  return events
    .filter(isNoteEvent)
    .filter((n) => n.tick < toTick && n.tick + n.duration > fromTick)
    .map((n) => n.id)
}

