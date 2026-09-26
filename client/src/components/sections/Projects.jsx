import { motion } from 'framer-motion';
import Section from '../ui/Section.jsx';
import Icon from '../ui/Icon.jsx';
import TagList from '../ui/TagList.jsx';
import SpotlightCard from '../ui/SpotlightCard.jsx';
import { fadeUp, stagger } from '../ui/Reveal.jsx';
import { MetaRow } from './Experience.jsx';
import { formatRange } from '../../utils/format.js';

function ProjectCard({ project, index }) {
  const { title, summary, highlights, tech, githubUrl, liveUrl, featured } = project;
  return (
    <SpotlightCard variants={fadeUp} className={`project-card ${index === 0 ? 'is-wide' : ''}`} layout>
      <header className="project-head">
        <span className="project-index mono">{String(index + 1).padStart(2, '0')}</span>
        <p className="meta mono">{formatRange(project.startDate, project.endDate, project.current)}</p>
        {featured && <span className="badge">Featured</span>}
      </header>

      <h3 className="project-title">{title}</h3>
      {summary && <p className="project-summary">{summary}</p>}
      <MetaRow guide={project.guide} teamSize={project.teamSize} />

      {highlights?.length > 0 && (
        <ul className="bullet-list">
          {highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      )}

      <footer className="project-foot">
        <TagList items={tech} />
        {(githubUrl || liveUrl) && (
          <div className="project-links">
            {githubUrl && (
              <a href={githubUrl} target="_blank" rel="noreferrer" className="icon-btn" aria-label={`${title} source code`}>
                <Icon name="github" size={18} />
              </a>
            )}
            {liveUrl && (
              <a href={liveUrl} target="_blank" rel="noreferrer" className="icon-btn" aria-label={`${title} live site`}>
                <Icon name="arrowUpRight" size={18} />
              </a>
            )}
          </div>
        )}
      </footer>
    </SpotlightCard>
  );
}

export default function Projects({ projects }) {
  if (!projects.length) return null;
  return (
    <Section id="projects" index="05" eyebrow="Projects" title="Selected work.">
      <motion.div
        className="projects-grid"
        variants={stagger(0.1)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
      >
        {projects.map((p, i) => (
          <ProjectCard key={p.id} project={p} index={i} />
        ))}
      </motion.div>
    </Section>
  );
}
