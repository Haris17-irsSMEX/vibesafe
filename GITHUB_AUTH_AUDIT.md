# GitHub Authorization Audit

## 1. Architecture Overview

VibeSafe uses **two completely separate authorization systems**:

| System | Purpose | Technology |
|--------|---------|------------|
| Supabase Auth | User identity ("who is this user?") | `@supabase/ssr` OAuth via GitHub |
| GitHub OAuth | Repository access ("which repos can VibeSafe scan?") | Direct GitHub OAuth App |

These systems are entirely isolated. A user can be authenticated via Supabase without having connected any repositories, and vice versa.

---

## 2. Separation from Supabase Auth

- Supabase Auth callback: `/auth/callback` — exchanges Supabase auth code, creates user session
- GitHub OAuth callback: `/api/auth/github/callback` — exchanges GitHub code, stores encrypted token

**There is no token mixing.** GitHub access tokens are never stored in the Supabase session. Supabase session cookies never contain GitHub credentials.

---

## 3. OAuth Flow Diagram

### User Login Flow (Supabase)
```
User → /login → Supabase GitHub OAuth → /auth/callback → Session Cookie → /dashboard
```

### Repository Authorization Flow (GitHub OAuth App)
```
Authenticated User
→ /dashboard/connect (Connect GitHub button)
→ GET /api/auth/github           (sets CSRF state cookie, redirects)
→ GitHub Authorization Screen    (scope: repo, read:user)
→ GET /api/auth/github/callback  (validates state, exchanges code)
→ encryptToken(access_token)     (AES-256-GCM)
→ connected_repos.upsert()       (encrypted token stored)
→ /dashboard/connect?success=true
```

---

## 4. Token Storage Design

Tokens are stored in the `connected_repos` table with the following schema:

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → auth.users |
| `github_user_id` | bigint | GitHub numeric user ID |
| `github_login` | text | GitHub username |
| `github_token` | text | **AES-256-GCM encrypted** token |
| `token_scope` | text | OAuth scopes granted |
| `connected_at` | timestamptz | When authorized |

One row per user (upserted on `user_id`). Reconnecting updates the existing row.

---

## 5. Encryption Design

**Algorithm:** AES-256-GCM  
**Key:** 32-byte key from `GITHUB_TOKEN_ENCRYPTION_KEY` env var (hex-encoded, 64 chars)  
**IV:** 96-bit (12 bytes) randomly generated per encryption  
**Storage format:** `{iv_hex}:{ciphertext_hex}`

```
GitHub Token (plaintext)
→ encryptToken()           [lib/security/encryption.ts]
→ Random 96-bit IV
→ AES-256-GCM encrypt
→ "ivhex:ciphertexthex"    [stored in database]
```

```
Database value
→ decryptToken()           [lib/security/encryption.ts]
→ Split iv:ciphertext
→ AES-256-GCM decrypt
→ GitHub Token (plaintext) [used server-side only for API calls]
```

The decrypted token is **never returned to the client** and **never logged**.

---

## 6. Protected Routes Involved

| Route | Guard |
|-------|-------|
| `GET /api/auth/github` | Supabase session check (`getUser()`) — redirects to `/login` if not authenticated |
| `GET /api/auth/github/callback` | CSRF state cookie validation + Supabase session check |
| `/dashboard/connect` | Middleware + server-side `getUser()` + `redirect('/login')` |

---

## 7. Known Risks

1. **Token rotation not implemented.** GitHub OAuth tokens don't expire unless revoked. Future work should periodically verify tokens are still valid before use.
2. **`connected_repos` table must be created manually** in Supabase with the schema described above before the callback can store data. The upsert will fail silently if the table is missing.
3. **No per-repository selection yet.** The current phase authorizes an entire GitHub account (`repo` scope). Fine-grained repository selection is a Phase 2 concern.
4. **One connection per user.** The `upsert({ onConflict: 'user_id' })` strategy means reconnecting replaces the previous token, which is correct behavior but means only one GitHub account per VibeSafe user.

---

## 8. Recommended Next Phase

With GitHub authorization stable, the next phase should be:

1. **Create the `connected_repos` table** in Supabase with the schema above and enable RLS (`user_id = auth.uid()`).
2. **Repository listing:** Use the stored (decrypted) token to fetch the list of repositories the user has access to via `GET /user/repos`.
3. **Repository selection UI:** Let the user pick which repo to scan from their connected account.
4. **Scan lifecycle initiation:** Create scan records in a `scans` table and begin the DeepSeek analysis pipeline.
