// src/MyCode/taskService.ts
import { useCallback, useEffect, useRef } from "react"
import { emptyTrack } from "@signal-app/core"
import { useToast } from "dialog-hooks"

import { apiClient, ChordsToMidisRequest, RefMidiToMidiRequest, RefMidisMixSetRequest } from "./apiClient"


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
          updatedAt: Date.now(),
        })

        if (st.status === "succeeded" || st.status === "failed" || st.status === "canceled") {
          if (st.status === "succeeded") {
            if (st.kind === "ref_midis_mix_set") {
              const inst = (st as any).inst as any
              if (inst === "piano" || inst === "guitar" || inst === "bass") {
                myCodeUIStore.setActiveTaskForInstrument(inst, st.task_id)
              }
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
      kind: "chords_to_midis" | "ref_midi_to_midi" | "ref_midis_mix_set",
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
      } else if (kind === "ref_midi_to_midi") {
        const req: RefMidiToMidiRequest = {
          ...payload,
          session_id: sessionId,
          ...(opts?.inst ? { inst: opts.inst } : {}),
        }
        submitResp = await apiClient.submitRefMidiToMidi(req)
      } else {
        const req: RefMidisMixSetRequest = {
          ...payload,
          session_id: sessionId,
        }
        submitResp = await apiClient.submitRefMidisMixSet(req)
      }

      const now = Date.now()

      // 2) write store
      myCodeUIStore.upsertTask({
        taskId: submitResp.task_id,
        sessionId,
        kind,
        inst: opts?.inst ?? null, // ✅ 新增
        status: "queued",
        error: null,
        artifacts: [],
        createdAt: now,
        updatedAt: now,
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
      // const chords = myCodeUIStore.chordCells.map((s) => s.trim())
      const startBar = myCodeUIStore.lastSelection?.startBar ?? 1
      const endBar = myCodeUIStore.lastSelection?.endBar ?? 4
      const chords = myCodeUIStore.chordsByBar.slice(startBar-1, endBar)
      const bpm = Number(currentTempo.toFixed(2))
      const bars = myCodeUIStore.lastSelection?.bars ?? chords.length
      const segmentation = buildSegmentationFromBars(bars)
      const n_midi = 5
      const chord_beats = new Array(bars).fill(4)

      // ✅ inst 优先用入参，否则你也可以 fallback 到 store 的某个默认
      const instFinal = inst ?? "piano"

      console.log(chords)

      const taskId = await runTask(
        "chords_to_midis",
        {
          chords,
          chord_beats,
          segmentation,
          bpm,
          n_midi,
          inst: instFinal,
        },
        { inst: instFinal },
      )

      // ✅ 把当初生成用的 bars + chords 记到这个 task 上
      myCodeUIStore.upsertTask({
        taskId,
        inputBars: bars,
        inputChords: chords,
      })

      return taskId
    },
    [runTask, currentTempo],
  )

  const runRefMidiToMidiFromStore = useCallback(
    async (refMidi: File, inst?: "piano" | "guitar" | "bass") => {
      const startBar = myCodeUIStore.lastSelection?.startBar ?? 1
      const endBar = myCodeUIStore.lastSelection?.endBar ?? 4
      const chords = myCodeUIStore.chordsByBar.slice(startBar-1, endBar)

      const bars = myCodeUIStore.lastSelection?.bars ?? chords.length
      const segmentation = buildSegmentationFromBars(bars)
      const chord_beats = new Array(bars).fill(4)

      // 2) bpm：后端 type 是 number，别用 toFixed 的 string
      const bpm = Number(currentTempo.toFixed(2))

      // 3) inst：单选乐器的最终值
      const instFinal = inst ?? "piano"

      // 4) 提交任务（ref_midi_to_midi）
      const taskId = await runTask(
        "ref_midi_to_midi",
        {
          chords,
          chord_beats,
          segmentation,
          bpm,
          ref_midi: refMidi,
          inst: instFinal,
        },
        { inst: instFinal },
      )
      myCodeUIStore.upsertTask({ taskId, inputBars: bars, inputChords: chords })
      return taskId
    },
    [runTask, currentTempo],
  )

  const runRefMidisMixSetFromStore = useCallback(
    async (
      midiA: File,
      midiB: File,
      alphas: number[] = [0, 0.25, 0.5, 0.75, 1],
    ) => {
      const startBar = myCodeUIStore.lastSelection?.startBar ?? 1
      const endBar = myCodeUIStore.lastSelection?.endBar ?? 4
      const chords = myCodeUIStore.chordsByBar.slice(startBar-1, endBar)

      const bars = myCodeUIStore.lastSelection?.bars ?? chords.length
      const segmentation = buildSegmentationFromBars(bars)
      const chord_beats = new Array(bars).fill(4)

      const bpm = Number(currentTempo.toFixed(2))

      const taskId = await runTask(
        "ref_midis_mix_set",
        {
          chords,
          chord_beats,
          segmentation,
          bpm,
          alphas,
          midi_a: midiA,
          midi_b: midiB,
        },
      )

      myCodeUIStore.upsertTask({ taskId, inputBars: bars, inputChords: chords })
      return taskId
    },
    [runTask, currentTempo],
  )

  const runRefMidisMixSet = useCallback(
    async (args: {
      midiA: File
      midiB: File
      bars: number
      alphas?: number[]
    }) => {
      const chords = myCodeUIStore.chordCells.map((s) => s.trim())

      const bars = Math.max(0, Math.floor(args.bars))
      const segmentation = buildSegmentationFromBars(bars)
      const chord_beats = chords.map(() => 4)

      const bpm = currentTempo.toFixed(2)
      const alphas = (args.alphas?.length ? args.alphas : [0, 0.25, 0.5, 0.75, 1])

      const taskId = await runTask("ref_midis_mix_set", {
        chords,
        chord_beats,
        segmentation,
        bpm,
        alphas,
        midi_a: args.midiA,
        midi_b: args.midiB,
      })

      myCodeUIStore.upsertTask({ taskId, inputBars: bars, inputChords: chords })
      return taskId
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

        const selBars = Number(sel.bars ?? 0)
        if (selBars <= 0) throw new Error("选区小节数无效（bars <= 0）。")

        const normalizePayloadBarStartToZero = (payload: any, barTicks: number) => {
          const notes = payload?.notes ?? []
          if (!notes.length) return payload

          const minTick = notes.reduce((m: number, n: any) => Math.min(m, Number(n.tick ?? 0)), Infinity)
          if (!isFinite(minTick)) return payload

          // 关键：把「最早 note 所在的小节」的小节起点对齐到 0
          const barIndex = Math.floor(Math.max(0, minTick) / Math.max(1, barTicks)) // 0-based
          const shift = barIndex * Math.max(1, barTicks)

          if (shift <= 0) return payload

          const shiftedNotes = notes.map((n: any) => ({
            ...n,
            tick: Math.max(0, Number(n.tick ?? 0) - shift),
          }))

          return { ...payload, notes: shiftedNotes }
        }


        // 以选区反推每小节 tick（在 payload 的 timebase 上）
        const barTicks = Math.max(1, Math.floor(rangeLenInPayloadTicks / Math.max(1, selBars)))

        // 1) 找到 artifactBars：优先从任务元信息拿 inputBars
        const findTaskBarsByArtifactId = (aid: string): number | null => {
          const tasksById = (myCodeUIStore as any).tasksById as Record<string, any> | undefined
          if (!tasksById) return null
          for (const tid of Object.keys(tasksById)) {
            const task = tasksById[tid]
            const arts = task?.artifacts ?? []
            if (arts.some((x: any) => x?.artifact_id === aid)) {
              const b = Number(task?.inputBars ?? 0)
              return b > 0 ? b : null
            }
          }
          return null
        }

        const guessBarsFromPayload = (payload: any, barTicksGuess: number): number => {
          const notes = payload?.notes ?? []
          if (!notes.length) return 0
          const maxEnd = notes.reduce((m: number, n: any) => Math.max(m, Number(n.tick ?? 0) + Number(n.duration ?? 0)), 0)
          return Math.max(1, Math.ceil(maxEnd / Math.max(1, barTicksGuess)))
        }

        const artifactBars =
          findTaskBarsByArtifactId(artifactId) ??
          guessBarsFromPayload(parsed.payload, barTicks) // fallback

        if (!artifactBars || artifactBars <= 0) {
          throw new Error("无法确定该 artifact 的小节数（inputBars 缺失且无法从 MIDI 估算）。")
        }

        const normalizedPayload = normalizePayloadBarStartToZero(parsed.payload, barTicks)

        // 2) clip / tile
        const clipPayloadToLen = (payload: any, totalLen: number) => {
          // 你现有函数：裁切到 totalLen（仍以 0 为起点）
          return clampMidiNotesPayloadToRangeLen(payload, totalLen)
        }

        const tilePayloadToLen = (payload: any, loopLen: number, totalLen: number) => {
          const srcNotes = payload?.notes ?? []
          const out: any[] = []
          if (!srcNotes.length) return { ...payload, notes: [] }

          const reps = Math.ceil(totalLen / Math.max(1, loopLen))
          for (let r = 0; r < reps; r++) {
            const offset = r * loopLen
            for (const n of srcNotes) {
              const tick = Number(n.tick ?? 0) + offset
              const dur = Number(n.duration ?? 0)
              if (dur <= 0) continue
              if (tick >= totalLen) continue
              const end = tick + dur
              const clippedDur = end > totalLen ? Math.max(0, totalLen - tick) : dur
              if (clippedDur <= 0) continue
              out.push({ ...n, tick, duration: clippedDur })
            }
          }

          return { ...payload, notes: out }
        }

        let finalPayload: any
        if (artifactBars >= selBars) {
          // artifact 大于选区：只用前 selBars 小节
          finalPayload = clipPayloadToLen(normalizedPayload, selBars * barTicks)
        } else {
          // artifact 小于选区：按小节循环铺满
          const loopLen = Math.max(1, artifactBars * barTicks)
          finalPayload = tilePayloadToLen(normalizedPayload, loopLen, selBars * barTicks)
        }

        // 兜底：再裁一刀，避免 tick/duration 误差导致超界
        finalPayload = clipPayloadToLen(finalPayload, rangeLenInPayloadTicks)

        if (!(finalPayload.notes?.length ?? 0)) {
          throw new Error("导入后在该选区内没有可写入的 notes（可能选区太短或参考为空）。")
        }

        pushHistory()
        replaceMidiNotesInRange(
          t,
          finalPayload,
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
    runRefMidiToMidiFromStore,
    runRefMidisMixSet,
    applyArtifactToSelection,
    runRefMidisMixSetFromStore,
  }


}

