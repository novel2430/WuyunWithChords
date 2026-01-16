import styled from "@emotion/styled"
import { FC } from "react"
import { useDisableBounceScroll } from "../hooks/useDisableBounceScroll"
import { useDisableBrowserContextMenu } from "../hooks/useDisableBrowserContextMenu"
import { useDisableZoom } from "../hooks/useDisableZoom"
import { useGlobalKeyboardShortcut } from "../hooks/useGlobalKeyboardShortcut"
import { CloudFileDialog } from "../components/CloudFileDialog/CloudFileDialog"
import { ControlSettingDialog } from "../components/ControlSettingDialog/ControlSettingDialog"
import { ExportProgressDialog } from "../components/ExportDialog/ExportProgressDialog"
import { Head } from "../components/Head/Head"
import { HelpDialog } from "../components/Help/HelpDialog"
import { OnBeforeUnload } from "../components/OnBeforeUnload/OnBeforeUnload"
import { OnInit } from "../components/OnInit/OnInit"
import { PianoRollEditor } from "../components/PianoRoll/PianoRollEditor"
import { PublishDialog } from "../components/PublishDialog/PublishDialog"
import { SettingDialog } from "../components/SettingDialog/SettingDialog"
import { SignInDialog } from "../components/SignInDialog/SignInDialog"
import { TransportPanel } from "../components/TransportPanel/TransportPanel"
import { DeleteAccountDialog } from "../components/UserSettingsDialog/DeleteAccountDialog"
import { UserSettingsDialog } from "../components/UserSettingsDialog/UserSettingsDialog"
import { DropZone } from "../components/RootView/DropZone"

const Container = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  overflow: hidden;
`

const Column = styled.div`
  height: 100%;
  display: flex;
  flex-grow: 1;
  flex-direction: column;
  outline: none;
`

export const RootView: FC = () => {
  const keyboardShortcutProps = useGlobalKeyboardShortcut()
  useDisableZoom()
  useDisableBounceScroll()
  useDisableBrowserContextMenu()

  return (
    <>
      <DropZone>
        <Column {...keyboardShortcutProps} tabIndex={0}>
          <Container>
            <PianoRollEditor />
            <TransportPanel />
          </Container>
        </Column>
      </DropZone>
      <HelpDialog />
      <ExportProgressDialog />
      <Head />
      <SignInDialog />
      <CloudFileDialog />
      <SettingDialog />
      <ControlSettingDialog />
      <OnInit />
      <OnBeforeUnload />
      <PublishDialog />
      <UserSettingsDialog />
      <DeleteAccountDialog />
    </>
  )
}
