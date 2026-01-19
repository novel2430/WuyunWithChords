import styled from "@emotion/styled"
import React, { FC, useCallback, useMemo, useEffect, useRef, useState } from "react"
import { MidiView } from "./MidiView"
import { ChordGridInput } from "../chords/ChordGridInput"
import { CONSTANTS } from "../constants"
import { useSelectionInfo } from "../barSelection/useSelectionInfo"
import { useMyCodeUI } from "../store/useMyCodeUI"
import { SelectionInfoBox } from "../SelectionInfoBox"
import { useTrack } from "../../hooks/useTrack"
import { usePianoRoll } from "../../hooks/usePianoRoll"
import { useMobxGetter } from "../../hooks/useMobxSelector"
import { myCodeUIStore } from "../store"
import { validateSelection, validateChords } from "../chordsUtils"
import { useMyCodeTaskService } from "../api/taskService"
import { useSong } from "../../hooks/useSong"
import { useExtractBarSelectionNotes } from "../barSelection/useBarSelectionMidi"
import { notesToInMemoryMidiFile } from "../midiUtils"


const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const InstrumentsRow = styled.div`
  display: flex;
  gap: 10px;
`

const SmallHint = styled.div`
  margin-top: 8px;
  font-size: 12px;
  opacity: 0.75;
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

const ResultCard = styled.div`
  padding: 10px 10px;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.03);
  color: var(--color-text);
`

const Actions = styled.div`
  display: flex;
  gap: 10px;
`

const SectionTitle = styled.div`
  font-size: 16px;
  font-weight: bold;
  margin-top: 8px;
  margin-bottom: 8px;
`

const Btn = styled.button<{ kind?: "primary" | "ghost" }>`
  height: 40px;
  width: 100%;
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


export const UploadMidiPanel: FC = () => {
  const { selectionInfo } = useSelectionInfo()
  const {
    instruments: inst,
    chordCells,
    setChordCells,
    setActiveInstrument,
    activeInstrument,
    activeTaskForActiveInstrument,
    setSelectedArtifactForInstrument,
    selectedArtifactIdForActiveInstrument,
    artifactOpsById,
    setLastSelection,
    ensureChordCellsLength,
  } = useMyCodeUI()
  const { runRefMidiToMidiFromStore, applyArtifactToSelection } = useMyCodeTaskService()
  const { selectedTrackId } = usePianoRoll()
  const track = useTrack(selectedTrackId)
  const trackName = track.name
  const { measures, timebase } = useSong()
  const parsed = useMobxGetter(myCodeUIStore, "uploadedMidi")
  const activeTask = activeTaskForActiveInstrument
  const selectedArtifactId = selectedArtifactIdForActiveInstrument
  const artifacts = activeTask?.artifacts ?? []
  const activeArtifactOp = selectedArtifactId ? (artifactOpsById?.[selectedArtifactId] ?? {}) : {}
  const isApplying = !!activeArtifactOp.downloading || !!activeArtifactOp.importing
  const uploadedFile = useMobxGetter(myCodeUIStore, "uploadedMidiFile")
  const extractNotes = useExtractBarSelectionNotes()
  type RefMode = "selection" | "upload"
  const [refMode, setRefMode] = useState<RefMode>("selection")


  const validation = useMemo(() => {
    const vSel = validateSelection(selectionInfo)
    if (!vSel.ok) return vSel
    return validateChords(chordCells, selectionInfo!.bars)
  }, [selectionInfo, inst, chordCells])

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

  const onGenFromUploadedMidi = useCallback(async () => {
    if (!validation.ok || !uploadedFile) return
    await runRefMidiToMidiFromStore(uploadedFile, activeInstrument)
  }, [validation.ok, uploadedFile, activeInstrument, runRefMidiToMidiFromStore])

  const onGenFromSelection = useCallback(async () => {
    if (!validation.ok) return

    const res = extractNotes()
    const notes = res?.notes ?? []
    if (!notes.length) return  // 也可以 toast 提示“选区里没有 note”

    const refFile = notesToInMemoryMidiFile(notes, timebase, "piano", "ref_selection.mid")
    await runRefMidiToMidiFromStore(refFile, activeInstrument)
  }, [validation.ok, extractNotes, timebase, activeInstrument, runRefMidiToMidiFromStore])


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
        <SelectionInfoBox
          trackName={trackName}
          trackId={selectedTrackId}
          selectionInfo={selectionInfo}
        />
      </div>
      <div>
        <SectionTitle>{CONSTANTS.uploadMode.instrumentLabel}</SectionTitle>
        <InstrumentsRow>
          <Chip active={activeInstrument === "piano"} onMouseDown={() => setActiveInstrument("piano")}>
            {CONSTANTS.chordMode.pianoLabel}
          </Chip>
          <Chip active={activeInstrument === "guitar"} onMouseDown={() => setActiveInstrument("guitar")}>
            {CONSTANTS.chordMode.guitarLabel}
          </Chip>
          <Chip active={activeInstrument === "bass"} onMouseDown={() => setActiveInstrument("bass")}>
            {CONSTANTS.chordMode.bassLabel}
          </Chip>
        </InstrumentsRow>
      </div>
      <div>
        <SectionTitle>{CONSTANTS.uploadMode.refSourceLabel}</SectionTitle>
        <ModeToggle>
          <ModeTab active={refMode === "selection"} onMouseDown={() => setRefMode("selection")}>
            {CONSTANTS.uploadMode.refSelectionLabel}
          </ModeTab>
          <ModeTab active={refMode === "upload"} onMouseDown={() => setRefMode("upload")}>
            {CONSTANTS.uploadMode.refMidiLabel}
          </ModeTab>
        </ModeToggle>

        <SmallHint>
          {refMode === "selection"
            ? CONSTANTS.uploadMode.refSelectionHint 
            : CONSTANTS.uploadMode.refMidiHint}
        </SmallHint>
      </div>
      {refMode === "upload" && <MidiView />}
      <div>
        <SectionTitle>{CONSTANTS.chordMode.chordGenLabel}</SectionTitle>
        <ChordGridInput
          startBar={selectionInfo?.startBar ?? 1}
          barsCount={selectionInfo?.bars ?? 0}
          value={chordCells}
          onChange={setChordCells}
        />
      </div>
      <div>
        <SectionTitle>{CONSTANTS.chordMode.resultTab.headLabel}</SectionTitle>
        <ResultCard>
          {(!activeTask || activeTask.kind != "ref_midi_to_midi") ? (
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
      <div>
        <Actions>
          <Btn
            kind="primary"
            disabled={
              !validation.ok ||
              (refMode === "upload" && !uploadedFile) // 注意用 uploadedFile，不用 parsed
            }
            onMouseDown={refMode === "selection" ? onGenFromSelection : onGenFromUploadedMidi}
          >
            {refMode === "selection"
              ? CONSTANTS.uploadMode.refSelectionGenBtnLabel
              : CONSTANTS.uploadMode.refMidiGenBtnLabel}
          </Btn>
        </Actions>
      </div>
    </Wrap>
  )
}
