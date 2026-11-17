
// ============================================================
// [SCHOOL ADMIN PORTAL] — Staff Management
// Create, view, update, deactivate/reactivate staff accounts,
// reset passwords. Teaching staff can be assigned in
// Academic Setup > Subjects.
// ============================================================

import React, { useState, useEffect } from 'react'
import {
  Plus,
  Users,
  Key,
  UserX,
  UserCheck,
  Search,
  Copy,
  Check,
} from 'lucide-react'

import { COLORS, formatDate } from '../../theme'
import { apiFetch } from '../../api'
import {
  Button,
  Badge,
  Spinner,
  ErrorBanner,
  Field,
  Input,
  Select,
  EmptyState,
} from '../../components/ui'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import InfiniteScrollSentinel from '../../components/InfiniteScrollSentinel'
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll'

// Staff role labels
const ROLE_LABELS = {
  teacher: 'Teacher',
  classroom_teacher: 'Classroom Teacher',
  subject_teacher: 'Subject Teacher',
  class_teacher: 'Class Teacher',
  accountant: 'Accountant',
  account_officer: 'Account Officer',
  head_teacher: 'Head Teacher',
  deputy_head_teacher: 'Deputy Head Teacher',
  departmental_head: 'Departmental Head',
  principal: 'Principal',
  vp_academic: 'Vice Principal (Academic)',
  vp_administration: 'Vice Principal (Administration)',
  class_manager: 'Class Manager',
  school_admin: 'School Admin',
}

