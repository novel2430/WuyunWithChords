// src/MyCode/barSelection/useBarSelectionMidi.ts
import { useCallback } from "react"
import { isNoteEvent } from "@signal-app/core"
import { useHistory } from "../../hooks/useHistory"
import { usePianoRoll } from "../../hooks/usePianoRoll"
import { useTrack } from "../../hooks/useTrack"
import { useBarSelection } from "./store"
import { NoteDraft } from "./types"
import { extractNotesInRange, notesIntersectRangeIds } from "./midiRange"

export function useExtractBarSelectionNotes() {
  const { selectedTrackId } = usePianoRoll()
  const { getEvents } = useTrack(selectedTrackId)
  const { barSelection } = useBarSelection()

  return useCallback(() => {
    if (!barSelection) return null
    const events = getEvents()
    return {
      range: barSelection,
      notes: extractNotesInRange(events, barSelection.fromTick, barSelection.toTick),
    }
  }, [barSelection, getEvents])
}

export function useOverwriteBarSelectionNotes() {
  const { pushHistory } = useHistory()
  const { selectedTrackId } = usePianoRoll()
  const { getEvents, removeEvents, addEvents } = useTrack(selectedTrackId)
  const { barSelection } = useBarSelection()

  return useCallback(
    (notesRel: NoteDraft[]) => {
      if (!barSelection) return

      const { fromTick, toTick } = barSelection
      const events = getEvents()

      // 删除选区内所有 note
      const ids = notesIntersectRangeIds(events, fromTick, toTick)
      pushHistory()
      if (ids.length > 0) removeEvents(ids)

      // 写回：把相对 tick 平移到绝对 tick，并裁剪 duration 防越界
      const len = toTick - fromTick
      const notesAbs = notesRel
        .map((n) => {
          const absTick = fromTick + n.tick
          const end = Math.min(fromTick + len, absTick + n.duration)
          const dur = end - absTick
          if (dur <= 0) return null
          return { ...n, tick: absTick, duration: dur }
        })
        .filter((x): x is NoteDraft => x !== null)

      if (notesAbs.length > 0) addEvents(notesAbs as any)
    },
    [barSelection, getEvents, removeEvents, addEvents, pushHistory],
  )
}

