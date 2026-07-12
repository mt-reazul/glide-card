## The problem

GitHub Pages is a **static file host**. Your app is a TanStack Start SSR application — it needs a Node/Edge server runtime to render routes, run server functions (admin login, profile CRUD, backup/restore), and talk to the database. On GitHub Pages there is no server, so every route (`/`, `/admin`, everything) returns 404.

This isn't a config bug you can patch with a `_redirects` file or a `404.html` trick. The admin panel, passcode auth, and all the server functions built into this app **cannot run on GitHub Pages at all**.

## Options

### Option A — Keep using Lovable's hosting (recommended, zero work)
Your app is already live and working at:
- `https://glide-card.lovable.app`

Just share that URL, or connect a custom domain in Project Settings → Domains. Everything (SSR, admin panel, database) already works. GitHub sync stays useful for code backup/versioning.

### Option B — Deploy to a host that supports SSR
Point your GitHub repo at one of these instead of GitHub Pages:
- **Cloudflare Pages/Workers** — best match, same runtime Lovable uses
- **Vercel** — works with TanStack Start
- **Netlify** — works with TanStack Start

You'd disable GitHub Pages and connect the repo to one of the above. No code changes needed; they auto-detect the framework.

### Option C — (not viable) Make it work on GitHub Pages
Would require rewriting the app as a pure static SPA: remove all server functions, move admin auth to client-side (insecure), and replace database calls with something else. This throws away most of what's built. Not recommended.

## My recommendation

Stick with **Option A** — you already have a working public URL at `glide-card.lovable.app`. If you want a custom domain, connect it via Project Settings → Domains.

If you specifically need to self-host from your GitHub repo, tell me which host from Option B and I can add any config files that platform needs.
