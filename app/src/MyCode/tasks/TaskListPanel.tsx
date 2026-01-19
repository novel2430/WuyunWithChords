// src/MyCode/tasks/TaskListPanel.tsx
import styled from "@emotion/styled"
import React, { FC, useMemo, useCallback } from "react"
import { useMobxGetter } from "../../hooks/useMobxSelector"
import { myCodeUIStore } from "../store"

type TaskStatus = "queued" | "running" | "succeeded" | "failed" | "canceled" | string

type TaskRecord = {
  taskId: string
  kind?: string | null
  status?: TaskStatus
  error?: any
  artifacts?: Array<{ artifact_id: string; filename?: string | null }> | null

  // 你前面讨论过的 meta（可有可无）
  inst?: "piano" | "guitar" | "bass" | string | null
  inputBars?: number | null
  inputChords?: string[] | null

  createdAt?: number
  updatedAt?: number
}

type Props = {
  title?: string
  emptyHint?: string
  onSelectTask?: (taskId: string, task: TaskRecord) => void
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const HeaderRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
`

const Title = styled.div`
  font-size: 16px;
  font-weight: 700;
`

const Count = styled.div`
  font-size: 12px;
  opacity: 0.7;
`

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const RowBtn = styled.button`
  width: 100%;
  text-align: left;

  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;

  padding: 10px 10px;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.03);
  color: var(--color-text);

  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  &:active {
    transform: translateY(1px);
  }
`

const Left = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1;
`

const TopLine = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`

const StatusPill = styled.div<{ status: TaskStatus }>`
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: ${({ status }) => {
    if (status === "succeeded") return "rgba(255,255,255,0.10)"
    if (status === "failed") return "rgba(255,80,80,0.12)"
    if (status === "running") return "rgba(255,255,255,0.06)"
    if (status === "queued") return "rgba(255,255,255,0.04)"
    if (status === "canceled") return "rgba(255,255,255,0.04)"
    return "rgba(255,255,255,0.04)"
  }};
  opacity: 0.92;
  white-space: nowrap;
`

const KindText = styled.div`
  font-size: 13px;
  opacity: 0.9;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const MetaLine = styled.div`
  font-size: 12px;
  opacity: 0.7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const TimeLine = styled.div`
  font-size: 11px;
  opacity: 0.6;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  flex-direction: coulumn;
`

const Right = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
`

const Small = styled.div`
  font-size: 12px;
  opacity: 0.7;
`

const Empty = styled.div`
  padding: 10px 10px;
  border-radius: 12px;
  border: 1px dashed var(--color-border);
  background: rgba(255, 255, 255, 0.02);
  opacity: 0.75;
  font-size: 13px;
`

function fmtTime(ms?: number) {
  if (!ms) return "—"
  const d = new Date(ms)
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  const ss = String(d.getSeconds()).padStart(2, "0")
  return `${hh}:${mm}:${ss}`
}

function isDone(status?: TaskStatus) {
  return status === "succeeded" || status === "failed" || status === "canceled"
}

function fmtChords(chords?: string[] | null) {
  const arr = (chords ?? []).map((s) => (s ?? "").trim()).filter(Boolean)
  if (!arr.length) return ""
  // 太长就截断，避免撑爆
  const joined = arr.join("-")
  return joined.length > 40 ? joined.slice(0, 40) + "…" : joined
}

export const TaskListPanel: FC<Props> = ({
  title = "Tasks",
  emptyHint = "还没有任务。先生成一次，就会在这里出现。",
  onSelectTask,
}) => {
  const tasksById = useMobxGetter(myCodeUIStore as any, "tasksById") as Record<string, TaskRecord> | null

  const tasks = useMemo(() => {
    const arr = Object.values(tasksById ?? {}).filter((t) => !!t?.taskId)
    arr.sort((a, b) => (Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0)))
    return arr
  }, [tasksById])

  const onPick = useCallback(
    (t: TaskRecord) => {
      onSelectTask?.(t.taskId, t)
    },
    [onSelectTask],
  )

  return (
    <Wrap>
      <HeaderRow>
        <Title>{title}</Title>
        <Count>{tasks.length ? `${tasks.length} 条` : ""}</Count>
      </HeaderRow>

      {tasks.length === 0 ? (
        <Empty>{emptyHint}</Empty>
      ) : (
        <List>
          {tasks.map((t) => {
            const status: TaskStatus = (t.status ?? "queued") as TaskStatus
            const inst = t.inst ? String(t.inst) : "—"
            const kind = t.kind ? String(t.kind) : "task"
            const barsText = t.inputBars ? `${t.inputBars}小节` : ""
            const chordsText = fmtChords(t.inputChords)
            const meta = [barsText, chordsText].filter(Boolean).join(" · ")

            const artCount = t.artifacts?.length ?? 0
            const createdAt = t.createdAt
            const updatedAt = t.updatedAt

            const durationSec =
              isDone(status) && createdAt && updatedAt
                ? Math.max(0, Math.round((updatedAt - createdAt) / 1000))
                : null

            const showDuration = durationSec != null

            return (
              <RowBtn key={t.taskId} onMouseDown={() => onPick(t)}>
                <Left>
                  <TopLine>
                    <StatusPill status={status}>{status}</StatusPill>
                    <KindText title={`${kind}`}>
                      {kind}
                    </KindText>
                  </TopLine>

                  {!!meta && <MetaLine title={meta}>{meta}</MetaLine>}

                  <TimeLine>
                    <span>create {fmtTime(createdAt)}</span>
                    <span>update {fmtTime(updatedAt)}</span>
                    {showDuration && <span>dur {durationSec}s</span>}
                  </TimeLine>
                </Left>
              </RowBtn>
            )
          })}
        </List>
      )}
    </Wrap>
  )
}

