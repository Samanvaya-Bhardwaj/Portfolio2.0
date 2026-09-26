import Section from '../ui/Section.jsx';
import Reveal from '../ui/Reveal.jsx';
import Icon from '../ui/Icon.jsx';
import TagList from '../ui/TagList.jsx';
import SpotlightCard from '../ui/SpotlightCard.jsx';
import { formatRange } from '../../utils/format.js';

export function MetaRow({ guide, teamSize }) {
  if (!guide && !teamSize) return null;
  return (
    <ul className="meta-row">
      {guide && (
        <li>
          <Icon name="user" size={15} /> Guide: {guide}
        </li>
      )}
      {teamSize && (
        <li>
          <Icon name="users" size={15} /> Team of {teamSize}
        </li>
      )}
    </ul>
  );
}

export default function Experience({ experience }) {
  if (!experience.length) return null;

  return (
    <Section id="experience" index="04" eyebrow="Experience" title="Where I’ve been building.">
      <ol className="timeline">
        {experience.map((x, i) => (
          <Reveal as="li" key={x.id} className="timeline-item" delay={i * 0.06}>
            <span className={`timeline-node ${x.current ? 'is-current' : ''}`} aria-hidden="true" />
            <SpotlightCard className="exp-card">
              <header className="exp-head">
                <div>
                  <h3 className="card-title">
                    {x.role} <span className="at">@ {x.organization}</span>
                  </h3>
                  <MetaRow guide={x.guide} teamSize={x.teamSize} />
                </div>
                <p className="date-pill">
                  {x.current && <span className="status-dot" aria-hidden="true" />}
                  {formatRange(x.startDate, x.endDate, x.current)}
                </p>
              </header>

              {x.highlights?.length > 0 && (
                <ul className="bullet-list">
                  {x.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              )}

              {x.subProjects?.map((sp) => (
                <div key={sp.title} className="subproject">
                  <p className="subproject-title">
                    <Icon name="code" size={15} /> {sp.title}
                  </p>
                  {sp.description && <p>{sp.description}</p>}
                </div>
              ))}

              <TagList items={x.tech} />
            </SpotlightCard>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}
