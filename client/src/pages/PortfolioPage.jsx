import { usePortfolio } from '../context/PortfolioContext.jsx';
import useSeo from '../hooks/useSeo.js';
import Navbar from '../components/layout/Navbar.jsx';
import Footer from '../components/layout/Footer.jsx';
import Hero from '../components/sections/Hero.jsx';
import About from '../components/sections/About.jsx';
import Skills from '../components/sections/Skills.jsx';
import Education from '../components/sections/Education.jsx';
import Experience from '../components/sections/Experience.jsx';
import Projects from '../components/sections/Projects.jsx';
import Achievements from '../components/sections/Achievements.jsx';
import Contact from '../components/sections/Contact.jsx';
import Icon from '../components/ui/Icon.jsx';

function LoadingScreen() {
  return (
    <div className="page-state" role="status" aria-live="polite">
      <span className="loader" aria-hidden="true" />
      <p className="mono muted">loading portfolio…</p>
    </div>
  );
}

function ErrorScreen({ error, onRetry }) {
  return (
    <div className="page-state" role="alert">
      <p className="mono eyebrow-plain">Could not load the portfolio</p>
      <p className="muted">{error?.message}</p>
      <button type="button" className="btn btn-ghost" onClick={() => onRetry()}>
        <Icon name="refresh" size={16} /> Try again
      </button>
    </div>
  );
}

export default function PortfolioPage() {
  const { status, data, error, live, reload } = usePortfolio();
  useSeo(data?.profile);

  if (status === 'loading') return <LoadingScreen />;
  if (status === 'error') return <ErrorScreen error={error} onRetry={reload} />;
  if (!data.profile) {
    return <ErrorScreen error={{ message: 'No profile found. Run `npm run seed` on the server.' }} onRetry={reload} />;
  }

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Navbar profile={data.profile} ready={status === 'ready'} />
      <main id="main">
        <Hero profile={data.profile} />
        <About profile={data.profile} />
        <Skills skills={data.skills} />
        <Education education={data.education} />
        <Experience experience={data.experience} />
        <Projects projects={data.projects} />
        <Achievements achievements={data.achievements} />
        <Contact profile={data.profile} />
      </main>
      <Footer profile={data.profile} live={live} />
    </>
  );
}
