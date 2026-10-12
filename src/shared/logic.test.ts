import { describe, expect, it } from 'vitest'
import { dateHeading, markdownToBlocks, missingFields, parseDocumentId } from './feishu'
import {
  addDays,
  applyContact,
  carryOverTodos,
  createGoal,
  pendingDiaries,
  createPerson,
  diffDays,
  dueList,
  monthGrid,
  nextContactDate,
  shiftMonth,
  shouldRemind,
  goalsFor,
  weekKey,
  weeksOfMonth,
} from './logic'
import type { Diary, Goal, Person, Todo } from './types'

const person = (over: Partial<Person> = {}): Person => ({
  id: 'p1',
  name: '小王',
  note: '',
  createdAt: '2026-10-01',
  lastContactedAt: '2026-10-01',
  logs: [],
  ...over,
})

const todo = (over: Partial<Todo> = {}): Todo => ({
  id: 't1',
  text: '任务',
  done: false,
  date: '2026-10-10',
  originDate: '2026-10-10',
  ...over,
})

describe('日期工具', () => {
  it('跨月加天', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02')
  })

  it('计算相差天数', () => {
    expect(diffDays('2026-10-01', '2026-10-12')).toBe(11)
  })

  it('月份偏移跨年', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
  })

  it('月历从周一开始，并补齐整周', () => {
    // 2026-10-01 是周四
    const cells = monthGrid('2026-10')
    expect(cells[2]).toBeNull()
    expect(cells[3]).toBe('2026-10-01')
    expect(cells.length % 7).toBe(0)
    expect(cells.filter(Boolean)).toHaveLength(31)
  })
})

describe('社交联络间隔', () => {
  it('新增 3 天后提醒，之后 7 → 15 → 30 天递增，30 天后保持固定', () => {
    let p = person({ lastContactedAt: '2026-10-01' })
    expect(nextContactDate(p)).toBe('2026-10-04')

    p = applyContact(p, '2026-10-04', '一起吃饭')
    expect(nextContactDate(p)).toBe('2026-10-11')

    p = applyContact(p, '2026-10-11', '')
    expect(nextContactDate(p)).toBe('2026-10-26')

    p = applyContact(p, '2026-10-26', '')
    expect(nextContactDate(p)).toBe('2026-11-25')

    p = applyContact(p, '2026-11-25', '')
    expect(nextContactDate(p)).toBe('2026-12-25')
  })

  it('只返回到期的人，并按到期日升序', () => {
    const people = [
      person({ id: 'a', lastContactedAt: '2026-10-05' }), // 10-08 到期
      person({ id: 'b', lastContactedAt: '2026-09-01' }), // 09-04 到期
      person({ id: 'c', lastContactedAt: '2026-10-10' }), // 10-13 未到期
    ]
    expect(dueList(people, '2026-10-12').map(d => d.person.id)).toEqual(['b', 'a'])
  })
})

describe('待办顺延', () => {
  it('未完成的旧待办顺延到今天，已完成的保留原日期', () => {
    const result = carryOverTodos(
      [
        todo({ id: 'a' }),
        todo({ id: 'b', done: true }),
        todo({ id: 'c', date: '2026-10-12', originDate: '2026-10-12' }),
      ],
      '2026-10-12',
    )
    expect(result.map(t => [t.id, t.date])).toEqual([
      ['a', '2026-10-12'],
      ['b', '2026-10-10'],
      ['c', '2026-10-12'],
    ])
  })

  it('没有需要顺延的待办时返回原数组引用', () => {
    const todos = [todo({ date: '2026-10-12', originDate: '2026-10-12' })]
    expect(carryOverTodos(todos, '2026-10-12')).toBe(todos)
  })
})

describe('每日提醒', () => {
  const at = (h: number, m: number) => new Date(2026, 9, 12, h, m) // 2026-10-12

  it('到点且有未完成待办时提醒', () => {
    expect(
      shouldRemind({ now: at(22, 0), reminderTime: '22:00', lastReminderDate: '', undoneToday: 2 }),
    ).toBe(true)
  })

  it('未到点不提醒', () => {
    expect(
      shouldRemind({ now: at(21, 59), reminderTime: '22:00', lastReminderDate: '', undoneToday: 2 }),
    ).toBe(false)
  })

  it('当天已提醒过不重复提醒', () => {
    expect(
      shouldRemind({
        now: at(23, 0),
        reminderTime: '22:00',
        lastReminderDate: '2026-10-12',
        undoneToday: 2,
      }),
    ).toBe(false)
  })

  it('没有未完成待办时不提醒', () => {
    expect(
      shouldRemind({ now: at(22, 0), reminderTime: '22:00', lastReminderDate: '', undoneToday: 0 }),
    ).toBe(false)
  })
})

