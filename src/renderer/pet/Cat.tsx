export type CatState = 'idle' | 'blink' | 'happy'

const FUR = '#f5a54e'
const FUR_EDGE = '#d9782f'
const STRIPE = '#d9782f'
const INK = '#2b201c'
const PINK = '#f4a0b0'

/** 橘猫脸（参考 🐱 表情）：橘色脸、白色口鼻、粉耳朵、大眼睛 */
export function Cat({ state }: { state: CatState }) {
  return (
    <svg viewBox="0 0 200 200" width="128" height="128" aria-hidden="true">
      <defs>
        <clipPath id="cat-head">
          <ellipse cx="100" cy="112" rx="72" ry="62" />
        </clipPath>
      </defs>

      {/* 耳朵 */}
      <g strokeLinejoin="round" strokeWidth="10">
        <path d="M44 84 L46 24 L100 62 Z" fill={FUR} stroke={FUR_EDGE} />
        <path d="M156 84 L154 24 L100 62 Z" fill={FUR} stroke={FUR_EDGE} />
      </g>
      <path d="M56 74 L58 40 L84 60 Z" fill={PINK} />
      <path d="M144 74 L142 40 L116 60 Z" fill={PINK} />

      {/* 脸 */}
      <ellipse cx="100" cy="112" rx="72" ry="62" fill={FUR} stroke={FUR_EDGE} strokeWidth="3" />

      {/* 白色口鼻 */}
      <ellipse cx="100" cy="146" rx="46" ry="32" fill="#fff7ec" clipPath="url(#cat-head)" />

      {/* 额头条纹 */}
      <g stroke={STRIPE} strokeWidth="6" strokeLinecap="round">
        <path d="M100 58 L100 72" />
        <path d="M84 64 L88 76" />
        <path d="M116 64 L112 76" />
      </g>

      {/* 腮红 */}
      <ellipse cx="54" cy="128" rx="10" ry="6" fill="#ff8a94" opacity="0.45" />
      <ellipse cx="146" cy="128" rx="10" ry="6" fill="#ff8a94" opacity="0.45" />

      {/* 眼睛 */}
      {state === 'happy' ? (
        <g fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round">
          <path d="M60 110 Q72 96 84 110" />
          <path d="M116 110 Q128 96 140 110" />
        </g>
      ) : state === 'blink' ? (
        <g fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round">
          <path d="M62 108 Q72 114 82 108" />
          <path d="M118 108 Q128 114 138 108" />
        </g>
      ) : (
        <g>
          <ellipse cx="72" cy="108" rx="11" ry="14" fill={INK} />
          <ellipse cx="128" cy="108" rx="11" ry="14" fill={INK} />
          <circle cx="76" cy="102" r="4" fill="#fff" />
          <circle cx="132" cy="102" r="4" fill="#fff" />
        </g>
      )}

      {/* 鼻子和嘴 */}
      <path d="M92 122 L108 122 L100 131 Z" fill="#f2788a" strokeLinejoin="round" stroke="#f2788a" strokeWidth="3" />
      <path
        d="M100 131 Q95 141 88 136 M100 131 Q105 141 112 136"
        fill="none"
        stroke={INK}
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* 胡须 */}
      <g stroke="#5a4038" strokeWidth="2" strokeLinecap="round" opacity="0.7">
        <path d="M58 132 L24 126" />
        <path d="M58 140 L26 144" />
        <path d="M142 132 L176 126" />
        <path d="M142 140 L174 144" />
      </g>
    </svg>
  )
}
