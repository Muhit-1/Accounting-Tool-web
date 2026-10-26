import { formatMoney } from '../../lib/format'
import { paymentRows, type PaymentDetails, type PreviewLine } from '../../lib/invoice-preview'

function formatDay(day: string): string {
  const date = new Date(`${day}T00:00:00`)
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

const lines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

function Placeholder({ children }: { children: string }) {
  return <span style={{ color: '#b3b9c6', fontStyle: 'italic' }}>{children}</span>
}

// The invoice as it will print (the same layout as the PDF the server makes), redrawn on every key you press.
// Everything is sized from the width of the page so it stays sharp at any size.
export function InvoicePreview({
  business,
  client,
  number,
  issueDate,
  dueDate,
  terms,
  items,
  subtotal,
  currency,
  payment,
}: {
  business: { name: string; logoUrl: string | null; address: string | null; contactEmail: string | null; website: string | null }
  client: { name: string; address: string } | null
  number: string
  issueDate: string
  dueDate: string
  terms: string
  items: PreviewLine[]
  subtotal: number
  currency: string
  payment: PaymentDetails
}) {
  const pay = paymentRows(payment)
  const th = { padding: '1.4cqw 1.2cqw', textAlign: 'left' as const, fontWeight: 600 }
  const num = { textAlign: 'right' as const }
  return (
    <div style={{ containerType: 'inline-size' }} className="mx-auto w-full max-w-[640px]">
      <div
        aria-label="Invoice preview"
        style={{ aspectRatio: '1 / 1.35', padding: '6cqw 7cqw', fontSize: '1.95cqw', lineHeight: 1.45, color: '#1a1a1a', background: '#fff', fontFamily: "'Segoe UI', Arial, sans-serif" }}
        className="flex flex-col overflow-hidden rounded-[4px] shadow-[0_2px_14px_rgba(15,42,74,0.18)]"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            {business.logoUrl && /^data:image\/(png|jpe?g|webp|gif);base64,/.test(business.logoUrl) && (
              <img src={business.logoUrl} alt="" style={{ maxHeight: '11cqw', maxWidth: '34cqw', marginBottom: '1.6cqw' }} />
            )}
            <div style={{ fontWeight: 700, fontSize: '2.3cqw' }}>{business.name}</div>
            <div style={{ color: '#444' }}>
              {lines(business.address ?? '').map((line) => (
                <div key={line}>{line}</div>
              ))}
              {business.contactEmail && <div>{business.contactEmail}</div>}
              {business.website && <div>{business.website}</div>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '5cqw', fontWeight: 300, lineHeight: 1.1 }}>Invoice</div>
            <div style={{ color: '#444' }}># {number || <Placeholder>number</Placeholder>}</div>
            <div style={{ marginTop: '2.6cqw', fontWeight: 600 }}>Balance Due</div>
            <div style={{ fontSize: '2.9cqw', fontWeight: 700 }}>{formatMoney(subtotal, currency)}</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5cqw' }}>
          <div>
            <div style={{ color: '#444' }}>Bill To</div>
            {client ? (
              <>
                <div style={{ fontWeight: 700 }}>{client.name}</div>
                <div style={{ color: '#444' }}>
                  {lines(client.address).map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              </>
            ) : (
              <Placeholder>Choose a client</Placeholder>
            )}
          </div>
          <table style={{ borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ color: '#444', padding: '0.3cqw 0 0.3cqw 3cqw', textAlign: 'right' }}>Invoice Date :</td>
                <td style={{ padding: '0.3cqw 0 0.3cqw 2cqw', textAlign: 'right' }}>{formatDay(issueDate)}</td>
              </tr>
              <tr>
                <td style={{ color: '#444', padding: '0.3cqw 0 0.3cqw 3cqw', textAlign: 'right' }}>Terms :</td>
                <td style={{ padding: '0.3cqw 0 0.3cqw 2cqw', textAlign: 'right' }}>{terms}</td>
              </tr>
              <tr>
                <td style={{ color: '#444', padding: '0.3cqw 0 0.3cqw 3cqw', textAlign: 'right' }}>Due Date :</td>
                <td style={{ padding: '0.3cqw 0 0.3cqw 2cqw', textAlign: 'right' }}>{formatDay(dueDate)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4.2cqw' }}>
          <thead>
            <tr style={{ background: '#2d2d2d', color: '#fff' }}>
              <th style={th}>#</th>
              <th style={th}>Description</th>
              <th style={{ ...th, ...num }}>Qty</th>
              <th style={{ ...th, ...num }}>Rate</th>
              <th style={{ ...th, ...num }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '1.4cqw 1.2cqw' }}>
                  <Placeholder>Add a line</Placeholder>
                </td>
              </tr>
            )}
            {items.map((item, index) => (
              <tr key={index} style={{ borderBottom: '0.15cqw solid #e0e0e0' }}>
                <td style={{ padding: '1.4cqw 1.2cqw' }}>{index + 1}</td>
                <td style={{ padding: '1.4cqw 1.2cqw' }}>{item.description || <Placeholder>Item</Placeholder>}</td>
                <td style={{ padding: '1.4cqw 1.2cqw', ...num }}>{item.quantity}</td>
                <td style={{ padding: '1.4cqw 1.2cqw', ...num }}>{formatMoney(item.rate, currency)}</td>
                <td style={{ padding: '1.4cqw 1.2cqw', ...num }}>{formatMoney(item.amount, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.6cqw' }}>
          <tbody>
            <tr>
              <td style={{ padding: '0.9cqw 1.2cqw', textAlign: 'right' }}>Sub Total</td>
              <td style={{ padding: '0.9cqw 1.2cqw', textAlign: 'right', width: '24cqw' }}>{formatMoney(subtotal, currency)}</td>
            </tr>
            <tr style={{ fontWeight: 700 }}>
              <td style={{ padding: '0.9cqw 1.2cqw', textAlign: 'right', borderTop: '0.15cqw solid #ccc' }}>Total</td>
              <td style={{ padding: '0.9cqw 1.2cqw', textAlign: 'right', borderTop: '0.15cqw solid #ccc' }}>{formatMoney(subtotal, currency)}</td>
            </tr>
            <tr style={{ fontWeight: 700, background: '#f0f0f0' }}>
              <td style={{ padding: '0.9cqw 1.2cqw', textAlign: 'right' }}>Balance Due</td>
              <td style={{ padding: '0.9cqw 1.2cqw', textAlign: 'right' }}>{formatMoney(subtotal, currency)}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: 'auto', paddingTop: '4cqw' }}>
          <div>Thanks for your business.</div>
          {pay.length > 0 && (
            <>
              <div style={{ fontWeight: 700, margin: '2cqw 0 0.6cqw' }}>Payment Details:</div>
              {pay.map((row) => (
                <div key={row.label} style={{ color: '#333' }}>
                  {row.label}: {row.value}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
