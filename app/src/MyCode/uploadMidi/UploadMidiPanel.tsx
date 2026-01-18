import styled from "@emotion/styled"
import React, { FC, useCallback, useMemo, useRef, useState } from "react"
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

export const UploadMidiPanel: FC = () => {
  const { selectionInfo } = useSelectionInfo()
  const {
    instruments: inst,
    chordCells,
    setChordCells,
  } = useMyCodeUI()
  const { selectedTrackId } = usePianoRoll()
  const track = useTrack(selectedTrackId)
  const trackName = track.name
  const parsed = useMobxGetter(myCodeUIStore, "uploadedMidi")

  const validation = useMemo(() => {
    const vSel = validateSelection(selectionInfo)
    if (!vSel.ok) return vSel
    return validateChords(chordCells, selectionInfo!.bars)
  }, [selectionInfo, inst, chordCells])

  return (
    <Wrap>
      <MidiView />
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
        <SelectionInfoBox
          trackName={trackName}
          trackId={selectedTrackId}
          selectionInfo={selectionInfo}
        />
      </div>
      <div>
        <Btn kind="primary" disabled={!parsed || !validation.ok} onMouseDown={() => { }}>
          {CONSTANTS.chordMode.genBtnLabel}
        </Btn>
      </div>
    </Wrap>
  )
}
