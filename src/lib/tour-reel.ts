// The looping tutorial on the public home page ("the reel"). It is a small picture of the app that plays itself: a
// pointer moves, cells fill in, the balance counts, an invoice gets its PAID stamp. Nothing is recorded: every frame
// is drawn by seek(t), a pure function of time (seconds) that sets styles on the elements in components/landing/
// TourReel.tsx. So it is crisp at any size, loads with the page (no video file) and runs at the screen's own rate.
//
// Time runs from REEL_START to REEL_END. The timeline below still has the original numbers; the first four seconds
// (a title card) are skipped on purpose and the page starts at the sign-in screen.

export const REEL_START = 4.9
export const REEL_END = 52.3
export const REEL_LENGTH = REEL_END - REEL_START
export const STAGE_W = 1600
export const STAGE_H = 1000

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const p = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
const out = (k: number) => 1 - Math.pow(1 - k, 3)
const eio = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2)
const fmt = (n: number) => Math.round(n).toLocaleString('en-US')
const money2 = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Areas shown by the progress bar at the top.
const AREAS: [number, number][] = [
  [4, 12],
  [12, 22],
  [22, 33],
  [33, 43],
  [43, 53],
]

const CAPS: Record<string, [number, string][]> = {
  sign: [
    [4.6, 'Sign in with Google. No password.'],
    [8.4, 'It asks for its own folder in your Drive'],
  ],
  cash: [
    [12.6, 'Type in the blank row, like in a sheet'],
    [15.2, 'Put the amount in Money out'],
    [16.6, 'The balance works itself out. It stays locked.'],
    [19.3, 'Or paste many rows from Excel'],
  ],
  tab: [
    [22.6, 'Make your own tables. Add a column.'],
    [25.0, 'Write the formula by name. No A1.'],
    [27.4, 'The answers fill in and lock'],
    [30.0, 'Tick Paid and it posts to the Cash book'],
  ],
  inv: [
    [33.6, 'Fill in the invoice. See it as it prints.'],
    [36.2, 'The total adds up on its own'],
    [38.6, 'Send it. The PDF is ready.'],
    [40.6, 'Mark it paid. It can post to the Cash book.'],
  ],
  share: [
    [43.6, 'Share a business, or just one table'],
    [46.0, 'Choose View or Edit, and an end date'],
    [49.6, 'On that date the access ends by itself'],
  ],
}
const SCENE_END: Record<string, number> = { sign: 12, cash: 22, tab: 33, inv: 43, share: 53 }
interface Cap {
  t: number
  end: number
  text: string
  n: number
  of: number
}
const CAP_LIST: Cap[] = []
for (const [k, list] of Object.entries(CAPS)) {
  list.forEach((c, i) => CAP_LIST.push({ t: c[0], end: list[i + 1] ? list[i + 1][0] : SCENE_END[k] - 0.4, text: c[1], n: i + 1, of: list.length }))
}

type Key = string | [number, number]
// Pointer waypoints: [time, target]. A target is the name of an element (data-k) or fixed stage coordinates.
const WP: [number, Key][] = [
  [5.5, [900, 420]],
  [7.0, 'g1'],
  [7.9, 'g1'],
  [9.6, 'allow'],
  [10.3, 'allow'],
  [11.3, [1100, 640]],
  [13.4, 'c3m'],
  [14.0, 'c3m'],
  [15.0, 'c3o'],
  [17.6, 'c3b'],
  [19.0, 'c3b'],
  [19.6, [760, 500]],
  [21.6, [1000, 640]],
  [23.2, 'th-t'],
  [24.2, 'th-t'],
  [25.6, 'fx'],
  [28.6, [1000, 640]],
  [30.2, 'tk1'],
  [31.2, 'tk1'],
  [32.4, [1000, 700]],
  [34.0, 'in1'],
  [36.0, 'in2'],
  [38.4, 'b-send'],
  [39.0, 'b-send'],
  [40.8, 'b-paid'],
  [41.6, 'b-paid'],
  [42.4, [1000, 700]],
  [44.0, 'b-share'],
  [44.7, 'b-share'],
  [45.3, 'd-name'],
  [46.2, 'd-what'],
  [46.9, 'd-lvl'],
  [47.5, 'd-end'],
  [48.6, 'd-go'],
  [49.0, 'd-go'],
  [50.2, [1000, 640]],
  [52.2, [1000, 700]],
]
const CLICKS = [7.9, 10.3, 13.9, 15.0, 17.6, 24.2, 30.8, 38.9, 41.4, 44.7, 46.2, 46.9, 49.0]
const TARGETS = ['g1', 'allow', 'c3m', 'c3o', 'c3b', 'th-t', 'fx', 'tk1', 'in1', 'in2', 'b-send', 'b-paid', 'b-share', 'd-name', 'd-what', 'd-lvl', 'd-end', 'd-go']

