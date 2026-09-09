# Redeploy / Go-Live Checklist

Run this when AdSense approval is received and Netlify auto-deploy is
re-enabled. Work top to bottom.

## 1. Re-enable Netlify auto-deploy

Dashboard → Site configuration → Build & deploy → "Stop builds" /
auto-deploy toggle back ON. The latest `main` then deploys automatically.

## 2. Deploy & verify the build

- [ ] Netlify build goes green with commit `3fe2a12` or later
- [ ] CI on the deployed SHA was green (GitHub Actions)
- [ ] Site loads: `curl -sI https://freluxtools.netlify.app/` → HTTP/2 200,
      HSTS + X-Frame-Options present
- [ ] New admin theme behavior live: admin dark-mode toggle does NOT touch
      the public `theme` localStorage key (frelux_admin_theme isolation)
- [ ] Spot-check 2–3 rewritten learn articles render with new intros
      (e.g. POP category articles)

## 3. Bing IndexNow submission (key staged in this repo)

The key file `public/d9d554adcd72479996a83d3eb9eddaa8.txt` ships with this
deploy. Verify it is live, then bulk-submit all sitemap URLs:

```bash
# 3a. Verify key file is live
curl -s https://freluxtools.netlify.app/d9d554adcd72479996a83d3eb9eddaa8.txt
# → must echo: d9d554adcd72479996a83d3eb9eddaa8

# 3b. Bulk-submit every sitemap URL to IndexNow
curl -s "https://freluxtools.netlify.app/sitemap.xml" \
  | grep -oE '<loc>[^<]+</loc>' | sed 's/<[^>]*>//g' > /tmp/urls.txt

curl -s -X POST "https://api.indexnow.org/IndexNow" \
  -H "Content-Type: application/json" \
  -d "{\"host\":\"freluxtools.netlify.app\",
       \"key\":\"d9d554adcd72479996a83d3eb9eddaa8\",
       \"keyLocation\":\"https://freluxtools.netlify.app/d9d554adcd72479996a83d3eb9eddaa8.txt\",
       \"urlList\": $(python3 -c "import json;print(json.dumps(open('/tmp/urls.txt').read().split()))")}"
# → expect HTTP 200 (OK) or 202 (accepted); 403 = key file not reachable yet
```

- [ ] Key file live (3a)
- [ ] Bulk submission accepted (3b): expect 147 URLs
- [ ] Status visible in Bing Webmaster Tools → IndexNow within ~48h

## 4. AdSense final activation

- [ ] Ads.txt already live at `/ads.txt` and `/app-ads.txt` (verify 200)
- [ ] Switch ad units on in AdSense dashboard per approval instructions

## 5. Payment loop test (separate from redeploy, but do it same day)

- [ ] ₦100 live test transaction through Paystack checkout
- [ ] Confirm webhook → Supabase → user token grant end-to-end
- [ ] Refund/void the test charge

## 6. Post-deploy monitoring

- [ ] Check Sentry for new errors after 24h
- [ ] Bing Webmaster Tools: coverage graph rising
- [ ] Google Search Console: request indexing for a rewritten article
