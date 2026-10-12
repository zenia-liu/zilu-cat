import { useMemo, useState, type FormEvent } from 'react'
import type { Todo } from '../../shared/types'
import { MonthJumper } from './MonthJumper'
import { monthGrid, parseDateKey, shiftMonth, summarizeDay, toDateKey, todosOn } from '../../shared/logic'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

const dayLabel = (key: string) => {
  const date = parseDateKey(key)
  const weekday = WEEKDAYS[(date.getDay() + 6) % 7]
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日 周${weekday}`
}

export function Calendar({ todos }: { todos: Todo[] }) {
  const today = toDateKey(new Date())
  const [month, setMonth] = useState(today.slice(0, 7))
  const [selected, setSelected] = useState(today)
  const cells = useMemo(() => monthGrid(month), [month])

  return (
    <div className="calendar-layout">
      <section className="month">
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
              setSelected(today)
            }}
          >
            今天
          </button>
        </div>

        <div className="grid">
          {WEEKDAYS.map(w => (
            <div key={w} className="weekday">
              {w}
            </div>
          ))}
          {cells.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} className="day empty" />
            const { total, done } = summarizeDay(todos, date)
            const classes = ['day', date === today && 'today', date === selected && 'selected']
              .filter(Boolean)
              .join(' ')
            return (
              <button key={date} className={classes} onClick={() => setSelected(date)}>
                <span className="num">{Number(date.slice(8))}</span>
                {total > 0 && (
                  <span className={done === total ? 'count all-done' : 'count'}>
                    {done}/{total}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </section>

      <DayTodos date={selected} todos={todosOn(todos, selected)} />
    </div>
  )
}

function DayTodos({ date, todos }: { date: string; todos: Todo[] }) {
  const [text, setText] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    void window.api.addTodo(text, date)
    setText('')
  }

  return (
    <section className="day-detail">
      <h2>{dayLabel(date)}</h2>
      <form className="row" onSubmit={submit}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="添加待办，回车保存" />
        <button type="submit">添加</button>
      </form>

      <ul className="todo-list">
        {todos.map(t => (
          <li key={t.id} className={t.done ? 'todo done' : 'todo'}>
            <label>
              <input type="checkbox" checked={t.done} onChange={() => void window.api.toggleTodo(t.id)} />
              <span>{t.text}</span>
            </label>
            {t.originDate !== t.date && <small className="carry">顺延自 {t.originDate.slice(5)}</small>}
            <button className="link danger" onClick={() => void window.api.removeTodo(t.id)}>
              删除
            </button>
          </li>
        ))}
      </ul>

      {todos.length === 0 && <p className="hint">这一天还没有待办</p>}
    </section>
  )
}
