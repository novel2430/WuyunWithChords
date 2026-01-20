import styled from "@emotion/styled"
import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useToast } from "dialog-hooks"

import { CONSTANTS } from "../constants"
import { useSelectionInfo } from "../barSelection/useSelectionInfo"
import { useExtractBarSelectionNotes } from "../barSelection/useBarSelectionMidi"
import { notesToInMemoryMidiFile } from "../midiUtils"
import { validateChords, validateSelection } from "../chordsUtils"
import { ChordGridInput } from "../chords/ChordGridInput"
import { SelectionInfoBox } from "../SelectionInfoBox"

import { useMobxGetter } from "../../hooks/useMobxSelector"
import { myCodeUIStore } from "../store"
import { useMyCodeUI } from "../store/useMyCodeUI"
import { useSong } from "../../hooks/useSong"
import { usePianoRoll } from "../../hooks/usePianoRoll"

import { useTaskService } from "../api/taskServiceContext"

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const SectionTitle = styled.div`
  font-size: 16px;
  font-weight: bold;
  margin-top: 8px;
  margin-bottom: 8px;
`

const ModeToggle = styled.div`
  display: flex;
  gap: 6px;
  padding: 6px;
  border-radius: 14px;
  border: 1px solid var(--color-border);
  background: rgba(255,255,255,0.03);
`

const ModeTab = styled.button<{ active: boolean }>`
  flex: 1;
  height: 40px;
  border-radius: 10px;
  border: 1px solid ${({ active }) => (active ? "rgba(255,255,255,0.18)" : "transparent")};

  background: ${({ active }) =>
    active ? "var(--color-theme)" : "transparent"};

  color: var(--color-text);
  font-size: 13px;
  cursor: pointer;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  opacity: ${({ active }) => (active ? 1 : 0.85)};
  transition: background 120ms ease, opacity 120ms ease, transform 120ms ease;

  &:hover {
    opacity: 1;
    background: ${({ active }) =>
      active ? "var(--color-theme)" : "rgba(255,255,255,0.06)"};
  }

  &:active {
    transform: translateY(1px);
  }
`

const Card = styled.div`
  padding: 10px 10px;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.03);
`

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`

const SmallHint = styled.div`
  font-size: 12px;
  opacity: 0.72;
  line-height: 1.4;
  margin-top: 6px;
