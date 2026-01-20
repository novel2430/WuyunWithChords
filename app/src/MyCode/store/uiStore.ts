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

export type TaskStatus = "queued" | "running" | "succeeded" | "failed" | "canceled"

export type TaskArtifact = {
  artifact_id: string
  kind: string
  filename: string
  url: string
}

export type TaskRecord = {
  taskId: string
  sessionId: string | null
  kind: string
  status: TaskStatus
  error: any | null
  artifacts: TaskArtifact[]
  createdAt: number
  updatedAt: number
  inst?: Instrument | null
  inputBars?: number | null
  inputChords?: string[] | null
}

export type ArtifactOpState = {
  downloading?: boolean
  importing?: boolean
  error?: string | null
}

export class MyCodeUIStore {
  instruments = new Set<Instrument>(["piano"])
  chordCells: string[] = ["Am", "F", "C", "G"]
  lastSelection: BarSelectionSnapshot | null = null

  // ====== Chords generation result selection ======
  activeInstrument: Instrument = "piano"

  activeTaskIdByInstrument: Record<Instrument, string | null> = {
    piano: null,
    guitar: null,
    bass: null,
  }

  selectedArtifactIdByInstrument: Record<Instrument, string | null> = {
    piano: null,
    guitar: null,
    bass: null,
  }

  setActiveInstrument(inst: Instrument) {
    this.activeInstrument = inst
  }

  setActiveTaskForInstrument(inst: Instrument, taskId: string | null) {
    this.activeTaskIdByInstrument[inst] = taskId
    // 可选：让 TaskTab 也跟着切到这个 task
    if (taskId) this.activeTaskId = taskId
  }

  setSelectedArtifactForInstrument(inst: Instrument, artifactId: string | null) {
    this.selectedArtifactIdByInstrument[inst] = artifactId
  }

  clearSelectedArtifactForInstrument(inst: Instrument) {
    this.selectedArtifactIdByInstrument[inst] = null
  }

  get activeTaskForActiveInstrument(): TaskRecord | null {
    const tid = this.activeTaskIdByInstrument[this.activeInstrument]
    if (!tid) return null
    return this.tasksById[tid] ?? null
  }

  get selectedArtifactIdForActiveInstrument(): string | null {
    return this.selectedArtifactIdByInstrument[this.activeInstrument] ?? null
  }

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
      activeInstrument: this.activeInstrument, // ✅ 可选：方便未来直接发
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

  uploadedMidiFile: File | null = null

  setUploadedMidiFile(file: File | null) {
    this.uploadedMidiFile = file
  }

  clearUploadedMidi = () => {
    this.uploadedMidi = null
    this.uploadedMidiFile = null
  }

  // ====== Session ======
  sessionId: string | null = null
  sessionStatus: "idle" | "creating" | "ready" | "error" = "idle"
  sessionError: string | null = null

  // ====== Tasks ======
  tasksById: Record<string, TaskRecord> = {}
  taskOrder: string[] = []
  activeTaskId: string | null = null

  // artifact 操作状态（按钮 loading/disable）
  artifactOpsById: Record<string, ArtifactOpState> = {}

  // --- 你原有的字段/方法继续保留 ---

  // ====== Session actions ======
  setSessionCreating() {
    this.sessionStatus = "creating"
    this.sessionError = null
  }
  setSessionReady(sessionId: string) {
    this.sessionId = sessionId
    this.sessionStatus = "ready"
    this.sessionError = null
  }
  setSessionError(msg: string) {
    this.sessionStatus = "error"
    this.sessionError = msg
  }

  // ====== Task actions ======
  upsertTask(partial: Partial<TaskRecord> & { taskId: string }) {
    const now = Date.now()
    const old = this.tasksById[partial.taskId]
    if (!old) {
      const rec: TaskRecord = {
        taskId: partial.taskId,
        sessionId: partial.sessionId ?? this.sessionId,
        kind: partial.kind ?? "unknown",
        status: (partial.status as TaskStatus) ?? "queued",
        error: partial.error ?? null,
        artifacts: partial.artifacts ?? [],
        createdAt: partial.createdAt ?? now,
        updatedAt: partial.updatedAt ?? now,
        inst: partial.inst ?? null,
      }
      this.tasksById[partial.taskId] = rec
      this.taskOrder = [partial.taskId, ...this.taskOrder]
    } else {
      this.tasksById[partial.taskId] = {
        ...old,
        ...partial,
        updatedAt: partial.updatedAt ?? now,
      }
    }
  }

  setActiveTask(taskId: string | null) {
    this.activeTaskId = taskId
  }

  setArtifactOp(artifactId: string, patch: ArtifactOpState) {
    const prev = this.artifactOpsById[artifactId] ?? {}
    this.artifactOpsById[artifactId] = { ...prev, ...patch }
  }

  clearArtifactOp(artifactId: string) {
    delete this.artifactOpsById[artifactId]
  }

  get activeTask(): TaskRecord | null {
    if (!this.activeTaskId) return null
    return this.tasksById[this.activeTaskId] ?? null
  }

  get tasksList(): TaskRecord[] {
  return this.taskOrder
    .map((id) => this.tasksById[id])
    .filter(Boolean)
}

}
