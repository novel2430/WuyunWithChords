import styled from "@emotion/styled"
import { StyledSplitPane } from "../components/PianoRoll/StyledSplitPane"
import { CONSTANTS } from "./constants"
import { RootView } from "./MyRootView"
import { RightPanel } from "./RightPanel"

const Shell = styled.div`
  height: 100vh;
  display: grid;
  grid-template-rows: 56px 1fr;
`

const Header = styled.header`
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-bottom: 1px solid var(--color-divider);
  font-size: 18px;
`

const Main = styled.main`
  min-height: 0;
  height: 100%;
  display: flex;
  overflow: hidden;
`

const Panel = styled.div`
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  display: flex;
`

export function MainView() {
  return (
    <Shell>
      <Header>{CONSTANTS.headerTitle}</Header>
      <Main>
        <StyledSplitPane
          split="vertical"
          minSize={220}
          defaultSize={"75%"}
          style={{ width: "100%", height: "93%" }}
          pane1Style={{ display: "flex", minWidth: 0, minHeight: 0 }}
          pane2Style={{ display: "flex", minWidth: 0, minHeight: 0 }}
        >
          <Panel>
            <RootView />
          </Panel>

          <Panel>
            <RightPanel />
          </Panel>
        </StyledSplitPane>
      </Main>
    </Shell>
  )
}

