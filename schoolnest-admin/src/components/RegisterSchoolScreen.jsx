
import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Check, X as XIcon, Gift } from 'lucide-react'
import { COLORS } from '../theme'
import { apiFetch } from '../api'
import { Button, ErrorBanner, Field, Input } from './ui'

export default function RegisterSchoolScreen({
  baseUrl,
  onBack,
  onRegistered,
}) {
  const [form, setForm] = useState({
    name: '',
    schoolType: '',
    email: '',
    phone: '',
    address: '',
    subdomain: '',
    adminFullName: '',
    adminPassword: '',
    referralCode: '',
  })

  const [availability, setAvailability] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = useRef(null)

  function set(key, value) {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  useEffect(() => {
    const clean = form.subdomain.trim().toLowerCase()

    if (clean.length < 3) {
      setAvailability(null)
      setSuggestions([])
      return
    }

    setAvailability('checking')
    clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await apiFetch(
          baseUrl,
          `/schools/check-subdomain?name=${encodeURIComponent(clean)}`
        )

        if (res.available) {
          setAvailability('available')
          setSuggestions([])
        } else {
          setAvailability('taken')

          const suggestionResponse = await apiFetch(
            baseUrl,
            `/schools/suggest-subdomains?name=${encodeURIComponent(clean)}`
          )

          setSuggestions(suggestionResponse.suggestions || [])
        }
      } catch {
        setAvailability(null)
      }
    }, 400)

    return () => clearTimeout(debounceRef.current)
  }, [form.subdomain, baseUrl])

  async function submit(e) {
    e.preventDefault()

    if (loading) return

    if (!form.schoolType) {
      setError('Please select your school type.')
      return
    }

    if (availability !== 'available') {
      setError(
        availability === 'taken'
          ? 'Choose an available subdomain before continuing.'
          : 'Please wait while we check your school subdomain.'
      )
      return
    }

    setLoading(true)
    setError('')

    try {
      const body = {
        ...form,
        name: form.name.trim(),
        schoolType: form.schoolType,
        email: form.email.trim().toLowerCase(),
        subdomain: form.subdomain.trim().toLowerCase(),
        adminFullName: form.adminFullName.trim(),
      }

      if (!body.referralCode.trim()) {
        delete body.referralCode
      } else {
        body.referralCode = body.referralCode.trim()
      }

      const response = await apiFetch(baseUrl, '/schools/register', {
        method: 'POST',
        body,
      })

      onRegistered({
        subdomain: body.subdomain,
        identifier: body.email,
        verificationEmailQueued:
          response?.verificationEmailQueued === true,
      })
    } catch (err) {
      setError(err.message || 'Unable to register your school.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center py-10"
      style={{ backgroundColor: COLORS.navyDeep }}
    >
      <div className="w-full max-w-md px-4">
        <button
          onClick={onBack}
          type="button"
          disabled={loading}
          className="flex items-center gap-1.5 text-sm mb-4 disabled:opacity-50"
          style={{ color: COLORS.textOnNavyMuted }}
        >
          <ArrowLeft size={15} /> Back to sign in
        </button>

        <div className="bg-white rounded-lg p-7">
          <h2
            className="text-base font-semibold mb-1"
            style={{ color: COLORS.textPrimary }}
          >
            Register your school
          </h2>

          <p className="text-xs mb-5" style={{ color: COLORS.textSecondary }}>
            Creates your school and your own School Admin account, with a
            30-day free trial — no card required.
          </p>

          <ErrorBanner message={error} />

          <form onSubmit={submit}>
            <Field label="School name">
              <Input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                required
                disabled={loading}
              />
            </Field>

            <Field label="School type">
              <select
                value={form.schoolType}
                onChange={(e) => set('schoolType', e.target.value)}
                required
                disabled={loading}
                className="w-full rounded-md border px-3 py-2 text-sm outline-none"
                style={{
                  borderColor: COLORS.border,
                  color: COLORS.textPrimary,
                  backgroundColor: '#FFFFFF',
                }}
              >
                <option value="">Select school type</option>
                <option value="primary">Primary school</option>
                <option value="secondary">Secondary school</option>
                <option value="both">Both primary and secondary</option>
              </select>
            </Field>

            <Field label="School subdomain">
              <div className="relative">
                <Input
                  value={form.subdomain}
                  onChange={(e) =>
                    set(
                      'subdomain',
                      e.target.value
                        .replace(/[^a-z0-9-]/gi, '')
                        .toLowerCase()
                    )
                  }
                  placeholder="e.g. greenfield"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  required
                  disabled={loading}
                />

                {availability === 'checking' && (
                  <span
                    className="text-xs absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: COLORS.textSecondary }}
                  >
                    checking…
                  </span>
                )}

                {availability === 'available' && (
                  <Check
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: COLORS.green }}
                  />
                )}

                {availability === 'taken' && (
                  <XIcon
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: COLORS.red }}
                  />
                )}
              </div>

              {availability === 'taken' && suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      disabled={loading}
                      onClick={() => set('subdomain', suggestion)}
                      className="text-xs px-2 py-1 rounded"
                      style={{
                        backgroundColor: COLORS.surface,
                        color: COLORS.navyAccent,
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </Field>

            <Field label="School email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                required
                disabled={loading}
              />
            </Field>

            <Field label="School phone">
              <Input
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                required
                disabled={loading}
              />
            </Field>

            <Field label="Address">
              <Input
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                required
                disabled={loading}
              />
            </Field>

            <div
              className="pt-3 mt-1"
              style={{ borderTop: `1px solid ${COLORS.border}` }}
            >
              <p
                className="text-xs font-medium mb-3"
                style={{ color: COLORS.textSecondary }}
              >
                Your admin account
              </p>

              <Field label="Your full name">
                <Input
                  value={form.adminFullName}
                  onChange={(e) => set('adminFullName', e.target.value)}
                  required
                  disabled={loading}
                />
              </Field>

              <Field label="Choose a password">
                <Input
                  type="password"
                  value={form.adminPassword}
                  onChange={(e) => set('adminPassword', e.target.value)}
                  minLength={8}
                  required
                  disabled={loading}
                />
              </Field>
            </div>

            <div
              className="pt-3 mt-1"
              style={{ borderTop: `1px solid ${COLORS.border}` }}
            >
              <Field
                label={
                  <span className="flex items-center gap-1.5">
                    <Gift size={13} /> Referral code (optional)
                  </span>
                }
              >
                <Input
                  value={form.referralCode}
                  onChange={(e) => set('referralCode', e.target.value)}
                  placeholder="Have a code from another school?"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  disabled={loading}
                />
              </Field>
            </div>

            <Button
              type="submit"
              full
              loading={loading}
              disabled={loading || availability !== 'available'}
            >
              Create my school
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
