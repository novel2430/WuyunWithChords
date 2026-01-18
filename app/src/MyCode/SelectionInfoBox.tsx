import styled from "@emotion/styled"
import React, { FC } from "react"
import { CONSTANTS } from "./constants"

type Props = {
  trackName?: string | null
  trackId?: string | number | null
  selectionInfo?: {
    startBar: number
    endBar: number
    bars: number
    fromTick: number
    toTick: number
  } | null
}

const SectionTitle = styled.div`
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
  font-size: 13px;
  line-height: 1.5;
`

export const SelectionInfoBox: FC<Props> = ({ trackName, trackId, selectionInfo }) => {
  return (
    <div>
      <SectionTitle>{CONSTANTS.barSelectionInfo.label}</SectionTitle>
      <InfoBox>
        {!selectionInfo ? (
          <>{CONSTANTS.barSelectionInfo.emptyHint}</>
        ) : (
          <>
            <div>
              Track：{trackName || "未命名"}（inedex: {String(trackId ?? "")}）
            </div>
            <div>
              小节：第 {selectionInfo.startBar} ～ {selectionInfo.endBar}（共 {selectionInfo.bars} 小节）
            </div>
            <div>
              Tick：{selectionInfo.fromTick} ～ {selectionInfo.toTick}
            </div>
          </>
        )}
      </InfoBox>
    </div>
  )
}
