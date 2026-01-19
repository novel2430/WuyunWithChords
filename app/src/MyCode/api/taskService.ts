// src/MyCode/taskService.ts
import { useCallback, useEffect, useRef } from "react"
import { emptyTrack } from "@signal-app/core"
import { useToast } from "dialog-hooks"

import { apiClient, ChordsToMidisRequest, RefMidiToMidiRequest } from "./apiClient"

// 你已有的 store 单例
import { myCodeUIStore } from "../store" // ← 按你的真实路径改一下

import { useHistory } from "../../hooks/useHistory"
import { usePianoRoll } from "../../hooks/usePianoRoll"
import { useSong } from "../../hooks/useSong"
import { useConductorTrack } from "../../hooks/useConductorTrack"
import { useTrack } from "../../hooks/useTrack"


// 你已有的 midiUtils
import {
  parseMidiFileFirstTrack,
  writeMidiNotesToTrackAt,
  useJumpToTick,
  clampMidiNotesPayloadToRangeLen,
  replaceMidiNotesInRange,
} from "../midiUtils" // ← 按你的真实路径改一下

type Poller = { timerId: number; stopped: boolean }

function jitterMs(min: number, max: number) {
  return Math.floor(min + Math.random() * Math.max(0, max - min))
}

function buildSegmentationFromBars(bars: number): string {
  const n = Math.max(0, Math.floor(bars))
  if (n <= 0) return "A0" // 或者你也可以直接 throw

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  let left = n
  let seg = ""
  let i = 0

  while (left > 0) {
    const len = Math.min(4, left)
    const ch = letters[i] ?? "Z"
    seg += `${ch}${len}`
    left -= len
    i += 1
  }
  return seg
}


