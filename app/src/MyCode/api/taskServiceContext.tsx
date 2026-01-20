import React, { createContext, useContext } from "react"
import { useMyCodeTaskService } from "./taskService"

type Svc = ReturnType<typeof useMyCodeTaskService>

const Ctx = createContext<Svc | null>(null)

export function TaskServiceProvider({ children }: { children: React.ReactNode }) {
  const svc = useMyCodeTaskService()
  return <Ctx.Provider value={svc}>{children}</Ctx.Provider>
}

export function useTaskService() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useTaskService must be used within <TaskServiceProvider>")
  return v
}

