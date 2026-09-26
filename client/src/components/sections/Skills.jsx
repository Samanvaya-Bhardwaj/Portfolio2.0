import { motion } from 'framer-motion';
import Section from '../ui/Section.jsx';
import SpotlightCard from '../ui/SpotlightCard.jsx';
import { fadeUp, stagger } from '../ui/Reveal.jsx';
import { groupBy } from '../../utils/format.js';

export default function Skills({ skills }) {
  if (!skills.length) return null;
  const groups = groupBy(skills, 'category');

  return (
    <Section id="skills" index="02" eyebrow="Skills" title="Tools I reach for.">
      <motion.div
        className="skills-grid"
        variants={stagger(0.07)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
      >
        {groups.map(([category, items]) => (
          <SpotlightCard key={category} variants={fadeUp} className="skill-card">
            <h3 className="card-kicker">{category}</h3>
            <ul className="chip-list">
              {items.map((s) => (
                <li key={s.id} className="chip">
                  {s.name}
                </li>
              ))}
            </ul>
          </SpotlightCard>
        ))}
      </motion.div>
    </Section>
  );
}
