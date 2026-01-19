import { useEffect, useMemo } from "react"
import { usePianoRoll } from "../../hooks/usePianoRoll"
import { useSong } from "../../hooks/useSong"
import { useTrack } from "../../hooks/useTrack"
import { useBarSelection } from "./store"
import { extractNotesInRange } from "./midiRange"

/*
 * 选区变化时，把：选中小节范围、当前 track、以及选区内 notes 打印到 console。
 * 只用于调试，建议后续移除/加开关。
 */
export function useBarSelectionDebugLog(enabled = true) {
  const { barSelection } = useBarSelection()
  const { selectedTrackId } = usePianoRoll()
  const { getEvents } = useTrack(selectedTrackId)
  const { timebase } = useSong()

  // 为了避免频繁日志，这里只在 selection / track 改变时触发
  useEffect(() => {
    if (!enabled) return

    if (!barSelection) {
      console.log("[BarSel] cleared")
      return
    }

    const events = getEvents()
    const notes = extractNotesInRange(events, barSelection.fromTick, barSelection.toTick)

    // 你想要的：小节范围、内容、track
    console.log("[BarSel] track =", selectedTrackId)
    console.log("[BarSel] range ticks =", barSelection, "len =", barSelection.toTick - barSelection.fromTick, "timebase =", timebase)
    console.log("[BarSel] notes (relative ticks) =", notes)

    // 如果你还想看“绝对 tick”的版本：
    const notesAbs = notes.map((n) => ({
      ...n,
      tick: n.tick + barSelection.fromTick,
    }))
    console.log("[BarSel] notes (absolute ticks) =", notesAbs)
  }, [enabled, barSelection, selectedTrackId, getEvents, timebase])
}

