# Samanvaya Bhardwaj — Portfolio

A MERN portfolio with an interactive Three.js hero, a JWT-protected admin dashboard, and Socket.IO real-time sync. All portfolio content lives in MongoDB. Nothing is hardcoded in React.

```
React + Vite ── REST (/api) ──► Express ──► MongoDB   (source of truth)
     ▲                              │
     └──── Socket.IO events ◄───────┘                 (change notifications only)
```

## Features

- **Public site** with Hero, About, Skills, Education, Experience, Projects, Achievements and Contact. It is responsive from 320px up to wide desktop.
- **3D "embedding space"** built with React Three Fiber. Clustered points stand for document chunks, and a query vector moves through them, retrieving its top-k nearest neighbours in real time. It's a visual nod to the RAG work in the projects. Performance guards:
  - lazy-loaded chunk
  - DPR clamp
  - fewer points on mobile
  - pauses when off-screen or when the tab is hidden
  - honours `prefers-reduced-motion`
  - static fallback when WebGL isn't available
- **Admin dashboard at `/admin`** with full CRUD for projects, skills, experience, education and achievements, plus a profile editor, a contact-message inbox (read/unread/delete/reply) and a password change page. Each item has an order and a visible/hidden flag.
- **Real-time sync.** Every committed write is broadcast. Open portfolio tabs update without a refresh, hidden items disappear immediately, and admins get new contact messages live. Clients refetch after a reconnect so they can't drift out of sync.
- **Live chat.** Visitors can chat with you from a floating widget without signing up. The first message creates a conversation and gives the visitor a random session token, stored in their browser, so the chat survives reloads and syncs across tabs. The server only stores a SHA-256 hash of the token. The dashboard's Live chat page shows every conversation with presence (is the visitor still on the site?), typing indicators and unread badges. Visitors see whether you're online. Both sides can send files up to 5 MB (PDF, DOC/DOCX, TXT, PNG/JPG/WEBP), such as a résumé or a job description. Files are stored in MongoDB GridFS. Each file's content is checked against its extension. Only the admin or that chat's visitor can download a file, and it is always served as a download. Chats are rate-limited per socket and per IP, and they expire after 90 days of inactivity. A background job then removes their files.
- **Security:**
  - bcrypt (12 rounds)
  - JWT bearer auth
  - login and contact rate limiting
  - zod validation that strips unknown keys
  - URL allow-listing (blocks `javascript:` URLs)
  - honeypot spam field
  - Helmet
  - CORS allow-list
  - 100 KB body limit
  - contact messages go only to authenticated sockets
- **SEO/a11y:**
  - meta, Open Graph and Person JSON-LD, synced from the profile
  - `robots.txt` (admin excluded) and `noindex` on admin pages
  - semantic landmarks, skip link, focus styles, ARIA on forms and menus

## Project structure

```
server/src
  config/        env loading + validation, Mongo connection
  models/        Admin, Profile (singleton), content collections, Message
  validators/    zod schemas (create + auto-derived partial update schemas)
  middleware/    auth (JWT), validation, error handling
  controllers/   generic CRUD factory (persist → broadcast)
  routes/        auth, profile, messages, generic content router, COLLECTIONS registry
  socket/        Socket.IO server, admin room, broadcast helpers
  seed/          data.js (from the résumé) + seed.js
client/src
  api/           fetch client (JWT, error mapping) + shared socket
  context/       PortfolioContext (data + live patches), AuthContext
  three/         EmbeddingScene, data generation, GLSL shaders
  components/    layout (Navbar, Footer), sections/*, ui/*
  admin/         AdminApp, layout, config-driven ResourceForm/ResourcePage, pages/*
  styles/        global.css (design tokens), admin.css
```

To add a new content section:

1. Add a model and a zod schema.
2. Add one entry to `COLLECTIONS` in `server/src/routes/index.js`.
3. Add one entry to `RESOURCES` in `client/src/admin/resources.js`.

