import { Link } from 'react-router-dom'

// Said next to every Google button on the public pages, as on the sign-in page:
// what the Drive permission is for, and that going on means accepting the legal texts.
export function SignInNote({ centered = false }: { centered?: boolean }) {
  return (
    <p className={`signin-note${centered ? ' centered' : ''}`}>
      Google will ask for access to a folder that Exin Finance creates in your own Drive. By continuing you agree to the{' '}
      <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>.
    </p>
  )
}
