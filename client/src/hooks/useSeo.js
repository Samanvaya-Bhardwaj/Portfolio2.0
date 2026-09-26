import { useEffect } from 'react';

function setMeta(selector, attr, value) {
  if (!value) return;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    const [, key, name] = selector.match(/\[(name|property)="([^"]+)"\]/);
    el.setAttribute(key, name);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

/** Keeps title, description, Open Graph tags and Person JSON-LD in sync with the profile. */
export default function useSeo(profile) {
  useEffect(() => {
    if (!profile) return;
    const role = profile.roles?.[0];
    const title = role ? `${profile.name} — ${role}` : profile.name;
    const description = profile.headline || profile.summary?.slice(0, 160);

    document.title = title;
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);

    const sameAs = Object.values(profile.socials || {}).filter((u) => /^https?:/.test(u));
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: profile.name,
      description,
      ...(profile.email && { email: `mailto:${profile.email}` }),
      ...(profile.location && { address: profile.location }),
      ...(sameAs.length && { sameAs }),
      ...(import.meta.env.VITE_SITE_URL && { url: import.meta.env.VITE_SITE_URL }),
    };
    let script = document.getElementById('person-jsonld');
    if (!script) {
      script = document.createElement('script');
      script.id = 'person-jsonld';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLd);
  }, [profile]);
}
