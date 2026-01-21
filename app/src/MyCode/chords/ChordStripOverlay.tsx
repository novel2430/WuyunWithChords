import styled from "@emotion/styled"
import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Beat, Range } from "@signal-app/core"

import { Layout } from "../../Constants"
import { useSong } from "../../hooks/useSong"
import { useTickScroll } from "../../hooks/useTickScroll"
import { useMyCodeUI } from "../store/useMyCodeUI"
import { useSelectionInfo } from "../barSelection/useSelectionInfo"

const Wrap = styled.div`
  position: relative;
  height: 100%;
  overflow: hidden;

  border-bottom: 1px solid var(--color-divider);
  background: rgba(255, 255, 255, 0.02);
`

const Cell = styled.div<{ selected?: boolean }>`
  position: absolute;
  top: 0;
  bottom: 0;
  border-right: 1px solid rgba(255, 255, 255, 0.08);

  /* Ensure input never visually bleeds outside the bar cell */
  overflow: hidden;

  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;

  cursor: text;
  user-select: none;

  background: ${({ selected }) =>
    selected ? "rgba(255,255,255,0.06)" : "transparent"};

  &:hover {
    background: ${({ selected }) =>
      selected ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)"};
  }
`

const BarLabel = styled.div`
  padding-left: 5px;
  font-size: 10px;
  opacity: 0.55;
  line-height: 1;
`

const ChordText = styled.div`
  font-size: 13px;
  font-weight: 700;
  opacity: 0.92;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-left: 5px;
`

const Input = styled.input`
  width: 100%;
  height: 28px;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  outline: none;
  background: rgba(0, 0, 0, 0.18);
  color: var(--color-text);
  padding: 0 10px;
  font-size: 13px;
`

type BarStart = {
  bar: number // 1-based
  tick: number
  x: number // world x
}

