import styled from "@emotion/styled"
import React, { FC, useEffect, useMemo } from "react"
import { CONSTANTS } from "../constants"

type Props = {
  // 选区起始小节号（用于显示 Bar 12 / Bar 13 …）
  startBar?: number | null
  // 选中小节数（决定出现多少个格子）
  barsCount: number
  // 外部受控 state
  value: string[]
  onChange: (next: string[]) => void
  // 没选区时显示的文案（可复用）
  emptyHint?: string
}

const InfoBox = styled.div`
  padding: 10px 10px;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.03);
  color: var(--color-text);
  font-size: 12px;
  opacity: 0.92;
  line-height: 1.5;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
`

const Cell = styled.div`
  border-radius: 12px;
  border: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.04);
  padding: 8px 8px 6px 8px;
  overflow: hidden;
`

const CellTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--color-text);
  margin-bottom: 6px;
`

const Input = styled.input`
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  height: 32px;
  border-radius: 10px;

  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);

  padding: 0 10px;
  color: var(--color-text);
  outline: none;

  &:focus {
    border-color: rgba(255, 255, 255, 0.28);
    background: rgba(255, 255, 255, 0.05);
  }

  ::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }
`

export const ChordGridInput: FC<Props> = ({
  startBar,
  barsCount,
  value,
  onChange,
  emptyHint = CONSTANTS.chordProgression.emptyHint,
}) => {
  // ✅ 自动对齐长度（抽走你原本在 ChordsModePane 里的 useEffect）
  useEffect(() => {
    if (!barsCount) return
    onChange(
      (() => {
        const next = value.slice(0, barsCount)
        while (next.length < barsCount) next.push("")
        return next
      })()
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barsCount])

  const safeStartBar = useMemo(() => {
    if (!barsCount) return 0
    return typeof startBar === "number" ? startBar : 1
  }, [barsCount, startBar])

  if (!barsCount) {
    return <InfoBox>{emptyHint}</InfoBox>
  }

  return (
    <Grid>
      {value.map((val, i) => {
        const barNo = safeStartBar + i
        return (
          <Cell key={i}>
            <CellTop>
              <span>小节 {barNo}</span>
            </CellTop>

            <Input
              value={val}
              onChange={(e) => {
                const v = e.target.value
                const next = value.slice()
                next[i] = v
                onChange(next)
              }}
              placeholder="Am"
            />
          </Cell>
        )
      })}
    </Grid>
  )
}

