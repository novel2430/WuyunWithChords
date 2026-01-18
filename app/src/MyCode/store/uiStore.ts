import { makeAutoObservable, toJS } from "mobx"
import type { ParsedMidiFirstTrack } from "../midiUtils"

export type Instrument = "piano" | "guitar" | "bass"

export type BarSelectionSnapshot = {
  trackId: string | number | null
  trackName: string | null
  startBar: number
  endBar: number
  bars: number
  fromTick: number
  toTick: number
  timebase?: number | null
}

export class MyCodeUIStore {
  instruments = new Set<Instrument>(["piano"])
  chordCells: string[] = ["Am", "F", "C", "G"]
  lastSelection: BarSelectionSnapshot | null = null

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true })
  }

  // ---------- instruments ----------
  toggleInstrument(k: Instrument) {
    const next = new Set(this.instruments)
    if (next.has(k)) next.delete(k)
    else next.add(k)
    this.instruments = next
  }

  setInstruments(arr: Instrument[]) {
    this.instruments = new Set(arr)
  }

  // ---------- chords ----------
  setChordCells(next: string[]) {
    this.chordCells = next
  }

  ensureChordCellsLength(n: number) {
    if (!n || n < 1) return
    const next = this.chordCells.slice(0, n)
    while (next.length < n) next.push("")
    this.chordCells = next
  }

  // ---------- selection snapshot ----------
  setLastSelection(sel: BarSelectionSnapshot | null) {
    this.lastSelection = sel
  }

  // ---------- serialization for backend ----------
  toPayload() {
    return {
      instruments: Array.from(this.instruments),
      chords: this.chordCells.map((s) => (s ?? "").trim()),
      selection: this.lastSelection ? toJS(this.lastSelection) : null,
    }
  }

  resetChords(defaultChords: string[] = ["Am", "F", "C", "G"]) {
    this.chordCells = defaultChords.slice()
  }

  clearAll() {
    this.instruments = new Set(["piano"])
    this.chordCells = ["Am", "F", "C", "G"]
    this.lastSelection = null
  }

  // ---------- Midi Upload ----------
  uploadedMidi: ParsedMidiFirstTrack | null = null

  setUploadedMidi = (p: ParsedMidiFirstTrack | null) => {
    this.uploadedMidi = p
  }

  clearUploadedMidi = () => {
    this.uploadedMidi = null
  }
}
