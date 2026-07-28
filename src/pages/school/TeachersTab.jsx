/**
 * TeachersTab
 * -----------
 * Wraps your existing TeachersPage as a tab inside the School section.
 * Your TeachersPage already handles teacher CRUD; we just re-mount it here.
 */
import TeachersPage from '../teachers/TeachersPage'

export default function TeachersTab() {
  return <TeachersPage embedded />
}
