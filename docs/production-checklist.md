# Production Checklist

## Deployment target for this week

Use a Node host with persistent disk or volume support.

Good fits:

- Railway with persistent volume
- Render with persistent disk
- Fly.io with attached volume
- a VPS or cloud VM you control

Do not deploy this exact build to an environment where filesystem writes are ephemeral unless you first replace `DATA_DIR` storage with managed database and object storage.

## Required environment variables

- `APP_URL`
- `APP_ACCESS_CODE`
- `SESSION_SECRET`
- `DATA_DIR`

Optional but recommended:

- `APP_ACCESS_EMAILS`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `SERVER_ACTIONS_ALLOWED_ORIGINS`
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` for multi-instance self-hosting

## Security steps before customer use

1. Replace the founder access-code flow with SSO-capable auth for any non-internal production use.
2. Put the app behind HTTPS only.
3. Store `DATA_DIR` on encrypted disk or encrypted volume.
4. Rotate `SESSION_SECRET` and use a long random value.
5. Back up the private data directory daily.
6. Restrict host and firewall access to SSH and HTTPS only.
7. Keep `SERVER_ACTIONS_ALLOWED_ORIGINS` as hostnames only when a reverse proxy is in front of the app.
8. Verify private routes emit `no-store` and `X-Robots-Tag: noindex` headers.

## Application checks

1. `npm run lint`
2. `npm run typecheck`
3. `npm run build`
4. Verify login works with the configured allowlist.
5. Save a vault artifact.
6. Save an intake.
7. Generate a draft.
8. Confirm audit events are written.
9. Hit `/api/health` and confirm it returns `status: ok`.
10. Download `/api/private/export` while authenticated and confirm the JSON backup contains your latest records.

## OpenAI runtime notes

This build uses the OpenAI Responses API when `OPENAI_API_KEY` is present.

Official references:

- [Quickstart](https://developers.openai.com/api/docs/quickstart)
- [Responses migration guide](https://developers.openai.com/api/docs/guides/migrate-to-responses)
- [GPT-5.4 mini model page](https://developers.openai.com/api/docs/models/gpt-5.4-mini)

Inference:

`gpt-5.4-mini` is the best default here because it supports the Responses API, structured outputs, and tool use, while being materially cheaper than full `gpt-5.4`.

## Honest launch framing

For this week, market it as:

"An AI-made, AI-operated customer assurance workspace for early pilot teams."

Avoid claiming:

- autonomous final answer submission
- enterprise-ready compliance automation
- public trust-center maturity you do not actually have yet
