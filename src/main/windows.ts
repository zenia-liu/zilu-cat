import { app, BrowserWindow, Menu, screen } from 'electron'
import { join } from 'node:path'
import { IPC } from '../shared/ipc'
import type { PetPosition } from '../shared/types'
import * as store from './store'

const PET_SIZE = 160
const PRELOAD = join(__dirname, '../preload/index.js')

let petWin: BrowserWindow | null = null
let panelWin: BrowserWindow | null = null
let settingsWin: BrowserWindow | null = null
let moveTimer: ReturnType<typeof setTimeout> | undefined

export const getPetWindow = () => petWin

function loadPage(win: BrowserWindow, page: 'pet' | 'panel' | 'settings'): void {
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) void win.loadURL(`${devUrl}/${page}/index.html`)
  else void win.loadFile(join(__dirname, `../renderer/${page}/index.html`))
}

function defaultPetPosition(): PetPosition {
  const area = screen.getPrimaryDisplay().workArea
  return { x: area.x + area.width - PET_SIZE - 24, y: area.y + area.height - PET_SIZE - 24 }
}

/** 在 Mac 上保存的位置换到 Windows 上（或拔掉显示器）时可能已经不在任何屏幕内 */
function resolvePetPosition(saved: PetPosition | null): PetPosition {
  if (!saved) return defaultPetPosition()
  const visible = screen
    .getAllDisplays()
    .some(({ workArea: a }) => saved.x >= a.x && saved.x < a.x + a.width && saved.y >= a.y && saved.y < a.y + a.height)
  return visible ? saved : defaultPetPosition()
}

function savePetPosition(): void {
  if (!petWin) return
  const [x, y] = petWin.getPosition()
  store.update(d => {
    d.settings.petPosition = { x, y }
  }, { notify: false })
}

export function createPetWindow(): void {
  const pos = resolvePetPosition(store.getData().settings.petPosition)
  const win = new BrowserWindow({
    width: PET_SIZE,
    height: PET_SIZE,
    x: pos.x,
    y: pos.y,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: { preload: PRELOAD },
  })
  petWin = win
  win.setAlwaysOnTop(true, 'floating')
  // 默认穿透：只有鼠标落在猫身上或气泡上时才接收事件，其余区域不挡住下面的窗口
  win.setIgnoreMouseEvents(true, { forward: true })
  win.on('move', () => {
    clearTimeout(moveTimer)
    moveTimer = setTimeout(savePetPosition, 400)
  })
  win.on('closed', () => {
    petWin = null
  })
  loadPage(win, 'pet')
}

export function movePet(dx: number, dy: number): void {
  if (!petWin) return
  const [x, y] = petWin.getPosition()
  petWin.setPosition(Math.round(x + dx), Math.round(y + dy))
}

export function setPetPassthrough(passthrough: boolean): void {
  petWin?.setIgnoreMouseEvents(passthrough, { forward: true })
}

export function showPetMenu(): void {
  Menu.buildFromTemplate([
    { label: '打开面板', click: () => openPanel() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]).popup({ window: petWin ?? undefined })
}

export function openPanel(): void {
  if (panelWin) {
    if (panelWin.isMinimized()) panelWin.restore()
    panelWin.show()
    panelWin.focus()
    return
  }
  const win = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    title: '自律猫',
    show: false,
    webPreferences: { preload: PRELOAD },
  })
  panelWin = win
  win.once('ready-to-show', () => win.show())
  win.on('closed', () => {
    panelWin = null
  })
  loadPage(win, 'panel')
}

/** 数据变化后通知所有窗口重新读取 */
export function notifyDataChanged(): void {
  for (const win of BrowserWindow.getAllWindows()) win.webContents.send(IPC.dataChanged)
}

/** 设置单独开一个窗口，只打开一次 */
export function openSettings(): void {
  if (settingsWin) {
    if (settingsWin.isMinimized()) settingsWin.restore()
    settingsWin.show()
    settingsWin.focus()
    return
  }
  const win = new BrowserWindow({
    width: 680,
    height: 760,
    minWidth: 560,
    minHeight: 520,
    title: '设置',
    show: false,
    webPreferences: { preload: PRELOAD },
  })
  settingsWin = win
  win.once('ready-to-show', () => win.show())
  win.on('closed', () => {
    settingsWin = null
  })
  loadPage(win, 'settings')
}
