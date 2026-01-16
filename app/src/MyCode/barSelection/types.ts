// src/MyCode/barSelection/types.ts
import { NoteEvent } from "@signal-app/core"

export type BarSelection = {
  /** absolute song ticks, [fromTick, toTick) */
  readonly fromTick: number
  readonly toTick: number
}

export type NoteDraft = Omit<NoteEvent, "id">