describe('新增联系人', () => {
  const base = { id: 'p2', name: ' 小李 ', note: ' 健身房认识 ', today: '2026-10-12' }

  it('默认认识日期为今天，第一次联络提醒在 3 天后', () => {
    const p = createPerson({ ...base, metDate: '2026-10-12' })
    expect(p.name).toBe('小李')
    expect(p.note).toBe('健身房认识')
    expect(p.createdAt).toBe('2026-10-12')
    expect(p.lastContactedAt).toBe('2026-10-12')
    expect(nextContactDate(p)).toBe('2026-10-15')
  })

  it('可以选择过去的认识日期，提醒日期跟着往前推', () => {
    const p = createPerson({ ...base, metDate: '2026-10-05' })
    expect(p.createdAt).toBe('2026-10-05')
    expect(nextContactDate(p)).toBe('2026-10-08')
  })

  it('未来或非法的日期回退为今天', () => {
    expect(createPerson({ ...base, metDate: '2026-10-20' }).createdAt).toBe('2026-10-12')
    expect(createPerson({ ...base, metDate: '' }).createdAt).toBe('2026-10-12')
  })
})

describe('目标周期', () => {
  it('周编号按 ISO 规则计算，跨年时归属正确的年份', () => {
    expect(weekKey('2026-10-12')).toBe('2026-W42')
    expect(weekKey('2027-01-01')).toBe('2026-W53')
    expect(weekKey('2026-01-01')).toBe('2026-W01')
    expect(weekKey('2025-12-29')).toBe('2026-W01')
  })

  it('按月展开周：覆盖整个月，首尾周可能跨月', () => {
    const weeks = weeksOfMonth('2026-10')
    expect(weeks.map(w => w.period)).toEqual(['2026-W40', '2026-W41', '2026-W42', '2026-W43', '2026-W44'])
    expect(weeks[0]).toEqual({ period: '2026-W40', start: '2026-09-28', end: '2026-10-04' })
    expect(weeks[4].end).toBe('2026-11-01')
  })

  it('只取指定周期的目标，未完成的排在前面', () => {
    const base = { why: '', how: '', done: false, createdAt: '2026-10-01' }
    const goals: Goal[] = [
      { ...base, id: 'a', horizon: 'week', title: '本周', period: '2026-W42' },
      { ...base, id: 'b', horizon: 'week', title: '上周', period: '2026-W41' },
      { ...base, id: 'c', horizon: 'week', title: '已完成', period: '2026-W42', done: true },
      { ...base, id: 'd', horizon: 'week', title: '本周二', period: '2026-W42' },
      { ...base, id: 'e', horizon: 'long', title: '远期', period: '' },
    ]
    expect(goalsFor(goals, 'week', '2026-W42').map(g => g.id)).toEqual(['a', 'd', 'c'])
    expect(goalsFor(goals, 'week', '2026-W41').map(g => g.id)).toEqual(['b'])
    expect(goalsFor(goals, 'long', '').map(g => g.id)).toEqual(['e'])
  })

  it('新建目标时去掉首尾空白，并写入指定的周期', () => {
    const goal = createGoal({
      id: 'g1',
      horizon: 'month',
      period: '2026-11',
      title: ' 读完一本书 ',
      why: ' 想静下来 ',
      how: '',
      today: '2026-10-12',
    })
    expect(goal).toMatchObject({ title: '读完一本书', why: '想静下来', how: '', period: '2026-11', done: false })
  })
})

