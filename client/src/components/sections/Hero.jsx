import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../ui/Icon.jsx';
import { fadeUp, stagger } from '../ui/Reveal.jsx';

// Three.js is split into its own chunk so text content paints first.
const EmbeddingScene = lazy(() => import('../../three/EmbeddingScene.jsx'));

function RotatingRole({ roles }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (roles.length < 2) return undefined;
    const id = setInterval(() => setI((n) => (n + 1) % roles.length), 2800);
    return () => clearInterval(id);
  }, [roles.length]);

  if (!roles.length) return null;
  return (
    <span className="role-rotator" aria-live="off">
      <AnimatePresence mode="wait">
        <motion.span
          key={roles[i % roles.length]}
          initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
          transition={{ duration: 0.35 }}
        >
          {roles[i % roles.length]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default function Hero({ profile }) {
  const roles = profile.roles || [];
  const [first, ...rest] = (profile.name || '').split(' ');

  return (
    <section id="hero" className="hero" aria-label="Introduction">
      <Suspense fallback={<div className="hero-scene scene-fallback" aria-hidden="true" />}>
        <EmbeddingScene className="hero-scene" />
      </Suspense>
      <div className="hero-vignette" aria-hidden="true" />

      <motion.div className="container hero-content" variants={stagger(0.1, 0.1)} initial="hidden" animate="show">
        {profile.currentFocus && (
          <motion.p variants={fadeUp} className="hero-status">
            <span className="status-dot" aria-hidden="true" />
            {profile.currentFocus}
          </motion.p>
        )}

        <motion.h1 variants={fadeUp} className="hero-title">
          {first} <span className="text-gradient">{rest.join(' ')}</span>
        </motion.h1>

        {roles.length > 0 && (
          <motion.p variants={fadeUp} className="hero-roles">
            <span className="mono prompt" aria-hidden="true">
              ~/
            </span>
            <span className="sr-only">{roles.join(', ')}</span>
            <RotatingRole roles={roles} />
          </motion.p>
        )}

        {profile.headline && (
          <motion.p variants={fadeUp} className="hero-headline">
            {profile.headline}
          </motion.p>
        )}

        <motion.div variants={fadeUp} className="hero-cta">
          <a href="#projects" className="btn btn-primary">
            View projects <Icon name="arrowRight" size={17} />
          </a>
          <a href="#contact" className="btn btn-ghost">
            Get in touch
          </a>
        </motion.div>

        {profile.stats?.length > 0 && (
          <motion.dl variants={fadeUp} className="hero-stats">
            {profile.stats.map((s) => (
              <div key={s.label} className="stat">
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </motion.dl>
        )}
      </motion.div>

      <motion.aside
        className="scene-legend"
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
      >
        <p className="legend-title">embedding space · live retrieval</p>
        <ul>
          <li>
            <span className="legend-swatch swatch-doc" /> document chunks
          </li>
          <li>
            <span className="legend-swatch swatch-query" /> query vector
          </li>
          <li>
            <span className="legend-swatch swatch-edge" /> top-k neighbours
          </li>
        </ul>
      </motion.aside>

      <a href="#about" className="scroll-cue" aria-label="Scroll to about section">
        <span />
      </a>
    </section>
  );
}
