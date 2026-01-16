// src/MyCode/barSelection/barMath.ts
import { Measure } from "@signal-app/core"

export function barRangeFromTwoTicks(
  measures: any[],
  timebase: number,
  tickA: number,
  tickB: number,
): { fromTick: number; toTick: number } {
  const aStart = Measure.getMeasureStart(measures, tickA, timebase).tick
  const bStart = Measure.getMeasureStart(measures, tickB, timebase).tick

  const from = Math.min(aStart, bStart)
  const maxStart = Math.max(aStart, bStart)

  // 选区右边界：最后一个小节的“下一小节起点”（exclusive）
  const to = Measure.getNextMeasureTick(measures, maxStart, timebase)

  return { fromTick: from, toTick: to }
}

export function barRangeFromOneTick(
  measures: any[],
  timebase: number,
  tick: number,
): { fromTick: number; toTick: number } {
  const start = Measure.getMeasureStart(measures, tick, timebase).tick
  const to = Measure.getNextMeasureTick(measures, start, timebase)
  return { fromTick: start, toTick: to }
}

