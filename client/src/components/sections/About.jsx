import Section from '../ui/Section.jsx';
import Reveal from '../ui/Reveal.jsx';
import Icon from '../ui/Icon.jsx';
import TagList from '../ui/TagList.jsx';

export default function About({ profile }) {
  const paragraphs = (profile.summary || '').split(/\n{2,}/).filter(Boolean);
  const socials = [
    { key: 'github', label: 'GitHub', icon: 'github' },
    { key: 'linkedin', label: 'LinkedIn', icon: 'linkedin' },
    { key: 'website', label: 'Website', icon: 'globe' },
  ].filter((s) => profile.socials?.[s.key]);

  return (
    <Section id="about" index="01" eyebrow="About" title="A bit about me.">
      <div className="about-grid">
        <Reveal className="about-copy">
          {paragraphs.map((p) => (
            <p key={p.slice(0, 32)}>{p}</p>
          ))}
        </Reveal>

        <Reveal as="aside" className="card about-card" delay={0.1} aria-label="Quick facts">
          <dl className="facts">
            {profile.location && (
              <div className="fact">
                <dt>
                  <Icon name="mapPin" size={16} /> Based in
                </dt>
                <dd>{profile.location}</dd>
              </div>
            )}
            {profile.email && (
              <div className="fact">
                <dt>
                  <Icon name="mail" size={16} /> Email
                </dt>
                <dd>
                  <a href={`mailto:${profile.email}`} className="link">
                    {profile.email}
                  </a>
                </dd>
              </div>
            )}
            {profile.interests?.length > 0 && (
              <div className="fact">
                <dt>
                  <Icon name="layers" size={16} /> Interests
                </dt>
                <dd>
                  <TagList items={profile.interests} label="Interests" />
                </dd>
              </div>
            )}
            {profile.hobbies?.length > 0 && (
              <div className="fact">
                <dt>
                  <Icon name="star" size={16} /> Hobbies
                </dt>
                <dd>{profile.hobbies.join(' · ')}</dd>
              </div>
            )}
          </dl>
          {socials.length > 0 && (
            <div className="social-row">
              {socials.map((s) => (
                <a key={s.key} href={profile.socials[s.key]} className="icon-btn" target="_blank" rel="noreferrer" aria-label={s.label}>
                  <Icon name={s.icon} size={18} />
                </a>
              ))}
            </div>
          )}
        </Reveal>
      </div>
    </Section>
  );
}
