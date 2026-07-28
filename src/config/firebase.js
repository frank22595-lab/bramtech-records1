import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

let currentApp = null
let currentAuth = null
let currentDb = null
let currentStorage = null
let currentSchoolSlug = null
let currentConfig = null

export function initFirebaseForSchool(slug, config) {
  if (currentSchoolSlug === slug && currentApp) {
    return { app: currentApp, auth: currentAuth, db: currentDb, storage: currentStorage }
  }

  const appName = `school-${slug}`
  const existing = getApps().find(a => a.name === appName)
  currentApp = existing || initializeApp(config, appName)
  currentAuth = getAuth(currentApp)
  currentDb = getFirestore(currentApp)
  currentStorage = getStorage(currentApp)
  currentSchoolSlug = slug
  currentConfig = config

  return { app: currentApp, auth: currentAuth, db: currentDb, storage: currentStorage }
}

export function getFirebase() {
  if (!currentApp) {
    throw new Error('Firebase not initialized. Call initFirebaseForSchool first.')
  }
  return { app: currentApp, auth: currentAuth, db: currentDb, storage: currentStorage }
}

// Return the raw config for the current school. Used when we need to
// initialize a secondary Firebase app (e.g. to create a new user without
// logging the current user out).
export function getFirebaseConfig() {
  if (!currentConfig) {
    throw new Error('Firebase config not available')
  }
  return currentConfig
}

export function isFirebaseReady() {
  return currentApp !== null
}

export function currentSchool() {
  return currentSchoolSlug
}
