
import React, { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from 'lucide-react'
import { COLORS } from '../theme'
import { apiFetch } from '../api'
import { Button } from './ui'

export default function VerifyEmailScreen({ baseUrl, onBackToLogin }) {
  const [status, setStatus] = useState('verifying')
  const [message, setMessage] = useState('Verifying your email address…')

  useEffect(() => {
    let active = true

    async function verify() {
      const token = new URLSearchParams(window.location.search).get('token')

      if (!token) {
        if (active) {
          setStatus('error')
          setMessage('The verification link is invalid or incomplete.')
        }
        return
      }

      try {
        const response = await apiFetch(baseUrl, '/auth/verify-email', {
          method: 'POST',
          body: { token },
        })

        if (!active) return

        setStatus('success')
        setMessage(
          response?.message ||
          'Email verified successfully. You can now log in.'
        )

        // Remove the token from the browser address bar after verification.
        window.history.replaceState({}, document.title, '/verify-email')
      } catch (err) {
        if (!active) return

        setStatus('error')
        setMessage(err.message || 'Unable to verify your email address.')
      }
    }

    verify()

    return () => {
      active = false
    }
  }, [baseUrl])

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: COLORS.navyDeep }}
    >
      <div className="w-full max-w-sm bg-white rounded-lg p-7 text-center">
        <div
          className="w-10 h-10 rounded flex items-center justify-center font-semibold mx-auto mb-5"
          style={{
            backgroundColor: COLORS.navyAccent,
            color: '#fff',
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          SN
        </div>

        {status === 'verifying' && (
          <Loader2
            size={38}
            className="animate-spin mx-auto mb-4"
            style={{ color: COLORS.navyAccent }}
          />
        )}

        {status === 'success' && (
          <CheckCircle2
            size={42}
            className="mx-auto mb-4"
            style={{ color: COLORS.green }}
          />
        )}

        {status === 'error' && (
          <XCircle
            size={42}
            className="mx-auto mb-4"
            style={{ color: COLORS.red }}
          />
        )}

        <h2
          className="text-base font-semibold mb-2"
          style={{ color: COLORS.textPrimary }}
        >
          {status === 'verifying'
            ? 'Verifying your email'
            : status === 'success'
              ? 'Email verified'
              : 'Verification unsuccessful'}
        </h2>

        <p className="text-sm mb-6" style={{ color: COLORS.textSecondary }}>
          {message}
        </p>

        {status !== 'verifying' && (
          <Button full onClick={onBackToLogin}>
            <ArrowLeft size={15} />
            Back to sign in
          </Button>
        )}
      </div>
    </div>
  )
}