describe('飞书同步', () => {
  const diary = (date: string, content: string, syncedAt = ''): Diary => ({ date, content, updatedAt: date, syncedAt })
  const base = { today: '2026-10-12', nowTime: '23:00', syncTime: '23:30', startDate: '2026-10-01', lastAttemptAt: '', nowMs: 0 }

  it('只挑出有内容、未同步、从开始日期起、且已到时间的日记', () => {
    const diaries = [
      diary('2026-10-09', '昨天的内容'),
      diary('2026-10-10', '   '),
      diary('2026-10-11', '已经同步', '2026-10-11T23:31:00'),
      diary('2026-09-30', '开始前写的'),
      diary('2026-10-12', '今天还没到时间'),
    ]
    expect(pendingDiaries({ ...base, diaries }).map(d => d.date)).toEqual(['2026-10-09'])
    expect(pendingDiaries({ ...base, nowTime: '23:30', diaries }).map(d => d.date)).toEqual(['2026-10-09', '2026-10-12'])
  })

  it('没有设置开始日期时不同步；失败后冷却期内不重试', () => {
    const diaries = [diary('2026-10-09', '内容')]
    expect(pendingDiaries({ ...base, startDate: '', diaries })).toEqual([])
    const attempted = new Date('2026-10-12T10:00:00').getTime()
    expect(
      pendingDiaries({ ...base, diaries, lastAttemptAt: new Date(attempted).toISOString(), nowMs: attempted + 5 * 60_000 }),
    ).toEqual([])
    expect(
      pendingDiaries({ ...base, diaries, lastAttemptAt: new Date(attempted).toISOString(), nowMs: attempted + 11 * 60_000 }),
    ).toHaveLength(1)
  })
})

describe('Markdown 转飞书块', () => {
  it('文档 ID 可以从完整链接里取出，也可以直接粘贴', () => {
    expect(parseDocumentId('https://abc.feishu.cn/docx/AbC123xyz?from=share')).toBe('AbC123xyz')
    expect(parseDocumentId('  AbC123xyz ')).toBe('AbC123xyz')
  })

  it('日期标题带星期', () => {
    expect(dateHeading('2026-10-12')).toEqual({
      block_type: 3,
      heading1: { elements: [{ text_run: { content: '2026-10-12 周一' } }] },
    })
  })

  it('常见 Markdown 语法转换为对应的块类型，行内加粗保留样式', () => {
    const md = [
      '# 今天',
      '## 上午',
      '写了一点 **重要的** 东西',
      '- 列表项',
      '1. 有序项',
      '- [x] 已完成',
      '- [ ] 未完成',
      '> 引用',
      '```',
      'const a = 1',
      '```',
    ].join('\n')
    const blocks = markdownToBlocks(md)
    expect(blocks.map(b => b.block_type)).toEqual([4, 4, 2, 12, 13, 17, 17, 15, 14])
    expect(blocks[2]).toEqual({
      block_type: 2,
      text: {
        elements: [
          { text_run: { content: '写了一点 ' } },
          { text_run: { content: '重要的', text_element_style: { bold: true } } },
          { text_run: { content: ' 东西' } },
        ],
      },
    })
    expect(blocks[5]).toMatchObject({ todo: { style: { done: true } } })
    expect(blocks[6]).toMatchObject({ todo: { style: { done: false } } })
    expect(blocks[8]).toEqual({ block_type: 14, code: { elements: [{ text_run: { content: 'const a = 1' } }] } })
  })

  it('日记里的一级标题降为二级，避免和同步时自动加的日期标题冲突', () => {
    expect(markdownToBlocks('# 标题')).toEqual([{ block_type: 4, heading2: { elements: [{ text_run: { content: '标题' } }] } }])
    expect(markdownToBlocks('#### 更深')).toEqual([{ block_type: 5, heading3: { elements: [{ text_run: { content: '更深' } }] } }])
  })

  it('空行不生成块，单独的符号按原文保留', () => {
    expect(markdownToBlocks('\n  \n\n')).toEqual([])
    expect(markdownToBlocks('**')).toEqual([{ block_type: 2, text: { elements: [{ text_run: { content: '**' } }] } }])
  })
})

describe('飞书凭证检查', () => {
  it('列出缺少的必填项', () => {
    expect(missingFields({ appId: '', appSecret: ' ', documentId: '' })).toEqual(['App ID', 'App Secret', '文档链接或 ID'])
    expect(missingFields({ appId: 'cli_x', appSecret: 'secret', documentId: 'AbC' })).toEqual([])
  })
})
