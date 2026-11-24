-- Quick patch for the "Database error saving new user" error. Safe to run more than once.
grant usage on schema cbam to supabase_auth_admin;
grant execute on function cbam.handle_new_user() to supabase_auth_admin;
grant select, insert on all tables in schema cbam to supabase_auth_admin;
