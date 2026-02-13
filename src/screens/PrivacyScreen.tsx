import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

export default function PrivacyScreen() {
  const navigate = useNavigate();

  return (
    <div className="font-sans bg-body-gradient min-h-screen text-text-primary">
      <div className="max-w-[700px] mx-auto px-5">
        {/* Back button */}
        <div className="py-4">
          <button
            onClick={() => navigate('/')}
            className="bg-transparent border-none cursor-pointer text-text-secondary text-sm flex items-center gap-1.5 py-2"
          >
            <span className="text-lg">&larr;</span> Back to NxStops
          </button>
        </div>

        <h1 className="text-[28px] font-bold mb-2">Privacy Policy</h1>
        <p className="text-[13px] text-text-tertiary mb-8">Effective date: January 1, 2025</p>

        <p className="text-sm leading-[1.7] text-text-body mb-3">
          NxStops ("we", "our", "us") is a product of NxStops. This Privacy Policy explains how we collect, use, and protect your information when you use NxStops.
        </p>

        <h2 className="text-base font-bold text-text-primary mb-2 mt-7">1. Information We Collect</h2>
        <p className="text-sm leading-[1.7] text-text-body mb-3">We may collect the following types of information:</p>
        <ul className="text-sm leading-[1.7] text-text-body mb-3 pl-5">
          <li className="mb-1.5"><strong>Location data:</strong> If you enable GPS, we use your device's location to show nearby places and events. Location data is not stored on our servers.</li>
          <li className="mb-1.5"><strong>Account information:</strong> If you create an account, we collect your email address and display name through Supabase authentication.</li>
          <li className="mb-1.5"><strong>Trip plans:</strong> Your trip itineraries are stored locally on your device. Crew Mode plans are temporarily stored in our database to enable real-time collaboration.</li>
          <li className="mb-1.5"><strong>Reviews and tags:</strong> Community reviews and tags you submit are stored in our database and visible to other users.</li>
          <li className="mb-1.5"><strong>Usage data:</strong> We collect anonymous analytics to improve the app experience.</li>
        </ul>

        <h2 className="text-base font-bold text-text-primary mb-2 mt-7">2. How We Use Your Information</h2>
        <p className="text-sm leading-[1.7] text-text-body mb-3">We use your information to:</p>
        <ul className="text-sm leading-[1.7] text-text-body mb-3 pl-5">
          <li className="mb-1.5">Provide personalized place recommendations based on your location</li>
          <li className="mb-1.5">Enable trip planning and collaboration features</li>
          <li className="mb-1.5">Display community reviews and tags</li>
          <li className="mb-1.5">Improve our service through anonymous analytics</li>
        </ul>
        <p className="text-sm leading-[1.7] text-text-body mb-3">
          <strong>We do not sell your personal information.</strong> Your data is used solely to provide and improve the NxStops experience.
        </p>

        <h2 className="text-base font-bold text-text-primary mb-2 mt-7">3. Third-Party Services</h2>
        <p className="text-sm leading-[1.7] text-text-body mb-3">NxStops integrates with the following third-party services:</p>
        <ul className="text-sm leading-[1.7] text-text-body mb-3 pl-5">
          <li className="mb-1.5"><strong>Google Maps Platform:</strong> For maps, place data, and directions. Subject to Google's Privacy Policy.</li>
          <li className="mb-1.5"><strong>Supabase:</strong> For authentication and database services.</li>
          <li className="mb-1.5"><strong>Vercel Analytics:</strong> For anonymous usage analytics and performance monitoring.</li>
          <li className="mb-1.5"><strong>Sentry:</strong> For error tracking and application monitoring.</li>
          <li className="mb-1.5"><strong>Open-Meteo:</strong> For weather data (no personal data is sent).</li>
        </ul>

        <h2 className="text-base font-bold text-text-primary mb-2 mt-7">4. Cookies & Local Storage</h2>
        <p className="text-sm leading-[1.7] text-text-body mb-3">
          NxStops uses browser local storage and session storage to save your preferences, trip plans, saved places, and session data. This data stays on your device and can be cleared at any time through your browser settings or by using the "Clear Data & Reload" option in the app.
        </p>

        <h2 className="text-base font-bold text-text-primary mb-2 mt-7">5. Data Security</h2>
        <p className="text-sm leading-[1.7] text-text-body mb-3">
          We take reasonable measures to protect your information. All data transmission is encrypted via HTTPS. Authentication is handled through Supabase's secure infrastructure.
        </p>

        <h2 className="text-base font-bold text-text-primary mb-2 mt-7">6. Your Rights</h2>
        <p className="text-sm leading-[1.7] text-text-body mb-3">
          You can delete your account and associated data at any time. You can clear all locally stored data through your browser. If you have questions about your data, contact us at the address below.
        </p>

        <h2 className="text-base font-bold text-text-primary mb-2 mt-7">7. Children's Privacy</h2>
        <p className="text-sm leading-[1.7] text-text-body mb-3">
          NxStops is not directed at children under 13. We do not knowingly collect personal information from children under 13.
        </p>

        <h2 className="text-base font-bold text-text-primary mb-2 mt-7">8. Changes to This Policy</h2>
        <p className="text-sm leading-[1.7] text-text-body mb-3">
          We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated effective date.
        </p>

        <h2 className="text-base font-bold text-text-primary mb-2 mt-7">9. Contact Us</h2>
        <p className="text-sm leading-[1.7] text-text-body mb-3">
          If you have any questions about this Privacy Policy, please contact us at:
        </p>
        <p className="text-sm leading-[1.7] text-text-body mb-3">
          <a href="mailto:support@nxstops.com" className="text-accent-amber no-underline">support@nxstops.com</a>
        </p>

        <Footer />
      </div>
    </div>
  );
}
