// src/MyCode/midiUtils.ts
import { Beat, NoteEvent, Range } from "@signal-app/core"
import { songFromFile } from "../actions/file"
import { usePlayer } from "../hooks/usePlayer"
import { usePianoRollTickScroll } from "../hooks/usePianoRoll"
import { useCallback } from "react"

/* ========= Types ========= */

export type MidiNotePayload = {
  timebase: number
  notes: Omit<NoteEvent, "id">[]
}

export type ParsedMidiFirstTrack = {
  fileName: string
  trackName: string
  bars: number
  payload: MidiNotePayload
}

export type BarTickRange = {
  fromTick: number
  toTick: number
  bars: number
  startBar: number // 1-based
  endBar: number // 1-based
  barStartTicksAbs: number[]
  barEndTicksAbs: number[]
}

export type WriteOpts = {
  /** 目标工程 timebase（用于缩放） */
  targetTimebase: number
  /** 是否做 timebase 缩放，默认 true */
  scaleToTarget?: boolean
}

export type NoteLike = {
  id: number
  type: string
  subtype: string
  tick: number
  duration?: number
  velocity?: number
  noteNumber?: number
}

/** 兼容 signal 两种 track 结构：有的用 events，有的用 getEvents() */
export type TrackReadLike = {
  events?: any[]
  getEvents?: () => any[]
}

export type TrackRemoveLike = TrackReadLike & {
  removeEvents: (ids: number[]) => void
}

export type TrackAddLike = {
  addEvents: (evs: Omit<NoteEvent, "id">[]) => void
}

export type TrackRWLike = TrackRemoveLike & TrackAddLike

/* ========= Track helpers ========= */

function getTrackEvents(track: TrackReadLike): any[] {
  try {
    const evs = typeof track?.getEvents === "function" ? track.getEvents() : (track as any)?.events
    return Array.isArray(evs) ? evs : []
  } catch {
    return []
  }
}

/* ========= A) midi file -> note events ========= */

function isNoteEvent(e: any): e is NoteLike {
  return e?.type === "channel" && e?.subtype === "note" && typeof e?.tick === "number"
}

export function extractNoteEventsFromTrack(track: any): Omit<NoteEvent, "id">[] {
  const events = getTrackEvents(track as any)
  const noteEventsRaw = (events as any[]).filter(isNoteEvent)

  return noteEventsRaw.map((ev) => ({
    type: "channel",
    subtype: "note",
    tick: Number(ev?.tick ?? 0),
    duration: Number(ev?.duration ?? 0),
    velocity: Number(ev?.velocity ?? 80),
    noteNumber: Number(ev?.noteNumber ?? 60),
  }))
}

/**
 * 用“轨道最后一个 note 的结束 tick（exclusive）”来估算小节数
 * - endTickExclusive: max(tick + duration)
 * - 为避免正好落在下一小节起点导致 +1，用 endTickExclusive-1 作为 lastTick
 */
export function computeBarsFromEndTick(measures: any[], timebase: number, endTickExclusive: number) {
  if (!Array.isArray(measures) || measures.length === 0) return 0
  if (!Number.isFinite(endTickExclusive) || endTickExclusive <= 0) return 0

  // ✅ 关键：exclusive -> inclusive lastTick
  const lastTick = Math.max(0, Math.floor(endTickExclusive - 1))
  const to = lastTick + 1

  const beats = Beat.createInRange(measures as any, timebase, Range.create(0, to))
  const barStarts = beats.filter((b: any) => b.beat === 0)
  return Math.max(0, barStarts.length)
}

/*
 * 解析 MIDI 文件：取第一条非 conductor 轨道（否则 tracks[0]），只抽 note events
 */
export async function parseMidiFileFirstTrack(file: File): Promise<ParsedMidiFirstTrack> {
  const importedSong = await songFromFile(file)

  const firstTrack =
    importedSong.tracks.find((t: any) => !t?.isConductorTrack) ?? importedSong.tracks[0]
  if (!firstTrack) throw new Error("该 MIDI 里没有可用轨道。")

  const notes = extractNoteEventsFromTrack(firstTrack)

  let endTickExclusive = 0
  for (const ev of notes) {
    const t = Number(ev.tick ?? 0)
    const d = Number(ev.duration ?? 0)
    endTickExclusive = Math.max(endTickExclusive, t + Math.max(0, d), t)
  }

  const bars = computeBarsFromEndTick(importedSong.measures as any, importedSong.timebase, endTickExclusive)

  return {
    fileName: file.name,
    trackName: String((firstTrack as any).name ?? ""),
    bars,
    payload: { timebase: importedSong.timebase, notes },
  }
}

/* ========= B) bar selection / bars -> tick range ========= */

export function computeBarTickRangeFromTicks(
  measures: any[],
  timebase: number,
  fromTick: number,
  toTick: number,
): BarTickRange | null {
  if (!Array.isArray(measures) || measures.length === 0) return null

  const from = Math.min(fromTick, toTick)
  const to = Math.max(fromTick, toTick)
  if (to <= from) return null

  const beats = Beat.createInRange(measures as any, timebase, Range.create(from, to))
  const barBeats = beats.filter((b: any) => b.beat === 0)
  const starts = barBeats.map((b: any) => Number(b.tick))

  if (starts.length === 0) {
    return {
      fromTick: from,
      toTick: to,
      bars: 1,
      startBar: 1,
      endBar: 1,
      barStartTicksAbs: [from],
      barEndTicksAbs: [to],
    }
  }

  const startBar = Number((barBeats[0] as any).measure ?? 0) + 1
  const endBar = Number((barBeats[barBeats.length - 1] as any).measure ?? 0) + 1
  const ends = starts.slice(1).concat([to])

  return {
    fromTick: from,
    toTick: to,
    bars: starts.length,
    startBar,
    endBar,
    barStartTicksAbs: starts,
    barEndTicksAbs: ends,
  }
}