export const ChordStripOverlay: FC = () => {
  const { measures, timebase } = useSong()
  const { scrollLeft, canvasWidth, transform } = useTickScroll()

  const { selectionInfo } = useSelectionInfo()
  const {
    chordsByBar,
    ensureChordsByBarLength,
    getChordAtBar,
    setChordAtBar,
    syncChordCellsFromRange,
  } = useMyCodeUI()

  const [origin, setOrigin] = useState<string>("")

  // ✅ 选区变化：把对应范围同步到旧 chordCells（方便你暂时不改 rightPanel）
  useEffect(() => {
    if (!selectionInfo) return
    if (selectionInfo.bars <= 0) return
    ensureChordsByBarLength(selectionInfo.endBar)
    syncChordCellsFromRange(selectionInfo.startBar, selectionInfo.bars)
  }, [selectionInfo?.startBar, selectionInfo?.endBar, selectionInfo?.bars, ensureChordsByBarLength, syncChordCellsFromRange])

  const barStarts = useMemo<BarStart[]>(() => {
    const ms: any[] = Array.isArray(measures) ? (measures as any[]) : []
    if (!ms.length || !Number.isFinite(timebase) || timebase <= 0) return []

    const fromTick = Math.max(0, Math.floor(transform.getTick(scrollLeft)))
    // 给一点 buffer：确保能拿到“视口末尾之后的下一个小节起点”，用来算最后一个 cell 的宽度
    const toTick = Math.max(fromTick, Math.ceil(transform.getTick(scrollLeft + canvasWidth)) + timebase * 64)

    const beats = Beat.createInRange(ms as any, timebase, Range.create(fromTick, toTick)) as any[]
    const starts = beats
      .filter((b) => b?.beat === 0)
      .map((b) => ({
        bar: Number(b?.measure ?? 0) + 1,
        tick: Number(b?.tick ?? 0),
        x: Math.round(transform.getX(Number(b?.tick ?? 0))),
      }))

    // 只保留视口附近（含 buffer）
    const left = scrollLeft - 200
    const right = scrollLeft + canvasWidth + 200
    return starts.filter((s) => s.x >= left && s.x <= right)
  }, [measures, timebase, transform, scrollLeft, canvasWidth])

  const selectedRange = useMemo(() => {
    if (!selectionInfo) return null
    const s = Math.max(1, Math.floor(selectionInfo.startBar))
    const e = Math.max(s, Math.floor(selectionInfo.endBar))
    return { s, e }
  }, [selectionInfo?.startBar, selectionInfo?.endBar])

  const isBarSelected = useCallback(
    (bar: number) => {
      if (!selectedRange) return false
      return bar >= selectedRange.s && bar <= selectedRange.e
    },
    [selectedRange],
  )

  const [editingBar, setEditingBar] = useState<number | null>(null)
  const [draft, setDraft] = useState<string>("")
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!editingBar) return
    // 下一帧 focus，避免点击时被别的 handler 抢焦点
    const t = window.requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
    return () => window.cancelAnimationFrame(t)
  }, [editingBar])

  const beginEdit = useCallback(
    (bar: number) => {
      const cur = getChordAtBar(bar)
      setEditingBar(bar)
      setDraft(cur)
      setOrigin(cur)
    },
    [getChordAtBar],
  )


  const commitEdit = useCallback(() => {
    if (!editingBar) return
    setChordAtBar(editingBar, draft)

    // 兼容旧 chordCells：如果正在编辑的 bar 在当前选区内，就把选区范围重新同步一次
    if (selectionInfo && selectionInfo.bars > 0) {
      if (editingBar >= selectionInfo.startBar && editingBar <= selectionInfo.endBar) {
        syncChordCellsFromRange(selectionInfo.startBar, selectionInfo.bars)
      }
    }

    setEditingBar(null)
  }, [editingBar, draft, setChordAtBar, selectionInfo, syncChordCellsFromRange])

  const cancelEdit = useCallback(() => {
    if (!editingBar) {
      setEditingBar(null)
      return
    }
    setChordAtBar(editingBar, origin)
    if (selectionInfo && selectionInfo.bars > 0) {
      if (editingBar >= selectionInfo.startBar && editingBar <= selectionInfo.endBar) {
        syncChordCellsFromRange(selectionInfo.startBar, selectionInfo.bars)
      }
    }
    setEditingBar(null)
  }, [editingBar, origin, setChordAtBar, selectionInfo, syncChordCellsFromRange])


  // 让 chordsByBar 变更也触发重渲染（避免 MobX getter 在某些情况下被 tree-shaking 成没依赖）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = chordsByBar.length

  return (
    <Wrap>
      {barStarts.map((b, idx) => {
        const next = barStarts[idx + 1]
        const nextX = next ? next.x : b.x + Math.max(80, Math.round(Layout.pixelsPerTick * 4 * (timebase || 480)))
        const left = Math.round(b.x - scrollLeft)
        const width = Math.max(48, Math.round(nextX - b.x))
        const selected = isBarSelected(b.bar)

        return (
          <Cell
            key={`${b.bar}-${b.tick}`}
            selected={selected}
            style={{ left, width }}
            onMouseDown={(e) => {
              e.preventDefault()
              beginEdit(b.bar)
            }}
          >
            <BarLabel>#{b.bar}</BarLabel>
            {editingBar === b.bar ? (
              <Input
                ref={inputRef}
                value={draft}
                onChange={(e) => {
                  const next = e.currentTarget.value
                  setDraft(next)
                  if (!editingBar) return
                  setChordAtBar(editingBar, next)

                  if (selectionInfo && selectionInfo.bars > 0) {
                    if (editingBar >= selectionInfo.startBar && editingBar <= selectionInfo.endBar) {
                      syncChordCellsFromRange(selectionInfo.startBar, selectionInfo.bars)
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    commitEdit()
                  } else if (e.key === "Escape") {
                    e.preventDefault()
                    cancelEdit()
                  }
                }}
                onBlur={() => commitEdit()}
              />
            ) : (
              <ChordText title={getChordAtBar(b.bar)}>
                {getChordAtBar(b.bar) || "—"}
              </ChordText>
            )}
          </Cell>
        )
      })}
    </Wrap>
  )
}