export default function StaffList({ baseUrl, token, subdomain }) {
  const opts = { token, subdomain }

  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newCredentials, setNewCredentials] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)

  // Load staff accounts
  async function load() {
    setLoading(true)
    setError('')

    try {
      const data = await apiFetch(baseUrl, '/staff', opts)
      setStaff(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [baseUrl, token, subdomain])

  // Handle confirmed deactivate/reactivate/reset actions
  async function runConfirmed() {
    if (!confirmAction) return

    const { type, staff: selectedStaff } = confirmAction

    setConfirmAction(null)
    setBusyId(selectedStaff.id)

    try {
      if (type === 'toggle') {
        await apiFetch(
          baseUrl,
          `/staff/${selectedStaff.id}/${selectedStaff.isActive ? 'deactivate' : 'reactivate'}`,
          { ...opts, method: 'PATCH' }
        )

        await load()
      } else {
        const data = await apiFetch(
          baseUrl,
          `/staff/${selectedStaff.id}/reset-password`,
          { ...opts, method: 'POST' }
        )

        setNewCredentials({
          fullName: selectedStaff.fullName,
          email: selectedStaff.email,
          tempPassword: data.tempPassword,
        })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  // Search staff
  const filtered = staff.filter((s) => {
    const name = (s.fullName || '').toLowerCase()
    const email = (s.email || '').toLowerCase()
    const query = search.toLowerCase()

    return name.includes(query) || email.includes(query)
  })

  const {
    visibleItems: visibleStaff,
    hasMore,
    sentinelRef,
  } = useInfiniteScroll(filtered, 15)

  if (loading) {
    return <Spinner label="Loading staff…" />
  }

  return (
    <div>
      <ErrorBanner message={error} />

      {/* Search and create staff */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: COLORS.textSecondary }}
          />

          <Input
            placeholder="Search staff…"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Button onClick={() => setShowCreate(true)}>
          <Plus size={15} />
          New Staff
        </Button>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <EmptyState
          icon={Users}
          title="No staff found"
          sub={
            search
              ? 'Try another search term.'
              : 'Add your first staff member.'
          }
        />
      )}

      {/* Staff table */}
      {filtered.length > 0 && (
        <div
          className="bg-white rounded overflow-hidden"
          style={{ border: `1px solid ${COLORS.border}` }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{
                  backgroundColor: COLORS.surface,
                  borderBottom: `1px solid ${COLORS.border}`,
                }}
              >
                {['Name', 'Email', 'Role', 'Status', 'Last login', ''].map(
                  (heading) => (
                    <th
                      key={heading}
                      className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wide"
                      style={{ color: COLORS.textSecondary }}
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {visibleStaff.map((s) => (
                <tr
                  key={s.id}
                  style={{ borderBottom: `1px solid ${COLORS.border}` }}
                >
                  <td
                    className="px-4 py-3 font-medium"
                    style={{ color: COLORS.textPrimary }}
                  >
                    {s.fullName}
                  </td>

                  <td
                    className="px-4 py-3"
                    style={{ color: COLORS.textSecondary }}
                  >
                    {s.email}
                  </td>

                  <td className="px-4 py-3">
                    <Badge tone="neutral">
                      {ROLE_LABELS[s.role] || s.role}
                    </Badge>
                  </td>

                  <td className="px-4 py-3">
                    {s.isActive ? (
                      <Badge tone="green">Active</Badge>
                    ) : (
                      <Badge tone="red">Inactive</Badge>
                    )}
                  </td>

                  <td
                    className="px-4 py-3 text-xs"
                    style={{ color: COLORS.textSecondary }}
                  >
                    {s.lastLoginAt ? formatDate(s.lastLoginAt) : 'Never'}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {/* Reset password */}
                      <button
                        onClick={() =>
                          setConfirmAction({ type: 'reset', staff: s })
                        }
                        disabled={busyId === s.id}
                        className="p-1.5 rounded hover:bg-gray-100"
                        title="Reset password"
                      >
                        <Key
                          size={14}
                          style={{ color: COLORS.textSecondary }}
                        />
                      </button>

                      {/* Deactivate/reactivate */}
                      <button
                        onClick={() =>
                          setConfirmAction({ type: 'toggle', staff: s })
                        }
                        disabled={busyId === s.id}
                        className="p-1.5 rounded hover:bg-gray-100"
                        title={s.isActive ? 'Deactivate' : 'Reactivate'}
                      >
                        {s.isActive ? (
                          <UserX
                            size={14}
                            style={{ color: COLORS.red }}
                          />
                        ) : (
                          <UserCheck
                            size={14}
                            style={{ color: COLORS.green }}
                          />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <InfiniteScrollSentinel
            sentinelRef={sentinelRef}
            hasMore={hasMore}
          />
        </div>
      )}

      {/* Create staff modal */}
      {showCreate && (
        <CreateStaffModal
          baseUrl={baseUrl}
          opts={opts}
          onClose={() => setShowCreate(false)}
          onSaved={load}
          onCreated={setNewCredentials}
        />
      )}

      {/* Credentials modal */}
      {newCredentials && (
        <CredentialsModal
          credentials={newCredentials}
          onClose={() => setNewCredentials(null)}
        />
      )}

      {/* Confirmation modal */}
      {confirmAction && (
        <ConfirmModal
          title={
            confirmAction.type === 'toggle'
              ? confirmAction.staff.isActive
                ? 'Deactivate staff'
                : 'Reactivate staff'
              : 'Reset password'
          }
          message={
            confirmAction.type === 'toggle'
              ? `${confirmAction.staff.isActive ? 'Deactivate' : 'Reactivate'} ${confirmAction.staff.fullName}'s account?`
              : `Generate a new temporary password for ${confirmAction.staff.fullName}?`
          }
          confirmLabel={
            confirmAction.type === 'toggle'
              ? confirmAction.staff.isActive
                ? 'Deactivate'
                : 'Reactivate'
              : 'Reset password'
          }
          tone={
            confirmAction.type === 'toggle' &&
            confirmAction.staff.isActive
              ? 'red'
              : 'navy'
          }
          onCancel={() => setConfirmAction(null)}
          onConfirm={runConfirmed}
        />
      )}
    </div>
  )
}

// ============================================================
// CREATE STAFF MODAL
// ============================================================

function CreateStaffModal({
  baseUrl,
  opts,
  onClose,
  onSaved,
  onCreated,
}) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('classroom_teacher')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()

    setLoading(true)
    setError('')

    try {
      const data = await apiFetch(baseUrl, '/staff', {
        ...opts,
        method: 'POST',
        body: {
          fullName,
          email,
          phone,
          role,
        },
      })

      await onSaved()
      onClose()

      onCreated({
        fullName,
        email,
        tempPassword: data.tempPassword,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="New staff account" onClose={onClose}>
      <ErrorBanner message={error} />

      <form onSubmit={submit}>
        <Field label="Full name">
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </Field>

        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>

        <Field label="Phone">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </Field>

        <Field label="Role">
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="classroom_teacher">
              Classroom Teacher
            </option>

            <option value="subject_teacher">
              Subject Teacher
            </option>

            <option value="head_teacher">
              Head Teacher
            </option>

            <option value="deputy_head_teacher">
              Deputy Head Teacher
            </option>

            <option value="departmental_head">
              Departmental Head
            </option>

            <option value="account_officer">
              Account Officer
            </option>

            <option value="principal">
              Principal
            </option>

            <option value="vp_academic">
              Vice Principal (Academic)
            </option>

            <option value="vp_administration">
              Vice Principal (Administration)
            </option>

            <option value="class_manager">
              Class Manager
            </option>

            <option value="accountant">
              Accountant
            </option>
          </Select>
        </Field>

        <Button type="submit" full loading={loading}>
          Create account
        </Button>
      </form>
    </Modal>
  )
}

// ============================================================
// CREDENTIALS MODAL
// ============================================================

function CredentialsModal({ credentials, onClose }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(
      `Email: ${credentials.email}\nTemporary password: ${credentials.tempPassword}`
    )

    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal title="Account created" onClose={onClose}>
      <p
        className="text-sm mb-4"
        style={{ color: COLORS.textSecondary }}
      >
        We've also emailed these credentials to{' '}
        <strong style={{ color: COLORS.textPrimary }}>
          {credentials.email}
        </strong>
        . Share this copy as a backup.
      </p>

      <div
        className="rounded p-4 mb-4"
        style={{
          backgroundColor: COLORS.surface,
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        <div
          className="text-xs mb-1"
          style={{ color: COLORS.textSecondary }}
        >
          Email
        </div>

        <div
          className="text-sm mb-3"
          style={{ color: COLORS.textPrimary }}
        >
          {credentials.email}
        </div>

        <div
          className="text-xs mb-1"
          style={{ color: COLORS.textSecondary }}
        >
          Temporary password
        </div>

        <div
          className="text-sm font-semibold"
          style={{ color: COLORS.textPrimary }}
        >
          {credentials.tempPassword}
        </div>
      </div>

      <Button full onClick={copy}>
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? 'Copied' : 'Copy credentials'}
      </Button>
    </Modal>
  )
}
