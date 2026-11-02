# Migration history

The archie-* migration files (2026-09-08 onwards) are retained here even
though the ARCHIE engine code now lives in its own repository: they document
schema that is APPLIED on this project's shared database, and the Supabase
GitHub integration requires every remotely-applied migration version to
exist in this directory. Deleting them fails the "Supabase Preview" check
("Remote migration versions not found in local migrations directory").
These files are inert — applied migrations are never re-run.

The authoritative copy for future schema work is managed in the ARCHIE
repository.
