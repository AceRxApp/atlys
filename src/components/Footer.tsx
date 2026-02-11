import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function Footer() {
  const { theme } = useTheme();

  const linkStyle: React.CSSProperties = {
    color: theme.text.tertiary,
    textDecoration: 'none',
    fontSize: '12px',
    padding: '4px 2px',
  };

  return (
    <footer style={{
      padding: '24px 20px 16px',
      textAlign: 'center',
      borderTop: `1px solid ${theme.border.subtle}`,
    }}>
      <nav style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px',
        flexWrap: 'wrap',
      }}>
        <Link to="/about" style={linkStyle}>About</Link>
        <span style={{ color: theme.text.muted, fontSize: '10px' }}>&middot;</span>
        <Link to="/privacy" style={linkStyle}>Privacy</Link>
        <span style={{ color: theme.text.muted, fontSize: '10px' }}>&middot;</span>
        <Link to="/terms" style={linkStyle}>Terms</Link>
        <span style={{ color: theme.text.muted, fontSize: '10px' }}>&middot;</span>
        <Link to="/contact" style={linkStyle}>Contact</Link>
      </nav>
      <div style={{
        fontSize: '11px',
        color: theme.text.muted,
      }}>
        &copy; {new Date().getFullYear()} Eleve Creative Haus
      </div>
    </footer>
  );
}
