
export type Validation = { ok: boolean; msg: string }

export function ok(): Validation {
  return { ok: true, msg: "" }
}

export function err(msg: string): Validation {
  return { ok: false, msg }
}

export function validateChords(
  chordCells: string[],
  bars: number,
): Validation {
  if (!Number.isFinite(bars) || bars <= 0) return err("选中小节数无效。")

  if (chordCells.length !== bars) {
    return err(`内部错误：格子数量(${chordCells.length})与选中小节数(${bars})不一致。`)
  }

  const emptyAt = chordCells.findIndex((c) => !String(c ?? "").trim())
  if (emptyAt !== -1) return err(`第 ${emptyAt + 1} 小节的和弦为空，请补齐。`)

  return ok()
}

export function validateSelection(
  selectionInfo: { bars: number } | null,
): Validation {
  if (!selectionInfo) return err("请先在时间条上选择小节范围。")
  return ok()
}
