-- PTI Phase 8 — Financial audit integrity tests
-- Read-only accounting/ledger assertions. No finance rows are changed.

begin;
set local statement_timeout = '60s';

-- Effective donation value can never become negative.
do $$
begin
  if exists (
    select 1
    from public.donations d
    where d.amount + coalesce((
      select sum(a.amount_delta)
      from public.donation_adjustments a
      where a.donation_id=d.id
    ),0) < 0
  ) then
    raise exception 'Finance integrity failure: a donation has negative effective value';
  end if;
end $$;

-- Reconciled current state requires current verification=verified and positive value.
do $$
begin
  if exists (
    select 1
    from public.donations d
    where app_private.latest_donation_reconciliation_state(d.id)='reconciled'::public.donation_reconciliation_state
      and (
        app_private.latest_donation_verification_state(d.id)<>'verified'::public.donation_verification_state
        or app_private.effective_donation_amount(d.id)<=0
      )
  ) then
    raise exception 'Finance integrity failure: reconciled donation is not currently verified/positive';
  end if;
end $$;

-- Receipt snapshots must equal the effective amount at the moment each receipt
-- was issued. This validates append-only adjustments + versioned receipt history.
do $$
begin
  if exists (
    select 1
    from public.donation_receipts r
    join public.donations d on d.id=r.donation_id
    where r.amount_snapshot <> d.amount + coalesce((
      select sum(a.amount_delta)
      from public.donation_adjustments a
      where a.donation_id=d.id
        and a.created_at <= r.issued_at
    ),0)
  ) then
    raise exception 'Finance integrity failure: receipt amount snapshot does not match historical ledger value';
  end if;
end $$;

-- Receipt versions must start at 1 and remain contiguous per donation.
do $$
begin
  if exists (
    select 1
    from (
      select donation_id, min(version) as min_version, max(version) as max_version, count(*) as versions
      from public.donation_receipts
      group by donation_id
    ) r
    where r.min_version<>1 or r.max_version<>r.versions
  ) then
    raise exception 'Finance integrity failure: receipt version sequence contains a gap';
  end if;
end $$;

-- Campaign-linked donations must preserve campaign currency and remain in the
-- campaign organization subtree.
do $$
begin
  if exists (
    select 1
    from public.donations d
    join public.fundraising_campaigns c on c.id=d.campaign_id
    where d.currency<>c.currency
      or not exists (
        select 1
        from public.organization_unit_closure tree
        where tree.ancestor_id=c.org_unit_id
          and tree.descendant_id=d.org_unit_id
      )
  ) then
    raise exception 'Finance integrity failure: campaign donation currency/scope mismatch';
  end if;
end $$;

-- Core finance history tables must retain append-only triggers.
do $$
declare
  missing text;
begin
  select string_agg(x.trigger_name, ', ' order by x.trigger_name)
  into missing
  from (
    values
      ('donations_append_only_guard'),
      ('donation_verification_events_append_only_guard'),
      ('donation_reconciliation_events_append_only_guard'),
      ('donation_adjustments_append_only_guard'),
      ('donation_receipts_append_only_guard')
  ) as x(trigger_name)
  where not exists (
    select 1 from pg_catalog.pg_trigger t
    where t.tgname=x.trigger_name and not t.tgisinternal
  );

  if missing is not null then
    raise exception 'Finance integrity failure: append-only triggers missing: %', missing;
  end if;
end $$;

-- Every ledger mutation should have a corresponding non-PII audit event.
do $$
begin
  if exists (
    select 1 from public.donations d
    where not exists (
      select 1 from public.audit_events a
      where a.action='finance_donation_recorded' and a.entity_type='donation' and a.entity_id=d.id
    )
  ) then
    raise exception 'Finance audit failure: donation without finance_donation_recorded audit event';
  end if;

  if exists (
    select 1 from public.donation_adjustments x
    where not exists (
      select 1 from public.audit_events a
      where a.action='finance_donation_adjustment_created' and a.entity_type='donation_adjustment' and a.entity_id=x.id
    )
  ) then
    raise exception 'Finance audit failure: adjustment without audit event';
  end if;

  if exists (
    select 1 from public.donation_receipts r
    where not exists (
      select 1 from public.audit_events a
      where a.action='finance_receipt_issued'
        and a.entity_type='donation'
        and a.entity_id=r.donation_id
        and a.detail->>'receipt_no'=r.receipt_no
    )
  ) then
    raise exception 'Finance audit failure: receipt without matching audit event';
  end if;
end $$;

select
  count(*) as donation_count,
  coalesce(sum(d.amount),0) as base_amount_total,
  coalesce((select sum(a.amount_delta) from public.donation_adjustments a),0) as adjustment_total,
  coalesce(sum(app_private.effective_donation_amount(d.id)),0) as effective_amount_total
from public.donations d;

select 'PASS: finance ledger integrity' as result;
rollback;