`

const Btn = styled.button<{ kind?: "primary" | "ghost" }>`
  height: 40px;
  border-radius: 12px;
  cursor: pointer;
  padding: 0 12px;
  font-size: 14px;

  border: 1px solid var(--color-border);
  background: ${({ kind }) =>
    kind === "primary" ? "var(--color-theme)" : "rgba(255,255,255,0.03)"};
  color: var(--color-text);

  &:hover {
    background: ${({ kind }) =>
      kind === "primary" ? "var(--color-theme)" : "rgba(255,255,255,0.06)"};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`

const Input = styled.input`
  height: 40px;
  border-radius: 12px;
  padding: 0 10px;
  border: 1px solid var(--color-border);
  background: rgba(255,255,255,0.03);
  color: var(--color-text);
  outline: none;
  min-width: 120px;

  &:focus {
    border-color: rgba(255,255,255,0.22);
    background: rgba(255,255,255,0.05);
  }
`

const ArtifactList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
`

const ArtifactRow = styled.button<{ active: boolean }>`
  width: 100%;
  text-align: left;
  padding: 10px 10px;
  border-radius: 12px;
  border: 1px solid ${({ active }) => (active ? "rgba(255,255,255,0.22)" : "var(--color-border)")};
  background: ${({ active }) => (active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)")};
  color: var(--color-text);
  cursor: pointer;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  &:hover {
    background: ${({ active }) => (active ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.06)")};
  }

  &:active {
    transform: translateY(1px);
  }
`

function parseAlphaFromFilename(name?: string | null): number | null {
  const s = String(name ?? "")
  // e.g. mix_a0.25.mid / mix_a0.50.mid / mix_a1.00.mid
  const m = s.match(/mix_a\s*([0-9]+(?:\.[0-9]+)?)/i)
  if (!m) return null
  const v = Number(m[1])
  return Number.isFinite(v) ? v : null
}

function isWantedAlpha(a: number) {
  const eps = 1e-6
  return Math.abs(a - 0.25) < eps || Math.abs(a - 0.5) < eps || Math.abs(a - 0.75) < eps
}

export const MixPanel: FC = () => {
  const toast = useToast()

  type RefMode = "selection" | "upload"
  const [refMode, setRefMode] = useState<RefMode>("upload")

  const { timebase } = useSong()
  const { selectedTrackId } = usePianoRoll()

  const { selectionInfo } = useSelectionInfo()
  const extractNotes = useExtractBarSelectionNotes()

  const { chordCells, setChordCells, ensureChordCellsLength, setLastSelection } = useMyCodeUI()

  const activeTask = useMobxGetter(myCodeUIStore, "activeTask")

  const { runRefMidisMixSet, applyArtifactToSelection } = useTaskService()

  // --- upload mode states ---
  const fileARef = useRef<HTMLInputElement | null>(null)
  const fileBRef = useRef<HTMLInputElement | null>(null)
  const [midiA, setMidiA] = useState<File | null>(null)
  const [midiB, setMidiB] = useState<File | null>(null)
  const [barsOverride, setBarsOverride] = useState<number>(8)
  const [bpmOverride, setBpmOverride] = useState<number>(120)

  // --- selection mode meta ---
  const [barsForMix, setBarsForMix] = useState<number | null>(null)

  // --- result selection ---
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null)

  // keep store.lastSelection updated so "覆盖选区" works even on Mix tab
  useEffect(() => {
    if (!selectionInfo) {
      setLastSelection(null)
      return
    }
    setLastSelection({
      trackId: selectedTrackId ?? null,
      trackName: null,
      startBar: selectionInfo.startBar,
      endBar: selectionInfo.endBar,
      bars: selectionInfo.bars,
      fromTick: selectionInfo.fromTick,
      toTick: selectionInfo.toTick,
      timebase,
    })
  }, [selectionInfo, selectedTrackId, timebase, setLastSelection])

  // auto size chord grid
  useEffect(() => {
    const bars = refMode === "selection" ? (selectionInfo?.bars ?? 0) : barsOverride
    if (bars > 0) ensureChordCellsLength(bars)
  }, [ensureChordCellsLength, refMode, selectionInfo?.bars, barsOverride])

  const bars = useMemo(() => {
    if (refMode === "selection") return barsForMix ?? selectionInfo?.bars ?? 0
    return Math.max(1, Math.floor(barsOverride))
  }, [refMode, selectionInfo?.bars, barsOverride, barsForMix])

  const validation = useMemo(() => {
    const v1 = refMode === "selection" ? validateSelection(selectionInfo) : { ok: true, msg: "" }
    if (!v1.ok) return v1
    return validateChords(chordCells, bars)
  }, [refMode, selectionInfo, chordCells, bars])

  const onPickFileA = useCallback(() => fileARef.current?.click(), [])
  const onPickFileB = useCallback(() => fileBRef.current?.click(), [])
  const [barsOverrideText, setBarsOverrideText] = useState(String(barsOverride))

  const onFileAChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.currentTarget.files?.[0]
    if (f) setMidiA(f)
    e.currentTarget.value = ""
  }, [])

  const onFileBChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.currentTarget.files?.[0]
    if (f) setMidiB(f)
    e.currentTarget.value = ""
  }, [])

  const onUseSelectionAsA = useCallback(() => {
    const v = validateSelection(selectionInfo)
    if (!v.ok) {
      toast.error(v.msg)
      return
    }
    const res = extractNotes()
    const notes = res?.notes ?? []
    if (!notes.length) {
      toast.error("选区里没有 note events。")
      return
    }
    const selBars = selectionInfo!.bars
    if (barsForMix != null && barsForMix !== selBars) {
      toast.error(`A/B 需要相同小节数：当前 A=${barsForMix}，本次选区=${selBars}`)
      return
    }
    setBarsForMix(selBars)
    ensureChordCellsLength(selBars)
    setMidiA(notesToInMemoryMidiFile(notes, timebase, "piano", "mix_a_selection.mid"))
    toast.success("已设置 A 来源为当前选区。")
  }, [selectionInfo, extractNotes, timebase, toast, barsForMix, ensureChordCellsLength])

  const onUseSelectionAsB = useCallback(() => {
    const v = validateSelection(selectionInfo)
    if (!v.ok) {
      toast.error(v.msg)
      return
    }
    const res = extractNotes()
    const notes = res?.notes ?? []
    if (!notes.length) {
      toast.error("选区里没有 note events。")
      return
    }
    const selBars = selectionInfo!.bars
    if (barsForMix != null && barsForMix !== selBars) {
      toast.error(`A/B 需要相同小节数：当前 A=${barsForMix}，本次选区=${selBars}`)
      return
    }
    setBarsForMix(selBars)
    ensureChordCellsLength(selBars)
    setMidiB(notesToInMemoryMidiFile(notes, timebase, "piano", "mix_b_selection.mid"))
    toast.success("已设置 B 来源为当前选区。")
  }, [selectionInfo, extractNotes, timebase, toast, barsForMix, ensureChordCellsLength])

  const visibleArtifacts = useMemo(() => {
    const arts = activeTask?.artifacts ?? []
    const picked = arts
      .map((a) => ({
        ...a,
        alpha: parseAlphaFromFilename(a.filename),
      }))
      .filter((a) => a.alpha != null && isWantedAlpha(a.alpha!))
      .sort((x, y) => Number(x.alpha) - Number(y.alpha))
    return picked
  }, [activeTask?.artifacts])

  const onGen = useCallback(async () => {
    if (!validation.ok) {
      toast.error(validation.msg)
      return
    }
    if (!midiA || !midiB) {
      toast.error("请先设置 midi_a 和 midi_b。")
      return
    }
    const alphas = [0, 0.25, 0.5, 0.75, 1]
    await runRefMidisMixSet({
      midiA,
      midiB,
      bars,
      alphas,
    })
    setSelectedArtifactId(null)
  }, [validation, toast, midiA, midiB, runRefMidisMixSet, bars, bpmOverride, refMode])

  const onApplySelected = useCallback(async () => {
    if (!selectedArtifactId) return
    const a = (activeTask?.artifacts ?? []).find((x) => x.artifact_id === selectedArtifactId)
    await applyArtifactToSelection(selectedArtifactId, a?.filename ?? undefined)
  }, [selectedArtifactId, activeTask?.artifacts, applyArtifactToSelection])

  const canGen = validation.ok && !!midiA && !!midiB
  const isMixTask = activeTask?.kind === "ref_midis_mix_set"

  useEffect(() => {
    // barsOverride 被别处改动时同步显示
    setBarsOverrideText(String(barsOverride))
  }, [barsOverride])

  return (
    <Wrap>
      <div>
        <SelectionInfoBox trackName={null} trackId={selectedTrackId ?? null} selectionInfo={selectionInfo} />
      </div>

      <div>
        <SectionTitle>{CONSTANTS.mixPanel.mixingModeChooseLabel}</SectionTitle>
        <ModeToggle>
          <ModeTab active={refMode === "upload"} onMouseDown={() => setRefMode("upload")}>
            {CONSTANTS.mixPanel.mixingUploadLabel}
          </ModeTab>
          <ModeTab active={refMode === "selection"} onMouseDown={() => setRefMode("selection")}>
            {CONSTANTS.mixPanel.mixingSelectionLabel}
          </ModeTab>
        </ModeToggle>
      </div>

      {refMode === "upload" ? (
        <Card>
          <SectionTitle>{CONSTANTS.mixPanel.sourcesLabel}</SectionTitle>
          <Row>
            <Btn kind="primary" onMouseDown={onPickFileA}>{CONSTANTS.mixPanel.pickMidiALabel}</Btn>
            <div style={{ fontSize: 13, opacity: 0.85 }}>{midiA ? midiA.name : ""}</div>
          </Row>
          <Row style={{ marginTop: 8 }}>
            <Btn kind="primary" onMouseDown={onPickFileB}>{CONSTANTS.mixPanel.pickMidiBLabel}</Btn>
            <div style={{ fontSize: 13, opacity: 0.85 }}>{midiB ? midiB.name : ""}</div>
          </Row>

          <Row style={{ marginTop: 10 }}>
            <div style={{ fontSize: 13, opacity: 0.8 }}>{CONSTANTS.mixPanel.barsLabel}</div>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="8"
              value={barsOverrideText}
              onChange={(e) => {
                // 只保留数字
                const raw = e.currentTarget.value
                const cleaned = raw.replace(/[^\d]/g, "")
                setBarsOverrideText(cleaned)
              }}
              onBlur={() => {
                const n = Math.max(1, Math.floor(Number(barsOverrideText || "1")))
                setBarsOverride(n)
                setBarsOverrideText(String(n))
              }}
            />
          </Row>

          <SmallHint>{CONSTANTS.mixPanel.uploadHint}</SmallHint>

          <input
            ref={fileARef}
            type="file"
            accept=".mid,.midi,audio/midi"
            style={{ display: "none" }}
            onChange={onFileAChange}
          />
          <input
            ref={fileBRef}
            type="file"
            accept=".mid,.midi,audio/midi"
            style={{ display: "none" }}
            onChange={onFileBChange}
          />
        </Card>
      ) : (
        <Card>
          <SectionTitle>{CONSTANTS.mixPanel.sourcesLabel}</SectionTitle>
          <Row>
            <Btn kind="primary" onMouseDown={onUseSelectionAsA}>{CONSTANTS.mixPanel.pickSelectionALabel}</Btn>
            <div style={{ fontSize: 13, opacity: 0.85 }}>{midiA ? midiA.name : "—"}</div>
          </Row>
          <Row style={{ marginTop: 8 }}>
            <Btn kind="primary" onMouseDown={onUseSelectionAsB}>{CONSTANTS.mixPanel.pickSelectionBLabel}</Btn>
            <div style={{ fontSize: 13, opacity: 0.85 }}>{midiB ? midiB.name : "—"}</div>
          </Row>
          <SmallHint>{CONSTANTS.mixPanel.selectionHint}</SmallHint>
        </Card>
      )}

      <div>
        <SectionTitle>{CONSTANTS.chordMode.chordGenLabel}</SectionTitle>
        <ChordGridInput
          startBar={(selectionInfo?.startBar ?? 1)}
          barsCount={bars}
          value={chordCells}
          onChange={setChordCells}
        />
        {!validation.ok && <SmallHint style={{ opacity: 0.9 }}>{validation.msg}</SmallHint>}
      </div>

      <div>
        <SectionTitle>{CONSTANTS.mixPanel.resultsLabel}</SectionTitle>
        <Card>
          {!isMixTask || !activeTask ? (
            <>
              <div style={{ opacity: 0.85, fontSize: 13, fontWeight: "bold" }}>
                {CONSTANTS.mixPanel.noTaskLabel}
              </div>
              <SmallHint>{CONSTANTS.mixPanel.noTaskHint}</SmallHint>
            </>
          ) : activeTask.status !== "succeeded" ? (
            <div style={{ opacity: 0.85, fontSize: 13 }}>
              {activeTask.status === "failed"
                ? `生成失败：${String(activeTask.error ?? "") || "unknown error"}`
                : "生成中..."}
            </div>
          ) : visibleArtifacts.length === 0 ? (
            <div style={{ opacity: 0.85, fontSize: 13 }}>任务成功但没有找到 mix_a0.25/0.5/0.75 的 artifacts。</div>
          ) : (
            <>
              <ArtifactList>
                {visibleArtifacts.map((a) => {
                  const isActive = a.artifact_id === selectedArtifactId
                  const alpha = a.alpha != null ? a.alpha.toFixed(2) : ""
                  return (
                    <ArtifactRow
                      key={a.artifact_id}
                      active={isActive}
                      onMouseDown={() => setSelectedArtifactId(a.artifact_id)}
                      title={a.filename}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {a.filename || a.artifact_id}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>alpha {alpha}</div>
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>{isActive ? "选中" : ""}</div>
                    </ArtifactRow>
                  )
                })}
              </ArtifactList>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, gap: 10 }}>
                <Btn
                  kind="ghost"
                  disabled={!selectedArtifactId}
                  onMouseDown={onApplySelected}
                >
                  {CONSTANTS.mixPanel.applySelectionLabel}
                </Btn>
              </div>
            </>
          )}
        </Card>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Btn kind="primary" disabled={!canGen} onMouseDown={onGen}>
          {CONSTANTS.mixPanel.genBtnLabel}
        </Btn>
      </div>
    </Wrap>
  )
}
