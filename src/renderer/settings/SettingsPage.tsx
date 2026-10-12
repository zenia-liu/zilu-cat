import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { AppData, Theme } from '../../shared/types'
import { useTheme } from '../theme'
import { FeishuSettings } from './FeishuSettings'

const THEMES: { value: Theme; label: string }[] = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
]

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="group">
      <h2 className="group-title">{title}</h2>
      <div className="group-body">{children}</div>
    </section>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="group-row">
      <div className="group-label">
        <span>{label}</span>
        {hint && <span className="group-hint">{hint}</span>}
      </div>
      <div className="group-control">{children}</div>
    </div>
  )
}

export function SettingsPage() {
  const [data, setData] = useState<AppData | null>(null)
  useTheme(data?.settings.theme ?? 'system')

  const reload = useCallback(() => {
    void window.api.getData().then(setData)
  }, [])

  useEffect(() => {
    reload()
    return window.api.onDataChanged(reload)
  }, [reload])

  if (!data) return null
  const { settings } = data

  return (
    <div className="settings-page">
      <h1 className="settings-title">设置</h1>

      <Group title="外观">
        <Row label="主题" hint="夜间模式适合晚上使用">
          <div className="segmented">
            {THEMES.map(item => (
              <button
                key={item.value}
                className={settings.theme === item.value ? 'on' : ''}
                onClick={() => void window.api.updateSettings({ theme: item.value })}
              >
                {item.label}
              </button>
            ))}
          </div>
        </Row>
      </Group>

      <Group title="提醒">
        <Row label="每日提醒时间" hint="到了这个时间，今天还没完成的待办会在桌宠身上提醒">
          <input
            type="time"
            value={settings.reminderTime}
            onChange={e => void window.api.updateSettings({ reminderTime: e.target.value })}
          />
        </Row>
        <Row label="同时弹出系统通知">
          <input
            type="checkbox"
            checked={settings.notifyEnabled}
            onChange={e => void window.api.updateSettings({ notifyEnabled: e.target.checked })}
          />
        </Row>
      </Group>

      <Group title="飞书云文档同步">
        <FeishuSettings config={settings.feishu} />
      </Group>
    </div>
  )
}
