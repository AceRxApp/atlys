import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

export default function ContactScreen() {
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

        <h1 className="text-[28px] font-bold mb-2">Contact Us</h1>
        <p className="text-[15px] text-text-secondary mb-10 leading-relaxed">
          We'd love to hear from you. Whether you have a question, feedback, or want to partner with us — reach out anytime.
        </p>

        <div className="grid gap-4 mb-12">
          {/* General inquiries */}
          <a
            href="mailto:hello@nxstops.com"
            className="bg-bg-surface-alpha backdrop-blur-[20px] rounded-2xl p-6 border border-border-subtle no-underline text-inherit block"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-tint-bg10 flex items-center justify-center text-lg shrink-0">
                {'\u{1F44B}'}
              </div>
              <div>
                <div className="text-[15px] font-semibold text-text-primary">General Inquiries & Partnerships</div>
              </div>
            </div>
            <div className="text-[15px] text-accent-amber font-medium ml-[52px]">
              hello@nxstops.com
            </div>
          </a>

          {/* Support */}
          <a
            href="mailto:support@nxstops.com"
            className="bg-bg-surface-alpha backdrop-blur-[20px] rounded-2xl p-6 border border-border-subtle no-underline text-inherit block"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-green-tint-bg flex items-center justify-center text-lg shrink-0">
                {'\u{1F6E0}\u{FE0F}'}
              </div>
              <div>
                <div className="text-[15px] font-semibold text-text-primary">Help & Feedback</div>
              </div>
            </div>
            <div className="text-[15px] text-accent-amber font-medium ml-[52px]">
              support@nxstops.com
            </div>
          </a>
        </div>

        {/* About NxStops brief */}
        <div className="text-center py-8 border-t border-border-subtle">
          <div className="text-2xl font-bold mb-1 bg-accent-text-gradient">
            NxStops
          </div>
          <p className="text-[13px] text-text-secondary leading-relaxed max-w-[360px] mx-auto mt-2">
            A travel companion for discovering places, planning trips, and exploring cities. Built by NxStops.
          </p>
        </div>

        {/* CTA */}
        <div className="text-center pb-5">
          <button
            onClick={() => navigate('/')}
            className="btn-primary px-10 py-3.5 rounded-[14px] text-[15px] shadow-[0_4px_20px_var(--amber-tint-shadow)]"
          >
            Open NxStops
          </button>
        </div>

        <Footer />
      </div>
    </div>
  );
}
