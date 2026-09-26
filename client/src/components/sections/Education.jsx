import Section from '../ui/Section.jsx';
import Reveal from '../ui/Reveal.jsx';
import TagList from '../ui/TagList.jsx';
import { formatRange, formatYear } from '../../utils/format.js';

export default function Education({ education }) {
  if (!education.length) return null;

  return (
    <Section id="education" index="03" eyebrow="Education" title="Academic path.">
      <ol className="timeline">
        {education.map((e, i) => (
          <Reveal as="li" key={e.id} className="timeline-item" delay={i * 0.06}>
            <span className="timeline-node" aria-hidden="true" />
            <div className="card edu-card">
              <div className="edu-head">
                <div>
                  <p className="meta mono">{formatRange(e.startYear, e.endYear, e.current, formatYear)}</p>
                  <h3 className="card-title">{e.institution}</h3>
                  <p className="card-subtitle">{e.degree}</p>
                </div>
                {e.score && (
                  <p className="score-badge">
                    <span className="score-label">{e.scoreLabel || 'Score'}</span>
                    <span className="score-value">{e.score}</span>
                    {e.scoreNote && <span className="score-note">{e.scoreNote}</span>}
                  </p>
                )}
              </div>
              {e.coursework?.length > 0 && (
                <div className="edu-coursework">
                  <p className="card-kicker">Coursework</p>
                  <TagList items={e.coursework} label="Coursework" />
                </div>
              )}
            </div>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}
