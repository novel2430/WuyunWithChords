// src/MyCode/barSelection/store.ts
import { atom, useAtomValue, useSetAtom, useStore } from "jotai"
import { BarSelection } from "./types"

const barSelectionAtom = atom<BarSelection | null>(null)
const clearBarSelectionAtom = atom(null, (_get, set) => set(barSelectionAtom, null))

export function useBarSelection(store = useStore()) {
  return {
    barSelection: useAtomValue(barSelectionAtom, { store }),
    setBarSelection: useSetAtom(barSelectionAtom, { store }),
    clearBarSelection: useSetAtom(clearBarSelectionAtom, { store }),
  }
}

