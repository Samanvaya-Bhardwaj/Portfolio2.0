import Icon from '../ui/Icon.jsx';

export default function Footer({ profile, live }) {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <p className="footer-copy">
          © {new Date().getFullYear()} {profile?.name}
        </p>
        <p className={`live-indicator ${live.connected ? 'is-live' : ''}`} role="status" aria-live="polite">
          <span className="live-dot" aria-hidden="true" />
          {live.connected ? 'Live sync connected' : 'Live sync offline'}
        </p>
        <a href="#hero" className="footer-top">
          Back to top <Icon name="arrowUp" size={15} />
        </a>
      </div>
    </footer>
  );
}
