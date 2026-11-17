
import React, { useState, useEffect } from 'react'
import { Plus, BookOpen, Trash2, Loader2 } from 'lucide-react'
import { COLORS } from '../../theme'
import { apiFetch } from '../../api'
import {
  Button,
  Spinner,
  ErrorBanner,
  Field,
  Input,
  Select,
  EmptyState,
} from '../../components/ui'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'

const ALL = '__ALL__'

export default function Subjects({ baseUrl, token, subdomain }) {
  const opts = { token, subdomain }

  const [subjects, setSubjects] = useState([])
  const [classes, setClasses] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showSubjectModal, setShowSubjectModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(null)
  const [confirmRemove, setConfirmRemove] = useState(null)
  const [removingId, setRemovingId] = useState(null)

  async function load(showLoader = true) {
    if (showLoader) setLoading(true)
    setError('')

    try {
      const [subjectsData, classesData, staffData] = await Promise.all([
        apiFetch(baseUrl, '/subjects', opts),
        apiFetch(baseUrl, '/classes', opts),
        apiFetch(baseUrl, '/staff', opts),
      ])

      setSubjects(subjectsData)
      setClasses(classesData)

      // Include legacy and current teaching roles.
      setStaff(
        staffData.filter((s) =>
          ['teacher', 'classroom_teacher', 'subject_teacher'].includes(s.role)
        )
      )
    } catch (err) {
      setError(err.message || 'Unable to load subjects.')
    } finally {
      if (showLoader) setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [baseUrl, token, subdomain])

  async function confirmRemoveNow() {
    const id = confirmRemove
    if (!id || removingId) return

    setRemovingId(id)
    setError('')

    try {
      await apiFetch(baseUrl, `/subject-mappings/${id}`, {
        ...opts,
        method: 'DELETE',
      })

      setConfirmRemove(null)
      await load(false)
    } catch (err) {
      setError(err.message || 'Unable to remove this subject assignment.')
    } finally {
      setRemovingId(null)
    }
  }

  function openNextSubject(currentSubject) {
    const currentIndex = subjects.findIndex(
      (subject) => subject.id === currentSubject.id
    )

    const nextSubject = subjects[currentIndex + 1]

    if (nextSubject) {
      setShowAssignModal(nextSubject)
    } else {
      setShowAssignModal(null)
    }
  }

  if (loading) return <Spinner label="Loading subjects…" />

  return (
    <div>
      <ErrorBanner message={error} />

      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowSubjectModal(true)}>
          <Plus size={15} /> New Subject
        </Button>
      </div>

      {subjects.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="No subjects yet"
          sub="Add your first subject, e.g. Mathematics."
        />
      )}

      <div className="space-y-3">
        {subjects.map((s) => (
          <div
            key={s.id}
            className="bg-white rounded"
            style={{ border: `1px solid ${COLORS.border}` }}
          >
            <div
              className="px-5 py-3.5 flex items-center justify-between"
              style={{ borderBottom: `1px solid ${COLORS.border}` }}
            >
              <span
                className="text-sm font-semibold"
                style={{ color: COLORS.textPrimary }}
              >
                {s.name}
              </span>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAssignModal(s)}
              >
                <Plus size={13} /> Assign to class
              </Button>
            </div>

            <div className="p-4">
              {(!s.subjectMappings || s.subjectMappings.length === 0) && (
                <span
                  className="text-xs"
                  style={{ color: COLORS.textSecondary }}
                >
                  Not assigned to any class yet.
                </span>
              )}

              <div className="flex flex-wrap gap-2">
                {s.subjectMappings?.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded text-xs"
                    style={{ backgroundColor: COLORS.surface }}
                  >
                    <span style={{ color: COLORS.textPrimary }}>
                      {m.class?.name || 'Unknown class'}{' '}
                      {m.arm?.name || '(All arms)'}
                    </span>

                    <span style={{ color: COLORS.textSecondary }}>
                      · {m.teacher?.fullName || 'No teacher'}
                    </span>

                    <button
                      type="button"
                      disabled={removingId === m.id}
                      onClick={() => setConfirmRemove(m.id)}
                      className="disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Remove assignment"
                    >
                      {removingId === m.id ? (
                        <Loader2
                          size={12}
                          className="animate-spin"
                          style={{ color: COLORS.red }}
                        />
                      ) : (
                        <Trash2 size={12} style={{ color: COLORS.red }} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showSubjectModal && (
        <SubjectModal
          baseUrl={baseUrl}
          opts={opts}
          onClose={() => setShowSubjectModal(false)}
          onSaved={() => load(false)}
        />
      )}

      {showAssignModal && (
        <AssignModal
          key={showAssignModal.id}
          baseUrl={baseUrl}
          opts={opts}
          subject={showAssignModal}
          classes={classes}
          staff={staff}
          onClose={() => setShowAssignModal(null)}
          onSaved={() => load(false)}
          onAssignAnother={() => openNextSubject(showAssignModal)}
        />
      )}

      {confirmRemove && (
        <ConfirmModal
          title="Remove subject from class"
          message="Teachers will lose access to enter scores for this subject in this class."
          confirmLabel="Remove"
          tone="red"
          onCancel={() => {
            if (!removingId) setConfirmRemove(null)
          }}
          onConfirm={confirmRemoveNow}
        />
      )}
    </div>
  )
}

// ============================================================
// CREATE SUBJECT
// ============================================================

function SubjectModal({ baseUrl, opts, onClose, onSaved }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (loading) return

    setLoading(true)
    setError('')

    try {
      await apiFetch(baseUrl, '/subjects', {
        ...opts,
        method: 'POST',
        body: { name: name.trim() },
      })

      await onSaved()
      onClose()
    } catch (err) {
      setError(err.message || 'Unable to create subject.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title="New subject"
      onClose={() => {
        if (!loading) onClose()
      }}
    >
      <ErrorBanner message={error} />

      <form onSubmit={submit}>
        <Field label="Subject name">
          <Input
            placeholder="e.g. Mathematics"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
          />
        </Field>

        <Button type="submit" full loading={loading} disabled={!name.trim()}>
          Create subject
        </Button>
      </form>
    </Modal>
  )
}

// ============================================================
// BUILD ASSIGNMENT PAIRS
//
// armId is nullable in the backend.
//
// - All classes: one class-wide mapping per class.
// - Class without arms: one class-wide mapping.
// - All arms: one class-wide mapping.
// - Specific arm: one arm-specific mapping.
// ============================================================

function resolvePairs(classId, armId, classes) {
  // Assign the subject to every class.
  // Each class receives one class-wide mapping.
  if (classId === ALL) {
    return classes.map((cls) => ({
      classId: cls.id,
      armId: null,
    }))
  }

  const selectedClass = classes.find((cls) => cls.id === classId)

  if (!selectedClass) return []

  // Assign to the entire class.
  // This also handles classes that have no arms.
  if (armId === ALL || !armId) {
    return [
      {
        classId: selectedClass.id,
        armId: null,
      },
    ]
  }

  // Assign to one specific arm.
  const selectedArm = (selectedClass.arms || []).find(
    (arm) => arm.id === armId
  )

  if (!selectedArm) return []

  return [
    {
      classId: selectedClass.id,
      armId: selectedArm.id,
    },
  ]
}

function isDuplicateAssignment(err) {
  const message = (err?.message || '').toLowerCase()

  return (
    message.includes('already mapped') ||
    message.includes('already assigned') ||
    message.includes('duplicate') ||
    message.includes('409')
  )
}

// ============================================================
// ASSIGN SUBJECT
// ============================================================

function AssignModal({
  baseUrl,
  opts,
  subject,
  classes,
  staff,
  onClose,
  onSaved,
  onAssignAnother,
}) {
  const [classId, setClassId] = useState('')
  const [armId, setArmId] = useState(ALL)
  const [teacherId, setTeacherId] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const selectedClass = classes.find((cls) => cls.id === classId)

  async function submit(e) {
    e.preventDefault()

    if (loading) return

    setError('')
    setResult(null)

    const pairs = resolvePairs(classId, armId, classes)

    if (pairs.length === 0) {
      setError(
        classId === ALL
          ? 'No classes are available for subject assignment.'
          : 'Please select a valid class or arm.'
      )
      return
    }

    if (!teacherId) {
      setError('Please select a teacher.')
      return
    }

    setLoading(true)
    setProgress({ current: 0, total: pairs.length })

    let assigned = 0
    let skipped = 0
    const failures = []

    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i]

      setProgress({
        current: i + 1,
        total: pairs.length,
      })

      try {
        await apiFetch(baseUrl, `/subjects/${subject.id}/assign`, {
          ...opts,
          method: 'POST',
          body: {
            classId: pair.classId,
            armId: pair.armId,
            teacherId,
          },
        })

        assigned++
      } catch (err) {
        if (isDuplicateAssignment(err)) {
          skipped++
        } else {
          failures.push({
            classId: pair.classId,
            armId: pair.armId,
            message: err.message || 'Unknown assignment error',
          })
        }
      }
    }

    await onSaved()

    setResult({
      assigned,
      skipped,
      failures,
      total: pairs.length,
    })

    setLoading(false)
  }

  const closeModal = () => {
    if (!loading) onClose()
  }

  if (result) {
    return (
      <Modal title="Assignment complete" onClose={onClose}>
        <div className="space-y-3 mb-5">
          <p className="text-sm" style={{ color: COLORS.textPrimary }}>
            Assignment results for <strong>{subject.name}</strong>
          </p>

          <div
            className="rounded p-3 text-sm"
            style={{ backgroundColor: '#E8F5EE', color: COLORS.green }}
          >
            Successfully assigned: <strong>{result.assigned}</strong>
          </div>

          {result.skipped > 0 && (
            <div
              className="rounded p-3 text-sm"
              style={{ backgroundColor: '#FBF1E1', color: COLORS.amber }}
            >
              Already assigned: <strong>{result.skipped}</strong>
            </div>
          )}

          {result.failures.length > 0 && (
            <div
              className="rounded p-3 text-sm"
              style={{
                backgroundColor: '#FBEAEA',
                color: COLORS.red,
              }}
            >
              <p className="font-semibold mb-2">
                Failed assignments: {result.failures.length}
              </p>

              {result.failures.map((failure, index) => {
                const cls = classes.find(
                  (item) => item.id === failure.classId
                )

                const arm = failure.armId
                  ? cls?.arms?.find((item) => item.id === failure.armId)
                  : null

                return (
                  <p key={index} className="text-xs mb-1">
                    {cls?.name || 'Unknown class'}{' '}
                    {failure.armId
                      ? `(${arm?.name || 'Unknown arm'})`
                      : '(Entire class)'}
                    : {failure.message}
                  </p>
                )
              })}
            </div>
          )}

          <p className="text-xs" style={{ color: COLORS.textSecondary }}>
            Processed {result.total} class assignment
            {result.total !== 1 ? 's' : ''}.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button full onClick={onAssignAnother}>
            <Plus size={15} /> Assign another subject
          </Button>

          <Button variant="ghost" full onClick={onClose}>
            Done
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title={`Assign ${subject.name}`} onClose={closeModal}>
      <p className="text-xs mb-4" style={{ color: COLORS.textSecondary }}>
        Select the class, arm and teacher for{' '}
        <strong style={{ color: COLORS.textPrimary }}>
          {subject.name}
        </strong>.
      </p>

      <ErrorBanner message={error} />

      <form onSubmit={submit}>
        <Field label="Class">
          <Select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value)
              setArmId(ALL)
              setError('')
            }}
            required
            disabled={loading}
          >
            <option value="">Select a class…</option>
            <option value={ALL}>All classes</option>

            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </Select>
        </Field>

        {classId && classId !== ALL && (
          <Field label="Arm">
            <Select
              value={armId}
              onChange={(e) => {
                setArmId(e.target.value)
                setError('')
              }}
              disabled={loading}
            >
              <option value={ALL}>Entire class (all arms)</option>

              {(selectedClass?.arms || []).map((arm) => (
                <option key={arm.id} value={arm.id}>
                  {arm.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {classId === ALL && (
          <p
            className="text-xs mb-4 rounded p-3"
            style={{
              backgroundColor: COLORS.surface,
              color: COLORS.textSecondary,
            }}
          >
            This will create one class-wide assignment for every available
            class, including classes without arms.
          </p>
        )}

        <Field label="Teacher">
          <Select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            required
            disabled={loading}
          >
            <option value="">Select a teacher…</option>

            {staff.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.fullName}
              </option>
            ))}
          </Select>
        </Field>

        {loading && (
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-2">
              <span style={{ color: COLORS.textSecondary }}>
                Assigning subject…
              </span>

              <span style={{ color: COLORS.textPrimary }}>
                {progress.current} / {progress.total}
              </span>
            </div>

            <div
              className="h-2 rounded overflow-hidden"
              style={{ backgroundColor: COLORS.surface }}
            >
              <div
                className="h-full rounded transition-all duration-200"
                style={{
                  width: `${
                    progress.total
                      ? (progress.current / progress.total) * 100
                      : 0
                  }%`,
                  backgroundColor: COLORS.green,
                }}
              />
            </div>
          </div>
        )}

        <Button
          type="submit"
          full
          loading={loading}
          disabled={loading || !classId || !teacherId}
        >
          {loading ? 'Assigning…' : 'Assign subject'}
        </Button>
      </form>
    </Modal>
  )
}
