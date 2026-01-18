import styled from "@emotion/styled"
import React, { FC, useCallback, useMemo, useRef } from "react"
import { emptyTrack } from "@signal-app/core"
import { useToast } from "dialog-hooks"
import { useHistory } from "../../hooks/useHistory"
import { usePianoRoll } from "../../hooks/usePianoRoll"
import { useSong } from "../../hooks/useSong"
import { CONSTANTS } from "../constants"

import { useMobxGetter } from "../../hooks/useMobxSelector"
import { myCodeUIStore } from "../store"

import {
  parseMidiFileFirstTrack,
  writeMidiNotesToTrackAt,
  useJumpToTick,
} from "../midiUtils"

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const SectionTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 16px;
  font-weight: bold;
  margin-top: 8px;
  margin-bottom: 8px;
`

const InfoBox = styled.div`
  padding: 10px 10px;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.03);
  color: var(--color-text);
  font-size: 14px;
  opacity: 0.92;
  line-height: 1.5;
`

const Row = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`

const Btn = styled.button<{ kind?: "primary" | "ghost" }>`
  height: 40px;
  border-radius: 12px;
  cursor: pointer;
  padding: 0 12px;
  font-size: 14px;

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

export const MidiView: FC = () => {
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement | null>(null)

  const { pushHistory } = useHistory()
  const { setSelectedTrackId } = usePianoRoll()
  const { tracks: currentTracks, timebase: currentTimebase, insertTrack, updateEndOfSong } = useSong()

  // ✅ 从 store 读
  const parsed = useMobxGetter(myCodeUIStore, "uploadedMidi")

  const jumpToTick = useJumpToTick()

  const onPickFile = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      try {
        const file = e.currentTarget.files?.[0]
        if (!file) return

        const result = await parseMidiFileFirstTrack(file)

        // ✅ 写入 store（不再 setState）
        myCodeUIStore.setUploadedMidi(result)
      } catch (err) {
        console.error(err)
        myCodeUIStore.setUploadedMidi(null)
        toast.error((err as Error)?.message ?? "解析 MIDI 失败。")
      } finally {
        e.currentTarget.value = ""
      }
    },
    [toast],
  )

  const canImport = useMemo(() => {
    return !!parsed && (parsed.payload?.notes?.length ?? 0) > 0
  }, [parsed])

  const doImport = useCallback(() => {
    if (!parsed) return
    if (!canImport) {
      toast.error("没有可导入的 note events。")
      return
    }

    const insertIndex = Math.max(0, currentTracks.length - 1)
    const channel = Math.min(insertIndex, 0xf)
    const t = emptyTrack(channel)

    pushHistory()

    writeMidiNotesToTrackAt(t, parsed.payload, 0, {
      targetTimebase: currentTimebase,
      scaleToTarget: true,
    })

    insertTrack(t, insertIndex)
    updateEndOfSong()
    setSelectedTrackId(t.id)
    jumpToTick(0)
  }, [
    parsed,
    canImport,
    currentTracks.length,
    currentTimebase,
    pushHistory,
    insertTrack,
    updateEndOfSong,
    setSelectedTrackId,
    jumpToTick,
    toast,
  ])

  const clearParsed = useCallback(() => {
    myCodeUIStore.clearUploadedMidi()
  }, [])

  return (
    <Wrap>
      <div>
        <SectionTitle>
          <span>{CONSTANTS.uploadMode.uploadLabel}</span>
          <Btn kind="ghost" disabled={!parsed} onMouseDown={clearParsed}>
            {CONSTANTS.uploadMode.clearBtnLabel}
          </Btn>
        </SectionTitle>

        <Row>
          <Btn kind="primary" onMouseDown={onPickFile}>
            {CONSTANTS.uploadMode.chooseMidiBtnLabel}
          </Btn>
          <Btn kind="primary" disabled={!parsed || !canImport} onMouseDown={doImport}>
            {CONSTANTS.uploadMode.importMidiToTrackBtnLabel}
          </Btn>
        </Row>

        <input
          ref={inputRef}
          type="file"
          accept=".mid,.midi,audio/midi"
          style={{ display: "none" }}
          onChange={onFileChange}
        />
      </div>

      <div>
        <SectionTitle>{CONSTANTS.uploadMode.midiAnalyzeLabel}</SectionTitle>
        {!parsed ? (
          <InfoBox>{CONSTANTS.uploadMode.midiAnalyzeHint}</InfoBox>
        ) : (
          <InfoBox>
            <div>文件名: {parsed.fileName}</div>
            <div>第一轨: {parsed.trackName || "(unnamed)"}</div>
            <div>小节数: {parsed.bars}</div>
          </InfoBox>
        )}
      </div>
    </Wrap>
  )
}
