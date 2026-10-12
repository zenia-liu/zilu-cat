export interface Todo {
  id: string
  text: string
  done: boolean
  /** 当前所在的日期 YYYY-MM-DD，未完成的待办会被顺延到今天 */
  date: string
  /** 最初创建的日期 */
  originDate: string
}

export interface ContactLog {
  date: string
  note: string
}

export interface Person {
  id: string
  name: string
  note: string
  createdAt: string
  /** 上一次联络的日期；新增时等于 createdAt */
  lastContactedAt: string
  logs: ContactLog[]
}

export interface PetPosition {
  x: number
  y: number
}

export interface FeishuSettings {
  enabled: boolean
  appId: string
  appSecret: string
  /** 飞书文档 ID，从文档链接 .../docx/<ID> 里取 */
  documentId: string
  /** 每天自动同步的时间 HH:mm */
  syncTime: string
  /** 从这一天起的日记才会同步，之前的不会一次性导入 */
  startDate: string
  lastSyncedAt: string
  lastError: string
  /** 上一次尝试同步的时间，失败后过一段时间再重试 */
  lastAttemptAt: string
}

/** 外观：跟随系统、浅色、深色 */
export type Theme = 'system' | 'light' | 'dark'

export interface Settings {
  /** 每日提醒时间 HH:mm */
  reminderTime: string
  notifyEnabled: boolean
  petPosition: PetPosition | null
  theme: Theme
  feishu: FeishuSettings
}

export type GoalHorizon = 'week' | 'month' | 'year' | 'long'

export interface Goal {
  id: string
  horizon: GoalHorizon
  title: string
  /** 为什么要做这件事 */
  why: string
  /** 打算怎么实现 */
  how: string
  /** 所属周期：周 2026-W42、月 2026-10、年 2026；远期目标为空 */
  period: string
  done: boolean
  createdAt: string
}

/** 每天一篇日记，内容为 Markdown */
export interface Diary {
  /** YYYY-MM-DD */
  date: string
  content: string
  updatedAt: string
  /** 同步到飞书的时间，空字符串表示还没同步 */
  syncedAt: string
}

export interface AppData {
  todos: Todo[]
  people: Person[]
  goals: Goal[]
  diaries: Diary[]
  settings: Settings
  /** 上一次发出每日提醒的日期，保证每天只提醒一次 */
  lastReminderDate: string
}
