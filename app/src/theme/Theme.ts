export interface Theme {
  isLightContent: boolean // if true, text color is light and background color is dark
  font: string
  monoFont: string
  canvasFont: string
  themeColor: string
  onSurfaceColor: string // content color on themeColor
  darkBackgroundColor: string
  backgroundColor: string
  secondaryBackgroundColor: string
  editorBackgroundColor: string // control pane / arrange view / tempo editor
  editorGridColor: string
  editorSecondaryGridColor: string
  dividerColor: string
  popupBorderColor: string
  textColor: string
  secondaryTextColor: string
  tertiaryTextColor: string
  pianoKeyBlack: string
  pianoKeyWhite: string
  pianoWhiteKeyLaneColor: string
  pianoBlackKeyLaneColor: string
  pianoHighlightedLaneColor: string
  pianoLaneEdgeColor: string
  ghostNoteColor: string
  recordColor: string
  shadowColor: string
  highlightColor: string
  greenColor: string
  redColor: string
  yellowColor: string
}

const darkTheme: Theme = {
  isLightContent: true,
  font: "Inter, -apple-system, Noto Sans SC, Noto Sans TC, BlinkMacSystemFont, Avenir, Lato",
  monoFont: "Roboto Mono, monospace",
  canvasFont: "Arial",
  // themeColor: "hsl(230, 70%, 55%)",
  themeColor: "#5e936c",
  onSurfaceColor: "#eceff4",
  // textColor: "#ffffff",
  textColor: "#eceff4",
  secondaryTextColor: "hsl(223, 12%, 60%)",
  tertiaryTextColor: "#5a6173",
  // dividerColor: "hsl(224, 12%, 24%)",
  dividerColor: "#4c566a",
  popupBorderColor: "hsl(228, 10%, 13%)",
  // darkBackgroundColor: "hsl(228, 10%, 13%)",
  darkBackgroundColor: "#2e3440",
  // backgroundColor: "hsl(228, 10%, 16%)",
  backgroundColor: "#3b4252",
  // secondaryBackgroundColor: "hsl(227, 10%, 22%)",
  secondaryBackgroundColor: "#3b4252",
  // editorBackgroundColor: "hsl(228, 10%, 13%)",
  editorBackgroundColor: "#3b4252",
  // editorSecondaryGridColor: "hsl(224, 12%, 19%)",
  editorSecondaryGridColor: "#4c566a",
  // editorGridColor: "hsl(224, 12%, 26%)",
  editorGridColor: "#4c566a",
  pianoKeyBlack: "#2e3440",
  pianoKeyWhite: "#eceff4",
  // pianoWhiteKeyLaneColor: "hsl(228, 10%, 16%)",
  pianoWhiteKeyLaneColor: "#3b4252",
  // pianoBlackKeyLaneColor: "hsl(228, 10%, 13%)",
  pianoBlackKeyLaneColor: "#2e3440",
  pianoHighlightedLaneColor: "hsl(230, 23%, 20%)",
  // pianoLaneEdgeColor: "hsl(228, 10%, 18%)",
  pianoLaneEdgeColor: "#4c566a",
  ghostNoteColor: "#4c566a",
  recordColor: "#dd3c3c",
  shadowColor: "rgba(0, 0, 0, 0.1)",
  highlightColor: "#8388a51a",
  greenColor: "#31DE53",
  redColor: "#DE5267",
  yellowColor: "#DEB126",
}

const lightTheme: Theme = {
  isLightContent: false,
  font: "Inter, -apple-system, BlinkMacSystemFont, Avenir, Lato",
  monoFont: "Roboto Mono, monospace",
  canvasFont: "Arial",
  themeColor: "hsl(230, 70%, 55%)",
  onSurfaceColor: "#ffffff",
  textColor: "#000000",
  secondaryTextColor: "hsl(223, 12%, 40%)",
  tertiaryTextColor: "#7a7f8b",
  dividerColor: "hsl(223, 12%, 80%)",
  popupBorderColor: "#e0e0e0",
  darkBackgroundColor: "hsl(228, 20%, 95%)",
  backgroundColor: "#ffffff",
  secondaryBackgroundColor: "hsl(227, 20%, 95%)",
  editorBackgroundColor: "#ffffff",
  editorGridColor: "hsl(223, 12%, 86%)",
  editorSecondaryGridColor: "hsl(223, 12%, 92%)",
  pianoKeyBlack: "#272a36",
  pianoKeyWhite: "#fbfcff",
  pianoWhiteKeyLaneColor: "#ffffff",
  pianoBlackKeyLaneColor: "hsl(228, 10%, 96%)",
  pianoHighlightedLaneColor: "hsl(228, 70%, 97%)",
  pianoLaneEdgeColor: "hsl(228, 10%, 92%)",
  ghostNoteColor: "hsl(223, 12%, 80%)",
  recordColor: "#ee6a6a",
  shadowColor: "rgba(0, 0, 0, 0.1)",
  highlightColor: "#f5f5fa",
  greenColor: "#56DE83",
  redColor: "#DE8287",
  yellowColor: "#DEBE56",
}

export const themes = {
  dark: darkTheme,
  light: lightTheme,
} as const

export const themeNames = Object.keys(themes) as (keyof typeof themes)[]
export type ThemeType = (typeof themeNames)[number]
