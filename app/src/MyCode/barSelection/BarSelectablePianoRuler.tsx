// src/MyCode/barSelection/BarSelectablePianoRuler.tsx
import React, { FC } from "react"
import CanvasPianoRuler, { PianoRulerProps } from "../../components/PianoRoll/CanvasPianoRuler"
import { BarSelectionOverlay } from "./BarSelectionOverlay"

export const BarSelectablePianoRuler: FC<PianoRulerProps> = (props) => {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <CanvasPianoRuler {...props} />
      <BarSelectionOverlay />
    </div>
  )
}

