import { useMemo, useState, type FormEvent } from 'react'
import type { Person } from '../../shared/types'
import { diffDays, dueList, nextContactDate, toDateKey } from '../../shared/logic'
import { DatePicker } from './DatePicker'

export function Social({ people }: { people: Person[] }) {
  const today = toDateKey(new Date())
  const due = useMemo(() => dueList(people, today), [people, today])
  const all = useMemo(
    () => [...people].sort((a, b) => nextContactDate(a).localeCompare(nextContactDate(b))),
    [people],
  )

  return (
    <div className="social-layout">
      <section className="card">
        <h2>
          今日需联络 <span className="badge">{due.length}</span>
        </h2>
        {due.length === 0 && <p className="hint">今天没有需要联络的人</p>}
        <ul className="person-list">
          {due.map(({ person, dueDate }) => (
            <li key={person.id} className="person">
              <div className="person-head">
                <strong>{person.name}</strong>
                <span className={dueDate < today ? 'overdue' : 'due-today'}>
                  {dueDate < today ? `逾期 ${diffDays(dueDate, today)} 天` : '今天'}
                </span>
              </div>
              {person.note && <p className="note">{person.note}</p>}
              <ContactForm personId={person.id} />
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <AddPerson />
        <h2>全部联系人</h2>
        {all.length === 0 && <p className="hint">还没有录入任何人</p>}
        <ul className="person-list">
          {all.map(person => (
            <PersonRow key={person.id} person={person} today={today} />
          ))}
        </ul>
      </section>
    </div>
  )
}

function ContactForm({ personId }: { personId: string }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')

  if (!open) {
    return (
      <button className="small" onClick={() => setOpen(true)}>
        已联络
      </button>
    )
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void window.api.contactPerson(personId, note)
    setNote('')
    setOpen(false)
  }

  return (
    <form className="row" onSubmit={submit}>
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="聊了什么（可不填）" autoFocus />
      <button type="submit">保存</button>
      <button type="button" className="ghost" onClick={() => setOpen(false)}>
        取消
      </button>
    </form>
  )
}

function PersonRow({ person, today }: { person: Person; today: string }) {
  const [expanded, setExpanded] = useState(false)
  const next = nextContactDate(person)

  return (
    <li className="person">
      <div className="person-head">
        <strong>{person.name}</strong>
        <span className="meta">
          上次 {person.lastContactedAt.slice(5)} · 下次 {next.slice(5)}
          {next <= today ? '（该联络了）' : ''}
        </span>
      </div>
      {person.note && <p className="note">{person.note}</p>}
      <div className="row">
        <button className="link" onClick={() => setExpanded(e => !e)}>
          {expanded ? '收起' : `记录 ${person.logs.length} 次`}
        </button>
        <button className="link danger" onClick={() => void window.api.removePerson(person.id)}>
          删除
        </button>
      </div>
      {expanded && (
        <ul className="logs">
          {person.logs.length === 0 && <li className="hint">还没有联络记录</li>}
          {[...person.logs].reverse().map((log, i) => (
            <li key={`${log.date}-${i}`}>
              <span className="meta">{log.date}</span> {log.note || '（无备注）'}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

function AddPerson() {
  const today = toDateKey(new Date())
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [metDate, setMetDate] = useState(today)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    void window.api.addPerson(name, note, metDate)
    setName('')
    setNote('')
    setMetDate(today)
  }

  return (
    <form className="add-person" onSubmit={submit}>
      <h2>录入新认识的人</h2>
      <div className="row">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="名字" />
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="备注：在哪认识、有什么特点" />
      </div>
      <div className="row met-row">
        <label className="met-date">
          认识日期
          <DatePicker value={metDate} max={today} onChange={setMetDate} />
        </label>
        <button type="submit">添加</button>
      </div>
    </form>
  )
}
