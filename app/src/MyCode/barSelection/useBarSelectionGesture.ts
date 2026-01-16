// src/MyCode/barSelection/useBarSelectionGesture.ts
import { MouseEvent, useCallback } from "react"
import { observeDrag } from "../../helpers/observeDrag"
import { useSong } from "../../hooks/useSong"
import { useTickScroll } from "../../hooks/useTickScroll"
import { barRangeFromOneTick, barRangeFromTwoTicks } from "./barMath"
import { useBarSelection } from "./store"

export function useBarSelectionGesture() {
  const { measures, timebase } = useSong()
  const { transform, scrollLeft } = useTickScroll()
  const { setBarSelection } = useBarSelection()

  const onMouseDown = useCallback(
    (e: MouseEvent) => {
      // 只处理左键，避免跟原 ruler 的右键菜单/ctrl/alt 逻辑冲突
      if (e.button !== 0 || e.ctrlKey || e.altKey) return

      e.preventDefault()
      e.stopPropagation()

      const startPosX = e.nativeEvent.offsetX + scrollLeft
      const startClientX = e.nativeEvent.clientX
      const startTick = transform.getTick(startPosX)

      // click：选中单个小节
      setBarSelection(barRangeFromOneTick(measures, timebase, startTick))

      observeDrag({
        onMouseMove: (ev) => {
          const deltaPx = ev.clientX - startClientX
          const endPosX = startPosX + deltaPx
          const endTick = transform.getTick(endPosX)
          setBarSelection(barRangeFromTwoTicks(measures, timebase, startTick, endTick))
        },
      })
    },
    [measures, timebase, transform, scrollLeft, setBarSelection],
  )

  return { onMouseDown }
}

