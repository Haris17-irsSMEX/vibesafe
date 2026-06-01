# Phase 1C — Repository Listing + Connection UX Audit

## Files Changed

| File | Action |
|---|---|
| `services/github/RepoFetcher.ts` | **NEW** — GitHub API repository fetcher |
| `services/github/getConnectedRepositories.ts` | **NEW** — Server-side loader (decrypt + fetch) |
| `app/api/auth/github/disconnect/route.ts` | **NEW** — POST disconnect endpoint |
| `app/dashboard/connect/page.tsx` | **MODIFIED** — uses `getConnectedRepositories`, passes repo data |
| `app/dashboard/connect/ConnectPageClient.tsx` | **MODIFIED** — full repo card UI, all alert/loading states |
| `app/api/auth/github/route.ts` | **MODIFIED** — removed debug console.log |

---

## Repository Loading Architecture

```
Browser request → /dashboard/connect (Server Component)
  │
  ├─ createClient() → Supabase auth.getUser() [session verified]
  │
  └─ getConnectedRepositories()
       │
       ├─ connected_repos.select('github_login, connected_at, github_token')
       │   .eq('user_id', user.id)                [user_id from session]
       │
       ├─ decryptToken(github_token)              [AES-256-GCM, server only]
       │
       └─ fetchUserRepositories(plainToken)
            │
            └─ GET api.github.com/user/repos      [token used here]
                 │
                 └─ Returns SafeRepo[]            [token discarded]
                       │
                       ↓
            ConnectPageClient (Client Component)
            receives: SafeRepo[] with NO token
```

The token **never crosses the server/client boundary**.

---

## Token Security Explanation

- **Storage**: AES-256-GCM encrypted in `connected_repos.github_token`
- **Decryption**: Server-side only in `getConnectedRepositories.ts`; token used then discarded
- **Client exposure**: Client receives only `SafeRepo[]` — no token present
- **Network tab**: Token never appears in browser requests or HTML
- **Logging**: Error handlers log messages only, never token values
- **localStorage/sessionStorage**: Not used in this flow
- **Disconnect**: POST `/api/auth/github/disconnect` derives `user_id` from Supabase session only

---

## UX / Loading / Alerts Added

### Alert States
| State | Trigger | UI |
|---|---|---|
| GitHub connected successfully | `?success=true` | Green banner |
| GitHub disconnected successfully | Successful disconnect POST | Grey banner |
| OAuth error | `?error=<code>` | Red banner |
| Disconnect error | fetch failure | Red banner |
| Token expired / revoked | `repoError === 'invalid_token'` | Amber banner |
| Rate limit reached | `repoError === 'rate_limited'` | Amber banner |
| Network error | `repoError === 'network_error'` | Amber banner |

### Loading / Disabled States
- **Disconnect** button: spinner + "Disconnecting…" while in-flight; `disabled` prevents double-clicks
- **Scan buttons** on repo cards: permanently disabled with `aria-disabled` until next phase

### Repository Cards
Each card shows: name, full_name, public/private badge, default branch, relative updated date, GitHub link, disabled scan button

---

## Known Limitations

1. **Pagination**: Max 100 repos (GitHub `per_page` limit); pagination deferred to Phase 1D
2. **No search/filter**: Client-side filter can be added in Phase 1D
3. **Token expiry**: Detected only when fetch is attempted, not at page load
4. **Org repos**: May not appear if org restricts third-party OAuth access

---

## Verification Results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `/dashboard/connect` loads | ✅ |
| GitHub username appears | ✅ |
| Repository cards appear | ✅ |
| Token not visible in browser/network | ✅ |
| Disconnect works | ✅ |
| Reconnect works | ✅ |
| Loading/disabled states present | ✅ |
| No raw stack traces in UI | ✅ |
| Debug console.log removed | ✅ |

---

## Recommended Next Phase: Phase 1D — Scan Initiation

**Scope**:
- `scans` table (id, user_id, repo_full_name, status, created_at)
- `POST /api/scan/start` — verifies user, decrypts token, creates scan record
- Replace disabled "Scan" button with real "Start Scan"
- Show scan status on repo card
- `/results` page listing scans

**Do NOT implement** until Phase 1D is confirmed: DeepSeek, payments, file content fetching, vulnerability rendering.
