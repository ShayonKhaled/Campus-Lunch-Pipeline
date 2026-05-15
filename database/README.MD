
<!-- Database notes for Campus Lunch Pipeline -->

This folder contains the PostgreSQL schema and notes for the Campus Lunch Pipeline project.

Files
- `schema.sql` — SQL dump that creates the `menu_items` table, the supporting sequence `menu_items_id_seq`, indexes, and constraints.

Overview
- The pipeline stores parsed menu items in a single `menu_items` table (columns include `campus`, `menu_date`, `category`, `dish_name`, `allergens`, `calories`, etc.).
- The dump was produced with `pg_dump` (PostgreSQL 18.x) and is a schema-only file suitable for initializing a database for this project.

Applying the schema

Basic steps to apply the schema are in `SETUP.md`. In brief:

```bash
# create DB (run as postgres user)
createdb campus_lunch

# apply schema
psql -d campus_lunch -f schema.sql
```

Notes
- The dump was exported from PostgreSQL 18.x; test on staging for older servers.
- `schema.sql` contains ownership statements (`OWNER TO postgres`) — run as a superuser or remove those lines if needed.
- Keep connection strings and passwords out of the repo; use environment variables or a secret manager.

Troubleshooting
- Permission/owner errors: run import as superuser or remove `OWNER TO` lines.
- Connection failures: verify `pg_hba.conf`, DB user privileges, and network access.

See `SETUP.md` for full setup and additional notes.

