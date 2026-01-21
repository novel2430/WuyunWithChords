import styled from "@emotion/styled"
import { FC } from "react"
import { Layout } from "../../Constants"
import { useKeyScroll } from "../../hooks/useKeyScroll"
import { Positioned } from "../ui/Positioned"
// import CanvasPianoRuler from "./CanvasPianoRuler"
import { BarSelectablePianoRuler } from "../../MyCode/barSelection"
import { ChordStripOverlay } from "../../MyCode/chords/ChordStripOverlay"
import { PianoKeys } from "./PianoKeys"
import { PianoRollCanvas } from "./PianoRollCanvas/PianoRollCanvas"

export interface PianoRollStageProps {
  width: number
  height: number
  keyWidth: number
}

const Container = styled.div``

const RulerPosition = styled(Positioned)`
  height: var(--size-ruler-height);
  background: var(--color-background);
  border-bottom: 1px solid var(--color-divider);
`

const ChordStripPosition = styled(Positioned)`
  height: ${Layout.chordStripHeight}px;
  background: var(--color-background);
  border-bottom: 1px solid var(--color-divider);
`

const LeftTopSpace = styled(RulerPosition)``

export const PianoRollStage: FC<PianoRollStageProps> = ({
  width,
  height,
  keyWidth,
}) => {
  const { scrollTop } = useKeyScroll()

  const topOffset = Layout.rulerHeight + Layout.chordStripHeight


  return (
    <Container>
      <Positioned top={topOffset} left={keyWidth}>
        <PianoRollCanvas width={width} height={height - topOffset} />
      </Positioned>
      <Positioned top={-scrollTop + topOffset}>
        <PianoKeys width={keyWidth} />
      </Positioned>
      <LeftTopSpace width={keyWidth} />

      <ChordStripPosition top={0} left={0} width={keyWidth} />
      <RulerPosition top={Layout.chordStripHeight} left={0} width={keyWidth} />
      <ChordStripPosition top={0} left={keyWidth} width={width}>
        <ChordStripOverlay />
      </ChordStripPosition>

      <RulerPosition top={Layout.chordStripHeight} left={keyWidth}>
        <BarSelectablePianoRuler />
      </RulerPosition>
    </Container>
  )
}
