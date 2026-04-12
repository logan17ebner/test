# DiligenceAI

React + Vite app for document intake, company-scoped analysis runs, and review flows. Analysis posts to an **n8n** webhook with **plain text** extracted from PDFs in the browser (**pdf.js**), then polls **Supabase** until the run completes.

## Requirements

- Node 18+ (npm)
- Environment variables (see below)

## Setup

```bash
npm install
cp .env.example .env.local
# Edit .env.local — required for analysis runs
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

## Environment variables

| Variable | Purpose |
|----------|---------|
| `VITE_N8N_WEBHOOK_URL` | n8n **webhook production URL** (path contains `/webhook/`). Do not use the workflow editor URL. |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key — used to poll `dilligencetable` until `status === 'complete'` after the webhook responds. |

Copy `.env.example` to `.env.local` and fill in values. `.env.local` is gitignored.

## How analysis works (documents → n8n)

1. **Upload** — Each file is stored in **IndexedDB** by document id (`src/utils/docFileCache.js`) so PDF bytes survive reloads; `localStorage` only keeps metadata (PDFs do not store base64 `content` there).
2. **Run analysis** — `Analysis.jsx` restores `File` objects from IndexedDB when needed, then `buildAnalysisWebhookPayload` sends ready PDFs as `{ name, type, file }` (no upstream `content`).
3. **`runDiligenceWorkflow`** — Uses **pdf.js** to extract text from each `File`, then POSTs JSON `{ companyName, companyId, documents }` where each document has string `content` (plain text) for n8n. The pdf.js worker is loaded via Vite’s `?url` import (`pdf.worker.min.mjs`).
4. **Polling** — The client polls Supabase (`dilligencetable`) for the completed `result` for that `companyId` / run id.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | ESLint |

## Stack

- React 19, React Router, Tailwind
- `@supabase/supabase-js`, `pdfjs-dist`
- Deploy-friendly static build (e.g. Vercel — see `vercel.json` if present)

## License

Private / see repository owner.
