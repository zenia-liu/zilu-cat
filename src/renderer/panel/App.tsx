import { useCallback, useEffect, useState } from 'react'
import type { AppData } from '../../shared/types'
import { useTheme } from '../theme'
import { Calendar } from './Calendar'
import { Goals } from './Goals'
import { Journal } from './Journal'
import { Social } from './Social'

type Tab = 'daily' | 'social' | 'goals'

export function App() {
  const [data, setData] = useState<AppData | null>(null)
  const [tab, setTab] = useState<Tab>('daily')
  useTheme(data?.settings.theme ?? 'system')

  const reload = useCallback(() => {
    void window.api.getData().then(setData)
  }, [])

  useEffect(() => {
    reload()
    return window.api.onDataChanged(reload)
  }, [reload])

  if (!data) return null

  return (
    <div className="app">
      <header className="topbar">
        <div className="tabs">
          <button className={tab === 'daily' ? 'tab active' : 'tab'} onClick={() => setTab('daily')}>
            日常
          </button>
          <button className={tab === 'social' ? 'tab active' : 'tab'} onClick={() => setTab('social')}>
            社交
          </button>
          <button className={tab === 'goals' ? 'tab active' : 'tab'} onClick={() => setTab('goals')}>
            目标
          </button>
        </div>
        <button className="ghost" onClick={() => window.api.openSettings()}>
          设置
        </button>
      </header>

      <main className="content">
        {tab === 'daily' && (
          <div className="daily">
            <Calendar todos={data.todos} />
            <Journal diaries={data.diaries ?? []} feishu={data.settings.feishu} />
          </div>
        )}
        {tab === 'social' && <Social people={data.people} />}
        {tab === 'goals' && <Goals goals={data.goals ?? []} />}
      </main>
    </div>
  )
}
