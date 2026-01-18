// src/MyCode/chords/chordUtils.ts
const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
}

export function splitChords(input: string): string[] {
  // 支持：空格 / 换行 / | 分隔
  return input
    .replace(/\r/g, "")
    .split(/[\n|\s]+/g)
    .map((s) => s.trim())
    .filter(Boolean)
}

function clampMidi(n: number) {
  return Math.max(0, Math.min(127, n))
}

type ParsedChord = {
  root: number // semitone 0-11
  quality: "maj" | "min"
  add7: "none" | "dom7" | "maj7"
  slashBass?: number // semitone 0-11
}

/**
 * 极简和弦解析：
 * - C, Am, Dm, F# , Bb
 * - 7 / maj7
 * - slash：C/E（只影响 bass）
 */
export function parseChordSymbol(sym: string): ParsedChord | null {
  const s = sym.trim()
  if (!s) return null

  const [main, slash] = s.split("/")

  const m = /^([A-G])([#b]?)(.*)$/.exec(main)
  if (!m) return null

  const rootName = `${m[1]}${m[2] ?? ""}`
  const root = NOTE_TO_SEMITONE[rootName]
  if (root == null) return null

  const rest = (m[3] ?? "").toLowerCase()

  const quality: "maj" | "min" = rest.startsWith("m") && !rest.startsWith("maj")
    ? "min"
    : "maj"

  let add7: ParsedChord["add7"] = "none"
  if (rest.includes("maj7")) add7 = "maj7"
  else if (rest.includes("7")) add7 = "dom7"

  let slashBass: number | undefined
  if (slash) {
    const sm = /^([A-G])([#b]?)$/.exec(slash.trim())
    if (sm) {
      const bn = `${sm[1]}${sm[2] ?? ""}`
      const b = NOTE_TO_SEMITONE[bn]
      if (b != null) slashBass = b
    }
  }

  return { root, quality, add7, slashBass }
}

export function chordToMidiNotes(
  chord: string,
  baseMidi: number,
  opts?: { include7?: boolean },
): number[] {
  const p = parseChordSymbol(chord)
  if (!p) return []

  const third = p.quality === "min" ? 3 : 4
  const fifth = 7
  const notes = [0, third, fifth].map((x) => clampMidi(baseMidi + p.root + x))

  const include7 = opts?.include7 ?? true
  if (include7 && p.add7 !== "none") {
    const seventh = p.add7 === "maj7" ? 11 : 10
    notes.push(clampMidi(baseMidi + p.root + seventh))
  }
  return notes
}

export function chordBassNote(chord: string, baseMidi: number): number | null {
  const p = parseChordSymbol(chord)
  if (!p) return null
  const semitone = p.slashBass ?? p.root
  return clampMidi(baseMidi + semitone)
}

