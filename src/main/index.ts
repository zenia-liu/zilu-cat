import { app, ipcMain, shell } from 'electron'
import { randomUUID } from 'node:crypto'
import { IPC, type FeishuPatch, type SettingsPatch } from '../shared/ipc'
import { parseDocumentId } from '../shared/feishu'
import { syncToday, testFeishu } from './feishu'
import type { GoalHorizon } from '../shared/types'
import { applyContact, createGoal, createPerson, toDateKey } from '../shared/logic'
import * as store from './store'
import { createPetWindow, movePet, notifyDataChanged, openPanel, openSettings, setPetPassthrough, showPetMenu } from './windows'
import { startScheduler } from './scheduler'

function registerIpc(): void {
  ipcMain.handle(IPC.getData, () => store.getData())

  ipcMain.handle(IPC.addTodo, (_e, text: string, date: string) => {
    const content = text.trim()
    if (!content) return
    store.update(d => {
      d.todos.push({ id: randomUUID(), text: content, done: false, date, originDate: date })
    })
  })

  ipcMain.handle(IPC.toggleTodo, (_e, id: string) => {
    store.update(d => {
      const todo = d.todos.find(t => t.id === id)
      if (todo) todo.done = !todo.done
    })
  })

  ipcMain.handle(IPC.removeTodo, (_e, id: string) => {
    store.update(d => {
      d.todos = d.todos.filter(t => t.id !== id)
    })
  })

  ipcMain.handle(IPC.addPerson, (_e, name: string, note: string, metDate: string) => {
    if (!name.trim()) return
    const today = toDateKey(new Date())
    store.update(d => {
      d.people.push(createPerson({ id: randomUUID(), name, note, metDate, today }))
    })
  })

  ipcMain.handle(IPC.removePerson, (_e, id: string) => {
    store.update(d => {
      d.people = d.people.filter(p => p.id !== id)
    })
  })

  ipcMain.handle(IPC.contactPerson, (_e, id: string, note: string) => {
    const today = toDateKey(new Date())
    store.update(d => {
      d.people = d.people.map(p => (p.id === id ? applyContact(p, today, note) : p))
    })
  })

  ipcMain.handle(IPC.addGoal, (_e, horizon: GoalHorizon, period: string, title: string, why: string, how: string) => {
    if (!title.trim()) return
    const today = toDateKey(new Date())
    store.update(d => {
      d.goals.push(createGoal({ id: randomUUID(), horizon, period, title, why, how, today }))
    })
  })

  ipcMain.handle(IPC.saveDiary, (_e, date: string, content: string) => {
    const updatedAt = new Date().toISOString()
    store.update(d => {
      const existing = d.diaries.find(item => item.date === date)
      if (existing) {
        existing.content = content
        existing.updatedAt = updatedAt
      } else {
        d.diaries.push({ date, content, updatedAt, syncedAt: '' })
      }
    }, { notify: false })
  })

  ipcMain.handle(IPC.toggleGoal, (_e, id: string) => {
    store.update(d => {
      const goal = d.goals.find(g => g.id === id)
      if (goal) goal.done = !goal.done
    })
  })

  ipcMain.handle(IPC.removeGoal, (_e, id: string) => {
    store.update(d => {
      d.goals = d.goals.filter(g => g.id !== id)
    })
  })

  ipcMain.handle(IPC.updateFeishu, (_e, patch: FeishuPatch) => {
    const today = toDateKey(new Date())
    store.update(d => {
      const cfg = d.settings.feishu
      if (typeof patch.enabled === 'boolean') {
        // 第一次开启时记下开始日期，之前写的日记不会一次性导入
        if (patch.enabled && !cfg.enabled && !cfg.startDate) cfg.startDate = today
        cfg.enabled = patch.enabled
      }
      if (typeof patch.appId === 'string') cfg.appId = patch.appId.trim()
      if (typeof patch.appSecret === 'string') cfg.appSecret = patch.appSecret.trim()
      if (typeof patch.documentId === 'string') cfg.documentId = parseDocumentId(patch.documentId)
      if (typeof patch.syncTime === 'string' && /^\d{2}:\d{2}$/.test(patch.syncTime)) cfg.syncTime = patch.syncTime
    })
  })

  ipcMain.handle(IPC.testFeishu, () => testFeishu(store.getData().settings.feishu))

  ipcMain.handle(IPC.syncFeishuNow, () => syncToday())

  // 只允许打开飞书开放平台，避免面板里的链接被用来打开任意网址
  ipcMain.handle(IPC.openExternal, (_e, url: string) => {
    if (url.startsWith('https://open.feishu.cn/')) void shell.openExternal(url)
  })

  ipcMain.handle(IPC.updateSettings, (_e, patch: SettingsPatch) => {
    store.update(d => {
      if (patch.reminderTime !== undefined && /^\d{2}:\d{2}$/.test(patch.reminderTime)) {
        d.settings.reminderTime = patch.reminderTime
      }
      if (typeof patch.notifyEnabled === 'boolean') {
        d.settings.notifyEnabled = patch.notifyEnabled
      }
      if (patch.theme === 'system' || patch.theme === 'light' || patch.theme === 'dark') {
        d.settings.theme = patch.theme
      }
    })
  })

  ipcMain.on(IPC.petDrag, (_e, dx: number, dy: number) => movePet(dx, dy))
  ipcMain.on(IPC.petPassthrough, (_e, passthrough: boolean) => setPetPassthrough(passthrough))
  ipcMain.on(IPC.petOpenPanel, () => openPanel())
  ipcMain.on(IPC.openSettings, () => openSettings())
  ipcMain.on(IPC.petMenu, () => showPetMenu())
}

// 只允许一个实例，避免开两只猫
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => openPanel())

  // 猫就是应用本身，关掉面板不退出
  app.on('window-all-closed', () => {})

  app.whenReady().then(() => {
    store.setChangeListener(notifyDataChanged)
    registerIpc()
    createPetWindow()
    startScheduler()
  })
}
