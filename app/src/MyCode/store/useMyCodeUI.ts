import { useMemo } from "react"
import { useMobxGetter } from "../../hooks/useMobxSelector"
import { myCodeUIStore } from "./index"

export function useMyCodeUI() {
  // 用 getter 订阅需要的字段
  const instruments = useMobxGetter(myCodeUIStore, "instruments")
  const chordCells = useMobxGetter(myCodeUIStore, "chordCells")
  const lastSelection = useMobxGetter(myCodeUIStore, "lastSelection")


  // actions 不需要订阅，直接用
  const actions = useMemo(
    () => ({
      toggleInstrument: myCodeUIStore.toggleInstrument,
      setChordCells: myCodeUIStore.setChordCells,
      ensureChordCellsLength: myCodeUIStore.ensureChordCellsLength,
      setLastSelection: myCodeUIStore.setLastSelection,
      resetChords: myCodeUIStore.resetChords,
      clearAll: myCodeUIStore.clearAll,
      toPayload: myCodeUIStore.toPayload,
    }),
    []
  )

  return { instruments, chordCells, lastSelection, ...actions }
}

