import { Link } from "react-router-dom";
import { useSchool } from "../../contexts/SchoolContext";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsOfServicePage() {
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
            <div className="text-xs text-slate-500">Terms of Service</div>
          </div>
          <FileText className="w-5 h-5 text-slate-400" />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <div className="prose prose-slate max-w-none">
          <h1 className="text-3xl font-bold text-ink mb-2">Terms of Service</h1>
          <p className="text-sm text-ink-soft mb-8">
            Last updated: {new Date().getFullYear()}
          </p>

          <p className="text-ink mb-6">
            Welcome to BramTech Records, a school records and result management
            platform provided by Bram Technologies ("we", "us", "our") to
            schools and their stakeholders. By using this service, you agree to
            these terms.
          </p>

          <h2 className="text-xl font-bold text-ink mt-8 mb-3">
            1. About the Service
          </h2>
          <p className="text-ink mb-4">
            BramTech Records helps schools manage student records, enter and
            calculate scores, generate report cards, and let parents check
            results privately with an access code. The platform is provided as a
            subscription service to schools.
          </p>

          <h2 className="text-xl font-bold text-ink mt-8 mb-3">
            2. Who can use it
          </h2>
          <ul className="text-ink mb-4 list-disc pl-6 space-y-2">
            <li>
              <strong>Directors and Admins:</strong> Authorised school personnel
              who manage the school's account.
            </li>
            <li>
              <strong>Teachers:</strong> School staff invited and approved by
              their director to enter scores and comments.
            </li>
            <li>
              <strong>Parents and Guardians:</strong> Authorised persons who
              received an access code from the school to view their child's
              results.
            </li>
          </ul>

          <h2 className="text-xl font-bold text-ink mt-8 mb-3">
            3. Your account
          </h2>
          <p className="text-ink mb-4">
            You are responsible for keeping your login details private. If you
            share your password or access code, anyone with it may see the data
            you have access to. Notify your school immediately if you suspect
            your account has been compromised.
          </p>

          <h2 className="text-xl font-bold text-ink mt-8 mb-3">
            4. Acceptable use
          </h2>
          <p className="text-ink mb-4">You agree not to:</p>
          <ul className="text-ink mb-4 list-disc pl-6 space-y-2">
            <li>Use the service for anything illegal or harmful</li>
            <li>Attempt to access data you are not authorised to see</li>
            <li>
              Interfere with, disrupt, or attempt to breach the security of the
              service
            </li>
            <li>Copy or resell the service without written permission</li>
            <li>Upload false or misleading information</li>
          </ul>

          <h2 className="text-xl font-bold text-ink mt-8 mb-3">
            5. School's responsibility
          </h2>
          <p className="text-ink mb-4">
            Each school is the owner of the data it enters into BramTech Records
            (student records, scores, comments, etc.). The school is responsible
            for ensuring the accuracy of that data and for handling it in line
            with applicable laws, including the Nigeria Data Protection
            Regulation (NDPR).
          </p>

          <h2 className="text-xl font-bold text-ink mt-8 mb-3">
            6. Our responsibility
          </h2>
          <p className="text-ink mb-4">
            We will use reasonable technical and organisational measures to keep
            your data secure. However, no online service can guarantee absolute
            security. Use of the service is at your own risk.
          </p>

          <h2 className="text-xl font-bold text-ink mt-8 mb-3">
            7. Availability
          </h2>
          <p className="text-ink mb-4">
            We aim to keep the service available 24/7, but occasional downtime
            may occur for maintenance, upgrades, or reasons outside our control.
            We are not liable for losses caused by downtime.
          </p>

          <h2 className="text-xl font-bold text-ink mt-8 mb-3">
            8. Subscription and payment
          </h2>
          <p className="text-ink mb-4">
            Schools pay a monthly or annual subscription plus a one-time setup
            fee, as agreed at signup. If a school stops paying, access to the
            platform may be suspended. Data can be exported on request within a
            reasonable notice period.
          </p>

          <h2 className="text-xl font-bold text-ink mt-8 mb-3">
            9. Termination
          </h2>
          <p className="text-ink mb-4">
            You may stop using the service at any time. A school may terminate
            its subscription with at least 30 days notice. We may suspend or
            terminate access if these terms are violated or subscription fees
            are unpaid.
          </p>

          <h2 className="text-xl font-bold text-ink mt-8 mb-3">
            10. Changes to these terms
          </h2>
          <p className="text-ink mb-4">
            We may update these terms occasionally. Material changes will be
            communicated to schools. Continued use of the service means you
            accept the updated terms.
          </p>

          <h2 className="text-xl font-bold text-ink mt-8 mb-3">
            11. Governing law
          </h2>
          <p className="text-ink mb-4">
            These terms are governed by the laws of the Federal Republic of
            Nigeria. Any disputes will be resolved in Nigerian courts.
          </p>

          <h2 className="text-xl font-bold text-ink mt-8 mb-3">12. Contact</h2>
          <p className="text-ink mb-4">
            Questions about these terms? Contact us at:
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
            <Link to="/privacy" className="hover:text-brand-700">
              Privacy Policy
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
