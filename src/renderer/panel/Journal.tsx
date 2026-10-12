import { useEffect, useRef, useState } from 'react'
import type { Diary, FeishuSettings as FeishuConfig } from '../../shared/types'
import type { FeishuResult } from '../../shared/ipc'
import { missingFields } from '../../shared/feishu'
import { toDateKey } from '../../shared/logic'
import { ConfirmDialog } from './ConfirmDialog'
import { LiveEditor } from './LiveEditor'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

// 输入后多久自动保存
const SAVE_DELAY = 500

export function Journal({ diaries, feishu }: { diaries: Diary[]; feishu: FeishuConfig }) {
  const today = toDateKey(new Date())
  const entry = diaries.find(d => d.date === today)
  return (
    <JournalEditor
      key={today}
      date={today}
      initial={entry?.content ?? ''}
      syncedAt={entry?.syncedAt ?? ''}
      feishu={feishu}
    />
  )
}

function JournalEditor({
  date,
  initial,
  syncedAt,
  feishu,
}: {
  date: string
  initial: string
  syncedAt: string
  feishu: FeishuConfig
}) {
  const [content, setContent] = useState(initial)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<FeishuResult | null>(null)
  const timer = useRef<number | null>(null)
  const latest = useRef(initial)

  // 立即保存；失去焦点、离开页面、同步前都会调用，保证同步的是最新内容
  const save = () => {
    if (timer.current === null) return
    window.clearTimeout(timer.current)
    timer.current = null
    void window.api.saveDiary(date, latest.current)
  }

  const onChange = (value: string) => {
    setContent(value)
    latest.current = value
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(save, SAVE_DELAY)
  }

  useEffect(() => save, [])

  const [y, m, d] = date.split('-').map(Number)
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()]
  const configured = missingFields(feishu).length === 0
  const synced = syncedAt !== ''
  const hasContent = content.trim() !== ''

  const sync = async () => {
    setConfirming(false)
    save()
    setBusy(true)
    try {
      setResult(await window.api.syncFeishuNow())
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card journal">
      <div className="journal-head">
        <h2>
          今日日记 <span className="meta">{`${m} 月 ${d} 日 周${weekday}`}</span>
        </h2>
        <span className="meta">自动保存</span>
      </div>
      <p className="journal-tip">
        同步到飞书时，每篇日记前会自动加一个日期一级标题，所以日记里请不要用一级标题（#），用二级标题（##）或更小的标题即可。
      </p>

      <div className="journal-editor">
        <LiveEditor
          initial={initial}
          onChange={onChange}
          onBlur={save}
          placeholderText="写点今天的事吧。直接输入 Markdown 就会实时显示：# 标题、**加粗**、- 列表、- [ ] 待办"
        />
      </div>

      <div className="journal-sync">
        <div className="journal-sync-text">
          {synced ? (
            <span className="ok">今天的日记已同步到飞书，之后的修改不会再同步。</span>
          ) : configured ? (
            <span className="meta">写完后再点同步，今天的日记只能同步一次。</span>
          ) : (
            <span className="meta">还没有配置飞书云文档，请先在设置里填写。</span>
          )}
          {result && <span className={result.ok ? 'ok' : 'error'}>{result.message}</span>}
        </div>
        {configured ? (
          <button disabled={!hasContent || synced || busy} onClick={() => setConfirming(true)}>
            {synced ? '今天已同步' : busy ? '同步中…' : '同步到飞书'}
          </button>
        ) : (
          <button className="ghost" onClick={() => void window.api.openSettings()}>
            去设置
          </button>
        )}
      </div>

      {confirming && (
        <ConfirmDialog
          title="同步今天的日记？"
          body="同步后今天的日记只会同步这一次，之后再修改的内容不会写入飞书。请先确认今天的日记已经写完。"
          confirmText="确定，同步"
          onConfirm={() => void sync()}
          onCancel={() => setConfirming(false)}
        />
      )}
    </section>
  )
}
