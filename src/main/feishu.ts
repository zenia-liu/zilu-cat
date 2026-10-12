import { dateHeading, markdownToBlocks, missingFields, type FeishuBlock } from '../shared/feishu'
import { pendingDiaries, toDateKey } from '../shared/logic'
import type { AppData, FeishuSettings } from '../shared/types'
import * as store from './store'

const API = 'https://open.feishu.cn/open-apis'
// 每次请求最多追加的块数，超过就分批发送
const CHUNK_SIZE = 50

export interface SyncResult {
  ok: boolean
  message: string
}

let cachedToken: { key: string; value: string; expiresAt: number } | null = null
let syncing = false

/** 凭证齐全即可手动同步；自动同步还需要打开开关 */
export function feishuReady(cfg: FeishuSettings): boolean {
  return missingFields(cfg).length === 0
}

function missingMessage(cfg: FeishuSettings): string {
  return `还缺少：${missingFields(cfg).join('、')}`
}

async function post<T extends object>(url: string, body: unknown, token?: string): Promise<{ code: number; msg: string } & T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  const json = (await res.json()) as { code: number; msg: string } & T
  if (json.code !== 0) throw new Error(`${json.msg}（错误码 ${json.code}）`)
  return json
}

async function getToken(appId: string, appSecret: string): Promise<string> {
  const key = `${appId}:${appSecret}`
  // 令牌有效期约两小时，提前一分钟刷新
  if (cachedToken && cachedToken.key === key && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value
  }
  const body = await post<{ tenant_access_token: string; expire: number }>(
    `${API}/auth/v3/tenant_access_token/internal`,
    { app_id: appId, app_secret: appSecret },
  )
  cachedToken = { key, value: body.tenant_access_token, expiresAt: Date.now() + body.expire * 1000 }
  return body.tenant_access_token
}

/** 追加到文档末尾：根块 ID 与文档 ID 相同，index 为 -1 表示放在最后 */
async function appendBlocks(token: string, documentId: string, blocks: FeishuBlock[]): Promise<void> {
  for (let i = 0; i < blocks.length; i += CHUNK_SIZE) {
    await post(
      `${API}/docx/v1/documents/${documentId}/blocks/${documentId}/children`,
      { children: blocks.slice(i, i + CHUNK_SIZE), index: -1 },
      token,
    )
  }
}

/** 测试连接：只校验应用凭证，不往文档里写任何内容 */
export async function testFeishu(cfg: FeishuSettings): Promise<SyncResult> {
  if (!feishuReady(cfg)) return { ok: false, message: missingMessage(cfg) }
  try {
    await getToken(cfg.appId, cfg.appSecret)
    return { ok: true, message: '连接成功：应用凭证有效' }
  } catch (err) {
    return { ok: false, message: errorMessage(err) }
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 把某一天的日记追加到飞书文档，并记录同步结果 */
async function syncDate(date: string): Promise<SyncResult> {
  const data = store.getData()
  const cfg = data.settings.feishu
  const diary = data.diaries.find(item => item.date === date)
  if (!diary || diary.content.trim() === '') return { ok: false, message: '这一天还没有日记内容' }
  if (!feishuReady(cfg)) return { ok: false, message: missingMessage(cfg) }

  store.update(d => {
    d.settings.feishu.lastAttemptAt = new Date().toISOString()
  }, { notify: false })

  try {
    const token = await getToken(cfg.appId, cfg.appSecret)
    const blocks = [dateHeading(date), ...markdownToBlocks(diary.content)]
    await appendBlocks(token, cfg.documentId, blocks)
    const now = new Date().toISOString()
    store.update(d => {
      const item = d.diaries.find(x => x.date === date)
      if (item) item.syncedAt = now
      d.settings.feishu.lastSyncedAt = now
      d.settings.feishu.lastError = ''
    })
    return { ok: true, message: `已同步 ${date} 的日记` }
  } catch (err) {
    const message = errorMessage(err)
    store.update(d => {
      d.settings.feishu.lastError = message
    }, { notify: false })
    return { ok: false, message }
  }
}

/** 手动同步今天的日记（不受同步时间限制） */
export async function syncToday(): Promise<SyncResult> {
  const today = toDateKey(new Date())
  const diary = store.getData().diaries.find(item => item.date === today)
  if (diary?.syncedAt) return { ok: true, message: '今天的日记已经同步过了' }
  if (syncing) return { ok: false, message: '正在同步中，请稍后再试' }
  syncing = true
  try {
    return await syncDate(today)
  } finally {
    syncing = false
  }
}

/** 定时检查：把到期还没同步的日记按日期顺序同步；出错就停下来，等冷却后再试 */
export async function syncPending(data: AppData, now: Date): Promise<void> {
  const cfg = data.settings.feishu
  if (syncing || !cfg.enabled || !feishuReady(cfg)) return
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const pending = pendingDiaries({
    diaries: data.diaries,
    today: toDateKey(now),
    nowTime,
    syncTime: cfg.syncTime,
    startDate: cfg.startDate,
    lastAttemptAt: cfg.lastAttemptAt,
    nowMs: now.getTime(),
  })
  if (pending.length === 0) return
  syncing = true
  try {
    for (const diary of pending) {
      const result = await syncDate(diary.date)
      if (!result.ok) break
    }
  } finally {
    syncing = false
  }
}
