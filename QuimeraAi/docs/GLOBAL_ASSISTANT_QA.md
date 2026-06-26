# Global Assistant QA

## Automated coverage added in GA1

Run:

```bash
npm run test:run -- tests/services/globalAssistant*.test.ts
```

Coverage:

- Memory scope validation.
- User/project/admin memory isolation.
- Admin memory inaccessible in user mode.
- Critical actions require confirmation.
- Admin actions blocked for normal users.
- Mutating actions require preview.
- Service and feature gates block unavailable modules.
- Runtime creates task, loads memory, selects model, builds preview plan, and writes audit events.
- Project-scoped actions are blocked without active project context.
- OpenRouter model role metadata supports tool-loop checks.

## GA1 manual checks

- Confirm no dashboard UI behavior changed.
- Confirm existing AI Studio still receives dashboard initial prompts.
- Confirm ChatCore, ChatbotWidget, SocialChatInbox, LandingChatbotWidget, and Email AI Studio are not replaced or merged.
- Confirm `docs/GLOBAL_ASSISTANT_ARCHITECTURE.md` describes each existing chat surface.
- Confirm no Supabase migration was added in GA1.
- Confirm no module connector applies changes yet.

## Future manual QA

When GA4-GA10 land, manually verify:

- Dashboard request: "crea un website para X".
- Dashboard request: "genera una imagen para el hero".
- Switch project by chat.
- Edit website section by chat.
- Create product by chat.
- Create email campaign draft by chat.
- Create appointment by chat.
- Review leads by chat.
- Create Bio Page by chat.
- Train ChatCore by chat.
- Run analytics report by chat.
- Open Super Admin mode as owner.
- Attempt admin action as normal user.
- Review memory panel.
- Delete user memory.
- Continue an unfinished task.
- Confirm action preview.
- Roll back a supported action.

## Build and audit commands

Recommended for GA1:

```bash
npm run test:run -- tests/services/globalAssistant*.test.ts
npm run build
```

For UI PRs later:

```bash
npm run ds:audit
npm run type-check
```

If repo-wide `type-check` has pre-existing noise, run touched-file type checks and document the baseline.
