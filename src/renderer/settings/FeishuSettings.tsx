import { useState } from 'react'
import type { FeishuResult } from '../../shared/ipc'
import type { FeishuSettings as FeishuConfig } from '../../shared/types'
import { missingFields } from '../../shared/feishu'
import { Tutorial } from './Tutorial'

export function FeishuSettings({ config }: { config: FeishuConfig }) {
  const [appId, setAppId] = useState(config.appId)
  const [appSecret, setAppSecret] = useState(config.appSecret)
  const [documentId, setDocumentId] = useState(config.documentId)
  const [result, setResult] = useState<FeishuResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)

  const missing = missingFields({ appId, appSecret, documentId })

  // 点按钮前先把输入框里的内容提交，避免主进程读到旧的凭证
  const run = async (action: () => Promise<FeishuResult>) => {
    setBusy(true)
    try {
      await window.api.updateFeishu({ appId, appSecret, documentId })
      setResult(await action())
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="feishu">
      <div className="feishu-head">
        <div className="feishu-head-right">
          <button className="ghost" onClick={() => setShowTutorial(true)}>
            教程
          </button>
          <label className="feishu-toggle">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={e => void window.api.updateFeishu({ enabled: e.target.checked })}
            />
            每天自动同步日记
          </label>
        </div>
      </div>

      <div className="feishu-grid">
        <label>
          <span>App ID</span>
          <input
            value={appId}
            onChange={e => setAppId(e.target.value)}
            onBlur={() => void window.api.updateFeishu({ appId })}
            placeholder="cli_xxxxxxxx"
          />
        </label>
        <label>
          <span>App Secret</span>
          <input
            type="password"
            value={appSecret}
            onChange={e => setAppSecret(e.target.value)}
            onBlur={() => void window.api.updateFeishu({ appSecret })}
            placeholder="只保存在本机"
          />
        </label>
        <label className="wide">
          <span>文档链接或 ID</span>
          <input
            value={documentId}
            onChange={e => setDocumentId(e.target.value)}
            onBlur={() => void window.api.updateFeishu({ documentId })}
            placeholder="https://xxx.feishu.cn/docx/..."
          />
        </label>
        <label>
          <span>同步时间</span>
          <input
            type="time"
            value={config.syncTime}
            onChange={e => void window.api.updateFeishu({ syncTime: e.target.value })}
          />
        </label>
      </div>

      <ul className="feishu-checklist">
        <li className={missing.includes('App ID') || missing.includes('App Secret') ? '' : 'ok'}>
          应用凭证：App ID 和 App Secret
        </li>
        <li className={missing.includes('文档链接或 ID') ? '' : 'ok'}>文档链接或 ID</li>
        <li className={config.enabled ? 'ok' : ''}>勾选「每天自动同步日记」（手动同步不需要）</li>
      </ul>

      <div className="feishu-actions">
        <button className="ghost" disabled={busy} onClick={() => void run(() => window.api.testFeishu())}>
          测试连接
        </button>
        <span className="meta">
          {config.lastSyncedAt ? `上次同步 ${config.lastSyncedAt.slice(0, 16).replace('T', ' ')}` : '还没有同步过'}
        </span>
      </div>
      {result && <p className={result.ok ? 'feishu-msg ok' : 'feishu-msg error'}>{result.message}</p>}
      {!result && config.lastError && <p className="feishu-msg error">上次失败：{config.lastError}</p>}

      {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}
    </section>
  )
}
