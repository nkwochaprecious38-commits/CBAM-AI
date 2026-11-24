-- DESTRUCTIVE: removes every CBAM AI table and helper function in the public schema, including any data in them.
-- Only run this if the existing tables are from an earlier attempt and hold nothing you need.
-- Auth users are not touched. Run schema.sql afterwards.
drop table if exists audit_logs, notifications, regulatory_updates, regulatory_sources, certificate_estimates, carbon_price_evidence,
  authorization_records, compliance_tasks, cbam_declarations, document_revisions, documents, supplier_submissions, calculation_results,
  emissions_records, activity_data, emissions_factors, methodologies, imports, products, product_classifications, reporting_periods,
  production_facilities, supplier_users, suppliers, invitations, memberships, profiles, organizations cascade;
drop function if exists is_member(uuid), member_role(uuid), can_write(uuid), is_admin(uuid) cascade;
drop function if exists handle_new_user() cascade;
