import { app } from 'electron'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { carryOverTodos, createDefaultData, toDateKey } from '../shared/logic'
import type { AppData } from '../shared/types'

// 数据只存本地：Mac 在 ~/Library/Application Support，Windows 在 %APPDATA%
let cache: AppData | null = null
let onChange: (() => void) | null = null

const dataFile = () => join(app.getPath('userData'), 'data.json')

function load(): AppData {
  if (cache) return cache
  const defaults = createDefaultData()
  const file = dataFile()
  if (!existsSync(file)) {
    cache = defaults
    return cache
  }
  try {
    const saved = JSON.parse(readFileSync(file, 'utf-8')) as Partial<AppData>
    cache = {
      ...defaults,
      ...saved,
      settings: { ...defaults.settings, ...saved.settings },
    }
  } catch {
    // 文件损坏时保留一份副本，避免被默认数据覆盖
    renameSync(file, `${file}.broken-${Date.now()}`)
    cache = defaults
  }
  return cache
}

function save(data: AppData): void {
  const file = dataFile()
  const tmp = `${file}.tmp`
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8')
  renameSync(tmp, file)
}

export function setChangeListener(listener: () => void): void {
  onChange = listener
}

/** 读取数据，并把未完成的待办顺延到今天 */
export function getData(): AppData {
  const data = load()
  const carried = carryOverTodos(data.todos, toDateKey(new Date()))
  if (carried !== data.todos) {
    data.todos = carried
    save(data)
  }
  return data
}

export function update(mutate: (data: AppData) => void, { notify = true } = {}): void {
  const data = load()
  mutate(data)
  save(data)
  if (notify) onChange?.()
}
