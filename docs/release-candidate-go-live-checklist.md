# PTI Release Candidate Go-Live Checklist

Use this after `20260914060000_pti_final_gap_closure_release_candidate.sql` has been pushed.

## Automated gates

- [ ] `nvm use`
- [ ] `npm ci`
- [ ] `npm run release:check`
- [ ] `npx supabase migration list` shows local = remote through `20260914060000`
- [ ] `npm run qa:release` passes against the intended database, or all release QA SQL files pass in SQL Editor
- [ ] `npm run db:backup` creates a verified dump
- [ ] restore drill has been performed against a disposable database
- [ ] `npm run safe-export` produces a clean archive

## Membership / privacy

- [ ] Normal member cannot set designation through a direct API request
- [ ] Normal member cannot change issuance state, member number, org scope or public verification token
- [ ] New membership requires accepted declaration and owned photo path
- [ ] Existing cards are regenerated so QR links use random verification tokens
- [ ] Unknown and inactive public verification references produce the same public result
- [ ] Masked member export is the normal workflow
- [ ] Full-PII export requires a meaningful reason and appears in audit records

## Authentication

- [ ] Production redirect URL for `/login?recovery=1` is allowed in Supabase Auth URL configuration
- [ ] Signup, login, forgot password and reset password work on the production domain
- [ ] Leaked-password protection is enabled in hosted Supabase Auth
- [ ] Privileged accounts use the chosen MFA policy
- [ ] SMTP sender/domain is production-ready
- [ ] CAPTCHA/bot controls are configured if required for the launch risk profile
- [ ] Phone login remains hidden unless an SMS provider is configured and tested

## Finance

Use separate test identities for the workflow.

- [ ] Recorder can record donation
- [ ] Recorder cannot verify the same donation
- [ ] Different finance user can verify
- [ ] Recorder cannot reconcile the same donation
- [ ] Verifier cannot reconcile the same donation
- [ ] Third authorized finance user can reconcile a verified donation
- [ ] Adjustment/reversal history stays append-only
- [ ] Receipt version history remains intact

## Authorization / operations

- [ ] Legacy `admin` can manage members
- [ ] Active `super_admin` can manage the same membership workflows
- [ ] District/division/province coordinators cannot access sibling/out-of-scope records
- [ ] Volunteer self-service does not grant coordinator authority
- [ ] Attendance QR expired/closed-session behavior is verified
- [ ] Leadership drill-down respects hierarchy scope
- [ ] Notification targeting reaches only intended recipients

## Infrastructure / monitoring

- [ ] Vercel security headers are visible on the deployed response, or equivalent headers are configured on the actual host
- [ ] Supabase backups/PITR retention is verified
- [ ] Error/uptime monitoring provider is connected and alert routing is tested
- [ ] Production database/security advisors are reviewed after the final migration
- [ ] Service-role key exists only in server environment variables
- [ ] `.env.local`, backups and exported data are absent from Git and shared ZIPs

## PWA / notifications

- [ ] `manifest.json` installs correctly on target devices
- [ ] New service worker activates and obsolete cache versions are removed
- [ ] In-app notification inbox and unread badge work
- [ ] If Web Push is enabled, subscription, sender worker, retry/failure handling and `notificationclick` navigation are tested end-to-end

## Final release decision

Do not treat a successful frontend build alone as production approval. Release only after database QA, auth recovery, finance maker/checker, backup/restore and role-scope tests have all been exercised against the release candidate.
