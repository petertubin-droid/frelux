## archie-deploy-parity.patch

Applies the audit HIGH-2/MEDIUM-5 fix to `.github/workflows/archie-deploy.yml`
(deploy to BOTH the mirror and production projects; `archie-agent-worker`
deploys with the JWT lock). The automation's push credential lacks GitHub's
`workflow` scope, so it cannot push workflow-file changes directly. Apply with:

```bash
git apply docs/patches/archie-deploy-parity.patch
git add .github/workflows/archie-deploy.yml
git commit -m "ci: deploy parity - both projects (audit HIGH-2/MEDIUM-5)"
git push
```
