import { useEffect } from 'react'

const STEPS: { title: string; body: string[] }[] = [
  {
    title: '创建飞书自建应用',
    body: [
      '打开飞书开放平台并登录，进入「开发者后台」，点击「创建企业自建应用」，填写名称（比如"桌面自律日记"）后创建。',
      '如果你的飞书没有企业、或没有开发者权限，需要请企业管理员帮你创建。',
    ],
  },
  {
    title: '复制应用凭证',
    body: [
      '在应用里进入「凭证与基础信息」，复制 App ID 和 App Secret，分别粘贴到本设置的两个输入框里。',
      'App Secret 相当于密码，只保存在你的电脑上，不要发给别人。',
    ],
  },
  {
    title: '开通云文档权限',
    body: [
      '进入「权限管理」，搜索「文档」，开通云文档相关的权限，比如"创建和编辑新版文档"（具体名称以控制台显示为准）。',
    ],
  },
  {
    title: '发布应用版本',
    body: [
      '进入「版本管理与发布」，创建版本并提交发布。权限修改通常需要发布版本后才会生效；企业内部应用可能需要管理员审批。',
    ],
  },
  {
    title: '把应用加到日记文档里',
    body: [
      '在飞书里新建一篇云文档，作为你的日记本。',
      '打开文档，点右上角的「...」，找到「添加文档应用」或协作者相关入口，选择你刚创建的应用，并给它「可编辑」权限。',
      '这一步很重要：应用没被加进文档，就算凭证和权限都正确，也写不进去。',
    ],
  },
  {
    title: '粘贴文档链接',
    body: [
      '复制文档的网址，形如 https://xxx.feishu.cn/docx/AbC123xyz。',
      '整段粘贴到本设置的「文档链接或 ID」里即可，应用会自动取出中间的 ID。',
    ],
  },
  {
    title: '测试并开始同步',
    body: [
      '点「测试连接」，显示"连接成功"说明凭证没问题。',
      '在「日常」里写一篇日记，点「立即同步今天的日记」，然后打开飞书文档检查末尾是否出现了日期标题和内容。',
      '确认无误后，勾选「每天自动同步日记」，并设置同步时间（默认 23:30）。',
    ],
  },
]

const FAQ: { q: string; a: string }[] = [
  { q: '提示"还缺少……"', a: '对应的输入框没有填写。填写后点输入框以外的地方，内容会自动保存。' },
  { q: '提示权限不足或无权限', a: '检查第 3、4、5 步是否都完成了：权限已开通、版本已发布、应用已加为文档的可编辑协作者。' },
  { q: '点了同步但文档里没有内容', a: '先确认今天的日记里写了内容，并且已经点击过输入框以外的地方（保存完成）。' },
  { q: '日记里能用一级标题吗？', a: '不建议。同步时会自动加一个日期一级标题，日记里的 # 会自动降为二级标题，避免飞书文档的标题层级错乱。' },
]

export function Tutorial({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal card" role="dialog" aria-modal="true" aria-labelledby="tutorial-title" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="tutorial-title">飞书云文档同步教程</h2>
          <button className="ghost icon" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        <p className="hint">按顺序做完下面 7 步。菜单名称可能和控制台略有不同，以你看到的为准。</p>

        <ol className="tutorial">
          {STEPS.map(step => (
            <li key={step.title}>
              <h3>{step.title}</h3>
              {step.body.map(text => (
                <p key={text}>{text}</p>
              ))}
            </li>
          ))}
        </ol>

        <h3 className="faq-title">常见问题</h3>
        <dl className="faq">
          {FAQ.map(item => (
            <div key={item.q}>
              <dt>{item.q}</dt>
              <dd>{item.a}</dd>
            </div>
          ))}
        </dl>

        <div className="row modal-actions">
          <button className="ghost" onClick={() => void window.api.openExternal('https://open.feishu.cn/app')}>
            打开飞书开放平台
          </button>
          <button onClick={onClose}>知道了</button>
        </div>
      </div>
    </div>
  )
}
