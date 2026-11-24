-- Removes CBAM AI leftovers from the PUBLIC schema, created by earlier partial runs.
-- The live app uses the "cbam" schema and is NOT affected. Nothing in "cbam" is touched.
-- Tables of the other app that share names (organizations, profiles, memberships, invitations,
-- notifications, audit_logs, products) are NOT dropped.
-- Safe to run more than once. It aborts without changing anything if a target table holds rows.

do $$
declare
  t text; n bigint; r record; f text; src text;
  tbls text[] := array['activity_data','authorization_records','calculation_results','carbon_price_evidence','cbam_declarations',
    'certificate_estimates','compliance_tasks','document_revisions','documents','emissions_factors','emissions_records','imports',
    'methodologies','product_classifications','production_facilities','regulatory_sources','regulatory_updates','reporting_periods',
    'supplier_submissions','supplier_users','suppliers'];
begin
  -- 1. Safety check: refuse if any of these public tables contains data.
  foreach t in array tbls loop
    if to_regclass('public.'||t) is not null then
      execute format('select count(*) from public.%I', t) into n;
      if n > 0 then raise exception 'public.% has % row(s). Aborting so nothing is lost. Review it first.', t, n; end if;
    end if;
  end loop;

  -- 2. Policies on shared tables that reference my helper functions (matched by content, not by name).
  for r in select schemaname, tablename, policyname from pg_policies
           where schemaname = 'public'
             and (coalesce(qual,'') ilike '%cbam\_%' or coalesce(with_check,'') ilike '%cbam\_%')
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    raise notice 'dropped policy % on %', r.policyname, r.tablename;
  end loop;

  -- 3. Audit triggers on shared tables that call MY audit_row (matched by function content).
  select pg_get_functiondef(p.oid) into src from pg_proc p where p.pronamespace='public'::regnamespace and p.proname='audit_row' limit 1;
  if src is not null and src ilike '%table_name, row_id, action, old_data%' then
    for r in select c.relname as tbl, tg.tgname from pg_trigger tg join pg_class c on c.oid = tg.tgrelid
             join pg_proc p on p.oid = tg.tgfoid
             where not tg.tgisinternal and p.proname = 'audit_row' and p.pronamespace = 'public'::regnamespace
               and c.relnamespace = 'public'::regnamespace
    loop
      execute format('drop trigger %I on public.%I', r.tgname, r.tbl);
      raise notice 'dropped trigger % on %', r.tgname, r.tbl;
    end loop;
  end if;

  -- 4. Drop the CBAM-only tables.
  foreach t in array tbls loop execute format('drop table if exists public.%I cascade', t); end loop;

  -- 5. Drop functions only if their source is recognisably mine.
  for r in select p.oid, p.oid::regprocedure as sig, p.proname from pg_proc p
           where p.pronamespace = 'public'::regnamespace
             and p.proname in ('cbam_is_member','cbam_member_role','cbam_can_write','cbam_is_admin','cbam_is_supplier_user','cbam_supplier_in_my_org',
               'accept_supplier_invite','submit_supplier_data','log_reminder','ensure_workspace','guard_declaration','seed_org','audit_row','accept_invitation')
  loop
    src := pg_get_functiondef(r.oid);
    if src ilike '%cbam\_%' or src ilike '%regulatory_sources%' or src ilike '%supplier_submissions%' or src ilike '%table_name, row_id, action, old_data%'
       or src ilike '%supplier_users%' or src ilike '%from invitations where token%' then
      execute format('drop function if exists %s cascade', r.sig);
      raise notice 'dropped function %', r.sig;
    else
      raise notice 'kept function % (does not look like mine)', r.sig;
    end if;
  end loop;
end $$;

-- Left alone on purpose:
--  * Columns I added to the other app's tables (products.cn_code etc.): harmless, nullable, empty. Say so if you want them dropped.
--  * Whether row level security is enabled on shared tables: I cannot know the original state.
--  * The empty storage bucket "documents": delete it in the dashboard under Storage if you like.
