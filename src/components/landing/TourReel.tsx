import { memo, useEffect, useRef } from 'react'
import { createReel, REEL_LENGTH, REEL_START, STAGE_H, STAGE_W } from '../../lib/tour-reel'
import { prefersReducedMotion } from '../../lib/use-landing-nav'
import './reel.css'

// The picture itself. Rendered once and never again: tour-reel.ts changes styles and text on these elements
// directly, 60 times a second, so React must not touch them.
const ReelMarkup = memo(function ReelMarkup() {
  return (
    <>

  <div className="rt-win" data-k="win" >
    <div className="rt-tb" data-k="tb" ><i></i><i></i><i></i><span className="rt-tbt" data-k="tbt" >Exin Finance</span></div>
    <div className="rt-body" data-k="body" >
      <div className="rt-signin rt-pane" data-k="signin"  >
        <svg width="96" height="96" viewBox="0 0 100 100"><rect width="100" height="100" rx="10" fill="#5fdcb0"/><g fill="#2d1e00"><rect x="21.7" y="29.2" width="56.6" height="8.4" rx="4.2"/><rect x="21.7" y="49.1" width="42.9" height="8.4" rx="4.2"/><rect x="21.7" y="69" width="56.6" height="8.4" rx="4.2"/></g></svg>
        <h2>Open your <b>first sheet.</b></h2>
        <div className="rt-g1 rt-gbtn" data-k="g1"  ><svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.2 5.5-4.7 7.2l7.6 5.9c4.4-4.1 6.9-10.1 6.9-17.6z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>Continue with Google</div>
        <p className="rt-sm" >Google asks for a folder in your own Drive, for invoice PDFs and receipts. It cannot see any other file.</p>
        <div className="rt-perm" data-k="perm" ><h3>Exin Finance wants to create and manage its own files in your Google Drive</h3><p>Only files it creates itself. Nothing else in your Drive is visible to it.</p><div className="rt-row" ><span className="rt-b2" >Cancel</span><span className="rt-allow rt-b2 rt-pri" data-k="allow"  >Allow</span></div></div>
        <div className="rt-done" data-k="done" ><div className="rt-tick" ><svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></div><b>Signed in</b></div>
      </div>

      <div className="rt-app rt-pane" data-k="app"  >
        <div className="rt-rail" data-k="rail" >
          <div className="rt-biz" ><i>LS</i><span>Linen Shop<small>BDT</small></span></div>
          <h6>Books</h6><div className="rt-i-cash rt-it" data-k="i-cash"  >Cash book</div><div className="rt-i-inv rt-it" data-k="i-inv"  >Invoices</div>
          <h6>Tables</h6><div className="rt-i-ord rt-it" data-k="i-ord"  >Orders</div>
          <h6>Business</h6><div className="rt-i-share rt-it" data-k="i-share"  >Sharing</div>
        </div>
        <div className="rt-main" data-k="main" >

                    <div className="rt-p-cash rt-page" data-k="p-cash"  >
            <div className="rt-ph" ><h3>Cash book</h3>
              <div className="rt-bal" ><small><span>Balance</span><em>🔒 locked</em></small><b><u>BDT</u><span className="rt-bal" data-k="bal" >50,850</span></b></div></div>
            <div className="rt-grid" >
              <div className="rt-gr rt-hd rt-cols-cash" ><div>Date</div><div>Memo</div><div className="rt-r" >In</div><div className="rt-r" >Out</div><div className="rt-r" >Balance</div></div>
              <div className="rt-gr rt-cols-cash" ><div className="rt-mono" >04 Nov</div><div>Order ORD-0041<span className="rt-pill" >linked</span></div><div className="rt-r rt-up" >4,800</div><div className="rt-r" ></div><div className="rt-r rt-lock" >53,000</div></div>
              <div className="rt-gr rt-cols-cash" ><div className="rt-mono" >05 Nov</div><div>Packaging</div><div className="rt-r" ></div><div className="rt-r rt-dn" >2,150</div><div className="rt-r rt-lock" >50,850</div></div>
              <div className="rt-gr rt-cols-cash" ><div className="rt-c3d rt-mono" data-k="c3d"  >06 Nov</div><div className="rt-c3m" data-k="c3m" ></div><div className="rt-r" ></div><div className="rt-c3o rt-r rt-dn" data-k="c3o"  ></div><div className="rt-c3b rt-r rt-lock" data-k="c3b"  ></div></div>
              <div className="rt-gr rt-cols-cash rt-x"  data-k="x"><div className="rt-mono" >07 Nov</div><div>Courier fee</div><div className="rt-r" ></div><div className="rt-r rt-dn" >380</div><div className="rt-r rt-lock" >32,470</div></div>
              <div className="rt-gr rt-cols-cash rt-x"  data-k="x"><div className="rt-mono" >08 Nov</div><div>Order ORD-0043<span className="rt-pill" >linked</span></div><div className="rt-r rt-up" >3,200</div><div className="rt-r" ></div><div className="rt-r rt-lock" >35,670</div></div>
              <div className="rt-gr rt-cols-cash rt-x"  data-k="x"><div className="rt-mono" >09 Nov</div><div>Fabric restock</div><div className="rt-r" ></div><div className="rt-r rt-dn" >4,200</div><div className="rt-r rt-lock" >31,470</div></div>
            </div>
            <div className="rt-t-paste rt-toast" data-k="t-paste"  ><span>✓ Pasted 3 rows from Excel</span><span className="rt-mono" >checked by the server</span></div>
          </div>

                    <div className="rt-p-tab rt-page" data-k="p-tab"  >
            <div className="rt-ph" ><h3>Orders</h3><span className="rt-chipx rt-g" >Posts to Cash book when Paid</span></div>
            <div className="rt-fbar" ><span>ƒ</span><div className="rt-fx" data-k="fx" ></div><em className="rt-fxph" data-k="fxph" style={{ fontStyle: 'normal', opacity: '.55' }}  >Formula</em></div>
            <div className="rt-grid" >
              <div className="rt-gr rt-hd rt-cols-tab" ><div>Item</div><div className="rt-r" >Qty</div><div className="rt-r" >Price</div><div className="rt-th-t rt-r" data-k="th-t" style={{ color: 'var(--stamp)' }}   >＋ Add column</div><div style={{ justifyContent: 'center' }} >Paid</div></div>
              <div className="rt-gr rt-cols-tab" ><div>Linen set</div><div className="rt-r" >3</div><div className="rt-r" >1,800</div><div className="rt-r rt-lock rt-tt" data-k="tt" ></div><div style={{ justifyContent: 'center' }} ><span className="rt-tk1 rt-tick" data-k="tk1"  ><svg viewBox="0 0 24 24" fill="none" stroke="#0f7b59" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></span></div></div>
              <div className="rt-gr rt-cols-tab" ><div>Cushion</div><div className="rt-r" >4</div><div className="rt-r" >650</div><div className="rt-r rt-lock rt-tt" data-k="tt" ></div><div style={{ justifyContent: 'center' }} ><span className="rt-tick" ></span></div></div>
              <div className="rt-gr rt-cols-tab" ><div>Throw</div><div className="rt-r" >2</div><div className="rt-r" >2,400</div><div className="rt-r rt-lock rt-tt" data-k="tt" ></div><div style={{ justifyContent: 'center' }} ><span className="rt-tick" ></span></div></div>
            </div>
            <div className="rt-t-post rt-toast" data-k="t-post"  ><span>✓ Posted to the Cash book</span><b className="rt-mono" >+5,400</b></div>
          </div>

                    <div className="rt-p-inv rt-page" data-k="p-inv"  >
            <div className="rt-ph" ><h3>Invoice 0014</h3><span className="rt-stc rt-chipx" data-k="stc"  >Draft</span></div>
            <div className="rt-inv" >
              <div className="rt-form" >
                <label>Client</label><div className="rt-inp" >Trail Gear</div>
                <label>Items</label>
                <div className="rt-il" ><div className="rt-in1 rt-inp" data-k="in1"  ></div><div className="rt-iq1 rt-inp rt-mono" data-k="iq1"  ></div><div className="rt-ip1 rt-inp rt-mono" data-k="ip1"  ></div></div>
                <div className="rt-il" ><div className="rt-in2 rt-inp" data-k="in2"  ></div><div className="rt-iq2 rt-inp rt-mono" data-k="iq2"  ></div><div className="rt-ip2 rt-inp rt-mono" data-k="ip2"  ></div></div>
                <div className="rt-b-send rt-btn3 rt-dis" data-k="b-send"  >Send</div>
                <div className="rt-b-paid rt-btn3 rt-sec rt-dis" data-k="b-paid" style={{ marginTop: '14px' }}   >Mark paid</div>
              </div>
              <div className="rt-paper rt-paperx" data-k="paper"  >
                <div className="rt-h" ><div><strong>Invoice 0014</strong><div className="rt-sub" >Trail Gear · USD</div></div><div className="rt-sub" style={{ textAlign: 'right' }}  >Issued 02 Nov<br />Due 16 Nov</div></div>
                <div className="rt-pr rt-hd" ><div>Item</div><div style={{ textAlign: 'right' }} >Qty</div><div style={{ textAlign: 'right' }} >Amount</div></div>
                <div className="rt-pr1 rt-pr" data-k="pr1"  ><div>Trail pack, 40L</div><div className="rt-mono" style={{ textAlign: 'right' }}  >20</div><div className="rt-mono" style={{ textAlign: 'right' }}  >1,800.00</div></div>
                <div className="rt-pr2 rt-pr" data-k="pr2"  ><div>Rain cover</div><div className="rt-mono" style={{ textAlign: 'right' }}  >20</div><div className="rt-mono" style={{ textAlign: 'right' }}  >240.00</div></div>
                <div className="rt-ptot rt-tot" data-k="ptot"  ><span>Total</span><span className="rt-mono" >USD <span className="rt-tv" data-k="tv" >0.00</span></span></div>
                <div className="rt-stampx rt-stampx" data-k="stampx"  >PAID</div>
              </div>
            </div>
            <div className="rt-t-inv rt-toast" data-k="t-inv"  ><span className="rt-t-inv-t" data-k="t-inv-t" ></span><b className="rt-t-inv-v rt-mono" data-k="t-inv-v"  ></b></div>
          </div>

                    <div className="rt-p-share rt-page" data-k="p-share"  >
            <div className="rt-ph" ><h3>Sharing</h3><div className="rt-b-share rt-b2 rt-pri" data-k="b-share"  >Share</div></div>
            <div className="rt-who" ><span className="rt-av" >RA</span><div><b>Rina, accountant</b><small>Whole business · until 30 Dec</small></div><div className="rt-acts" ><span className="rt-badge" >View</span></div></div>
            <div className="rt-w2 rt-who" data-k="w2" style={{ opacity: '0' }}   ><span className="rt-av" >TK</span><div><b>Tanvir, packing</b><small className="rt-w2s" data-k="w2s" >Orders table only · until 15 Dec</small></div><div className="rt-acts" ><span className="rt-w2b rt-badge rt-e" data-k="w2b"  >Edit</span><span className="rt-w2a rt-b2" data-k="w2a"  >Stop</span></div></div>
            <div className="rt-scrim rt-scrim" data-k="scrim"  ></div>
            <div className="rt-dlg" data-k="dlg" >
              <h4>Share with someone</h4>
              <label style={{ font: '600 16px RM', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-soft)', display: 'block', marginBottom: '8px' }} >Person</label><div className="rt-d-name rt-inp" data-k="d-name"  ></div>
              <label style={{ font: '600 16px RM', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-soft)', display: 'block', marginBottom: '8px' }} >What</label><div className="rt-d-what rt-inp" data-k="d-what"  >Whole business</div>
              <div style={{ display: 'flex', gap: '18px' }} >
                <div style={{ flex: '1' }} ><label style={{ font: '600 16px RM', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-soft)', display: 'block', marginBottom: '8px' }} >May</label><div className="rt-d-lvl rt-inp" data-k="d-lvl"  >View</div></div>
                <div style={{ flex: '1' }} ><label style={{ font: '600 16px RM', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-soft)', display: 'block', marginBottom: '8px' }} >Until</label><div className="rt-d-end rt-inp rt-mono" data-k="d-end"  ></div></div>
              </div>
              <div className="rt-d-go rt-btn3" data-k="d-go"  >Share</div>
            </div>
            <div className="rt-t-sh rt-toast" data-k="t-sh"  ><span>Access ended on its own</span><b className="rt-mono" >16 Dec</b></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  
    <div className="rt-prog" data-k="prog" />
    <div className="rt-rip" data-k="rip" />
    <svg className="rt-cur" data-k="cur" viewBox="0 0 22 22" fill="none">
      <path d="M3 2v15l4.2-3.8 2.9 6.3 2.7-1.2-2.9-6.2H16z" fill="#fff" stroke="#0e1a14" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
    <div className="rt-cap" data-k="cap">
      <span className="rt-n" data-k="cn" />
      <span className="rt-t" data-k="ct" />
    </div>
    </>
  )
})

// The one-minute tutorial on the home page. It is drawn live (no video file): a fixed 1600 x 1000 picture scaled to
// fit its box, played only while its page is showing and the tab is visible. With reduced motion it shows one still
// frame and does not move.
export function TourReel({ active }: { active: boolean }) {
  const wrap = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const reel = useRef<ReturnType<typeof createReel> | null>(null)

  useEffect(() => {
    const box = wrap.current
    const el = stage.current
    if (!box || !el) return
    reel.current = createReel(el)
    const fit = () => {
      const k = Math.min(box.clientWidth / STAGE_W, box.clientHeight / STAGE_H)
      el.style.setProperty('--k', String(k))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(box)
    // reduced motion: one calm still frame (the Cash book)
    if (prefersReducedMotion()) reel.current.seek(20.8)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!active || prefersReducedMotion()) return
    const r = reel.current
    const el = stage.current
    if (!r || !el) return
    const FADE = 0.5
    let raf = 0
    let start = performance.now()
    const frame = (now: number) => {
      if (document.hidden) {
        start = now - ((now - start) % (REEL_LENGTH * 1000))
      }
      const pos = ((now - start) / 1000) % REEL_LENGTH
      r.seek(REEL_START + pos)
      // a soft join where the loop ends and starts again
      el.style.opacity = String(Math.min(1, pos / FADE, (REEL_LENGTH - pos) / FADE))
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [active])

  return (
    <div className="rt-wrap" ref={wrap} role="img" aria-label="A one minute tour: sign in with Google, the Cash book, tables with formulas, invoices, and sharing with an end date.">
      <div className="rt-stage" ref={stage} aria-hidden="true">
        <ReelMarkup />
      </div>
    </div>
  )
}
