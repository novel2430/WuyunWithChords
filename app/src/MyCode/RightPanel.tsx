import styled from "@emotion/styled"
import React, { useMemo, useState } from "react"
import { SegmentedControl } from "./SegmentedControl"
import { CONSTANTS } from "./constants"
import { useStores } from "../hooks/useStores"
import { useMobxGetter } from "../hooks/useMobxSelector"

import { ChordsModePane } from "./chords/ChordsModePane"
import { UploadMidiPanel } from "./uploadMidi/UploadMidiPanel"
import { TaskListPanel } from "./tasks/TaskListPanel"
import { MixPanel } from "./mix/MixPanel"

import { useToast } from "dialog-hooks"
import { useMyCodeTaskService } from "./api/taskService"
import { TaskServiceProvider } from "./api/taskServiceContext"

const Main = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0; 
`

const Top = styled.div`
  display: flex;
  justify-content: center;
  height: 45px;
  width: 100%;
  padding-top: 10px;
`

const SwitchArea = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
`

const AnimatedPane = styled.div`
  animation: enter 200ms ease-out;
  @keyframes enter {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const ContentArea = styled.div`
  padding: 10px 20px;
`

const HintRow = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0 0 0;
  opacity: 0.85;
  font-size: 12px;
`

const Toggle = styled.label`
  display: inline-flex;
  gap: 6px;
  align-items: center;
  user-select: none;
  cursor: pointer;
`

export function RightPanel() {

  const [mode, setMode] = useState<"chords" | "upload" | "mix" | "task">("chords")

  const toast = useToast()

  const taskSvc = useMyCodeTaskService()

  return (
    <Main>
      <Top>
        <SegmentedControl
          ariaLabel="Input mode"
          options={[
            { key: "chords", label: CONSTANTS.rightPanel.chordsLabel },
            { key: "upload", label: CONSTANTS.rightPanel.uploadLabel},
            { key: "mix", label: CONSTANTS.rightPanel.mixLabel},
            { key: "task", label: CONSTANTS.rightPanel.TaskLabel},
          ]}
          value={mode}
          onChange={setMode}
        />
      </Top>

      <SwitchArea>
        <TaskServiceProvider>
          <AnimatedPane key={mode}>
            <ContentArea>
              {mode === "chords" && <ChordsModePane />}

              {mode === "upload" && <UploadMidiPanel />}
              {mode === "mix" && <MixPanel />}
              {mode === "task" && <TaskListPanel />}
            </ContentArea>
          </AnimatedPane>
        </TaskServiceProvider>
      </SwitchArea>
    </Main>
  )
}

