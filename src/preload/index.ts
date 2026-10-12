import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type Api } from '../shared/ipc'

const api: Api = {
  getData: () => ipcRenderer.invoke(IPC.getData),
  addTodo: (text, date) => ipcRenderer.invoke(IPC.addTodo, text, date),
  toggleTodo: id => ipcRenderer.invoke(IPC.toggleTodo, id),
  removeTodo: id => ipcRenderer.invoke(IPC.removeTodo, id),
  addPerson: (name, note, metDate) => ipcRenderer.invoke(IPC.addPerson, name, note, metDate),
  removePerson: id => ipcRenderer.invoke(IPC.removePerson, id),
  contactPerson: (id, note) => ipcRenderer.invoke(IPC.contactPerson, id, note),
  addGoal: (horizon, period, title, why, how) => ipcRenderer.invoke(IPC.addGoal, horizon, period, title, why, how),
  saveDiary: (date, content) => ipcRenderer.invoke(IPC.saveDiary, date, content),
  updateFeishu: patch => ipcRenderer.invoke(IPC.updateFeishu, patch),
  testFeishu: () => ipcRenderer.invoke(IPC.testFeishu),
  syncFeishuNow: () => ipcRenderer.invoke(IPC.syncFeishuNow),
  openExternal: url => ipcRenderer.invoke(IPC.openExternal, url),
  openSettings: () => ipcRenderer.send(IPC.openSettings),
  toggleGoal: id => ipcRenderer.invoke(IPC.toggleGoal, id),
  removeGoal: id => ipcRenderer.invoke(IPC.removeGoal, id),
  updateSettings: patch => ipcRenderer.invoke(IPC.updateSettings, patch),
  onDataChanged: callback => {
    const listener = () => callback()
    ipcRenderer.on(IPC.dataChanged, listener)
    return () => ipcRenderer.removeListener(IPC.dataChanged, listener)
  },
  pet: {
    drag: (dx, dy) => ipcRenderer.send(IPC.petDrag, dx, dy),
    setPassthrough: passthrough => ipcRenderer.send(IPC.petPassthrough, passthrough),
    openPanel: () => ipcRenderer.send(IPC.petOpenPanel),
    showMenu: () => ipcRenderer.send(IPC.petMenu),
    onReminder: callback => {
      const listener = (_e: unknown, count: number) => callback(count)
      ipcRenderer.on(IPC.reminder, listener)
      return () => ipcRenderer.removeListener(IPC.reminder, listener)
    },
  },
}

contextBridge.exposeInMainWorld('api', api)
