# Disabled CI workflow

The GitHub token available to the deployment agent does not carry the `workflow`
scope, so GitHub refuses any push that creates or updates files under
`.github/workflows/`.

The previous workflow is kept here verbatim as `ci.yml.disabled`. To re-enable
continuous integration, copy it back:

    mkdir -p .github/workflows
    cp .github/ci-backup/ci.yml.disabled .github/workflows/ci.yml

That restore needs a token (or a manual commit) with the `workflow` scope.
