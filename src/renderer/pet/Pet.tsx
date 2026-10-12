import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { Cat, type CatState } from './Cat'

// 移动超过这个像素数就视为拖动，不再当作点击
const DRAG_THRESHOLD = 4

export function Pet() {
  const drag = useRef<{ x: number; y: number; moved: number } | null>(null)
  const solid = useRef(false)
  const [blink, setBlink] = useState(false)
  const [hover, setHover] = useState(false)
  const [reminder, setReminder] = useState(0)

  // 待机时随机眨眼
  useEffect(() => {
    let timer: number
    const scheduleBlink = () => {
      timer = window.setTimeout(() => {
        setBlink(true)
        timer = window.setTimeout(() => {
          setBlink(false)
          scheduleBlink()
        }, 150)
      }, 2500 + Math.random() * 2500)
    }
    scheduleBlink()
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => window.api.pet.onReminder(setReminder), [])

  // 鼠标是否在猫身上：猫的图形只有画出来的部分能接收鼠标，所以看 target 即可
  const isOnCat = (e: PointerEvent) => e.target instanceof Element && e.target.closest('.cat') !== null

  const setSolid = (value: boolean) => {
    if (solid.current === value) return
    solid.current = value
    window.api.pet.setPassthrough(!value)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (d) {
      const dx = e.screenX - d.x
      const dy = e.screenY - d.y
      if (dx || dy) {
        window.api.pet.drag(dx, dy)
        d.moved += Math.abs(dx) + Math.abs(dy)
        d.x = e.screenX
        d.y = e.screenY
      }
      return
    }
    const onCat = isOnCat(e)
    const onBubble = e.target instanceof Element && e.target.closest('.solid') !== null
    setHover(onCat)
    setSolid(onCat || onBubble)
  }

  const onPointerLeave = () => {
    if (drag.current) return
    setHover(false)
    setSolid(false)
  }

  const onCatPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.screenX, y: e.screenY, moved: 0 }
  }

  // 没有明显拖动就算点击，打开面板
  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    if (d && d.moved < DRAG_THRESHOLD) window.api.pet.openPanel()
  }

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault()
    window.api.pet.showMenu()
  }

  const catState: CatState = hover ? 'happy' : blink ? 'blink' : 'idle'

  return (
    <div
      className="pet-root"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onContextMenu={onContextMenu}
    >
      {reminder > 0 && (
        <button
          className="bubble solid"
          onClick={() => {
            setReminder(0)
            window.api.pet.openPanel()
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>还有 {reminder} 件没做完</span>
        </button>
      )}
      <div className={hover ? 'cat hover' : 'cat'} onPointerDown={onCatPointerDown}>
        <Cat state={catState} />
      </div>
    </div>
  )
}
