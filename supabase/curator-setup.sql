-- Run this once in the Supabase Dashboard SQL Editor after replacing the email.
-- It grants publishing access only to that existing authenticated account.
-- Never run this with an email you do not control.

insert into public.curator_roles (user_id, role)
select id, 'admin'
from auth.users
where email = 'replace-with-your-login-email@example.com'
on conflict (user_id) do update set role = excluded.role;

-- Optional verification: it should return your assigned role.
select u.email, r.role, r.created_at
from public.curator_roles r
join auth.users u on u.id = r.user_id;
