import { useMemo } from "react"
import { useMobxGetter } from "../../hooks/useMobxSelector"
import { myCodeUIStore } from "./index"

export function useMyCodeUI() {
  // reactive values
  const instruments = useMobxGetter(myCodeUIStore, "instruments")
  const chordCells = useMobxGetter(myCodeUIStore, "chordCells")
  const chordsByBar = useMobxGetter(myCodeUIStore, "chordsByBar")
  const lastSelection = useMobxGetter(myCodeUIStore, "lastSelection")

  const activeInstrument = useMobxGetter(myCodeUIStore, "activeInstrument")
  const activeTaskIdByInstrument = useMobxGetter(myCodeUIStore, "activeTaskIdByInstrument")
  const selectedArtifactIdByInstrument = useMobxGetter(myCodeUIStore, "selectedArtifactIdByInstrument")
  const activeTaskForActiveInstrument = useMobxGetter(myCodeUIStore, "activeTaskForActiveInstrument")
  const selectedArtifactIdForActiveInstrument = useMobxGetter(
    myCodeUIStore,
    "selectedArtifactIdForActiveInstrument",
  )

  const tasksById = useMobxGetter(myCodeUIStore, "tasksById")
  const artifactOpsById = useMobxGetter(myCodeUIStore, "artifactOpsById")

  const uploadMidiTargetChords = useMobxGetter(
    myCodeUIStore,
    "uploadMidiTargetChords",
  )

  // stable actions
  const actions = useMemo(
    () => ({
      toggleInstrument: myCodeUIStore.toggleInstrument,
      setChordCells: myCodeUIStore.setChordCells,
      ensureChordCellsLength: myCodeUIStore.ensureChordCellsLength,
      ensureChordsByBarLength: myCodeUIStore.ensureChordsByBarLength,
      getChordAtBar: myCodeUIStore.getChordAtBar,
      setChordAtBar: myCodeUIStore.setChordAtBar,
      setChordsForRange: myCodeUIStore.setChordsForRange,
      getChordsSlice: myCodeUIStore.getChordsSlice,
      syncChordCellsFromRange: myCodeUIStore.syncChordCellsFromRange,
      setLastSelection: myCodeUIStore.setLastSelection,
      resetChords: myCodeUIStore.resetChords,
      clearAll: myCodeUIStore.clearAll,
      toPayload: myCodeUIStore.toPayload,
      setActiveInstrument: myCodeUIStore.setActiveInstrument,
      setActiveTaskForInstrument: myCodeUIStore.setActiveTaskForInstrument,
      setSelectedArtifactForInstrument: myCodeUIStore.setSelectedArtifactForInstrument,
      clearSelectedArtifactForInstrument: myCodeUIStore.clearSelectedArtifactForInstrument,
      setUploadMidiTargetChords: myCodeUIStore.setUploadMidiTargetChords,
      setUploadMidiTargetChordAt: myCodeUIStore.setUploadMidiTargetChordAt,
      ensureUploadMidiTargetChordsLength: myCodeUIStore.ensureUploadMidiTargetChordsLength,
    }),
    [],
  )

  return {
    instruments,
    chordCells,
    chordsByBar,
    lastSelection,

    tasksById,
    artifactOpsById,
    activeInstrument,
    activeTaskIdByInstrument,
    selectedArtifactIdByInstrument,
    activeTaskForActiveInstrument,
    selectedArtifactIdForActiveInstrument,

    uploadMidiTargetChords,

    ...actions,
  }
}