export function useMyCodeTaskService() {
  const toast = useToast()

  // 工程写入相关（artifact 导入）
  const { pushHistory } = useHistory()
  const { selectedTrackId, setSelectedTrackId } = usePianoRoll()
  const { tracks: currentTracks, timebase: currentTimebase, insertTrack, updateEndOfSong } = useSong()
  const jumpToTick = useJumpToTick()
  const track = useTrack(selectedTrackId)

  // 轮询 timers 存在 ref 里（不进 store）
  const pollersRef = useRef<Map<string, Poller>>(new Map())

  const stopPolling = useCallback((taskId: string) => {
    const p = pollersRef.current.get(taskId)
    if (!p) return
    p.stopped = true
    window.clearTimeout(p.timerId)
    pollersRef.current.delete(taskId)
  }, [])

  const stopAllPolling = useCallback(() => {
    for (const [taskId] of pollersRef.current.entries()) stopPolling(taskId)
  }, [stopPolling])

  useEffect(() => {
    return () => stopAllPolling()
  }, [stopAllPolling])

  const ensureSession = useCallback(async () => {
    if (myCodeUIStore.sessionId && myCodeUIStore.sessionStatus === "ready") {
      return myCodeUIStore.sessionId
    }
    try {
      myCodeUIStore.setSessionCreating()
      const resp = await apiClient.createSession()
      myCodeUIStore.setSessionReady(resp.session_id)
      return resp.session_id
    } catch (e) {
      const msg = (e as Error)?.message ?? "create session failed"
      myCodeUIStore.setSessionError(msg)
      throw e
    }
  }, [])

  const pollOnceAndSchedule = useCallback(
    async (taskId: string) => {
      const p = pollersRef.current.get(taskId)
      if (!p || p.stopped) return

      try {
        const st = await apiClient.getTask(taskId)

        myCodeUIStore.upsertTask({
          taskId: st.task_id,
          sessionId: st.session_id,
          kind: st.kind,
          inst: (st as any).inst ?? undefined,
          status: st.status,
          error: st.error ?? null,
          artifacts: (st.artifacts ?? []).map((a) => ({
            artifact_id: a.artifact_id,
            kind: a.kind,
            filename: a.filename,
            url: a.url,
          })),
        })

        if (st.status === "succeeded" || st.status === "failed" || st.status === "canceled") {
          if (st.status === "succeeded") {
            const inst = (st as any).inst as any
            if (inst === "piano" || inst === "guitar" || inst === "bass") {
              myCodeUIStore.setActiveTaskForInstrument(inst, st.task_id)
            }
          }
          stopPolling(taskId)
          if (st.status === "failed") {
            toast.error(typeof st.error === "string" ? st.error : "任务失败")
          }
          return
        }
      } catch (e) {
        // 网络抖动：不立刻失败，下一轮继续
        console.warn("poll task failed:", e)
      }

      // schedule next
      const next = jitterMs(700, 1300)
      const timerId = window.setTimeout(() => pollOnceAndSchedule(taskId), next)
      pollersRef.current.set(taskId, { timerId, stopped: false })
    },
    [stopPolling, toast],
  )

  const startPolling = useCallback(
    (taskId: string) => {
      if (pollersRef.current.has(taskId)) return // 已在轮询
      const timerId = window.setTimeout(() => pollOnceAndSchedule(taskId), 200)
      pollersRef.current.set(taskId, { timerId, stopped: false })
    },
    [pollOnceAndSchedule],
  )

  // ====== 统一 runTask：submit + 入 store + 轮询 ======
  const runTask = useCallback(
    async (
      kind: "chords_to_midis" | "ref_midi_to_midi",
      payload: any,
      opts?: { inst?: "piano" | "guitar" | "bass" },
    ) => {
      const sessionId = await ensureSession()

      // 1) submit
      let submitResp: { task_id: string }
      if (kind === "chords_to_midis") {
        const req: ChordsToMidisRequest = {
          ...payload,
          session_id: sessionId,
          ...(opts?.inst ? { inst: opts.inst } : {}),
        }
        submitResp = await apiClient.submitChordsToMidis(req)
      } else {
        const req: RefMidiToMidiRequest = { ...payload, session_id: sessionId }
        submitResp = await apiClient.submitRefMidiToMidi(req)
      }

      // 2) write store
      myCodeUIStore.upsertTask({
        taskId: submitResp.task_id,
        sessionId,
        kind,
        inst: opts?.inst ?? null, // ✅ 新增
        status: "queued",
        error: null,
        artifacts: [],
      })

      // 你要按 inst 组织展示：这里就把“该 inst 的 active task”指到这个 task
      if (opts?.inst) myCodeUIStore.setActiveTaskForInstrument(opts.inst, submitResp.task_id)

      // TaskTab 也可以继续用 activeTaskId（可留可删）
      myCodeUIStore.setActiveTask(submitResp.task_id)

      // 3) poll
      startPolling(submitResp.task_id)

      return submitResp.task_id
    },
    [ensureSession, startPolling],
  )

  const { currentTempo } = useConductorTrack()
  const runChordsToMidisFromStore = useCallback(
  async (inst?: "piano" | "guitar" | "bass") => {
    const chords = myCodeUIStore.chordCells.map((s) => s.trim())
    const bpm = currentTempo.toFixed(2)
    const bars = myCodeUIStore.lastSelection?.bars ?? chords.length
    const segmentation = buildSegmentationFromBars(bars)
    const n_midi = 5
    const chord_beats = chords.map(() => 4)

    // ✅ inst 优先用入参，否则你也可以 fallback 到 store 的某个默认
    const instFinal = inst ?? "piano"

    return runTask("chords_to_midis", {
      chords,
      chord_beats,
      segmentation,
      bpm,
      n_midi,
      inst: instFinal, // ✅ 直接进 payload
    },
    { inst: instFinal })
  },
  [runTask, currentTempo],
)


  // ====== artifact：导入为新轨道 ======
  const importArtifactAsNewTrack = useCallback(
    async (artifactId: string, filenameHint?: string) => {
      try {
        myCodeUIStore.setArtifactOp(artifactId, { downloading: true, error: null })

        const blob = await apiClient.downloadArtifactContentById(artifactId)

        myCodeUIStore.setArtifactOp(artifactId, { downloading: false, importing: true, error: null })

        const fileName = filenameHint || `artifact_${artifactId}.mid`
        const file = new File([blob], fileName, { type: "audio/midi" })

        // 复用你已抽象的解析：只解析第一轨 note events
        const parsed = await parseMidiFileFirstTrack(file)

        const canImport = (parsed.payload?.notes?.length ?? 0) > 0
        if (!canImport) {
          throw new Error("该 MIDI 没有可导入的 note events。")
        }

        // 新轨道插入到 conductor track 之前
        const insertIndex = Math.max(0, currentTracks.length - 1)
        const channel = Math.min(insertIndex, 0xf)
        const t = emptyTrack(channel)

        pushHistory()

        // 缩放到当前工程 timebase；baseTick=0（从开头写入）
        writeMidiNotesToTrackAt(t, parsed.payload, 0, {
          targetTimebase: currentTimebase,
          scaleToTarget: true,
        })

        insertTrack(t, insertIndex)
        updateEndOfSong()
        setSelectedTrackId(t.id)

        jumpToTick(0)

        myCodeUIStore.setArtifactOp(artifactId, { importing: false, error: null })
        toast.success("已导入为新轨道。")
      } catch (e) {
        const msg = (e as Error)?.message ?? "导入失败"
        myCodeUIStore.setArtifactOp(artifactId, { downloading: false, importing: false, error: msg })
        toast.error(msg)
      }
    },
    [
      currentTracks.length,
      currentTimebase,
      insertTrack,
      jumpToTick,
      pushHistory,
      setSelectedTrackId,
      toast,
      updateEndOfSong,
    ],
  )

  // taskService.ts 里加：从 store 读参数并提交
  // const { currentTempo } = useConductorTrack()
  // const runChordsToMidisFromStore = useCallback(async () => {
  //   const chords = myCodeUIStore.chordCells.map((s) => s.trim())
  //   const bpm = currentTempo
  //   const bars = myCodeUIStore.lastSelection?.bars ?? chords.length
  //   const segmentation = buildSegmentationFromBars(bars)
  //   const n_midi = 5
  //   const chord_beats = chords.map(() => 4)
  //
  //   const inst = myCodeUIStore.activeInstrument  // ✅ 新增
  //   return runTask(
  //     "chords_to_midis",
  //     { chords, chord_beats, segmentation, bpm, n_midi },
  //     { inst }, // ✅ 新增
  //   )
  // }, [runTask, currentTempo])

  const applyArtifactToSelection = useCallback(
    async (artifactId: string, filenameHint?: string) => {
      const sel = myCodeUIStore.lastSelection
      if (!sel) {
        toast.error("请先在时间条上选择小节范围。")
        return
      }
      if (!selectedTrackId) {
        toast.error("请先选中一个目标轨道。")
        return
      }

      const t: any = track as any
      if (!t) {
        toast.error("目标轨道不可用。")
        return
      }

      const from = Number(sel.fromTick ?? 0)
      const to = Number(sel.toTick ?? 0)
      const range = { from: Math.min(from, to), to: Math.max(from, to) }
      const rangeLen = Math.max(0, range.to - range.from)
      if (rangeLen <= 0) {
        toast.error("选区范围无效（toTick 必须大于 fromTick）。")
        return
      }

      try {
        myCodeUIStore.setArtifactOp(artifactId, { downloading: true, error: null })

        const blob = await apiClient.downloadArtifactContentById(artifactId)

        myCodeUIStore.setArtifactOp(artifactId, { downloading: false, importing: true, error: null })

        const fileName = filenameHint || `artifact_${artifactId}.mid`
        const file = new File([blob], fileName, { type: "audio/midi" })

        const parsed = await parseMidiFileFirstTrack(file)
        if (!(parsed.payload?.notes?.length ?? 0)) {
          throw new Error("该 MIDI 没有可导入的 note events。")
        }

        const scale = parsed.payload.timebase > 0 ? (currentTimebase / parsed.payload.timebase) : 1
        const rangeLenInPayloadTicks = Math.max(1, Math.floor(rangeLen / Math.max(1e-6, scale)))
        // ✅ 先把 payload 裁切到选区长度（仍以 0 为起点）
        const clippedPayload = clampMidiNotesPayloadToRangeLen(parsed.payload, rangeLenInPayloadTicks)

        if (!(clippedPayload.notes?.length ?? 0)) {
          throw new Error("导入后在该选区内没有可写入的 notes（可能选区太短）。")
        }

        pushHistory()

        // ✅ 统一：先删 [from,to) 内 notes，再把 payload 写到 from（含 timebase 缩放）
        replaceMidiNotesInRange(
          t,
          clippedPayload,
          range,
          { targetTimebase: currentTimebase, scaleToTarget: true },
        )

        updateEndOfSong()
        jumpToTick(range.from)

        myCodeUIStore.setArtifactOp(artifactId, { importing: false, error: null })
        toast.success("已覆盖写入到当前轨道的选中小节范围。")
      } catch (e) {
        const msg = (e as Error)?.message ?? "覆盖写入失败"
        myCodeUIStore.setArtifactOp(artifactId, { downloading: false, importing: false, error: msg })
        toast.error(msg)
      }
    },
    [
      track,
      selectedTrackId,
      currentTimebase,
      pushHistory,
      updateEndOfSong,
      jumpToTick,
      toast,
    ],
  )


  return {
    // session
    ensureSession,

    // tasks
    runTask,
    startPolling,
    stopPolling,
    stopAllPolling,

    // artifact ops
    importArtifactAsNewTrack,

    runChordsToMidisFromStore,
    applyArtifactToSelection,
  }


}

