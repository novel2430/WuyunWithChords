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

const LeftTop = styled.div`
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: auto;
  padding: 12px;
  border-bottom: 1px solid var(--color-divider);
`

const LeftBottom = styled.div`
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: auto;
  padding: 12px;
`

const RightTop = styled.section`
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
`

const RightBottom = styled.div`
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: auto;
  padding: 12px;
  border-top: 1px solid var(--color-divider);
`
const Sidebar = styled.aside`
  border-right: 1px solid var(--color-divider);
  padding: 12px;
`

const EditorSlot = styled.section`
  min-height: 0;
  overflow: hidden; /* RootView 內部自己處理 overflow */
`


export function MainView() {
  return (
    <Shell>
      <Header>{CONSTANTS.headerTitle}</Header>
      <Main>
        <StyledSplitPane
          split="vertical"
          minSize={220}
          defaultSize={"80%"}
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

