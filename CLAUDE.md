# Mini-JAMMS

A proof-of-concept public defect reporting system: a public web form (no login) and a simple admin view.

## Stack
- Database: Postgres on Supabase. Connect with a standard Postgres connection string using psycopg 3. Do not use the Supabase client library for database access. The Supabase Data API is disabled.
- File storage: Supabase Storage, accessed only through api/storage.py so it can be swapped for Azure Blob Storage.
- API: Python 3.13, FastAPI, Pydantic. Lives in api/.
- Frontend: React, TypeScript, Vite, Tailwind CSS, shadcn/ui. Lives in web/.
- Tests: pytest. CI: GitHub Actions.
- Hosting: API on Railway via api/Dockerfile. Frontend on Vercel.

## Layout
- api/                 FastAPI app, requirements.txt, Dockerfile, tests/
- web/                 React app
- db/migrations/       numbered SQL files, applied by hand in the Supabase SQL editor
- .github/workflows/   CI

## Rules
- Business logic and validation live in the API. The frontend may validate for user experience only.
- Write SQL by hand with parameterised queries. No ORM. Never build SQL with string formatting.
- Secrets come from environment variables. Never write a secret into a committed file. Never read or print any .env file.
- Keep it small. No authentication, offline sync, maps or image classification. Do not add features that were not asked for.
- Prefer the simplest code that works. The owner must be able to explain every file.

## Working style
- One task at a time. Stop after each task and summarise what changed and why, in plain language.
- The owner is strong in SQL and data modelling, and new to Python APIs, React, TypeScript, testing and CI. Explain those. Do not explain SQL basics.
- Before finishing any task that changes code, have the code-reviewer subagent review it.
- Run interactive installers in the owner's own terminal, not here. Never use sudo.
