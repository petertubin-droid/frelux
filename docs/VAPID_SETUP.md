# VAPID Key Generation (for Push Notifications)

Push notifications require a VAPID key pair. Generate and configure once:

## Step 1: Generate VAPID keys

```bash
npx web-push generate-vapid-keys
```

This outputs:
```
Public Key:  <long-base64-string>
Private Key: <long-base64-string>
```

## Step 2: Set Supabase secrets (server-side)

```bash
supabase secrets set VAPID_PUBLIC_KEY=<public-key-from-step-1>
supabase secrets set VAPID_PRIVATE_KEY=<private-key-from-step-1>
```

## Step 3: Set Netlify env var (client-side)

In Netlify dashboard → Site settings → Environment variables:
- `VITE_VAPID_PUBLIC_KEY` = <public-key-from-step-1>

## Step 4: Redeploy

After setting all three values, trigger a new deployment. Push notifications
will work for users who opt in via the PWA install / notification prompt.
