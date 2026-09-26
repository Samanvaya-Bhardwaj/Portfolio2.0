import { motion } from 'framer-motion';
import Section from '../ui/Section.jsx';
import Icon from '../ui/Icon.jsx';
import SpotlightCard from '../ui/SpotlightCard.jsx';
import { fadeUp, stagger } from '../ui/Reveal.jsx';

export default function Achievements({ achievements }) {
  if (!achievements.length) return null;
  return (
    <Section id="achievements" index="06" eyebrow="Achievements" title="Milestones.">
      <motion.div
        className="achievements-grid"
        variants={stagger(0.08)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
      >
        {achievements.map((a) => (
          <SpotlightCard key={a.id} variants={fadeUp} className="achievement-card">
            <span className="achievement-icon" aria-hidden="true">
              <Icon name="trophy" size={20} />
            </span>
            <div>
              {(a.category || a.date) && (
                <p className="card-kicker">{[a.category, a.date].filter(Boolean).join(' · ')}</p>
              )}
              <h3 className="card-title">
                {a.url ? (
                  <a href={a.url} target="_blank" rel="noreferrer" className="link">
                    {a.title} <Icon name="external" size={14} />
                  </a>
                ) : (
                  a.title
                )}
              </h3>
              {a.description && a.description !== a.title && <p className="muted">{a.description}</p>}
            </div>
          </SpotlightCard>
        ))}
      </motion.div>
    </Section>
  );
}
