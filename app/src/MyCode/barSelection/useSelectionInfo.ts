import { useMemo } from "react"
import { useSong } from "../../hooks/useSong"
import { useBarSelection } from "./store"
import { computeSelectionInfo } from "./selectionInfo"

export function useSelectionInfo() {
  const { barSelection, setBarSelection, clearBarSelection } = useBarSelection()
  const { measures, timebase } = useSong()

  const selectionInfo = useMemo(() => {
    return computeSelectionInfo(barSelection, measures as any, timebase)
  }, [barSelection, measures, timebase])

  return {
    barSelection,
    setBarSelection,
    clearBarSelection,
    selectionInfo,
  }
}

