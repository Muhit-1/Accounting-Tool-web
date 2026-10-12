import { Navigate, useParams, useSearchParams } from 'react-router-dom'

// The old /orders address now lands on the Orders tab of the workspace, keeping
// an open order (?open=) so links made earlier still work.
export function OrdersRedirect() {
  const { businessId } = useParams<{ businessId: string }>()
  const [searchParams] = useSearchParams()
  const next = new URLSearchParams({ tab: 'orders' })
  const open = searchParams.get('open')
  if (open) next.set('open', open)
  return <Navigate to={`/businesses/${businessId}/workspace?${next.toString()}`} replace />
}
