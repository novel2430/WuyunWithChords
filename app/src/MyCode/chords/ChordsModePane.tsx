// src/MyCode/chords/ChordsModePane.tsx
import styled from "@emotion/styled"
import React, { FC, useCallback, useMemo, useState, useEffect } from "react"
import { useToast } from "dialog-hooks"
import { usePianoRoll } from "../../hooks/usePianoRoll"
import { useSong } from "../../hooks/useSong"
import { useTrack } from "../../hooks/useTrack"
import { useHistory } from "../../hooks/useHistory"
import { ChordGridInput } from "./ChordGridInput"
import { SelectionInfoBox } from "../SelectionInfoBox"
import { CONSTANTS } from "../constants"
import { useMyCodeUI } from "../store/useMyCodeUI"
import { useSelectionInfo } from "../barSelection/useSelectionInfo"
import { validateSelection, validateChords } from "../chordsUtils"
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

const InstrumentsRow = styled.div`
  display: flex;
  gap: 10px;
`

const Chip = styled.button<{ active: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  height: 64px;
  border-radius: 12px;

  border: 1px solid var(--color-border);
  background: ${({ active }) =>
    active ? "var(--color-theme)" : "rgba(255,255,255,0.03)"};

  color: var(--color-text);

  cursor: pointer;
  user-select: none;

  transition: transform 120ms ease, filter 120ms ease, box-shadow 120ms ease,
    border-color 120ms ease;

  &:hover {
    border-color: rgba(255, 255, 255, 0.18);
    filter: brightness(1.06);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0px);
    filter: brightness(1.02);
  }
`

const ErrorText = styled.div`
  margin-top: 8px;
  font-size: 13px;
  color: rgba(255, 120, 120, 0.95);
`

const Actions = styled.div`
  display: flex;
  gap: 10px;
`

const Btn = styled.button<{ kind?: "primary" | "ghost" }>`
  flex: 1;
  height: 40px;
  border-radius: 12px;
  cursor: pointer;

  border: 1px solid var(--color-border);
  background: ${({ kind }) =>
    kind === "primary" ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.03)"};
  color: var(--color-text);

  &:hover {
    background: ${({ kind }) =>
    kind === "primary" ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)"};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`

const GenBtn = styled.button<{ kind?: "primary" | "ghost" }>`
  flex: 1;
  height: 40px;
  border-radius: 12px;
  cursor: pointer;

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

const ResultCard = styled.div`
  padding: 10px 10px;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.03);
  color: var(--color-text);
`

const ResultTopRow = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
`

const SegTabs = styled.div`
  display: flex;
  gap: 8px;
`

const TabBtn = styled.button<{ active: boolean }>`
  height: 32px;
  padding: 0 10px;
  border-radius: 10px;
  cursor: pointer;

  border: 1px solid var(--color-border);
  background: ${({ active }) =>
    active ? "var(--color-theme)" : "rgba(255,255,255,0.03)"};
  color: var(--color-text);
  opacity: ${({ active }) => (active ? 1 : 0.85)};

  &:hover {
    background: ${({ active }) =>
      active ? "var(--color-theme)" : "rgba(255,255,255,0.03)"};
  }
`

const StatusPill = styled.div`
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: rgba(255,255,255,0.03);
  opacity: 0.9;
`