const RAIL: Record<string, string> = {
  'i-cash': 'Linen Shop · Cash book',
  'i-ord': 'Linen Shop · Orders',
  'i-inv': 'Linen Shop · Invoices',
  'i-share': 'Linen Shop · Sharing',
}

export interface Reel {
  seek: (t: number) => void
}

// Finds every element once, then returns seek. `root` is the stage element (1600 x 1000 design pixels, possibly
// scaled by CSS), so pointer positions are measured relative to it and divided by its scale.
export function createReel(root: HTMLElement): Reel {
  const els = new Map<string, HTMLElement>()
  root.querySelectorAll<HTMLElement>('[data-k]').forEach((e) => {
    const k = e.dataset.k as string
    if (!els.has(k)) els.set(k, e)
  })
  const all = (k: string) => [...root.querySelectorAll<HTMLElement>(`[data-k="${k}"]`)]
  const $ = (k: string): HTMLElement => {
    const e = els.get(k)
    if (!e) throw new Error(`reel: missing ${k}`)
    return e
  }
  const show = (el: HTMLElement, t: number, a: number, b: number, d = 0.45) => {
    el.style.opacity = String(Math.min(out(p(t, a, a + d)), 1 - out(p(t, b - d, b))))
  }
  const ty = (el: HTMLElement, text: string, t: number, a: number, b: number) => {
    const s = text.slice(0, Math.round(text.length * p(t, a, b)))
    if (el.textContent !== s) el.textContent = s
  }
  const setText = (el: HTMLElement, s: string) => {
    if (el.textContent !== s) el.textContent = s
  }
  const toggle = (el: HTMLElement, cls: string, on: boolean) => el.classList.toggle(cls, on)

  const progress = $('prog')
  AREAS.forEach(() => {
    if (progress.children.length < AREAS.length) {
      const i = document.createElement('i')
      i.className = 'rt-seg'
      i.appendChild(document.createElement('b'))
      progress.appendChild(i)
    }
  })

  // Element centres in stage pixels, from layout offsets (they ignore transforms, so this is right even while the
  // page is turned away or a dialog is still sliding in).
  const C = new Map<string, [number, number]>()
  function measure() {
    for (const key of TARGETS) {
      const el = $(key)
      let x = el.offsetWidth / 2
      let y = el.offsetHeight / 2
      let e: HTMLElement | null = el
      while (e && e !== root) {
        x += e.offsetLeft
        y += e.offsetTop
        e = e.offsetParent as HTMLElement | null
      }
      C.set(key, [x, y])
    }
  }
  const pos = (w: [number, Key]): [number, number] => {
    const key = w[1]
    if (Array.isArray(key)) return key
    const c = C.get(key) ?? [800, 500]
    return [c[0] + (key === 'fx' ? -120 : 0), c[1]]
  }
  function cursorAt(t: number): [number, number] {
    let a = WP[0]
    let b = WP[0]
    for (let i = 0; i < WP.length; i++) {
      if (WP[i][0] <= t) a = WP[i]
      if (WP[i][0] > t) {
        b = WP[i]
        break
      }
      b = WP[i]
    }
    const A = pos(a)
    const B = pos(b)
    const k = a === b ? 1 : eio(p(t, a[0], b[0]))
    return [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k]
  }

  const cur = $('cur')
  const rip = $('rip')
  const capBox = $('cap')
  const rail = all('i-cash').concat(all('i-ord'), all('i-inv'), all('i-share'))
  const tts = all('tt')
  const xrows = all('x')
  const fxEl = $('fx')
  let fxShown = -1
  const FX = '{Total} = {Qty} × {Price}'
  function setFormula(n: number) {
    if (n === fxShown) return
    fxShown = n
    const parts = FX.slice(0, n).split(/(\{\w+\})/)
    fxEl.replaceChildren(
      ...parts
        .filter(Boolean)
        .map((s) => {
          if (/^\{\w+\}$/.test(s)) {
            const i = document.createElement('i')
            i.textContent = s
            return i
          }
          return document.createTextNode(s)
        }),
    )
  }

  function seek(t: number) {
    const winIn = out(p(t, 3.7, 4.7))
    const win = $('win')
    win.style.opacity = String(Math.min(winIn, 1 - out(p(t, 52.4, 53.2))))
    win.style.transform = `translateY(${(1 - winIn) * 40}px) scale(${0.97 + 0.03 * winIn})`
    AREAS.forEach(([a, b], i) => {
      ;(progress.children[i].firstChild as HTMLElement).style.width = `${p(t, a, b) * 100}%`
    })
    progress.style.opacity = String(out(p(t, 3.8, 4.6)) * (1 - out(p(t, 53, 53.6))))

    const cp = CAP_LIST.find((c) => t >= c.t && t < c.end)
    if (cp) {
      setText($('cn'), `${cp.n}/${cp.of}`)
      setText($('ct'), cp.text)
      const k = Math.min(out(p(t, cp.t, cp.t + 0.4)), 1 - out(p(t, cp.end - 0.3, cp.end)))
      capBox.style.opacity = String(k)
      capBox.style.transform = `translateY(${(1 - k) * 10}px)`
    } else capBox.style.opacity = '0'

    // sign in
    const si = $('signin')
    si.style.opacity = String(Math.min(out(p(t, 4, 4.8)), 1 - out(p(t, 11.4, 12))))
    ;[...si.children].forEach((c) => {
      const e = c as HTMLElement
      const k = e.dataset.k
      if (k !== 'perm' && k !== 'done') e.style.opacity = t < 8.2 ? '1' : t < 10.9 ? String(Math.max(0, 1 - out(p(t, 8.2, 8.8)))) : '0'
    })
    $('g1').style.transform = `scale(${1 - 0.04 * (t > 7.8 && t < 8.2 ? 1 : 0)})`
    const perm = $('perm')
    perm.style.opacity = String(Math.min(out(p(t, 8.3, 9)), 1 - out(p(t, 10.4, 10.9))))
    perm.style.transform = `translateY(${(1 - out(p(t, 8.3, 9))) * 20}px)`
    $('done').style.opacity = String(Math.min(out(p(t, 10.8, 11.3)), 1 - out(p(t, 11.6, 12))))

    // app shell
    $('app').style.opacity = String(Math.min(out(p(t, 11.8, 12.6)), 1 - out(p(t, 52.4, 53))))
    const act = t < 22 ? 'i-cash' : t < 33 ? 'i-ord' : t < 43 ? 'i-inv' : 'i-share'
    rail.forEach((e) => toggle(e, 'rt-on', e.dataset.k === act))
    setText($('tbt'), t < 12 ? 'Exin Finance' : RAIL[act])

    // cash book
    $('p-cash').style.opacity = String(Math.min(out(p(t, 12, 12.8)), 1 - out(p(t, 21.5, 22.1))))
    ty($('c3m'), 'Rent, shop', t, 13.6, 14.6)
    toggle($('c3m'), 'rt-foc', t > 13.4 && t < 15.2)
    ty($('c3o'), '18,000', t, 15.2, 16.0)
    toggle($('c3o'), 'rt-foc', t > 15 && t < 16.6)
    $('c3o').style.opacity = t > 15.1 ? '1' : '0'
    setText($('c3b'), t > 17.1 ? '32,850' : '')
    $('c3b').style.opacity = String(out(p(t, 17.1, 17.6)))
    $('c3b').style.boxShadow = t > 17.1 && t < 18.9 ? 'inset 0 0 0 3px #e3d29a' : 'none'
    let bal = 50850
    if (t > 17.1) bal = 50850 - 18000 * out(p(t, 17.1, 17.9))
    if (t > 19.8) bal = 32850 - (32850 - 31470) * out(p(t, 19.9, 20.9))
    setText($('bal'), fmt(bal))
    xrows.forEach((r, i) => {
      const k = out(p(t, 19.4 + i * 0.35, 20.0 + i * 0.35))
      r.style.opacity = String(k)
      r.style.transform = `translateX(${(1 - k) * 70}px)`
    })
    show($('t-paste'), t, 20.5, 21.6)

    // tables
    $('p-tab').style.opacity = String(Math.min(out(p(t, 22, 22.8)), 1 - out(p(t, 32.5, 33.1))))
    setText($('th-t'), t < 24.5 ? '＋ Add column' : 'Total ƒ')
    $('fxph').style.opacity = t < 25.6 ? '.55' : '0'
    setFormula(Math.round(FX.length * p(t, 25.8, 27.2)))
    const tv = ['5,400', '2,600', '4,800']
    tts.forEach((e, i) => {
      setText(e, tv[i])
      e.style.opacity = String(out(p(t, 27.6 + i * 0.3, 28.2 + i * 0.3)))
    })
    const tk = out(p(t, 30.8, 31.2))
    const tkEl = $('tk1')
    tkEl.style.background = tk > 0.5 ? 'var(--stamp-soft)' : '#fff'
    tkEl.style.borderColor = tk > 0.5 ? 'var(--stamp)' : '#b6cac0'
    ;(tkEl.firstElementChild as SVGElement).style.opacity = String(tk)
    show($('t-post'), t, 31.4, 32.6)

    // invoices
    $('p-inv').style.opacity = String(Math.min(out(p(t, 33, 33.8)), 1 - out(p(t, 42.5, 43.1))))
    ty($('in1'), 'Trail pack, 40L', t, 34.2, 35.2)
    ty($('iq1'), '20', t, 35.3, 35.5)
    ty($('ip1'), '90', t, 35.5, 35.8)
    toggle($('in1'), 'rt-foc', t > 34 && t < 35.9)
    ty($('in2'), 'Rain cover', t, 36.2, 36.9)
    ty($('iq2'), '20', t, 37.0, 37.2)
    ty($('ip2'), '12', t, 37.2, 37.5)
    toggle($('in2'), 'rt-foc', t > 36 && t < 37.6)
    const r1 = out(p(t, 35.6, 36.2))
    const r2 = out(p(t, 37.5, 38.1))
    $('pr1').style.opacity = String(r1)
    $('pr2').style.opacity = String(r2)
    setText($('tv'), money2(1800 * r1 + (t > 37.5 ? 240 * r2 : 0)))
    $('ptot').style.opacity = String(r1)
    const sent = t > 39
    const paid = t > 41.4
    const chip = $('stc')
    setText(chip, paid ? 'Paid' : sent ? 'Sent' : 'Draft')
    chip.className = 'rt-stc rt-chipx' + (sent ? ' rt-g' : '')
    toggle($('b-send'), 'rt-dis', !(r2 > 0.5) || sent)
    toggle($('b-paid'), 'rt-dis', !sent || paid)
    setText($('b-send'), sent ? 'Sent' : 'Send')
    const st = $('stampx')
    st.style.opacity = paid ? String(0.95 * out(p(t, 41.5, 42))) : '0'
    st.style.transform = `rotate(-12deg) scale(${paid ? 1 + 0.7 * (1 - out(p(t, 41.5, 42))) : 1.7})`
    let toast = Math.min(out(p(t, 39.4, 40)), 1 - out(p(t, 40.9, 41.3)), 1) + (paid ? out(p(t, 41.8, 42.3)) : 0)
    if (t > 42.5) toast = Math.max(0, 1 - out(p(t, 42.5, 43.1)))
    $('t-inv').style.opacity = String(clamp(toast))
    setText($('t-inv-t'), paid ? '✓ Posted to the Cash book' : '✓ Sent · PDF ready to download')
    setText($('t-inv-v'), paid ? 'USD +2,040.00' : '')

    // sharing
    $('p-share').style.opacity = String(Math.min(out(p(t, 43, 43.8)), 1 - out(p(t, 52.4, 53))))
    const open = Math.min(out(p(t, 44.9, 45.4)), 1 - out(p(t, 49.2, 49.7)))
    $('scrim').style.opacity = String(open)
    const dlg = $('dlg')
    dlg.style.opacity = String(open)
    dlg.style.transform = `translateY(${(1 - open) * 24}px)`
    ty($('d-name'), 'Tanvir, packing', t, 45.4, 46.1)
    setText($('d-what'), t > 46.3 ? 'One table: Orders' : 'Whole business')
    setText($('d-lvl'), t > 47.0 ? 'Edit' : 'View')
    ty($('d-end'), '15 Dec', t, 47.5, 48.2)
    ;(
      [
        ['d-name', 45.2, 46.3],
        ['d-what', 46.1, 46.6],
        ['d-lvl', 46.8, 47.3],
        ['d-end', 47.4, 48.5],
      ] as [string, number, number][]
    ).forEach(([k, a, b]) => toggle($(k), 'rt-foc', t > a && t < b))
    const w2 = out(p(t, 49.5, 50.2))
    const row = $('w2')
    row.style.opacity = t < 49.5 ? '0' : t > 51.4 ? '.5' : String(w2)
    row.style.transform = `translateY(${(1 - w2) * 16}px)`
    const ended = t > 51.4
    row.style.filter = ended ? 'grayscale(1)' : 'none'
    setText($('w2s'), ended ? 'Access ended' : 'Orders table only · until 15 Dec')
    setText($('w2a'), ended ? 'Share again' : 'Stop')
    show($('t-sh'), t, 51.6, 52.5)

    // pointer + click ripple
    const c = cursorAt(t)
    cur.style.opacity = String(Math.min(out(p(t, 5, 5.6)), 1 - out(p(t, 52.2, 52.8))))
    cur.style.transform = `translate(${c[0] - 8}px,${c[1] - 6}px)`
    let rk = -1
    for (const ct of CLICKS) if (t >= ct && t < ct + 0.7) rk = (t - ct) / 0.7
    if (rk >= 0) {
      rip.style.left = `${c[0]}px`
      rip.style.top = `${c[1]}px`
      rip.style.opacity = String((1 - rk) * 0.9)
      rip.style.transform = `scale(${0.3 + rk * 1.1})`
    } else rip.style.opacity = '0'
  }

  measure()
  seek(REEL_START)
  return { seek }
}
