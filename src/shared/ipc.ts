import type { AppData, FeishuSettings, GoalHorizon, Settings } from './types'

export const IPC = {
  getData: 'data:get',
  dataChanged: 'data:changed',
  addTodo: 'todo:add',
  toggleTodo: 'todo:toggle',
  removeTodo: 'todo:remove',
  addPerson: 'person:add',
  removePerson: 'person:remove',
  addGoal: 'goal:add',
  toggleGoal: 'goal:toggle',
  removeGoal: 'goal:remove',
  saveDiary: 'diary:save',
  updateFeishu: 'feishu:update',
  testFeishu: 'feishu:test',
  syncFeishuNow: 'feishu:sync-now',
  openExternal: 'app:open-external',
  openSettings: 'window:open-settings',
  contactPerson: 'person:contact',
  updateSettings: 'settings:update',
  reminder: 'pet:reminder',
  petDrag: 'pet:drag',
  petPassthrough: 'pet:passthrough',
  petOpenPanel: 'pet:open-panel',
  petMenu: 'pet:menu',
} as const

export type SettingsPatch = Partial<Pick<Settings, 'reminderTime' | 'notifyEnabled' | 'theme'>>

export type FeishuPatch = Partial<Pick<FeishuSettings, 'enabled' | 'appId' | 'appSecret' | 'documentId' | 'syncTime'>>

export interface FeishuResult {
  ok: boolean
  message: string
}

/** 渲染进程通过 preload 暴露的 window.api */
export interface Api {
  getData(): Promise<AppData>
  addTodo(text: string, date: string): Promise<void>
  toggleTodo(id: string): Promise<void>
  removeTodo(id: string): Promise<void>
  addPerson(name: string, note: string, metDate: string): Promise<void>
  removePerson(id: string): Promise<void>
  contactPerson(id: string, note: string): Promise<void>
  addGoal(horizon: GoalHorizon, period: string, title: string, why: string, how: string): Promise<void>
  saveDiary(date: string, content: string): Promise<void>
  updateFeishu(patch: FeishuPatch): Promise<void>
  testFeishu(): Promise<FeishuResult>
  syncFeishuNow(): Promise<FeishuResult>
  openExternal(url: string): Promise<void>
  openSettings(): void
  toggleGoal(id: string): Promise<void>
  removeGoal(id: string): Promise<void>
  updateSettings(patch: SettingsPatch): Promise<void>
  onDataChanged(callback: () => void): () => void
  pet: {
    drag(dx: number, dy: number): void
    setPassthrough(passthrough: boolean): void
    openPanel(): void
    showMenu(): void
    onReminder(callback: (undoneCount: number) => void): () => void
  }
}
