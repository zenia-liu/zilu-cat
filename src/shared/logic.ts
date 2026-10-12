import type { AppData, Diary, Goal, GoalHorizon, Person, Settings, Todo } from './types'

/** 联络间隔：新增后 3 天，之后每次联络递增，30 天后固定每 30 天一次 */
export const INTERVAL_DAYS = [3, 7, 15, 30] as const

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, days: number): string {
  const date = parseDateKey(key)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

/** 从 a 到 b 相差的天数（b 晚于 a 时为正） */
export function diffDays(a: string, b: string): number {
  return Math.round((parseDateKey(b).getTime() - parseDateKey(a).getTime()) / 86_400_000)
}

/** ym 形如 2026-10 */
export function shiftMonth(ym: string, delta: number): string {
  const date = parseDateKey(`${ym}-01`)
  date.setMonth(date.getMonth() + delta)
  return toDateKey(date).slice(0, 7)
}

/** 月历格子：周一开头，不属于本月的格子为 null，总数补齐为 7 的倍数 */
export function monthGrid(ym: string): (string | null)[] {
  const first = parseDateKey(`${ym}-01`)
  const offset = (first.getDay() + 6) % 7
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const cells: (string | null)[] = Array(offset).fill(null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(`${ym}-${pad(day)}`)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function todosOn(todos: Todo[], date: string): Todo[] {
  return todos.filter(t => t.date === date)
}

export function summarizeDay(todos: Todo[], date: string): { total: number; done: number } {
  const list = todosOn(todos, date)
  return { total: list.length, done: list.filter(t => t.done).length }
}

/** 把过去日期里未完成的待办顺延到今天；没有需要顺延的返回原数组 */
export function carryOverTodos(todos: Todo[], today: string): Todo[] {
  if (!todos.some(t => !t.done && t.date < today)) return todos
  return todos.map(t => (!t.done && t.date < today ? { ...t, date: today } : t))
}

export function nextContactDate(person: Person): string {
  const stage = Math.min(person.logs.length, INTERVAL_DAYS.length - 1)
  return addDays(person.lastContactedAt, INTERVAL_DAYS[stage])
}

export interface DueItem {
  person: Person
  dueDate: string
}

/** 今天及之前需要联络的人，按到期日升序 */
export function dueList(people: Person[], today: string): DueItem[] {
  return people
    .map(person => ({ person, dueDate: nextContactDate(person) }))
    .filter(item => item.dueDate <= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

/** 认识日期不能晚于今天，非法或未来日期回退为今天；认识当天视为第一次联络 */
export function createPerson(options: {
  id: string
  name: string
  note: string
  metDate: string
  today: string
}): Person {
  const { id, name, note, metDate, today } = options
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(metDate) && metDate <= today
  const date = valid ? metDate : today
  return {
    id,
    name: name.trim(),
    note: note.trim(),
    createdAt: date,
    lastContactedAt: date,
    logs: [],
  }
}

/** ISO 周编号，如 2026-W42：周一开头，周四所在的年份即为周的年份 */
export function weekKey(key: string): string {
  const monday = addDays(key, -((parseDateKey(key).getDay() + 6) % 7))
  const year = Number(addDays(monday, 3).slice(0, 4))
  const jan4 = `${year}-01-04`
  const firstMonday = addDays(jan4, -((parseDateKey(jan4).getDay() + 6) % 7))
  const week = diffDays(firstMonday, monday) / 7 + 1
  return `${year}-W${pad(week)}`
}

export function createGoal(options: {
  id: string
  horizon: GoalHorizon
  period: string
  title: string
  why: string
  how: string
  today: string
}): Goal {
  const { id, horizon, period, title, why, how, today } = options
  return {
    id,
    horizon,
    title: title.trim(),
    why: why.trim(),
    how: how.trim(),
    period,
    done: false,
    createdAt: today,
  }
}

/** 某个周期下的目标；未完成的排在前面，保持录入顺序 */
export function goalsFor(goals: Goal[], horizon: GoalHorizon, period: string): Goal[] {
  return goals
    .filter(g => g.horizon === horizon && g.period === period)
    .sort((a, b) => Number(a.done) - Number(b.done))
}

/** 某个月里涉及的所有周（周一开头），用于按周展开日历 */
export function weeksOfMonth(ym: string): { period: string; start: string; end: string }[] {
  const lastDay = addDays(`${shiftMonth(ym, 1)}-01`, -1)
  const weeks: { period: string; start: string; end: string }[] = []
  for (let start = addDays(`${ym}-01`, -((parseDateKey(`${ym}-01`).getDay() + 6) % 7)); start <= lastDay; start = addDays(start, 7)) {
    weeks.push({ period: weekKey(start), start, end: addDays(start, 6) })
  }
  return weeks
}

export function applyContact(person: Person, today: string, note: string): Person {
  return {
    ...person,
    lastContactedAt: today,
    logs: [...person.logs, { date: today, note: note.trim() }],
  }
}

export function shouldRemind(options: {
  now: Date
  reminderTime: string
  lastReminderDate: string
  undoneToday: number
}): boolean {
  const { now, reminderTime, lastReminderDate, undoneToday } = options
  const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`
  return undoneToday > 0 && hhmm >= reminderTime && lastReminderDate !== toDateKey(now)
}

export function createDefaultData(): AppData {
  const settings: Settings = {
    reminderTime: '22:00',
    notifyEnabled: true,
    petPosition: null,
    theme: 'system',
    feishu: {
      enabled: false,
      appId: '',
      appSecret: '',
      documentId: '',
      syncTime: '23:30',
      startDate: '',
      lastSyncedAt: '',
      lastError: '',
      lastAttemptAt: '',
    },
  }
  return { todos: [], people: [], goals: [], diaries: [], settings, lastReminderDate: '' }
}

/** 上一次尝试失败后，多久之后才重新尝试同步 */
export const FEISHU_RETRY_MS = 10 * 60_000

/**
 * 需要同步到飞书的日记：有内容、还没同步过、从开始日期起，
 * 且已经到了同步时间（当天的日记要等到设定时间之后才同步）；失败后冷却一段时间再重试
 */
export function pendingDiaries(options: {
  diaries: Diary[]
  today: string
  nowTime: string
  syncTime: string
  startDate: string
  lastAttemptAt: string
  nowMs: number
}): Diary[] {
  const { diaries, today, nowTime, syncTime, startDate, lastAttemptAt, nowMs } = options
  if (lastAttemptAt && nowMs - Date.parse(lastAttemptAt) < FEISHU_RETRY_MS) return []
  return diaries
    .filter(d => d.content.trim() !== '' && d.syncedAt === '' && startDate !== '' && d.date >= startDate)
    .filter(d => d.date < today || (d.date === today && nowTime >= syncTime))
    .sort((a, b) => a.date.localeCompare(b.date))
}