CRUD, validation, sync and the admin UI come with it automatically.

## Setup

**Requirements:** Node 20.19+ and MongoDB 6+ (local, Docker, or Atlas).

```bash
npm install                                   # installs root, server and client (npm workspaces)
cp server/.env.example server/.env            # then edit: JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, MONGODB_URI
npm run seed                                  # creates the admin user + inserts résumé content
npm run dev                                   # API on :5000, site on http://localhost:5173
```

- Admin login is at http://localhost:5173/admin with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
- `npm run seed` is safe to re-run. It only fills empty collections and resets the admin password to the `.env` value.
- `npm run seed:reset -w server` wipes the content collections and re-inserts them. Messages are kept.
- No local MongoDB? Start one with `docker run -d -p 27017:27017 --name mongo mongo:7`.

### Résumé download

Put a PDF in `client/public/` (e.g. `resume.pdf`), then set **Profile → Résumé URL** to `/resume.pdf` in the dashboard. The download buttons only appear once that field is set. GitHub, LinkedIn and project links work the same way.

## Deploy for free (Render + MongoDB Atlas)

1. **Atlas:** create a free M0 cluster and a database user.
   - Under Network Access, allow `0.0.0.0/0`.
   - Copy the `mongodb+srv://…/portfolio` connection string.
2. **Seed Atlas from your machine:** set `MONGODB_URI` in `server/.env` to the Atlas string, then run `npm run seed`.
3. **Push this repo to GitHub.**
4. **Render:** go to New → **Blueprint**, pick the repo, and paste `MONGODB_URI` when prompted. `render.yaml` sets up everything else, including a generated `JWT_SECRET`.
5. Open `https://<service>.onrender.com`. The admin dashboard is at `/admin`.

Free Render services sleep after about 15 minutes idle, so the first request after that takes around 30–60 s. Every push to the default branch redeploys automatically.

## Production

```bash
npm run build                  # builds client/dist
NODE_ENV=production npm start  # Express serves the API, Socket.IO and client/dist on one origin
```

If you host the client separately (e.g. Vercel/Netlify):

- Set `VITE_API_URL` to the API origin at build time.
- Add the site origin to `CLIENT_ORIGIN` on the server.

Behind Nginx, forward the WebSocket upgrade for `/socket.io/`:

```nginx
location /socket.io/ {
  proxy_pass http://localhost:5000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
}
```

## API

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/portfolio` | – | Profile + all visible content in one call |
| GET | `/api/{skills,education,experience,projects,achievements}` | optional | List (admins also see hidden items) |
| GET | `/api/:resource/:id` | optional | Single item |
| POST | `/api/:resource` | admin | Create |
| PUT | `/api/:resource/:id` | admin | Partial update |
| DELETE | `/api/:resource/:id` | admin | Delete |
| GET / PUT | `/api/profile` | – / admin | Read / replace profile |
| POST | `/api/messages` | – (rate-limited) | Contact form |
| GET / PATCH / DELETE | `/api/messages[/:id]` | admin | Inbox management |
| POST | `/api/auth/login` | – (rate-limited) | Returns JWT |
| GET | `/api/auth/me` | admin | Current admin |
| POST | `/api/auth/change-password` | admin | Change password |
| GET | `/api/admin/stats` | admin | Dashboard counts |
| GET | `/api/health` | – | Health + DB status |

Errors always have the shape `{ "error": { "message", "details?": [{ "field", "message" }] } }`.

**Socket events:**

- `content:changed` `{ resource, action: created|updated|deleted, item?, id? }` goes to everyone.
- `message:new` and `message:changed` go to the admin room only.

## Notes

- The JWT is stored in `localStorage` and sent as a bearer token. That keeps things simple and CSRF-free, but it's readable by any XSS. The app renders no user-supplied HTML, and all links are validated server-side.
- Content comes only from the résumé. Social links, project URLs and the résumé file are empty until you add them in the dashboard.
