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

export const ChordsModePane: FC = () => {
  const toast = useToast()
  const { pushHistory } = useHistory()

  const { selectedTrackId } = usePianoRoll()
  // ✅ 顶层直接解构 plain 值（不要 song.measures）
  const { measures, timebase } = useSong()

  // ✅ track 也一样：顶层先读出 name（不要在 useMemo/useCallback 里读 track.name）
  const track = useTrack(selectedTrackId)
  const trackName = track.name

  const {
    instruments: inst,
    chordCells,
    toggleInstrument,
    setChordCells,
    ensureChordCellsLength,
    setLastSelection,
  } = useMyCodeUI()

  const { barSelection, clearBarSelection, selectionInfo } = useSelectionInfo()

  const validation = useMemo(() => {
    const vSel = validateSelection(selectionInfo)
    if (!vSel.ok) return vSel
    if (inst.size === 0) return { ok: false, msg: "请选择至少一种乐器。" }
    return validateChords(chordCells, selectionInfo!.bars)
  }, [selectionInfo, inst, chordCells])

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
          <Chip active={inst.has("piano")} onMouseDown={() => toggleInstrument("piano")}>
            {CONSTANTS.chordMode.pianoLabel}
          </Chip>
          <Chip active={inst.has("guitar")} onMouseDown={() => toggleInstrument("guitar")}>
            {CONSTANTS.chordMode.guitarLabel}
          </Chip>
          <Chip active={inst.has("bass")} onMouseDown={() => toggleInstrument("bass")}>
            {CONSTANTS.chordMode.bassLabel}
          </Chip>
        </InstrumentsRow>
      </div>

      <div>
        <SectionTitle>{CONSTANTS.chordMode.chordGenLabel}</SectionTitle>
        <ChordGridInput
          startBar={selectionInfo?.startBar ?? 1}
          barsCount={selectionInfo?.bars ?? 0}
          value={chordCells}
          onChange={setChordCells}
        />
        {!validation.ok && <ErrorText>{validation.msg}</ErrorText>}
      </div>

      <div>
        <SelectionInfoBox
          trackName={trackName}
          trackId={selectedTrackId}
          selectionInfo={selectionInfo}
        />
      </div>

      <Actions>
        <Btn
          kind="ghost"
          onMouseDown={() => clearBarSelection()}
          disabled={!barSelection}
        >
          {CONSTANTS.chordMode.clearBtnLabel}
        </Btn>
        <GenBtn kind="primary" onMouseDown={() => { }} disabled={!validation.ok}>
          {CONSTANTS.chordMode.genBtnLabel}
        </GenBtn>
      </Actions>
    </Wrap>
  )
}

