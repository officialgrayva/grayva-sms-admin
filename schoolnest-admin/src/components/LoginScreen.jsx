
import React, { useState } from 'react'
import { Settings, ArrowRight, Mail } from 'lucide-react'
import { COLORS } from '../theme'
import { apiFetch } from '../api'
import { Button, ErrorBanner, Field, Input } from './ui'

export default function LoginScreen({
  baseUrl,
  onLoggedIn,
  onOpenSettings,
  onGoToRegister,
  onGoToForgotPassword,
  initialSubdomain,
  initialIdentifier,
  verificationNotice,
}) {
  const [subdomain, setSubdomain] = useState(initialSubdomain || '')
  const [identifier, setIdentifier] = useState(initialIdentifier || '')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(verificationNotice || '')
  const [needsVerification, setNeedsVerification] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()

    if (loading) return

    setError('')
    setSuccess('')
    setNeedsVerification(false)
    setLoading(true)

    try {
      const cleanSubdomain = subdomain.trim().toLowerCase() || undefined

      const data = await apiFetch(baseUrl, '/auth/login', {
        method: 'POST',
        body: { identifier: identifier.trim(), password },
        subdomain: cleanSubdomain,
      })

      onLoggedIn(data, cleanSubdomain ?? null)
    } catch (err) {
      setError(err.message || 'Unable to sign in.')

      if (
        err.status === 403 &&
        err.message === 'Please verify your email address before logging in.'
      ) {
        setNeedsVerification(true)
      }
    } finally {
      setLoading(false)
    }
  }

  async function resendVerification() {
    if (resending) return

    const email = identifier.trim()

    if (!email || !email.includes('@')) {
      setError('Enter the email address you used when registering your school.')
      return
    }

    setResending(true)
    setError('')
    setSuccess('')

    try {
      await apiFetch(baseUrl, '/auth/resend-verification', {
        method: 'POST',
        body: { email },
        subdomain: subdomain.trim().toLowerCase() || undefined,
      })

      setSuccess(
        'If your account requires verification, a new verification email has been sent. Please check your inbox.'
      )
      setNeedsVerification(false)
    } catch (err) {
      setError(err.message || 'Unable to resend the verification email.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: COLORS.navyDeep }}
    >
      <button
        onClick={onOpenSettings}
        className="fixed top-5 right-5 p-2 rounded"
        style={{ color: COLORS.textOnNavyMuted }}
        type="button"
        aria-label="Settings"
      >
        <Settings size={18} />
      </button>

      <div className="w-full max-w-sm px-4">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div
            className="w-9 h-9 rounded flex items-center justify-center font-semibold"
            style={{
              backgroundColor: COLORS.navyAccent,
              color: '#fff',
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            SN
          </div>

          <span className="text-white font-semibold text-lg">Schoolnest</span>
        </div>

        <div className="bg-white rounded-lg p-7">
          <h2
            className="text-base font-semibold mb-1"
            style={{ color: COLORS.textPrimary }}
          >
            Sign in
          </h2>

          <p className="text-xs mb-5" style={{ color: COLORS.textSecondary }}>
            Enter your school's subdomain below, or leave it blank if you're
            signing in as a Platform Super Admin.
          </p>

          {success && (
            <div
              className="rounded p-3 text-sm mb-4"
              style={{ backgroundColor: '#E8F5EE', color: COLORS.green }}
              role="status"
            >
              {success}
            </div>
          )}

          <ErrorBanner message={error} />

          {needsVerification && (
            <div
              className="rounded p-3 mb-4"
              style={{
                backgroundColor: '#FBF1E1',
                border: '1px solid #E8D3A9',
              }}
            >
              <p className="text-sm mb-3" style={{ color: COLORS.textPrimary }}>
                Your email address has not been verified yet. Check your inbox
                for the verification link, or request another one.
              </p>

              <Button
                type="button"
                full
                loading={resending}
                onClick={resendVerification}
              >
                <Mail size={15} />
                Resend verification email
              </Button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <Field label="School subdomain (optional for Super Admin)">
              <Input
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                placeholder="e.g. greenfield"
                disabled={loading}
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              />
            </Field>

            <Field label="Email, phone, or Student ID">
              <Input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={loading}
              />
            </Field>

            <Field label="Password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </Field>

            <div className="text-right mb-4 -mt-2">
              <button
                type="button"
                onClick={() => onGoToForgotPassword(subdomain)}
                className="text-xs font-medium"
                style={{ color: COLORS.navyAccent }}
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" full loading={loading}>
              Sign in
            </Button>
          </form>

          <div
            className="text-center mt-5 pt-5"
            style={{ borderTop: `1px solid ${COLORS.border}` }}
          >
            <button
              onClick={onGoToRegister}
              type="button"
              className="text-sm font-medium inline-flex items-center gap-1"
              style={{ color: COLORS.navyAccent }}
            >
              Register a new school <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
