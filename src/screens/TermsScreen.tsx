import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

export default function TermsScreen() {
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

        <h1 className="text-[28px] font-bold mb-2">Terms of Service</h1>
        <p className="text-[13px] text-text-tertiary mb-8">Effective date: January 1, 2025</p>

        <p className="text-sm leading-[1.7] text-text-body mb-3">
          Welcome to NxStops. By accessing or using our service, you agree to be bound by these Terms of Service. NxStops is operated by NxStops.
        </p>

        <h2 className="text-base font-bold text-text-primary mb-2 mt-7">1. Acceptance of Terms</h2>
        <p className="text-sm leading-[1.7] text-text-body mb-3">
          By using NxStops, you agree to these Terms of Service and our Privacy Policy. If you do not agree, please do not use the service.
        </p>

        <h2 className="text-base font-bold text-text-primary mb-2 mt-7">2. Description of Service</h2>
        <p className="text-sm leading-[1.7] text-text-body mb-3">
          NxStops is a travel companion web application that helps users discover places, plan trips, browse events, and collaborate with others on trip itineraries. The service is provided "as is" and "as available."
        </p>

        <h2 className="text-base font-bold text-text-primary mb-2 mt-7">3. User Accounts</h2>
        <p className="text-sm leading-[1.7] text-text-body mb-3">
          You may create an account to access additional features such as community reviews and crew mode. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
        </p>

        <h2 className="text-base font-bold text-text-primary mb-2 mt-7">4. User Conduct</h2>
        <p className="text-sm leading-[1.7] text-text-body mb-3">When using NxStops, you agree not to:</p>
        <ul className="text-sm leading-[1.7] text-text-body mb-3 pl-5">
          <li className="mb-1.5">Submit false, misleading, or inappropriate reviews or content</li>
          <li className="mb-1.5">Use the service for any unlawful purpose</li>
          <li className="mb-1.5">Attempt to interfere with the service's operation or security</li>
          <li className="mb-1.5">Scrape, copy, or redistribute content from the service without permission</li>
        </ul>

        <h2 className="text-base font-bold text-text-primary mb-2 mt-7">5. Third-Party Content & Links</h2>
        <p className="text-sm leading-[1.7] text-text-body mb-3">
          NxStops displays data from third-party sources including Google Maps, Google Places, and event providers. We also may link to third-party booking sites, travel services, and affiliate partners. We are not responsible for the accuracy, availability, or content of these third-party services. Your use of third-party services is subject to their respective terms and policies.
        </p>

        <h2 className="text-base font-bold text-text-primary mb-2 mt-7">6. Intellectual Property</h2>
        <p className="text-sm leading-[1.7] text-text-body mb-3">
          The NxStops name, logo, design, and original content are the property of NxStops. Place data, maps, and photos are provided by their respective owners (e.g., Google) and are subject to their terms of use.
        </p>

        <h2 className="text-base font-bold text-text-primary mb-2 mt-7">7. Limitation of Liability</h2>
        <p className="text-sm leading-[1.7] text-text-body mb-3">
          NxStops is provided for informational and planning purposes only. We do not guarantee the accuracy of place information, business hours, ratings, or event details. To the maximum extent permitted by law, NxStops shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service.
        </p>
        <p className="text-sm leading-[1.7] text-text-body mb-3">
          Always verify important details (hours, availability, safety) directly with businesses and venues before visiting.
        </p>

        <h2 className="text-base font-bold text-text-primary mb-2 mt-7">8. Termination</h2>
        <p className="text-sm leading-[1.7] text-text-body mb-3">
          We reserve the right to suspend or terminate your access to NxStops at any time for violations of these terms or for any other reason at our discretion.
        </p>

        <h2 className="text-base font-bold text-text-primary mb-2 mt-7">9. Changes to Terms</h2>
        <p className="text-sm leading-[1.7] text-text-body mb-3">
          We may update these Terms of Service from time to time. Continued use of the service after changes constitutes acceptance of the updated terms.
        </p>

        <h2 className="text-base font-bold text-text-primary mb-2 mt-7">10. Contact Us</h2>
        <p className="text-sm leading-[1.7] text-text-body mb-3">
          If you have any questions about these Terms of Service, please contact us at:
        </p>
        <p className="text-sm leading-[1.7] text-text-body mb-3">
          <a href="mailto:support@nxstops.com" className="text-accent-amber no-underline">support@nxstops.com</a>
        </p>

        <Footer />
      </div>
    </div>
  );
}
