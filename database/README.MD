
<!-- Database notes for Campus Lunch Pipeline -->

This folder contains the PostgreSQL schema and notes for the Campus Lunch Pipeline project.

Files
- `schema.sql` — SQL dump that creates the `menu_items` table, the supporting sequence `menu_items_id_seq`, indexes, and constraints.

Overview
- The pipeline stores parsed menu items in a single `menu_items` table (columns include `campus`, `menu_date`, `category`, `dish_name`, `allergens`, `calories`, etc.).
- The dump was produced with `pg_dump` (PostgreSQL 18.x) and is a schema-only file suitable for initializing a database for this project.

Applying the schema
1. Create or select a PostgreSQL database to use (example uses `campus_lunch`):

```bash
sudo -u postgres createdb campus_lunch
```

2. Apply the schema file:

```bash
sudo -u postgres psql -d campus_lunch -f schema.sql
```

Or, if you have a DB user with privileges:

```bash
psql "postgresql://dbuser@localhost:5432/campus_lunch" -f schema.sql
```

Notes
- Postgres version: schema was exported from PostgreSQL 18.x; it should work on recent PostgreSQL releases but test on staging if you run an older version.
- The dump contains `ALTER TABLE ... OWNER TO postgres` statements — adjust ownership or run as a superuser if needed.
- Do not store connection strings or passwords in this folder. Use environment variables or your secret manager for credentials used by the application.

Troubleshooting
- If you see permission or owner errors when applying the dump, either run the import as a superuser or remove/modify `OWNER TO` lines from `schema.sql` before importing.
- If your application cannot connect, verify `pg_hba.conf` and that the database user has the required privileges.

After setup
- Configure your application's database credentials in n8n and in `playwright-api` (if applicable) following the instructions in the top-level `README.md`.