/* ========= C) range read / clean ========= */

function eventOverlapsRange(e: { tick: number; duration?: number }, from: number, to: number) {
  const s = Number(e.tick ?? 0)
  const d = Number(e.duration ?? 0)
  const eEnd = s + Math.max(0, d)
  return s < to && eEnd > from
}

/** 获取 track 在 [from,to) 内的 note events（返回原事件对象，带 id） */
export function getNoteEventsInRange(track: TrackReadLike, from: number, to: number): NoteLike[] {
  const evs = getTrackEvents(track)
  return (evs as any[])
    .filter(isNoteEvent)
    .filter((e) => eventOverlapsRange(e, from, to))
}

/** 删除 track 在 [from,to) 内的 note events（清洗范围） */
export function removeNoteEventsInRange(track: TrackRemoveLike, from: number, to: number) {
  const removeIds = getNoteEventsInRange(track, from, to)
    .map((e) => e.id)
    .filter((id) => typeof id === "number")

  if (removeIds.length) track.removeEvents(removeIds)
}

/* ========= D) write / replace ========= */

/**
 * 裁切 payload 到 [0, rangeLen)：
 * - 丢掉完全不相交的 notes
 * - 截断跨边界的 note duration
 * - 输出的 tick 仍然基于 0（之后写入时再加 baseTick）
 */
export function clampMidiNotesPayloadToRangeLen(payload: MidiNotePayload, rangeLen: number): MidiNotePayload {
  const len = Math.max(0, Math.floor(rangeLen))
  if (len <= 0) return { ...payload, notes: [] }

  const notes = (payload.notes ?? [])
    .map((ev) => {
      const s = Math.max(0, Math.floor(Number(ev.tick ?? 0)))
      const d0 = Math.max(0, Math.floor(Number(ev.duration ?? 0)))
      const eEnd = s + d0

      // [s, eEnd) 与 [0, len) 不相交
      if (s >= len || eEnd <= 0) return null

      const ns = Math.max(0, s)
      const ne = Math.min(len, eEnd)
      const nd = Math.max(1, ne - ns)

      return { ...ev, tick: ns, duration: nd }
    })
    .filter(Boolean) as Omit<NoteEvent, "id">[]

  return { ...payload, notes }
}

/**
 * 把 payload.notes 写入到 baseTick 之后（不覆盖，只 add）
 * - 会做 timebase 缩放（默认开启）
 */
export function writeMidiNotesToTrackAt(
  track: TrackAddLike,
  payload: MidiNotePayload,
  baseTick: number,
  opts: WriteOpts,
) {
  const scaleToTarget = opts.scaleToTarget ?? true
  const base = Math.max(0, Math.round(baseTick))

  const scale =
    scaleToTarget && payload.timebase > 0 ? opts.targetTimebase / payload.timebase : 1

  const notes = (payload.notes ?? []).map((ev) => ({
    ...ev,
    tick: Math.max(0, Math.round(Number(ev.tick ?? 0) * scale)) + base,
    duration: Math.max(1, Math.round(Math.max(0, Number(ev.duration ?? 0)) * scale)),
  }))

  track.addEvents(notes)
}

/**
 * 覆盖写入：先删 range 内 notes，再把 payload 写到 range.from（对齐写入）
 * 注意：这只覆盖 [from,to) 内的 note events，范围外不动
 */
export function replaceMidiNotesInRange(
  track: TrackRWLike,
  payload: MidiNotePayload,
  range: { from: number; to: number },
  opts: WriteOpts,
) {
  removeNoteEventsInRange(track, range.from, range.to)
  writeMidiNotesToTrackAt(track, payload, range.from, opts)
}

/** 可选：覆盖写入且保证不越界（先裁切，再 replace） */
export function replaceMidiNotesInRangeClamped(
  track: TrackRWLike,
  payload: MidiNotePayload,
  range: { from: number; to: number },
  opts: WriteOpts,
) {
  const len = Math.max(0, Math.floor(range.to - range.from))
  const clipped = clampMidiNotesPayloadToRangeLen(payload, len)
  replaceMidiNotesInRange(track, clipped, range, opts)
}

/*
 * 跳转到指定 tick（默认 0）：播放头 + 视口一起跳
 * 注意：这是 hook，只能在 React 组件/其他 hook 中调用。
 */
export function useJumpToTick() {
  const { setPosition } = usePlayer()
  const { setScrollLeftInTicks } = usePianoRollTickScroll()

  return useCallback(
    (tick: number = 0) => {
      const t = Number.isFinite(tick) ? Math.max(0, Math.floor(tick)) : 0
      setPosition(t)
      setScrollLeftInTicks(t)
    },
    [setPosition, setScrollLeftInTicks],
  )
}
