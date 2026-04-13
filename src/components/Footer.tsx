import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="px-5 pt-6 pb-4 text-center border-t border-border-subtle">
      <nav aria-label="Footer navigation" className="flex justify-center items-center gap-2 mb-2 flex-wrap">
        <Link to="/about" className="text-text-tertiary no-underline text-xs py-1 px-0.5">About</Link>
        <span className="text-text-muted text-xs">&middot;</span>
        <Link to="/privacy" className="text-text-tertiary no-underline text-xs py-1 px-0.5">Privacy</Link>
        <span className="text-text-muted text-xs">&middot;</span>
        <Link to="/terms" className="text-text-tertiary no-underline text-xs py-1 px-0.5">Terms</Link>
        <span className="text-text-muted text-xs">&middot;</span>
        <Link to="/contact" className="text-text-tertiary no-underline text-xs py-1 px-0.5">Contact</Link>
      </nav>
      <div className="text-xs text-text-muted">
        &copy; {new Date().getFullYear()} NxStops
      </div>
    </footer>
  );
}
