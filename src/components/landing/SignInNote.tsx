import { Link } from 'react-router-dom'

// Said next to every Google button on the home page (it is the sign-in page too): what the Drive permission is for, and
// that going on means accepting the legal texts. Both open in a new tab, so a person never loses the page.
export function SignInNote({ centered = false }: { centered?: boolean }) {
  return (
    <p className={`signin-note${centered ? ' centered' : ''}`}>
      Exin Finance keeps your invoice PDFs and receipts in a folder it creates in your own Google Drive, so Google will ask
      for that permission. It is required, and Exin Finance cannot see any other file in your Drive. By continuing you
      agree to the{' '}
      <Link to="/terms" target="_blank" rel="noopener noreferrer">
        Terms of Service
      </Link>{' '}
      and{' '}
      <Link to="/privacy" target="_blank" rel="noopener noreferrer">
        Privacy Policy
      </Link>
      .
    </p>
  )
}
