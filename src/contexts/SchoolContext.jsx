import { createContext, useContext, useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { getSchoolSlug, getSchoolConfig } from '../config/schoolRegistry'
import { initFirebaseForSchool, getFirebase } from '../config/firebase'

const SchoolContext = createContext(null)

/**
 * SchoolProvider bootstraps the Firebase project for the current subdomain
 * and provides school-level state to the app.
 *
 * States:
 *  - loading: still figuring out which school and connecting
 *  - main:    on the main marketing/signup domain, no specific school
 *  - notFound: on a subdomain that isn't in the registry
 *  - ready:   Firebase initialized, school doc loaded (or absent if new school)
 */
export function SchoolProvider({ children }) {
  const [status, setStatus] = useState('loading') // loading | main | notFound | ready
  const [slug, setSlug] = useState(null)
  const [school, setSchool] = useState(null) // the /school root doc
  const [error, setError] = useState(null)

  useEffect(() => {
    let unsub = null

    async function boot() {
      try {
        const detectedSlug = getSchoolSlug()

        if (!detectedSlug) {
          setStatus('main')
          return
        }

        const config = await getSchoolConfig(detectedSlug)
        if (!config) {
          setSlug(detectedSlug)
          setStatus('notFound')
          return
        }

        initFirebaseForSchool(detectedSlug, config)
        setSlug(detectedSlug)

        // Subscribe to the root school doc (id: "school")
        const { db } = getFirebase()
        unsub = onSnapshot(
          doc(db, 'school', 'root'),
          snap => {
            setSchool(snap.exists() ? { id: snap.id, ...snap.data() } : null)
            setStatus('ready')
          },
          err => {
            console.error('[SchoolContext] school doc listener error:', err)
            setError(err.message)
            setStatus('ready') // still ready, just no school doc yet
          }
        )
      } catch (err) {
        console.error('[SchoolContext] boot error:', err)
        setError(err.message)
        setStatus('notFound')
      }
    }

    boot()
    return () => { if (unsub) unsub() }
  }, [])

  return (
    <SchoolContext.Provider value={{ status, slug, school, error }}>
      {children}
    </SchoolContext.Provider>
  )
}

export function useSchool() {
  const ctx = useContext(SchoolContext)
  if (!ctx) throw new Error('useSchool must be used within SchoolProvider')
  return ctx
}
