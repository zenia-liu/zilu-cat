import { parseDateKey } from './logic'

export interface FeishuCredentials {
  appId: string
  appSecret: string
  documentId: string
}

/** 缺少的必填项，空数组表示凭证齐全（不含是否开启自动同步） */
export function missingFields(cfg: FeishuCredentials): string[] {
  const missing: string[] = []
  if (!cfg.appId.trim()) missing.push('App ID')
  if (!cfg.appSecret.trim()) missing.push('App Secret')
  if (!cfg.documentId.trim()) missing.push('文档链接或 ID')
  return missing
}

/** 飞书文档块类型（block_type） */
const BLOCK = { text: 2, heading1: 3, heading2: 4, heading3: 5, bullet: 12, ordered: 13, code: 14, quote: 15, todo: 17 } as const

type TextElement = { text_run: { content: string; text_element_style?: { bold: boolean } } }

export type FeishuBlock = { block_type: number } & Record<string, unknown>

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** 支持粘贴完整链接，也支持直接粘贴文档 ID */
export function parseDocumentId(input: string): string {
  const text = input.trim()
  const match = text.match(/\/docx\/([A-Za-z0-9]+)/)
  return match ? match[1] : text
}

/** 每篇日记前面的日期标题，如 2026-10-12 周一 */
export function dateHeading(date: string): FeishuBlock {
  const label = `${date} ${WEEKDAYS[parseDateKey(date).getDay()]}`
  return { block_type: BLOCK.heading1, heading1: { elements: [{ text_run: { content: label } }] } }
}

/** 行内只处理 **加粗**，其余保持原文 */
function inline(text: string): TextElement[] {
  return text
    .split(/\*\*(.+?)\*\*/)
    .map((part, i): TextElement => ({
      text_run: i % 2 === 1 ? { content: part, text_element_style: { bold: true } } : { content: part },
    }))
    .filter(el => el.text_run.content !== '')
}

/**
 * 把 Markdown 转成飞书文档块。支持：标题、段落、无序/有序列表、待办、引用、代码块、**加粗**。
 * 其他语法（表格、图片、链接等）按原文写入段落。
 */
export function markdownToBlocks(markdown: string): FeishuBlock[] {
  const blocks: FeishuBlock[] = []
  const add = (type: number, key: string, text: string, extra: Record<string, unknown> = {}) => {
    const elements = inline(text)
    if (elements.length === 0) return
    blocks.push({ block_type: type, [key]: { elements, ...extra } })
  }

  let code: string[] | null = null
  for (const raw of markdown.replace(/\r\n/g, '\n').split('\n')) {
    if (raw.trim().startsWith('```')) {
      if (code) {
        blocks.push({ block_type: BLOCK.code, code: { elements: [{ text_run: { content: code.join('\n') } }] } })
        code = null
      } else {
        code = []
      }
      continue
    }
    if (code) {
      code.push(raw)
      continue
    }

    const line = raw.trim()
    if (!line) continue
    let m: RegExpMatchArray | null
    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
      // 一级标题留给同步时自动加的日期标题，日记里的 # 统一降为二级
      const level = Math.min(Math.max(m[1].length, 2), 3)
      const type = [BLOCK.heading2, BLOCK.heading3][level - 2]
      add(type, `heading${level}`, m[2])
    } else if ((m = line.match(/^[-*]\s+\[( |x|X)\]\s+(.*)$/))) {
      add(BLOCK.todo, 'todo', m[2], { style: { done: m[1] !== ' ' } })
    } else if ((m = line.match(/^[-*]\s+(.*)$/))) {
      add(BLOCK.bullet, 'bullet', m[1])
    } else if ((m = line.match(/^\d+\.\s+(.*)$/))) {
      add(BLOCK.ordered, 'ordered', m[1])
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      add(BLOCK.quote, 'quote', m[1])
    } else {
      add(BLOCK.text, 'text', line)
    }
  }
  if (code && code.length > 0) {
    blocks.push({ block_type: BLOCK.code, code: { elements: [{ text_run: { content: code.join('\n') } }] } })
  }
  return blocks
}
