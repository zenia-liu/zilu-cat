import { Notification } from 'electron'
import { IPC } from '../shared/ipc'
import { shouldRemind, toDateKey } from '../shared/logic'
import { syncPending } from './feishu'
import * as store from './store'
import { getPetWindow, openPanel } from './windows'

const TICK_MS = 30_000

/** 每 30 秒检查一次是否到了每日提醒时间 */
export function startScheduler(): void {
  tick()
  setInterval(tick, TICK_MS)
}

function tick(): void {
  const now = new Date()
  const today = toDateKey(now)
  const data = store.getData()
  void syncPending(data, now)
  const undoneToday = data.todos.filter(t => t.date === today && !t.done).length

  const remind = shouldRemind({
    now,
    reminderTime: data.settings.reminderTime,
    lastReminderDate: data.lastReminderDate,
    undoneToday,
  })
  if (!remind) return

  store.update(d => {
    d.lastReminderDate = today
  }, { notify: false })

  // 猫身上弹出聊天气泡
  getPetWindow()?.webContents.send(IPC.reminder, undoneToday)

  if (data.settings.notifyEnabled && Notification.isSupported()) {
    const notification = new Notification({
      title: '自律猫',
      body: `今天还有 ${undoneToday} 件待办没完成`,
    })
    notification.on('click', () => openPanel())
    notification.show()
  }
}
