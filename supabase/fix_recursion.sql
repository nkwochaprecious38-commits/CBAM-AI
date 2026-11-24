-- Fixes "infinite recursion detected in policy for relation suppliers". Safe to run more than once.
set search_path = cbam, public, extensions;

create or replace function cbam_is_supplier_user(p_supplier uuid) returns boolean
language sql stable security definer set search_path = cbam, public, extensions as $$
  select exists (select 1 from supplier_users where supplier_id = p_supplier and user_id = auth.uid());
$$;
create or replace function cbam_supplier_in_my_org(p_supplier uuid) returns boolean
language sql stable security definer set search_path = cbam, public, extensions as $$
  select exists (select 1 from suppliers s where s.id = p_supplier and cbam_is_member(s.org_id));
$$;
grant execute on function cbam_is_supplier_user(uuid), cbam_supplier_in_my_org(uuid) to authenticated, service_role;

drop policy if exists su_select on supplier_users;
create policy su_select on supplier_users for select using (user_id = auth.uid() or cbam_supplier_in_my_org(supplier_id));
drop policy if exists suppliers_portal_sel on suppliers;
create policy suppliers_portal_sel on suppliers for select using (cbam_is_supplier_user(id));
drop policy if exists subs_portal_sel on supplier_submissions;
create policy subs_portal_sel on supplier_submissions for select using (cbam_is_supplier_user(supplier_id));
drop policy if exists products_portal_sel on products;
create policy products_portal_sel on products for select using (cbam_is_supplier_user(supplier_id));
