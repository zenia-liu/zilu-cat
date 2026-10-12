import { useEffect, useRef } from 'react'
import { markdown } from '@codemirror/lang-markdown'
import { syntaxTree } from '@codemirror/language'
import { EditorState, type Range } from '@codemirror/state'
import { Decoration, type DecorationSet, EditorView, placeholder, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view'
import { GFM } from '@lezer/markdown'

/** 列表前的圆点，代替 "-" */
class BulletWidget extends WidgetType {
  toDOM() {
    const span = document.createElement('span')
    span.className = 'md-bullet'
    span.textContent = '•'
    return span
  }
}

/** 待办前的复选框，点击直接切换 [ ] / [x] */
class CheckWidget extends WidgetType {
  constructor(
    readonly checked: boolean,
    readonly pos: number,
  ) {
    super()
  }

  eq(other: CheckWidget) {
    return other.checked === this.checked && other.pos === this.pos
  }

  toDOM(view: EditorView) {
    const box = document.createElement('input')
    box.type = 'checkbox'
    box.checked = this.checked
    box.className = 'md-task'
    box.addEventListener('mousedown', e => {
      e.preventDefault()
      view.dispatch({ changes: { from: this.pos, to: this.pos + 3, insert: this.checked ? '[ ]' : '[x]' } })
    })
    return box
  }

  ignoreEvent() {
    return true
  }
}

/**
 * 实时渲染：光标不在的那一行隐藏 # ** ` > 等语法符号，并给标题、加粗、引用、代码块加样式；
 * 光标所在行保留原始写法，方便继续编辑。
 */
function build(view: EditorView): DecorationSet {
  const { state } = view
  const active = new Set<number>()
  for (const range of state.selection.ranges) {
    const first = state.doc.lineAt(range.from).number
    const last = state.doc.lineAt(range.to).number
    for (let n = first; n <= last; n++) active.add(n)
  }
  const isActive = (pos: number) => active.has(state.doc.lineAt(pos).number)
  const decos: Range<Decoration>[] = []
  const hide = (from: number, to: number) => decos.push(Decoration.replace({}).range(from, to))
  const lineClass = (from: number, to: number, cls: string) => {
    let pos = state.doc.lineAt(from).from
    const end = state.doc.lineAt(to).to
    while (pos <= end) {
      const line = state.doc.lineAt(pos)
      decos.push(Decoration.line({ class: cls }).range(line.from))
      pos = line.to + 1
    }
  }
  const markClass = (from: number, to: number, cls: string) => decos.push(Decoration.mark({ class: cls }).range(from, to))

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter: node => {
        const name = node.name
        if (/^ATXHeading[1-6]$/.test(name)) {
          const line = state.doc.lineAt(node.from)
          decos.push(Decoration.line({ class: `md-h${name.slice(-1)}` }).range(line.from))
        } else if (name === 'HeaderMark') {
          if (!isActive(node.from)) hide(node.from, Math.min(node.to + 1, state.doc.lineAt(node.from).to))
        } else if (name === 'StrongEmphasis') {
          markClass(node.from, node.to, 'md-bold')
        } else if (name === 'Emphasis') {
          markClass(node.from, node.to, 'md-italic')
        } else if (name === 'Strikethrough') {
          markClass(node.from, node.to, 'md-strike')
        } else if (name === 'InlineCode') {
          markClass(node.from, node.to, 'md-code')
        } else if (name === 'EmphasisMark' || name === 'StrikethroughMark') {
          if (!isActive(node.from)) hide(node.from, node.to)
        } else if (name === 'CodeMark') {
          if (!isActive(node.from)) hide(node.from, node.to)
        } else if (name === 'FencedCode') {
          lineClass(node.from, node.to, 'md-codeblock')
        } else if (name === 'Blockquote') {
          lineClass(node.from, node.to, 'md-quote')
        } else if (name === 'QuoteMark') {
          if (!isActive(node.from)) hide(node.from, Math.min(node.to + 1, state.doc.lineAt(node.from).to))
        } else if (name === 'ListMark') {
          const text = state.sliceDoc(node.from, node.to)
          if (/^[-*+]$/.test(text) && !isActive(node.from)) {
            decos.push(Decoration.replace({ widget: new BulletWidget() }).range(node.from, node.to))
          }
        } else if (name === 'TaskMarker') {
          const checked = /[xX]/.test(state.sliceDoc(node.from, node.to))
          decos.push(Decoration.replace({ widget: new CheckWidget(checked, node.from) }).range(node.from, node.to))
        }
      },
    })
  }
  return Decoration.set(decos, true)
}

const liveMarkdown = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = build(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = build(update.view)
      }
    }
  },
  { decorations: plugin => plugin.decorations },
)

const theme = EditorView.theme({
  '&': { fontSize: '14px', color: 'var(--ink)', backgroundColor: 'transparent' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'inherit', lineHeight: '1.8' },
  '.cm-content': { padding: '4px 0', caretColor: 'var(--accent)' },
  '.cm-placeholder': { color: 'var(--muted)' },
  '.md-h1': { fontSize: '18px', fontWeight: '600', marginTop: '10px' },
  '.md-h2': { fontSize: '16px', fontWeight: '600', marginTop: '8px' },
  '.md-h3': { fontSize: '14px', fontWeight: '600', marginTop: '6px' },
  '.md-bold': { fontWeight: '600' },
  '.md-italic': { fontStyle: 'italic' },
  '.md-strike': { textDecoration: 'line-through', color: 'var(--muted)' },
  '.md-code': {
    padding: '1px 5px',
    borderRadius: '5px',
    background: 'var(--accent-soft)',
    fontFamily: 'ui-monospace, SF Mono, Menlo, Consolas, monospace',
    fontSize: '13px',
  },
  '.md-codeblock': {
    background: 'var(--paper)',
    fontFamily: 'ui-monospace, SF Mono, Menlo, Consolas, monospace',
    fontSize: '13px',
    paddingLeft: '8px',
  },
  '.md-quote': {
    borderLeft: '3px solid var(--accent)',
    paddingLeft: '10px',
    color: 'var(--ink-soft)',
  },
  '.md-bullet': { display: 'inline-block', width: '1.2em', color: 'var(--accent-deep)', fontWeight: '600' },
  '.md-task': { margin: '0 6px 0 0', width: '14px', height: '14px', verticalAlign: '-2px', accentColor: 'var(--accent)' },
})

/** 只有一个输入框：输入时就地渲染 Markdown，没有单独的预览区 */
export function LiveEditor({
  initial,
  onChange,
  onBlur,
  placeholderText,
}: {
  initial: string
  onChange: (value: string) => void
  onBlur: () => void
  placeholderText: string
}) {
  const host = useRef<HTMLDivElement>(null)
  const handlers = useRef({ onChange, onBlur })
  handlers.current = { onChange, onBlur }

  useEffect(() => {
    const view = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: initial,
        extensions: [
          markdown({ extensions: [GFM] }),
          liveMarkdown,
          EditorView.lineWrapping,
          placeholder(placeholderText),
          theme,
          EditorView.updateListener.of(update => {
            if (update.docChanged) handlers.current.onChange(update.state.doc.toString())
          }),
          EditorView.domEventHandlers({
            blur: () => {
              handlers.current.onBlur()
              return false
            },
          }),
        ],
      }),
    })
    return () => view.destroy()
    // 日记按日期重新挂载，编辑器内容只在初始化时读取一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={host} className="live-editor" />
}
