export const MYCODE_API_BASE_URL =
  "https://www.next.zju.edu.cn/novel-wuyun/back/"

function joinUrl(base: string, path: string) {
  const b = base.endsWith("/") ? base : base + "/"
  const p = path.startsWith("/") ? path.slice(1) : path
  return b + p
}

async function readErrorPayload(resp: Response) {
  const ct = resp.headers.get("content-type") ?? ""
  try {
    if (ct.includes("application/json")) return await resp.json()
    return await resp.text()
  } catch {
    return null
  }
}

async function requestJson<T>(
  method: "GET" | "POST",
  path: string,
  init?: { body?: any; headers?: Record<string, string> },
): Promise<T> {
  const url = joinUrl(MYCODE_API_BASE_URL, path)
  const headers: Record<string, string> = {
    ...(init?.headers ?? {}),
  }

  let body: BodyInit | undefined = undefined
  if (init?.body !== undefined) {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json"
    body = JSON.stringify(init.body)
  }

  const resp = await fetch(url, { method, headers, body })
  if (!resp.ok) {
    const payload = await readErrorPayload(resp)
    throw new Error(
      `HTTP ${resp.status} ${resp.statusText}: ${typeof payload === "string" ? payload : JSON.stringify(payload)}`,
    )
  }
  return (await resp.json()) as T
}

async function requestForm<T>(path: string, form: FormData): Promise<T> {
  const url = joinUrl(MYCODE_API_BASE_URL, path)
  const resp = await fetch(url, { method: "POST", body: form })
  if (!resp.ok) {
    const payload = await readErrorPayload(resp)
    throw new Error(
      `HTTP ${resp.status} ${resp.statusText}: ${typeof payload === "string" ? payload : JSON.stringify(payload)}`,
    )
  }
  return (await resp.json()) as T
}

export type HealthResponse = any

export type CreateSessionResponse = {
  session_id: string
}

export type TaskSubmitResponse = {
  task_id: string
  status_url: string
}

export type ArtifactItem = {
  artifact_id: string
  kind: string
  filename: string
  url: string // e.g. "/tasks/artifacts/content/xxxx"
}

export type TaskStatusResponse = {
  task_id: string
  session_id: string
  kind: string
  status: "queued" | "running" | "succeeded" | "failed" | "canceled"
  error: any | null
  artifacts: ArtifactItem[]
}

export type ChordsToMidisRequest = {
  session_id: string
  chords: string[]
  chord_beats?: number[]
  segmentation: string
  bpm: number
  n_midi: number
  inst?: "piano" | "guitar" | "bass"
}

export type RefMidiToMidiRequest = {
  session_id: string
  chords: string[]
  chord_beats?: number[]
  segmentation: string
  bpm: number
  ref_midi: File
  inst?: "piano" | "guitar" | "bass"
}

export const apiClient = {
  health(): Promise<HealthResponse> {
    return requestJson("GET", "/health")
  },

  createSession(): Promise<CreateSessionResponse> {
    return requestJson("POST", "/sessions")
  },

  submitChordsToMidis(req: ChordsToMidisRequest): Promise<TaskSubmitResponse> {
    return requestJson("POST", "/tasks/chords_to_midis", { body: req })
  },

  submitRefMidiToMidi(req: RefMidiToMidiRequest): Promise<TaskSubmitResponse> {
    const form = new FormData()
    form.set("session_id", req.session_id)
    form.set("chords", JSON.stringify(req.chords))
    if (req.chord_beats) form.set("chord_beats", JSON.stringify(req.chord_beats))
    form.set("segmentation", req.segmentation)
    form.set("bpm", String(req.bpm))
    form.set("ref_midi", req.ref_midi, req.ref_midi.name || "ref.mid")
    if (req.inst) form.set("inst", req.inst)
    return requestForm("/tasks/ref_midi_to_midi", form)
  },

  getTask(taskId: string): Promise<TaskStatusResponse> {
    return requestJson("GET", `/tasks/${taskId}`)
  },

  async downloadArtifactContentById(artifactId: string): Promise<Blob> {
    const url = joinUrl(MYCODE_API_BASE_URL, `/tasks/artifacts/content/${artifactId}`)
    const resp = await fetch(url, { method: "GET" })
    if (!resp.ok) {
      const payload = await readErrorPayload(resp)
      throw new Error(
        `HTTP ${resp.status} ${resp.statusText}: ${typeof payload === "string" ? payload : JSON.stringify(payload)}`,
      )
    }
    return await resp.blob()
  },

  // 如果你只有 artifact.url（相对路径），也能用这个
  async downloadArtifactContentByUrl(relativeUrl: string): Promise<Blob> {
    const url = joinUrl(MYCODE_API_BASE_URL, relativeUrl)
    const resp = await fetch(url, { method: "GET" })
    if (!resp.ok) {
      const payload = await readErrorPayload(resp)
      throw new Error(
        `HTTP ${resp.status} ${resp.statusText}: ${typeof payload === "string" ? payload : JSON.stringify(payload)}`,
      )
    }
    return await resp.blob()
  },
}

