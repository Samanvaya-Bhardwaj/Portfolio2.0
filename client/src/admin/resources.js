import { formatRange, formatYear } from '../utils/format.js';

/**
 * Declarative config for each content collection. The generic ResourcePage/ResourceForm
 * render lists and forms from this, so adding a field is a one-line change here
 * (plus the matching Mongoose model + zod schema on the server).
 *
 * Field types: text | textarea | number | month | url | email | checkbox | list (one per line)
 *              | tags (comma separated) | pairs (repeatable sub-objects)
 */
const displayFields = [
  { name: 'order', label: 'Display order', type: 'number', help: 'Lower numbers appear first', half: true },
  { name: 'visible', label: 'Visible on site', type: 'checkbox', half: true },
];

export const RESOURCES = {
  projects: {
    label: 'Projects',
    singular: 'project',
    icon: 'layers',
    primary: (p) => p.title,
    secondary: (p) => [formatRange(p.startDate, p.endDate, p.current), p.featured && 'Featured'].filter(Boolean).join(' · '),
    defaults: { visible: true, featured: false, current: false, order: 0 },
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'summary', label: 'Summary', type: 'textarea', rows: 2, help: 'One or two sentences shown under the title' },
      { name: 'startDate', label: 'Start', type: 'month', half: true },
      { name: 'endDate', label: 'End', type: 'month', half: true },
      { name: 'current', label: 'Ongoing', type: 'checkbox', half: true },
      { name: 'featured', label: 'Featured', type: 'checkbox', half: true },
      { name: 'guide', label: 'Guide / mentor', type: 'text', half: true },
      { name: 'teamSize', label: 'Team size', type: 'number', half: true },
      { name: 'highlights', label: 'Highlights', type: 'list', rows: 5, help: 'One bullet per line' },
      { name: 'tech', label: 'Tech stack', type: 'tags', help: 'Comma separated' },
      { name: 'githubUrl', label: 'Source URL', type: 'url', half: true },
      { name: 'liveUrl', label: 'Live URL', type: 'url', half: true },
      ...displayFields,
    ],
  },
  experience: {
    label: 'Experience',
    singular: 'experience entry',
    icon: 'briefcase',
    primary: (x) => `${x.role} @ ${x.organization}`,
    secondary: (x) => formatRange(x.startDate, x.endDate, x.current),
    defaults: { visible: true, current: false, order: 0 },
    fields: [
      { name: 'role', label: 'Role', type: 'text', required: true, half: true },
      { name: 'organization', label: 'Organization', type: 'text', required: true, half: true },
      { name: 'startDate', label: 'Start', type: 'month', half: true },
      { name: 'endDate', label: 'End', type: 'month', half: true },
      { name: 'current', label: 'Current position', type: 'checkbox' },
      { name: 'guide', label: 'Guide / mentor', type: 'text', half: true },
      { name: 'teamSize', label: 'Team size', type: 'number', half: true },
      { name: 'highlights', label: 'Highlights', type: 'list', rows: 5, help: 'One bullet per line' },
      {
        name: 'subProjects',
        label: 'Sub-projects',
        type: 'pairs',
        itemLabel: 'sub-project',
        keys: [
          { key: 'title', label: 'Title' },
          { key: 'description', label: 'Description', textarea: true },
        ],
      },
      { name: 'tech', label: 'Tech', type: 'tags', help: 'Comma separated' },
      ...displayFields,
    ],
  },
  skills: {
    label: 'Skills',
    singular: 'skill',
    icon: 'code',
    primary: (s) => s.name,
    secondary: (s) => s.category,
    defaults: { visible: true, order: 0 },
    fields: [
      { name: 'name', label: 'Skill', type: 'text', required: true, half: true },
      { name: 'category', label: 'Category', type: 'text', required: true, half: true, suggest: 'category' },
      ...displayFields,
    ],
  },
  education: {
    label: 'Education',
    singular: 'education entry',
    icon: 'graduation',
    primary: (e) => e.institution,
    secondary: (e) => [e.degree, formatRange(e.startYear, e.endYear, e.current, formatYear)].filter(Boolean).join(' · '),
    defaults: { visible: true, current: false, order: 0 },
    fields: [
      { name: 'institution', label: 'Institution', type: 'text', required: true },
      { name: 'degree', label: 'Degree / board', type: 'text', required: true },
      { name: 'startYear', label: 'Start year', type: 'number', half: true },
      { name: 'endYear', label: 'End year', type: 'number', half: true },
      { name: 'current', label: 'Currently enrolled', type: 'checkbox' },
      { name: 'scoreLabel', label: 'Score label', type: 'text', half: true, placeholder: 'CGPA / Percentage' },
      { name: 'score', label: 'Score', type: 'text', half: true },
      { name: 'scoreNote', label: 'Score note', type: 'text', placeholder: 'e.g. till II semester' },
      { name: 'coursework', label: 'Coursework', type: 'list', rows: 4, help: 'One per line' },
      ...displayFields,
    ],
  },
  achievements: {
    label: 'Achievements',
    singular: 'achievement',
    icon: 'trophy',
    primary: (a) => a.title,
    secondary: (a) => [a.category, a.date].filter(Boolean).join(' · '),
    defaults: { visible: true, order: 0 },
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
      { name: 'category', label: 'Category', type: 'text', half: true, placeholder: 'Competition, Certification…' },
      { name: 'date', label: 'Date', type: 'text', half: true, placeholder: 'e.g. 2026' },
      { name: 'url', label: 'Link / credential URL', type: 'url' },
      ...displayFields,
    ],
  },
};

export const PROFILE_FIELDS = [
  { name: 'name', label: 'Full name', type: 'text', required: true, half: true },
  { name: 'location', label: 'Location', type: 'text', half: true },
  { name: 'headline', label: 'Headline', type: 'textarea', rows: 2, help: 'Shown under your name in the hero' },
  { name: 'roles', label: 'Rotating roles', type: 'list', rows: 3, help: 'One per line — cycles in the hero' },
  { name: 'currentFocus', label: 'Status line', type: 'text', help: 'Small line above your name' },
  { name: 'summary', label: 'About summary', type: 'textarea', rows: 7, help: 'Blank line between paragraphs' },
  { name: 'email', label: 'Public email', type: 'email', half: true },
  { name: 'resumeUrl', label: 'Résumé URL', type: 'url', half: true, help: 'e.g. /resume.pdf in client/public' },
  { name: 'socials.github', label: 'GitHub URL', type: 'url', half: true },
  { name: 'socials.linkedin', label: 'LinkedIn URL', type: 'url', half: true },
  { name: 'socials.website', label: 'Website URL', type: 'url' },
  { name: 'interests', label: 'Interests', type: 'tags', half: true, help: 'Comma separated' },
  { name: 'hobbies', label: 'Hobbies', type: 'tags', half: true, help: 'Comma separated' },
  {
    name: 'stats',
    label: 'Hero stats',
    type: 'pairs',
    itemLabel: 'stat',
    max: 6,
    keys: [
      { key: 'value', label: 'Value' },
      { key: 'label', label: 'Label' },
    ],
  },
];
