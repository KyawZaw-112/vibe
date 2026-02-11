# Admin login integration (`/admin/login`)

Use `signInAsAdmin` in your login page so admin verification is handled in one call.

```ts
import { signInAsAdmin } from '@/src/lib/admin-auth';

const result = await signInAsAdmin(supabase, { email, password });

if (!result.ok) {
  setError(result.error);
  return;
}

router.push('/admin');
```

## If you prefer manual flow

```ts
const { error: signInError } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (signInError) {
  setError(signInError.message);
  return;
}

const admin = await checkAdminAccess(supabase);
if (!admin.ok) {
  await supabase.auth.signOut();
  setError(
    admin.reason === 'NOT_ADMIN'
      ? 'You do not have admin access'
      : admin.error ?? 'Unable to verify admin access',
  );
  return;
}

router.push('/admin');
```

## Required backend setup

Run:

- `backend/sql/001_admin_access_setup.sql`

Then insert an admin user row:

```sql
insert into public.admin_users (user_id)
values ('<auth_user_uuid>')
on conflict (user_id) do nothing;
```