const ArtifactList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const ArtifactRow = styled.button<{ active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  width: 100%;
  padding: 10px 10px;
  border-radius: 12px;
  cursor: pointer;

  border: 1px solid ${({ active }) => (active ? "rgba(255,255,255,0.22)" : "var(--color-border)")};
  background: ${({ active }) => (active ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.03)")};
  color: var(--color-text);
  text-align: left;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }
`

const ArtifactName = styled.div`
  font-size: 13px;
  opacity: 0.92;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ArtifactLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const ArtifactMeta = styled.div`
  font-size: 11px;
  opacity: 0.6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const SmallHint = styled.div`
  margin-top: 8px;
  font-size: 12px;
  opacity: 0.75;
`

const ApplyBtn = styled.button<{ disabled?: boolean }>`
  height: 36px;
  padding: 0 12px;
  border-radius: 12px;
  cursor: pointer;

  border: 1px solid var(--color-border);
  background: var(--color-theme);
  color: var(--color-text);

  opacity: ${({ disabled }) => (disabled ? 0.45 : 1)};
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
`


export const ChordsModePane: FC = () => {
  const toast = useToast()
  const { pushHistory } = useHistory()

  const { selectedTrackId } = usePianoRoll()
  // ✅ 顶层直接解构 plain 值（不要 song.measures）
  const { measures, timebase } = useSong()

  // ✅ track 也一样：顶层先读出 name（不要在 useMemo/useCallback 里读 track.name）
  const track = useTrack(selectedTrackId)
  const trackName = track.name

  const { runChordsToMidisFromStore, applyArtifactToSelection } = useTaskService()

  const {
    instruments,
    chordCells,
    toggleInstrument,
    setChordCells,
    ensureChordCellsLength,
    setLastSelection,
    // ✅ 结果选择区要用
    activeInstrument,
    setActiveInstrument,
    setSelectedArtifactForInstrument,
    artifactOpsById,
    activeTaskForActiveInstrument,
    selectedArtifactIdForActiveInstrument,
  } = useMyCodeUI()


  const { barSelection, clearBarSelection, selectionInfo } = useSelectionInfo()

  const validation = useMemo(() => {
    const vSel = validateSelection(selectionInfo)
    if (!vSel.ok) return vSel
    if (instruments.size === 0) return { ok: false, msg: "请选择至少一种乐器。" }
    return validateChords(chordCells, selectionInfo!.bars)
  }, [selectionInfo, instruments, chordCells])

  const doGenerate = useCallback(async () => {
    const instArr = Array.from(instruments)
    if (instArr.length === 0) return
    for (const instName of instArr) {
      console.log(instName)
      await runChordsToMidisFromStore(instName)
    }
  }, [runChordsToMidisFromStore, instruments])

  const activeTask = activeTaskForActiveInstrument
  const selectedArtifactId = selectedArtifactIdForActiveInstrument

  const artifacts = activeTask?.artifacts ?? []

  const activeArtifactOp = selectedArtifactId ? (artifactOpsById?.[selectedArtifactId] ?? {}) : {}
  const isApplying = !!activeArtifactOp.downloading || !!activeArtifactOp.importing

  const onPickArtifact = useCallback(
    (artifactId: string) => {
      setSelectedArtifactForInstrument(activeInstrument, artifactId)
    },
    [activeInstrument, setSelectedArtifactForInstrument],
  )

  const onApplySelected = useCallback(async () => {
    if (!selectedArtifactId) return
    await applyArtifactToSelection(selectedArtifactId)
  }, [applyArtifactToSelection, selectedArtifactId])


  useEffect(() => {
    if (selectionInfo?.bars) ensureChordCellsLength(selectionInfo.bars)
  }, [selectionInfo?.bars, ensureChordCellsLength])

  useEffect(() => {
    if (!selectionInfo) {
      setLastSelection(null)
      return
    }
    setLastSelection({
      trackId: selectedTrackId ?? null,
      trackName: trackName ?? null,
      startBar: selectionInfo.startBar,
      endBar: selectionInfo.endBar,
      bars: selectionInfo.bars,
      fromTick: selectionInfo.fromTick,
      toTick: selectionInfo.toTick,
      timebase,
    })
  }, [selectionInfo, selectedTrackId, trackName, timebase, setLastSelection])


  return (
    <Wrap>
      <div>
        <SectionTitle>{CONSTANTS.chordMode.instrumentLabel}</SectionTitle>
        <InstrumentsRow>
          <Chip active={instruments.has("piano")} onMouseDown={() => toggleInstrument("piano")}>
            {CONSTANTS.chordMode.pianoLabel}
          </Chip>
          <Chip active={instruments.has("guitar")} onMouseDown={() => toggleInstrument("guitar")}>
            {CONSTANTS.chordMode.guitarLabel}
          </Chip>
          <Chip active={instruments.has("bass")} onMouseDown={() => toggleInstrument("bass")}>
            {CONSTANTS.chordMode.bassLabel}
          </Chip>
        </InstrumentsRow>
      </div>

      <div>
        <SectionTitle>{CONSTANTS.chordMode.resultTab.headLabel}</SectionTitle>

        <ResultCard>
          <ResultTopRow>
            <SegTabs>
              <TabBtn active={activeInstrument === "piano"} onMouseDown={() => setActiveInstrument("piano")}>
                {CONSTANTS.chordMode.resultTab.piano}
              </TabBtn>
              <TabBtn active={activeInstrument === "guitar"} onMouseDown={() => setActiveInstrument("guitar")}>
                {CONSTANTS.chordMode.resultTab.guitar}
              </TabBtn>
              <TabBtn active={activeInstrument === "bass"} onMouseDown={() => setActiveInstrument("bass")}>
                {CONSTANTS.chordMode.resultTab.bass}
              </TabBtn>
            </SegTabs>

            <StatusPill>
              {activeTask
                ? `${activeTask.status}${activeTask.error ? " · error" : ""}`
                : CONSTANTS.chordMode.resultTab.noTaskYet}
            </StatusPill>
          </ResultTopRow>

          {(!activeTask || activeTask.kind != "chords_to_midis") ? (
            <>
              <div style={{ opacity: 0.85, fontSize: 13, fontWeight: "bold" }}>
                {CONSTANTS.chordMode.resultTab.noTaskLabel}
              </div>
              <SmallHint>
                {CONSTANTS.chordMode.resultTab.noTaskHint}
              </SmallHint>
            </>
          ) : activeTask.status !== "succeeded" ? (
            <>
              <div style={{ opacity: 0.85, fontSize: 13 }}>
                {activeTask.status === "failed"
                  ? `生成失败：${String(activeTask.error ?? "") || "unknown error"}`
                  : "生成中..."}
              </div>
            </>
          ) : artifacts.length === 0 ? (
            <div style={{ opacity: 0.85, fontSize: 13 }}>任务成功但没有返回 artifacts。</div>
          ) : (
            <>
              <ArtifactList>
                {artifacts.map((a, idx) => {
                  const isActive = a.artifact_id === selectedArtifactId
                  const barsText = activeTask?.inputBars ? `${activeTask.inputBars}小節` : ""
                  const chordsText = (activeTask?.inputChords ?? [])
                    .map((s) => (s ?? "").trim())
                    .map((s) => (s.length ? s : "—"))
                    .join("-")
                  const metaText = [barsText, chordsText].filter(Boolean).join(" · ")

                  return (
                    <ArtifactRow
                      key={a.artifact_id}
                      active={isActive}
                      onMouseDown={() => onPickArtifact(a.artifact_id)}
                      title={a.filename}
                    >
                      <ArtifactLeft>
                        <ArtifactName>
                          {idx + 1}. {a.filename || a.artifact_id}
                        </ArtifactName>
                        {!!metaText && <ArtifactMeta>{metaText}</ArtifactMeta>}
                      </ArtifactLeft>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>{isActive ? "选中" : ""}</div>
                    </ArtifactRow>
                  )
                })}
              </ArtifactList>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <ApplyBtn
                  disabled={!selectedArtifactId || !selectionInfo || isApplying}
                  onMouseDown={onApplySelected}
                >
                  {CONSTANTS.chordMode.resultTab.updateSelection}
                </ApplyBtn>
              </div>
            </>
          )}
        </ResultCard>
      </div>


      <Actions>
        <Btn
          kind="ghost"
          onMouseDown={() => clearBarSelection()}
          disabled={!barSelection}
        >
          {CONSTANTS.chordMode.clearBtnLabel}
        </Btn>
        <GenBtn kind="primary" onMouseDown={doGenerate} disabled={!validation.ok}>
          {CONSTANTS.chordMode.genBtnLabel}
        </GenBtn>
      </Actions>
    </Wrap>
  )
}

