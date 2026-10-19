#!/usr/bin/env bash
# Uji migrasi + skenario penerimaan terhadap Postgres lokal (Docker).
# Tidak memerlukan project Supabase — cukup Docker.
#
# Penggunaan:
#   bash supabase/tests/run_local.sh
#
# Catatan: memakai stub lingkungan Supabase (schema auth, role anon, dsb.)
# sehingga perilaku RLS, trigger, dan RPC bisa diuji secara lokal.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

CONTAINER="${DK_PG_CONTAINER:-dompet-kami-pg}"
PORT="${DK_PG_PORT:-5544}"
DB=dompet

psql() {
  docker exec -i "$CONTAINER" psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 "$@"
}

psql_admin() {
  docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 "$@"
}

setup_database() {
  echo "== reset database =="
  psql_admin -q -c "drop database if exists $DB with (force)" >/dev/null
  psql_admin -q -c "create database $DB" >/dev/null

  echo "== stub supabase =="
  psql -q -f - < supabase/tests/stub_local_supabase.sql

  echo "== migrasi =="
  for f in supabase/migrations/*.sql; do
    echo "   -> $f"
    psql -q -f - < "$f" 2>&1 | grep -v "NOTICE:" || true
  done
}

echo "== siapkan container postgres =="
if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  docker run -d --name "$CONTAINER" \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB="$DB" \
    -p "$PORT:5432" \
    postgres:16-alpine >/dev/null
  echo "   container baru: $CONTAINER (port $PORT)"
fi

echo "== tunggu postgres siap =="
for _ in $(seq 1 60); do
  if docker exec "$CONTAINER" psql -U postgres -d postgres -c 'select 1' >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
if ! docker exec "$CONTAINER" psql -U postgres -d postgres -c 'select 1' >/dev/null 2>&1; then
  echo "postgres tidak siap dalam 60 detik" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# 1. Migrasi harus idempoten (dijalankan dua kali)
# ---------------------------------------------------------------------------
setup_database
echo "== migrasi dijalankan ulang (wajib tetap sukses) =="
for f in supabase/migrations/*.sql; do
  psql -q -f - < "$f" 2>&1 | grep -v "NOTICE:" || true
done

echo ""
echo "== uji skenario penerimaan =="
psql -f - < supabase/tests/test_acceptance.sql

# ---------------------------------------------------------------------------
# 2. Race condition: dua akun pertama login bersamaan harus menghasilkan
#    tepat satu admin. Perlu database bersih, jadi reset dulu.
# ---------------------------------------------------------------------------
setup_database

echo ""
echo "== uji race condition: dua login admin pertama bersamaan =="
ADMIN_A="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
ADMIN_B="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"

run_signup() {
  docker exec -i "$CONTAINER" psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 <<SQL
begin;
select pg_sleep(1);
insert into auth.users (id, email, raw_user_meta_data)
values ('$1', '$2@rumah.test', '{"full_name":"Race $2"}');
commit;
SQL
}

run_signup "$ADMIN_A" satu &
PID_A=$!
run_signup "$ADMIN_B" dua &
PID_B=$!
wait "$PID_A" "$PID_B"

psql -q <<SQL
do \$\$
declare
  v_admin int;
  v_pending int;
begin
  select count(*) filter (where role = 'admin') into v_admin
    from public.profiles where id in ('$ADMIN_A', '$ADMIN_B');
  select count(*) filter (where role = 'pending') into v_pending
    from public.profiles where id in ('$ADMIN_A', '$ADMIN_B');

  assert v_admin = 1, format('harus ada tepat 1 admin (dapat %s)', v_admin);
  assert v_pending = 1, format('harus ada tepat 1 pending (dapat %s)', v_pending);
  raise notice '--- race condition admin pertama: lulus ---';
end \$\$;
SQL

echo ""
echo "SEMUA UJIAN LULUS"
