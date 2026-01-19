import React, { FC, useMemo } from "react"
import styled from "@emotion/styled"
import { useTickScroll } from "../../hooks/useTickScroll"
import { useBarSelectionGesture } from "./useBarSelectionGesture"
import { useBarSelection } from "./store"
import { useBarSelectionDebugLog } from "./useBarSelectionDebugLog"

const STRIP_H = 14

const Strip = styled.div({
  position: "absolute",
  left: 0,
  top: 0,
  right: 0,
  height: STRIP_H,
  zIndex: 5,
  userSelect: "none",
})

const Rail = styled.div({
  position: "absolute",
  inset: 0,
  borderBottom: "1px dashed rgba(255,255,255,0.25)",
  background:
    "repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 6px, rgba(255,255,255,0.0) 6px, rgba(255,255,255,0.0) 12px)",
})

const Hint = styled.div({
  position: "absolute",
  right: 8,
  top: 0,
  height: STRIP_H,
  lineHeight: `${STRIP_H}px`,
  fontSize: 10,
  opacity: 0.75,
  pointerEvents: "none",
  whiteSpace: "nowrap",
})

const Badge = styled.div({
  position: "absolute",
  left: 8,
  top: 0,
  height: STRIP_H,
  lineHeight: `${STRIP_H}px`,
  fontSize: 10,
  opacity: 0.8,
  pointerEvents: "none",
  whiteSpace: "nowrap",
})

const Interactive = styled.div({
  position: "absolute",
  inset: 0,
  cursor: "col-resize",
  background: "transparent",
  ":hover": {
    outline: "1px solid rgba(255,255,255,0.18)",
    outlineOffset: -1,
  },
})

const Selection = styled.div({
  position: "absolute",
  top: 1,
  height: STRIP_H - 2,
  borderRadius: 3,
  background: "var(--color-theme)",
  opacity: 0.5,
  border: "1px solid var(--color-theme)",
  pointerEvents: "none",
})

const HandleL = styled.div({
  position: "absolute",
  top: -1,
  left: -4,
  width: 6,
  height: STRIP_H - 2,
  background: "rgba(0,0,0,0.22)",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: "3px 0 0 3px",
})

const HandleR = styled.div({
  position: "absolute",
  top: -1,
  right: -4,
  width: 6,
  height: STRIP_H - 2,
  background: "rgba(0,0,0,0.22)",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: "0 3px 3px 0",
})

export const BarSelectionOverlay: FC = () => {
  useBarSelectionDebugLog(false)
  const { barSelection, clearBarSelection } = useBarSelection()
  const { onMouseDown } = useBarSelectionGesture()
  const { transform, scrollLeft } = useTickScroll()

  const rect = useMemo(() => {
    if (!barSelection) return null
    const left = transform.getX(barSelection.fromTick) - scrollLeft
    const right = transform.getX(barSelection.toTick) - scrollLeft
    const width = Math.max(0, right - left)
    return { left, width }
  }, [barSelection, transform, scrollLeft])

  return (
    <Strip>
      <Rail />
      {rect && (
        <Selection style={{ left: rect.left, width: rect.width }}>
          <HandleL />
          <HandleR />
        </Selection>
      )}

      <Interactive
        onMouseDown={onMouseDown as any}
        onContextMenu={(e) => {
          // ✅ 右键取消选中（只在这条 14px 轨道上生效）
          e.preventDefault()
          e.stopPropagation()
          clearBarSelection()
        }}
        title="Drag to select bars. Right-click to clear."
      />
    </Strip>
  )
}
