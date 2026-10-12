import { useMemo, useState, type FormEvent } from 'react'
import type { Goal, GoalHorizon } from '../../shared/types'
import { goalsFor, shiftMonth, toDateKey, weekKey, weeksOfMonth } from '../../shared/logic'
import { MonthJumper } from './MonthJumper'

type Selection = { horizon: Exclude<GoalHorizon, 'long'>; period: string }

const fmt = (key: string) => key.slice(5).replace('-', '.')

export function Goals({ goals }: { goals: Goal[] }) {
  const today = toDateKey(new Date())
  const currentWeek = weekKey(today)
  const [month, setMonth] = useState(today.slice(0, 7))
  const [selected, setSelected] = useState<Selection>({ horizon: 'week', period: currentWeek })
  const weeks = useMemo(() => weeksOfMonth(month), [month])
  const [year, monthNo] = month.split('-')
  const isSelected = (horizon: Selection['horizon'], period: string) =>
    selected.horizon === horizon && selected.period === period

  return (
    <div className="goal-page">
      <section className="card goal-calendar">
        <div className="month-header">
          <button className="ghost icon" onClick={() => setMonth(m => shiftMonth(m, -1))}>
            ‹
          </button>
          <div className="month-title">
            <MonthJumper month={month} onChange={setMonth} />
          </div>
          <button className="ghost icon" onClick={() => setMonth(m => shiftMonth(m, 1))}>
            ›
          </button>
          <button
            className="ghost"
            onClick={() => {
              setMonth(today.slice(0, 7))
              setSelected({ horizon: 'week', period: currentWeek })
            }}
          >
            今天
          </button>
        </div>

        <div className="period-row">
          <button
            className={isSelected('year', year) ? 'period-btn on' : 'period-btn'}
            onClick={() => setSelected({ horizon: 'year', period: year })}
          >
            {year} 年目标
          </button>
          <button
            className={isSelected('month', month) ? 'period-btn on' : 'period-btn'}
            onClick={() => setSelected({ horizon: 'month', period: month })}
          >
            {Number(monthNo)} 月目标
          </button>
        </div>

        <ul className="week-list">
          {weeks.map(w => {
            const list = goalsFor(goals, 'week', w.period)
            const done = list.filter(g => g.done).length
            const classes = ['week-row']
            if (isSelected('week', w.period)) classes.push('on')
            if (w.period === currentWeek) classes.push('current')
            return (
              <li key={w.period}>
                <button className={classes.join(' ')} onClick={() => setSelected({ horizon: 'week', period: w.period })}>
                  <span className="week-no">第 {Number(w.period.slice(-2))} 周</span>
                  <span className="meta">
                    {fmt(w.start)} – {fmt(w.end)}
                  </span>
                  <span className="week-count">{list.length > 0 ? `${done}/${list.length}` : ''}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <GoalPanel
        key={`${selected.horizon}-${selected.period}`}
        horizon={selected.horizon}
        period={selected.period}
        heading={selectionTitle(selected)}
        subtitle={selectionSubtitle(selected, weeks)}
        goals={goals}
      />

      <GoalPanel
        horizon="long"
        period=""
        heading="远期目标"
        subtitle="几年之后想成为什么样的人"
        goals={goals}
        wide
      />
    </div>
  )
}

function selectionTitle({ horizon, period }: Selection): string {
  if (horizon === 'week') return `第 ${Number(period.slice(-2))} 周目标`
  if (horizon === 'month') return `${Number(period.slice(5))} 月目标`
  return `${period} 年目标`
}

function selectionSubtitle({ horizon, period }: Selection, weeks: { period: string; start: string; end: string }[]): string {
  if (horizon === 'week') {
    const w = weeks.find(item => item.period === period)
    return w ? `${fmt(w.start)} – ${fmt(w.end)}` : ''
  }
  if (horizon === 'month') return `${period.slice(0, 4)} 年 ${Number(period.slice(5))} 月`
  return '这一年想达成的结果'
}

const HINTS: Record<GoalHorizon, string> = {
  week: '这一周最想推进的事',
  month: '这个月想往前走一步的事',
  year: '今年想达成的结果',
  long: '几年之后想成为什么样的人',
}

function GoalPanel({
  horizon,
  period,
  heading,
  subtitle,
  goals,
  wide,
}: {
  horizon: GoalHorizon
  period: string
  heading: string
  subtitle: string
  goals: Goal[]
  wide?: boolean
}) {
  const [title, setTitle] = useState('')
  const [why, setWhy] = useState('')
  const [how, setHow] = useState('')
  const list = goalsFor(goals, horizon, period)
  const done = list.filter(g => g.done).length

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    void window.api.addGoal(horizon, period, title, why, how)
    setTitle('')
    setWhy('')
    setHow('')
  }

  return (
    <section className={wide ? 'card goal-card goal-long' : 'card goal-card'}>
      <div className="goal-head">
        <h2>
          {heading} <span className="badge">{list.length}</span>
        </h2>
        <span className="meta">{subtitle}</span>
      </div>
      <p className="hint">
        {HINTS[horizon]}
        {list.length > 0 && `　已完成 ${done}/${list.length}`}
      </p>

      <ul className="goal-list">
        {list.map(g => (
          <li key={g.id} className={g.done ? 'goal done' : 'goal'}>
            <div className="goal-title">
              <label>
                <input type="checkbox" checked={g.done} onChange={() => void window.api.toggleGoal(g.id)} />
                <span>{g.title}</span>
              </label>
              <button className="link danger" onClick={() => void window.api.removeGoal(g.id)}>
                删除
              </button>
            </div>
            {g.why && (
              <p className="goal-desc">
                <b>为什么</b>
                {g.why}
              </p>
            )}
            {g.how && (
              <p className="goal-desc">
                <b>怎么做</b>
                {g.how}
              </p>
            )}
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="hint">这个周期还没有目标</p>}

      <form className="goal-form" onSubmit={submit}>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="目标是什么" />
        <textarea
          value={why}
          onChange={e => setWhy(e.target.value)}
          placeholder="为什么要做这件事？想清楚了，做的时候会更有动力"
          rows={2}
        />
        <textarea value={how} onChange={e => setHow(e.target.value)} placeholder="打算怎么实现？第一步做什么" rows={2} />
        <div className="row goal-form-actions">
          <button type="submit">添加</button>
        </div>
      </form>
    </section>
  )
}
