/**
 * Initial portfolio content. Everything here is taken from the resume
 * ("Samanvaya IIITD.pdf"). Edit it later from the /admin dashboard — this file only
 * bootstraps an empty database.
 */

export const profile = {
  name: 'Samanvaya Bhardwaj',
  headline: 'Full-stack developer working across backend systems, NLP and retrieval-augmented generation.',
  roles: ['Full-Stack Developer', 'M.Tech CSE @ IIIT Delhi', 'Research Intern @ Foodoscope'],
  summary:
    'I am an M.Tech (CSE) student at Indraprastha Institute of Information Technology, Delhi, and a research intern at Foodoscope, where I modernize backend services with Node.js, Express.js and MongoDB and built a unified backend gateway that centralizes authentication and routing across Foodoscope’s database services.\n\n' +
    'My work sits at the intersection of full-stack development, NLP, generative AI and machine learning — from DigiLocker-integrated admission workflows used by thousands of applicants to a production RAG system for Indian legal question answering with hybrid retrieval and real-time streaming.',
  email: 'samanvaya25082@iiitd.ac.in',
  location: 'Muzaffarnagar, Uttar Pradesh',
  currentFocus: 'Research Intern at Foodoscope · M.Tech (CSE) at IIIT Delhi',
  resumeUrl: '',
  socials: { github: '', linkedin: '', website: '' },
  interests: ['Full-stack systems', 'Machine Learning applications', 'Scalable web platforms'],
  hobbies: ['Sketching', 'Writing'],
  stats: [
    { label: 'M.Tech CGPA (till II semester)', value: '8.12' },
    { label: 'Coding problems solved', value: '350+' },
    { label: 'Applicants served by admission portal', value: '2,000–3,000+' },
  ],
};

const skillGroups = {
  'Expertise Areas': ['Full-Stack Development', 'NLP', 'Generative AI', 'Machine Learning', 'RAG'],
  Languages: ['Python', 'JavaScript', 'TypeScript', 'Java', 'SQL'],
  'Frontend & Backend': ['React.js', 'Node.js', 'Express.js', 'Socket.io', 'Tailwind', 'Bootstrap'],
  'Data & AI': ['MongoDB', 'Redis', 'Vector Databases', 'Embeddings', 'NumPy', 'Pandas', 'Scikit-learn'],
  'Tools & DevOps': ['Git/GitHub', 'Postman', 'VS Code', 'Linux', 'Docker', 'Nginx'],
};

export const skills = Object.entries(skillGroups).flatMap(([category, names], groupIndex) =>
  names.map((name, i) => ({ name, category, order: groupIndex * 100 + i })),
);

export const education = [
  {
    institution: 'Indraprastha Institute of Information Technology, Delhi',
    degree: 'M.Tech (CSE)',
    startYear: 2025,
    current: true,
    scoreLabel: 'CGPA',
    score: '8.12',
    scoreNote: 'till II semester',
    coursework: [
      'Machine Learning',
      'Computation in Medicine',
      'Network Security',
      'Graduate Systems (system design)',
      'Information Integration and Applications',
    ],
    order: 0,
  },
  {
    institution: 'LPU',
    degree: 'B.Tech (CSE)',
    startYear: 2020,
    endYear: 2024,
    scoreLabel: 'CGPA',
    score: '7.8',
    order: 1,
  },
  {
    institution: 'Indraprastha Public School, Morna',
    degree: 'CBSE',
    startYear: 2019,
    endYear: 2020,
    scoreLabel: 'Percentage',
    score: '80.6',
    order: 2,
  },
];

