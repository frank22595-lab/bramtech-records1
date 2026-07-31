import { useAuth } from "../contexts/AuthContext";

/**
 * Central permission accessor for the app.
 *
 * Use in components:
 *   const { isDirector, isTeacher, has, canAccessClass } = usePermissions()
 *   if (isDirector) { ... }
 *   if (has('generateAccessCodes')) { ... }
 *   if (canAccessClass('class_1')) { ... }
 *
 * Role hierarchy:
 *   director > admin > teacher
 *
 * Directors and admins can access everything. Teachers are gated by their
 * `assignedClasses`, `assignedSubjects`, and `permissions` map.
 */
export function usePermissions() {
  const { profile } = useAuth();

  const role = profile?.role || null;
  const isDirector = role === "director";
  const isAdmin = role === "admin";
  const isTeacher = role === "teacher";
  const isAdminOrDirector = isDirector || isAdmin;
  const isAuthenticated = !!profile;

  const assignedClasses = Array.isArray(profile?.assignedClasses)
    ? profile.assignedClasses
    : [];
  const assignedSubjects = Array.isArray(profile?.assignedSubjects)
    ? profile.assignedSubjects
    : [];
  const classTeacherOf = profile?.classTeacherOf || null;
  const permissions = profile?.permissions || {};

  /**
   * Check an optional permission toggle (director-controlled).
   * Directors and admins always return true.
   */
  const has = (permissionKey) => {
    if (isAdminOrDirector) return true;
    return !!permissions[permissionKey];
  };

  /**
   * Can this user access the given class?
   * Directors and admins: yes, any class.
   * Teachers: only classes in their assignedClasses (or if they're class teacher).
   */
  const canAccessClass = (classId) => {
    if (!classId) return false;
    if (isAdminOrDirector) return true;
    if (classTeacherOf === classId) return true;
    return assignedClasses.includes(classId);
  };

  /**
   * Can this user enter scores for the given subject in the given class?
   * Directors and admins: yes.
   * Teachers: only if the subject is in their assignedSubjects AND the class is accessible.
   */
  const canEnterScoresFor = (classId, subjectId) => {
    if (isAdminOrDirector) return true;
    if (!canAccessClass(classId)) return false;
    if (!assignedSubjects.includes(subjectId)) return false;
    return true;
  };

  /**
   * Can this user add/remove students to this class?
   * Directors and admins: yes.
   * Teachers: yes for their assigned classes (baseline permission).
   */
  const canManageStudentsIn = (classId) => {
    if (isAdminOrDirector) return true;
    return canAccessClass(classId);
  };

  return {
    // Identity
    profile,
    role,

    // Booleans
    isAuthenticated,
    isDirector,
    isAdmin,
    isTeacher,
    isAdminOrDirector,

    // Assignments
    assignedClasses,
    assignedSubjects,
    classTeacherOf,
    permissions,

    // Checks
    has,
    canAccessClass,
    canEnterScoresFor,
    canManageStudentsIn,
  };
}
