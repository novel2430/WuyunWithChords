import styled from "@emotion/styled"
import React, { ReactNode, useCallback, useMemo, useRef, useState } from "react"

type SegKey = string | number
type Size = "sm" | "md"

export interface SegmentOption<K extends SegKey = SegKey> {
  key: K
  label: ReactNode
  icon?: ReactNode
  disabled?: boolean
}

export interface SegmentedControlProps<K extends SegKey = SegKey> {
  options: SegmentOption<K>[]
  /** Controlled value */
  value?: K
  /** Uncontrolled initial value */
  defaultValue?: K
  onChange?: (key: K) => void

  size?: Size
  disabled?: boolean
  className?: string
  ariaLabel?: string
}

const Root = styled.div<{ size: Size; disabled: boolean }>`
  position: relative;
  display: grid;
  align-items: center;

  border-radius: 999px;
  padding: ${(p) => (p.size === "sm" ? "2px" : "3px")};
  background: var(--color-highlight);
  box-shadow: inset 0 0 0 1px var(--color-divider);
  user-select: none;
  -webkit-user-select: none;

  opacity: ${(p) => (p.disabled ? 0.6 : 1)};
  pointer-events: ${(p) => (p.disabled ? "none" : "auto")};

`

const Indicator = styled.div<{ size: Size }>`
  position: absolute;
  top: ${(p) => (p.size === "sm" ? "2px" : "3px")};
  bottom: ${(p) => (p.size === "sm" ? "2px" : "3px")};
  left: 0;

  border-radius: 999px;
  background: color-mix(in srgb, var(--color-theme) 50%, var(--color-highlight));
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.06),
    inset 0 0 0 1px color-mix(in srgb, var(--color-divider) 70%, transparent);

  will-change: transform;
  transition: transform 140ms ease, width 140ms ease;
  pointer-events: none;
`

const Button = styled.button<{ size: Size }>`
  appearance: none;
  border: 0;
  background: transparent;
  border-radius: 999px;

  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${(p) => (p.size === "sm" ? "6px" : "8px")};

  padding: ${(p) => (p.size === "sm" ? "6px 10px" : "8px 12px")};
  min-width: 0;

  color: var(--color-text-secondary);
  font-size: ${(p) => (p.size === "sm" ? "0.75rem" : "0.8rem")};
  line-height: 1.5;
  cursor: default;

  &:hover {
    background: color-mix(in srgb, var(--color-highlight) 55%, transparent);
  }

  &:focus {
    outline: none;
  }

  &[data-selected="true"] {
    color: var(--color-text);
  }

  &[data-disabled="true"] {
    opacity: 0.45;
    pointer-events: none;
  }
`

const Label = styled.span`
  min-width: 0;
  overflow: hidden;
  textoverflow: ellipsis;
  white-space: nowrap;
`

function findIndexByKey<K extends SegKey>(options: SegmentOption<K>[], key: K | undefined) {
  if (key === undefined) return -1
  return options.findIndex((o) => o.key === key)
}

function nextEnabledIndex<K extends SegKey>(
  options: SegmentOption<K>[],
  from: number,
  dir: -1 | 1,
) {
  const n = options.length
  if (n === 0) return -1
  for (let step = 1; step <= n; step++) {
    const i = (from + dir * step + n) % n
    if (!options[i]?.disabled) return i
  }
  return from
}

export function SegmentedControl<K extends SegKey>({
  options,
  value,
  defaultValue,
  onChange,
  size = "md",
  disabled = false,
  className,
  ariaLabel,
}: SegmentedControlProps<K>) {
  const isControlled = value !== undefined

  const firstEnabledKey = useMemo(() => {
    const first = options.find((o) => !o.disabled)
    return first?.key
  }, [options])

  const [uncontrolled, setUncontrolled] = useState<K | undefined>(
    defaultValue ?? firstEnabledKey,
  )

  const currentValue = (isControlled ? value : uncontrolled) ?? firstEnabledKey
  const activeIndex = Math.max(0, findIndexByKey(options, currentValue))
  const count = Math.max(1, options.length)

  const indicatorStyle = useMemo(() => {
    const w = 100 / count
    return {
      width: `${w}%`,
      transform: `translateX(${activeIndex * 100}%)`,
    } as React.CSSProperties
  }, [activeIndex, count])

  const setValue = useCallback(
    (k: K) => {
      if (!isControlled) setUncontrolled(k)
      onChange?.(k)
    },
    [isControlled, onChange],
  )

  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled || options.length === 0) return

      const current = findIndexByKey(options, currentValue)
      const base = current >= 0 ? current : 0

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault()
        const dir: -1 | 1 = e.key === "ArrowLeft" ? -1 : 1
        const ni = nextEnabledIndex(options, base, dir)
        const nk = options[ni]?.key
        if (nk !== undefined) {
          setValue(nk)
          buttonsRef.current[ni]?.focus()
        }
      } else if (e.key === "Home") {
        e.preventDefault()
        const ni = nextEnabledIndex(options, -1, 1)
        const nk = options[ni]?.key
        if (nk !== undefined) {
          setValue(nk)
          buttonsRef.current[ni]?.focus()
        }
      } else if (e.key === "End") {
        e.preventDefault()
        let ni = base
        // 找最後一個 enabled
        for (let i = options.length - 1; i >= 0; i--) {
          if (!options[i]?.disabled) {
            ni = i
            break
          }
        }
        const nk = options[ni]?.key
        if (nk !== undefined) {
          setValue(nk)
          buttonsRef.current[ni]?.focus()
        }
      }
    },
    [disabled, options, currentValue, setValue],
  )

  return (
    <Root
      className={className}
      size={size}
      disabled={disabled}
      role="radiogroup"
      aria-label={ariaLabel}
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
      onKeyDown={onKeyDown}
    >
      {/* 滑動高亮底 */}
      <Indicator size={size} style={indicatorStyle} />

      {/* 選項 */}
      {options.map((opt, i) => {
        const selected = opt.key === currentValue
        return (
          <Button
            key={String(opt.key)}
            size={size}
            role="radio"
            aria-checked={selected}
            data-selected={selected}
            data-disabled={opt.disabled ?? false}
            tabIndex={selected ? 0 : -1}
            ref={(el) => {
              buttonsRef.current[i] = el
            }}
            onMouseDown={() => {
              if (!opt.disabled) setValue(opt.key)
            }}
          >
            {opt.icon}
            <Label>{opt.label}</Label>
          </Button>
        )
      })}
    </Root>
  )
}
