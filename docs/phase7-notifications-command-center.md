# PTI Phase 7 — Notifications & Operational Command Center

Phase 7 adds an in-app communications layer on top of the existing membership, volunteer, operations, attendance, finance and leadership foundations.

## Core model

- `notification_messages`: immutable published message metadata plus cancellation state.
- `notification_deliveries`: one per resolved authenticated recipient, with read/archive state.
- Direct client table access is revoked; reads and mutations flow through audited RPC boundaries.
- Public RPC wrappers are `SECURITY INVOKER`; privileged implementations remain in `app_private` as `SECURITY DEFINER` with an empty `search_path`.

## Targeting

A publisher chooses an organization scope and one audience:

- Entire scoped community
- Active members
- Active volunteers
- Organization role holders
- Finance role holders
- Operation participants
- Specific users (database contract; command-center UI intentionally does not expose arbitrary user targeting yet)

Recipient resolution happens server-side. Parent scopes can target descendants only when the authenticated actor has matching authority.

## Automatic operational messages

- New/reassigned duties create an immediate duty notification for the assigned volunteer.
- Operation status changes create an operation-update notification for current operation participants.
- Authorized operations users can run a deduplicated due-duty reminder sweep for duties starting in the next 1–168 hours.

## User experience

- `/notifications`: personal inbox, unread/read state, mark-all-read, archive, action links, load-more.
- `/command-center`: scoped publisher, role targeting, operation targeting, due reminder sweep, delivery/read metrics and cancellation.
- Header account badge refreshes on login, every 60 seconds, when the tab becomes visible, and when the inbox changes locally.

## Security notes

- Notification publishers are limited to authorized central/operations/coordinator/supervisor scopes. Operation coordinators may publish operation-specific messages for operations they manage.
- Auditors and finance leadership may view command-center reporting where their organization access permits but do not automatically gain publishing authority.
- Notification cancellation hides cancelled messages from active recipient inboxes without deleting the ledger row.
- Action URLs accept only relative app paths or HTTPS links.
