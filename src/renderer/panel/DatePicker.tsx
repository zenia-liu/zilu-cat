import { useEffect, useRef, useState } from 'react'
import { monthGrid, parseDateKey, shiftMonth, toDateKey } from '../../shared/logic'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

type View = 'days' | 'months' | 'years'

/** 用本应用配色自绘的日期选择器，替代系统自带的弹窗；可以切换到按月、按年选择 */
export function DatePicker({ value, max, onChange }: { value: string; max?: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('days')
  const [month, setMonth] = useState(value.slice(0, 7))
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

  const today = toDateKey(new Date())
  const shownYear = Number(month.slice(0, 4))
  const maxYear = max ? Number(max.slice(0, 4)) : Infinity
  const maxMonth = max ? max.slice(0, 7) : undefined

  const toggle = () => {
    setMonth(value.slice(0, 7))
    setView('days')
    setOpen(o => !o)
  }

  const pick = (date: string) => {
    onChange(date)
    setOpen(false)
  }

  const openYears = () => {
    setYearBase(shownYear - 5)
    setView('years')
  }

  // 箭头的步长跟着当前视图走：按日是一个月，按月是一年，按年是 12 年
  const step = (dir: -1 | 1) => {
    if (view === 'days') setMonth(ym => shiftMonth(ym, dir))
    else if (view === 'months') setMonth(ym => `${shownYear + dir}-${ym.slice(5)}`)
    else setYearBase(base => base + dir * 12)
  }

  const [y, m, d] = value.split('-').map(Number)
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][parseDateKey(value).getDay()]

  let title: React.ReactNode
  if (view === 'days') {
    title = (
      <button type="button" className="picker-title" onClick={() => setView('months')}>
        {`${shownYear} 年 ${Number(month.slice(5))} 月`}
      </button>
    )
  } else if (view === 'months') {
    title = (
      <button type="button" className="picker-title" onClick={openYears}>
        {`${shownYear} 年`}
      </button>
    )
  } else {
    title = <strong>{`${yearBase} – ${yearBase + 11}`}</strong>
  }

  return (
    <div className="date-picker" ref={root}>
      <button type="button" className="date-field" onClick={toggle}>
        <span>{`${y} 年 ${m} 月 ${d} 日 周${weekday}`}</span>
        <span className="date-caret">▾</span>
      </button>

      {open && (
        <div className="date-popover" role="dialog">
          <div className="month-header">
            <button className="ghost icon" type="button" onClick={() => step(-1)}>
              ‹
            </button>
            {title}
            <button className="ghost icon" type="button" onClick={() => step(1)}>
              ›
            </button>
          </div>

          {view === 'days' && (
            <div className="grid date-grid">
              {WEEKDAYS.map(w => (
                <div key={w} className="weekday">
                  {w}
                </div>
              ))}
              {monthGrid(month).map((date, i) => {
                if (!date) return <div key={`empty-${i}`} className="day empty" />
                const classes = ['day']
                if (date === today) classes.push('today')
                if (date === value) classes.push('selected')
                return (
                  <button
                    key={date}
                    type="button"
                    className={classes.join(' ')}
                    disabled={max !== undefined && date > max}
                    onClick={() => pick(date)}
                  >
                    <span className="num">{Number(date.slice(8))}</span>
                  </button>
                )
              })}
            </div>
          )}

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
                      setMonth(key)
                      setView('days')
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
                      setMonth(`${year}-${month.slice(5)}`)
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