export const experience = [
  {
    role: 'Research Intern',
    organization: 'Foodoscope',
    startDate: '2026-01',
    current: true,
    guide: 'Ganesh Baglar',
    teamSize: 2,
    highlights: [
      'Developed and modernized Foodoscope’s backend using Node.js, Express.js, and MongoDB, stabilizing REST APIs, improving validation and response handling, and supporting analytics and administrative dashboard workflows.',
      'Designed and implemented a Unified Backend Gateway using a reverse in-app proxy, enabling centralized authentication and routing across FlavorDB, RecipeDB, RecipeDB3, SpiceRx, DietRx, CocktailDB, and Sustainable Food Database services.',
      'Developed cross-database REST APIs including a FlavorDB–RecipeDB Connections API, and established Swagger/Postman documentation and testing workflows for authentication, validation, pagination, error handling, and production deployment.',
    ],
    subProjects: [
      {
        title: 'Foodoscope Chatbot',
        description:
          'Deployed and maintained the Foodoscope Chatbot, handling backend integration, environment configuration, and production setup for reliable operation within the IIIT-Delhi network.',
      },
    ],
    tech: ['Node.js', 'Express.js', 'MongoDB', 'REST APIs', 'Reverse proxy', 'Swagger', 'Postman'],
    order: 0,
  },
];

export const projects = [
  {
    title: 'Production RAG System for Indian Legal Question Answering',
    summary:
      'A stateful multi-agent RAG pipeline that answers Indian legal questions with grounded, streamed responses.',
    startDate: '2026-03',
    endDate: '2026-06',
    teamSize: 3,
    highlights: [
      'Engineered a stateful multi-agent RAG pipeline for Indian legal question answering with real-time SSE streaming and grounded response generation.',
      'Implemented hybrid retrieval using vector search and BM25, with Nomic embeddings and BGE Cross-Encoder reranking for relevant document retrieval.',
      'Built the system using Python, React.js, Redis, Docker, Nginx, LangChain, and LangGraph, incorporating Redis caching for low-latency response delivery.',
    ],
    tech: ['Python', 'React.js', 'LangChain', 'LangGraph', 'Redis', 'Docker', 'Nginx', 'BM25', 'Nomic embeddings', 'BGE Cross-Encoder', 'SSE'],
    featured: true,
    order: 0,
  },
  {
    title: 'IIIT Delhi M.Tech Admission Portal',
    summary:
      'DigiLocker-integrated certificate retrieval and document submission for the IIIT Delhi M.Tech admission process.',
    startDate: '2026-01',
    endDate: '2026-04',
    guide: 'Pushpendra Kumar',
    highlights: [
      'Integrated DigiLocker APIs into the IIITD admission portal for secure certificate retrieval and digital verification.',
      'Improved admission workflows by resolving business-logic issues, strengthening validations, and redesigning key UI components.',
      'Implemented a hybrid document-submission system supporting both DigiLocker and manual uploads, enabling reliable document processing for 2,000–3,000+ applicants.',
    ],
    tech: ['DigiLocker APIs', 'Digital verification', 'Validation', 'UI components'],
    featured: true,
    order: 1,
  },
  {
    title: 'CNI Plugin Benchmarking on Multi-Architecture Distributed Systems',
    summary:
      'Benchmarking CNI plugins across heterogeneous hardware and network configurations for cloud-native deployments.',
    startDate: '2026-01',
    endDate: '2026-04',
    teamSize: 4,
    highlights: [
      'Designed and executed benchmarking experiments for CNI plugins across heterogeneous distributed systems with varying hardware architectures and network configurations.',
      'Analyzed latency and throughput across 64B–1024B packet sizes under Wi-Fi and hotspot-based deployments to evaluate networking performance.',
      'Built automated containerized testing environments using Linux networking utilities, generating performance insights for scalable cloud-native deployments.',
    ],
    tech: ['CNI plugins', 'Containers', 'Linux networking', 'Benchmarking', 'Distributed systems'],
    order: 2,
  },
];

export const achievements = [
  {
    title: 'Solved 350+ coding problems',
    description: 'Solved 350+ coding problems across platforms.',
    category: 'Problem Solving',
    order: 0,
  },
  {
    title: 'Prefinal Round — code-a-thon',
    description: 'Reached the prefinal round in a code-a-thon.',
    category: 'Competition',
    order: 1,
  },
];
