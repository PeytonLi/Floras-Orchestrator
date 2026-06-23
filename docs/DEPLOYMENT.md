# Deploying Floras Orchestrator

## Prerequisites

- Node.js 18+
- pnpm 8+
- Optional: Neo4j (AuraDB free tier), Supabase project, DeepSeek API key

## Environment variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Required? | Purpose |
|---|---|---|
| `NEO4J_URI` | No | Bolt URI for Neo4j graph database |
| `NEO4J_USER` | No | Neo4j username |
| `NEO4J_PASSWORD` | No | Neo4j password |
| `SUPABASE_URL` | No | Supabase project URL |
| `SUPABASE_ANON_KEY` | No | Supabase anonymous key |
| `LLM_ENABLED` | No | Set to `true` to use real LLM agents |
| `LLM_PROVIDER` | No | Provider name (deepseek, openai, groq) |
| `LLM_API_KEY` | No | API key for the LLM provider |
| `LLM_MODEL` | No | Model name |
| `LLM_BASE_URL` | No | API base URL |
| `LLM_TEMPERATURE` | No | LLM temperature (0-2) |
| `LLM_MAX_TOKENS` | No | Max tokens per LLM call |

## Deployment options

### Vercel (recommended for Next.js)

1. Push to a GitHub repository
2. Import the project in Vercel
3. Set the build command to `pnpm build`
4. Set the output directory to `.next`
5. Add environment variables in Vercel's project settings

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY . .
RUN pnpm install
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
```

### Bare metal / VPS

```bash
git clone <repo>
cp .env.example .env
# Edit .env with your keys
pnpm install
pnpm build
pnpm start  # or use PM2: pm2 start pnpm -- start
```

## Health check

The dashboard is available at `http://localhost:3000`. No separate health
endpoint is exposed — if the page loads, the service is healthy.

## Production checklist

- [ ] `.env` file is configured with production values
- [ ] `LLM_ENABLED=true` if using real AI agents
- [ ] Neo4j instance is provisioned and reachable
- [ ] Supabase project is created (optional, for durable storage)
- [ ] Custom domain is configured (if using Vercel)
- [ ] SSL/TLS is enforced
