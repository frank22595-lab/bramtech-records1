/**
 * POST /api/reject-staff
 *
 * Director/admin rejects a pending signup (or removes a staff account).
 * Deletes BOTH the Firestore profile and the Firebase Auth account in THIS
 * school's project.
 *
 * Deleting only the profile — which is what the client used to do — left a
 * usable Auth login behind. That account could sign in, sit in a broken
 * profile-less state, and blocked the person from ever re-registering with
 * the same email.
 *
 * Auth: Bearer <Firebase ID token> of a director/admin OF THIS SCHOOL.
 * Body: { uid, school? }
 */

import {
  getAuthForSchool,
  getDbForSchool,
  resolveSchoolSlug,
  requireAdminCaller,
} from "./_firebase-admin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { uid } = req.body || {};
  if (!uid) return res.status(400).json({ error: "Missing user id." });

  const schoolSlug = resolveSchoolSlug(req);

  try {
    const caller = await requireAdminCaller(req, schoolSlug);
    if (!caller.ok) {
      return res.status(caller.status).json({ error: caller.error });
    }

    if (uid === caller.uid) {
      return res
        .status(400)
        .json({ error: "You cannot remove your own account." });
    }

    const db = getDbForSchool(schoolSlug);

    // Never let an admin delete a director.
    const targetSnap = await db.doc(`users/${uid}`).get();
    if (targetSnap.exists && targetSnap.data().role === "director") {
      if (caller.role !== "director") {
        return res
          .status(403)
          .json({ error: "Only a director can remove another director." });
      }
    }

    // Profile first — if the auth delete fails we have not left a live login
    // pointing at a profile that says "active".
    await db.doc(`users/${uid}`).delete();

    try {
      await getAuthForSchool(schoolSlug).deleteUser(uid);
    } catch (err) {
      if (err.code !== "auth/user-not-found") {
        console.error("reject-staff: auth delete failed for", uid, err.message);
        return res.status(500).json({
          error:
            "Profile removed, but their login could not be deleted. Please try again.",
        });
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("reject-staff error:", err);
    return res
      .status(500)
      .json({ error: "Could not remove that account. Please try again." });
  }
}
