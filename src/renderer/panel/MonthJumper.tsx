import { useEffect, useRef, useState } from 'react'

type View = 'months' | 'years'

/**
 * 月份标题：点一下进入选月份，再点年份进入选年份，可以快速跳到任意年月。
 * 用在日常、目标的日历标题上。
 */
export function MonthJumper({ month, onChange, max }: { month: string; onChange: (ym: string) => void; max?: string }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('months')
  // 年份视图里第一个显示的年份，每页 12 年
  const [yearBase, setYearBase] = useState(0)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const shownYear = Number(month.slice(0, 4))
  const maxYear = max ? Number(max.slice(0, 4)) : Infinity
  const maxMonth = max ? max.slice(0, 7) : undefined

  const toggle = () => {
    setView('months')
    setOpen(o => !o)
  }

  const openYears = () => {
    setYearBase(shownYear - 5)
    setView('years')
  }

  // 箭头的步长跟着视图走：选月份时翻一年，选年份时翻 12 年
  const step = (dir: -1 | 1) => {
    if (view === 'months') onChange(`${shownYear + dir}-${month.slice(5)}`)
    else setYearBase(base => base + dir * 12)
  }

  return (
    <div className="month-jump-root" ref={root}>
      <button type="button" className="month-jump" onClick={toggle}>
        <span>{`${shownYear} 年 ${Number(month.slice(5))} 月`}</span>
        <span className="date-caret">▾</span>
      </button>

      {open && (
        <div className="date-popover month-jump-popover" role="dialog">
          <div className="month-header">
            <button className="ghost icon" type="button" onClick={() => step(-1)}>
              ‹
            </button>
            {view === 'months' ? (
              <button className="picker-title" type="button" onClick={openYears}>
                {`${shownYear} 年`}
              </button>
            ) : (
              <strong>{`${yearBase} – ${yearBase + 11}`}</strong>
            )}
            <button className="ghost icon" type="button" onClick={() => step(1)}>
              ›
            </button>
          </div>

          {view === 'months' && (
            <div className="picker-cells">
              {Array.from({ length: 12 }, (_, i) => {
                const key = `${shownYear}-${String(i + 1).padStart(2, '0')}`
                return (
                  <button
                    key={key}
                    type="button"
                    className={key === month ? 'picker-cell on' : 'picker-cell'}
                    disabled={maxMonth !== undefined && key > maxMonth}
                    onClick={() => {
                      onChange(key)
                      setOpen(false)
                    }}
                  >
                    {`${i + 1} 月`}
                  </button>
                )
              })}
            </div>
          )}

          {view === 'years' && (
            <div className="picker-cells">
              {Array.from({ length: 12 }, (_, i) => {
                const year = yearBase + i
                return (
                  <button
                    key={year}
                    type="button"
                    className={year === shownYear ? 'picker-cell on' : 'picker-cell'}
                    disabled={year > maxYear}
                    onClick={() => {
                      onChange(`${year}-${month.slice(5)}`)
                      setView('months')
                    }}
                  >
                    {year}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
