import Reveal from './Reveal.jsx';

/** Standard section shell: anchor id, numbered mono eyebrow, heading and optional intro. */
export default function Section({ id, index, eyebrow, title, intro, children, className = '' }) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} className={`section ${className}`} aria-labelledby={headingId}>
      <div className="container">
        <Reveal as="header" className="section-header">
          <p className="eyebrow">
            <span className="eyebrow-index">{index}</span>
            <span className="eyebrow-line" aria-hidden="true" />
            {eyebrow}
          </p>
          <h2 id={headingId} className="section-title">
            {title}
          </h2>
          {intro && <p className="section-intro">{intro}</p>}
        </Reveal>
        {children}
      </div>
    </section>
  );
}
