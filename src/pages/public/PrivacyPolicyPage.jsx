import { Link } from "react-router-dom";
import { useSchool } from "../../contexts/SchoolContext";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPolicyPage() {
  const { school } = useSchool();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Simple header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            to="/check-result"
            className="text-slate-600 hover:text-slate-900"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-slate-900 truncate">
              {school?.name || "BramTech Records"}
            </div>
            <div className="text-xs text-slate-500">Privacy Policy</div>
          </div>
          <Shield className="w-5 h-5 text-slate-400" />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <div className="prose prose-slate max-w-none">
          <h1 className="text-3xl font-bold text-ink mb-2">Privacy Policy</h1>
          <p className="text-sm text-ink-soft mb-8">
            Last updated: {new Date().getFullYear()}
          </p>

          <p className="text-ink mb-6">
            Bram Technologies ("we", "us", "our") respects your privacy and is
            committed to protecting your personal data. This policy explains
            what we collect, how we use it, and your rights under the Nigeria
            Data Protection Regulation (NDPR).
          </p>

          <h2 className="text-xl font-bold text-ink mt-8 mb-3">
            1. Who we are
          </h2>
          <p className="text-ink mb-4">
            Bram Technologies is a Nigerian software company based in Okpanam,
            Delta State. We build BramTech Records for schools. When a school
            uses our platform, we are their data processor — the school itself
            is the data controller for their students' data.
          </p>

          <h2 className="text-xl font-bold text-ink mt-8 mb-3">
            2. What data we collect
          </h2>
          <p className="text-ink mb-4">
            <strong>About school staff (directors, teachers):</strong>
          </p>
          <ul className="text-ink mb-4 list-disc pl-6 space-y-2">
            <li>Full name</li>
            <li>Email address</li>
            <li>Phone number (WhatsApp)</li>
            <li>Role and permissions in the school</li>
            <li>Login timestamps</li>
          </ul>

          <p className="text-ink mb-4">
            <strong>About students (entered by the school):</strong>
          </p>
          <ul className="text-ink mb-4 list-disc pl-6 space-y-2">
            <li>Full name, gender, date of birth, class</li>
            <li>Admission number and photo</li>
            <li>Parent/guardian name, phone, email</li>
            <li>Scores, comments, attendance</li>
            <li>Weight and height (optional)</li>
          </ul>

          <p className="text-ink mb-4">
            <strong>About parents/guardians using the result checker:</strong>
          </p>
          <ul className="text-ink mb-4 list-disc pl-6 space-y-2">
            <li>The admission number and access code they enter</li>
            <li>Which reports they view (for the school's records)</li>
          </ul>

          <h2 className="text-xl font-bold text-ink mt-8 mb-3">
            3. How we use the data
          </h2>
          <ul className="text-ink mb-4 list-disc pl-6 space-y-2">
            <li>To provide the results portal service</li>
            <li>To generate report cards and PDF exports</li>
            <li>To let parents check their child's results</li>
            <li>To communicate with schools about the service</li>
            <li>To improve the platform and fix bugs</li>
          </ul>
          <p className="text-ink mb-4">
            We do <strong>not</strong> sell your data to third parties. We do{" "}
            <strong>not</strong> use your data for advertising.
          </p>

          <h2 className="text-xl font-bold text-ink mt-8 mb-3">
            4. Where the data is stored
          </h2>
          <p className="text-ink mb-4">
            Data is stored on Google Firebase (Firestore), Google Cloud Storage,
            and Vercel — all reputable global providers with strong security.
            Data may be processed in data centers in Europe.
          </p>

          <h2 className="text-xl font-bold text-ink mt-8 mb-3">
            5. Who has access
          </h2>
          <ul className="text-ink mb-4 list-disc pl-6 space-y-2">
            <li>
              <strong>Your school's director and admin</strong> can see all data
              for their school
            </li>
            <li>
              <strong>Teachers</strong> can see students in classes they are
              assigned to
            </li>
            <li>
              <strong>Parents</strong> can see only their own child's published
              reports (with the access code)
            </li>
            <li>
              <strong>Bram Technologies staff</strong> may access data only when
              necessary for support, security, or debugging
            </li>
          </ul>
          <p className="text-ink mb-4">
            Each school's data is kept separate from other schools using the
            platform.
          </p>

          <h2 className="text-xl font-bold text-ink mt-8 mb-3">
            6. How long we keep it
          </h2>
          <p className="text-ink mb-4">
            While a school is an active customer, we keep their data on the
            platform. If a school terminates their subscription, we retain data
            for up to 90 days to allow reactivation or export, then delete it.
            Backups may retain data for a further 30 days before being purged.
          </p>

          <h2 className="text-xl font-bold text-ink mt-8 mb-3">
            7. Your rights (under NDPR)
          </h2>
          <p className="text-ink mb-4">You have the right to:</p>
          <ul className="text-ink mb-4 list-disc pl-6 space-y-2">
            <li>
              <strong>Access</strong> the personal data we hold about you
            </li>
            <li>
              <strong>Correct</strong> data that is inaccurate
            </li>
            <li>
              <strong>Delete</strong> your data (subject to legal and
              contractual requirements)
            </li>
            <li>
              <strong>Object</strong> to certain uses of your data
            </li>
            <li>
              <strong>Complain</strong> to the Nigeria Data Protection
              Commission (NDPC) if you believe we have handled your data
              improperly
            </li>
          </ul>
          <p className="text-ink mb-4">
            For students under 18, these rights are exercised by the parent or
            guardian.
          </p>
          <p className="text-ink mb-4">
            To exercise these rights, first contact your school. If they cannot
            help, contact us using the details at the bottom of this page.
          </p>

          <h2 className="text-xl font-bold text-ink mt-8 mb-3">
            8. Security measures
          </h2>
          <p className="text-ink mb-4">We protect your data using:</p>
          <ul className="text-ink mb-4 list-disc pl-6 space-y-2">
            <li>HTTPS encryption for all data in transit</li>
            <li>
              Firebase security rules that restrict access to only the right
              people
            </li>
            <li>Access codes for parent lookups (never publicly listed)</li>
            <li>Role-based permissions for school staff</li>
            <li>Regular software updates</li>
          </ul>
          <p className="text-ink mb-4">
            No system is 100% secure, but we take reasonable steps to protect
            you.
          </p>

          <h2 className="text-xl font-bold text-ink mt-8 mb-3">
            9. Children's data
          </h2>
          <p className="text-ink mb-4">
            BramTech Records is designed for schools that store student records.
            Students are typically minors. We collect and process children's
            data only on behalf of, and under the authority of, their school.
            The school confirms it has the necessary consent to enter student
            data into the platform.
          </p>

          <h2 className="text-xl font-bold text-ink mt-8 mb-3">
            10. Third-party services
          </h2>
          <p className="text-ink mb-4">
            We use trusted third-party services to run the platform:
          </p>
          <ul className="text-ink mb-4 list-disc pl-6 space-y-2">
            <li>
              <strong>Google Firebase</strong> — database, authentication,
              storage
            </li>
            <li>
              <strong>Vercel</strong> — hosting and delivery
            </li>
            <li>
              <strong>Cloudinary</strong> — image storage (student photos,
              school logos)
            </li>
            <li>
              <strong>Paystack</strong> — payment processing (schools only)
            </li>
          </ul>
          <p className="text-ink mb-4">
            Each of these providers has their own privacy policy and security
            practices.
          </p>

          <h2 className="text-xl font-bold text-ink mt-8 mb-3">
            11. Changes to this policy
          </h2>
          <p className="text-ink mb-4">
            We may update this policy from time to time. The "last updated" date
            at the top shows when. If we make significant changes, we will
            notify schools directly.
          </p>

          <h2 className="text-xl font-bold text-ink mt-8 mb-3">
            12. Contact us
          </h2>
          <p className="text-ink mb-4">
            For any privacy questions, requests, or complaints:
          </p>
          <div className="bg-slate-100 rounded-lg p-4 text-sm">
            <p className="mb-1">
              <strong>Bram Technologies</strong>
            </p>
            <p className="mb-1">Email: bright2259@gmail.com</p>
            <p className="mb-1">Phone: 08137925907</p>
            <p>Location: Delta State, Nigeria</p>
          </div>

          <div className="mt-12 pt-6 border-t border-slate-200 text-center text-sm text-ink-soft">
            <Link to="/terms" className="hover:text-brand-700">
              Terms of Service
            </Link>
            {" · "}
            <Link to="/check-result" className="hover:text-brand-700">
              Check Result
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
