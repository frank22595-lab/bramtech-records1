import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { onSnapshot, doc } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { getFirebase } from '../../config/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { Clock, LogOut, RefreshCw, Check } from 'lucide-react'

/**
 * Waiting-for-approval screen.
 * Route: /staff-pending
 *
 * Shown when a signed-in user has status='pending'. Listens to their user
 * doc — the moment the director approves them, they get bounced to the
 * dashboard automatically.
 */
export default function StaffPendingPage() {
  const { user, profile } = useAuth()
  const { db, auth } = getFirebase()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(false)
  const [liveProfile, setLiveProfile] = useState(profile)

  useEffect(() => {
    if (!user?.uid) return
    // Listen for status changes on the user's own doc
    const unsub = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data()
          setLiveProfile(data)
          if (data.status === 'active') {
            // Director approved! Redirect to dashboard
            navigate(`/dashboard${window.location.search}`, { replace: true })
          }
        }
      },
      (err) => console.warn('[StaffPending] listener error:', err),
    )
    return () => unsub()
  }, [user?.uid, db, navigate])

  const currentProfile = liveProfile || profile

  const refresh = async () => {
    setChecking(true)
    setTimeout(() => setChecking(false), 1000)
  }

  const logout = async () => {
    try {
      await signOut(auth)
      navigate(`/login${window.location.search}`, { replace: true })
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-semibold text-slate-900">Account pending</span>
          <button
            onClick={logout}
            className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>

            <h1 className="text-2xl font-semibold text-slate-900 mb-2">
              Waiting for approval
            </h1>
            <p className="text-slate-600 mb-6">
              Your account has been created. Your director needs to approve it before you can log in.
            </p>

            <div className="bg-slate-50 rounded-lg p-4 text-left text-sm space-y-2 mb-6">
              {currentProfile?.fullName && (
                <Row label="Name" value={currentProfile.fullName} />
              )}
              {currentProfile?.email && (
                <Row label="Email" value={currentProfile.email} />
              )}
              {currentProfile?.phone && (
                <Row label="Phone" value={currentProfile.phone} />
              )}
              {currentProfile?.proposedSubjects?.length > 0 && (
                <Row
                  label="Subjects requested"
                  value={`${currentProfile.proposedSubjects.length} selected`}
                />
              )}
              {currentProfile?.signupNote && (
                <Row label="Your note" value={currentProfile.signupNote} />
              )}
            </div>

            <button
              onClick={refresh}
              disabled={checking}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {checking ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Checking…
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" /> Check status
                </>
              )}
            </button>

            <p className="text-xs text-slate-500 mt-4">
              We check automatically. When approved, you'll be redirected here without needing to refresh.
            </p>
          </div>

          <div className="mt-4 text-center text-sm text-slate-500">
            Contact the director if approval takes too long.
          </div>
        </div>
      </main>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-900 font-medium text-right truncate">{value}</span>
    </div>
  )
}
