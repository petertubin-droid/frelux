# FRELUX API Documentation

## Supabase Backend

Frelux uses Supabase (PostgreSQL + Auth + Storage) as its backend.

### Base URL

All database operations go through the Supabase client configured in `src/lib/supabase.ts`.

### Authentication

- **Email/Password**: `supabase.auth.signInWithPassword({ email, password })`
- **Email OTP**: `supabase.auth.signInWithOtp({ email })`
- **Phone OTP**: `supabase.auth.signInWithOtp({ phone })` → `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`
- **OAuth**: `supabase.auth.signInWithOAuth({ provider: 'google' })`
- **Session**: Persisted automatically by `@supabase/supabase-js`

### Database Tables

#### Core Tables

| Table                 | Description                          | RLS            |
| --------------------- | ------------------------------------ | -------------- |
| `profiles`            | User profiles (extends `auth.users`) | Yes            |
| `pro_profiles`        | ProConnect professional profiles     | Yes            |
| `pro_categories`      | Service categories                   | No (read-only) |
| `pro_services`        | Services offered                     | Yes            |
| `pro_locations`       | Service areas                        | Yes            |
| `projects`            | User construction projects           | Yes            |
| `measurements`        | Project measurements/takeoffs        | Yes            |
| `paint_colors`        | Paint color database                 | No (read-only) |
| `paint_families`      | Color families                       | No (read-only) |
| `credit_wallets`      | User credit wallets                  | Yes            |
| `credit_transactions` | Credit history                       | Yes            |
| `reward_items`        | Reward catalogue                     | No (read-only) |
| `reward_redemptions`  | Reward redemption history            | Yes            |
| `ad_events`           | Ad interaction tracking              | Yes            |

### Query Patterns

```typescript
// Read with filter
const { data, error } = await supabase
  .from("projects")
  .select("*")
  .eq("user_id", userId)
  .order("created_at", { ascending: false });

// Insert
const { data, error } = await supabase
  .from("projects")
  .insert({ name, building_type, user_id: userId })
  .select()
  .single();

// Update
const { data, error } = await supabase
  .from("projects")
  .update({ status: "completed" })
  .eq("id", projectId);

// Delete
const { error } = await supabase.from("projects").delete().eq("id", projectId);
```

### Storage

- **Material images**: `supabase.storage.from('materials')`
- **Project plans**: `supabase.storage.from('plans')`
- **User avatars**: `supabase.storage.from('avatars')`

### Realtime

```typescript
// Subscribe to project changes
supabase
  .channel("projects")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "projects" },
    callback,
  )
  .subscribe();
```

### Client SDK

The app uses a typed wrapper in `src/lib/api/` that provides:

- `EntityName.list()` — list all records
- `EntityName.get(id)` — get single record
- `EntityName.create(data)` — create record
- `EntityName.update(id, data)` — update record
- `EntityName.delete(id)` — delete record
- `EntityName.filter(params)` — filtered query

### Rate Limits

Supabase applies rate limits on:

- Auth endpoints: 120 requests/minute
- REST API: 200 requests/minute per connection
- Storage: 100 uploads/minute

### Error Handling

All API calls return `{ data, error }`. The app uses a centralized error boundary and Sentry for production error reporting.
