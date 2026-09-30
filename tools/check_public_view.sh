#!/usr/bin/env bash
set -uo pipefail
: "${SUPABASE_URL:?}"; : "${SUPABASE_ANON_KEY:?}"
H=(-H "apikey: $SUPABASE_ANON_KEY")
API="$SUPABASE_URL/rest/v1"
fail=0
bad() { echo "FAIL: $1"; fail=1; }

status() { curl -s -o /dev/null -w '%{http_code}' --max-time 15 "${H[@]}" "$@"; }

# 1) view je čitelný, vrací 200 a jen povolené klíče
code=$(status "$API/public_players?select=*&limit=1")
[ "$code" = 200 ] || bad "public_players vrací HTTP $code (čekáno 200)"
keys=$(curl -s --max-time 15 "${H[@]}" "$API/public_players?select=*&limit=1" \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print(",".join(sorted(d[0].keys())) if d else "history,modes,peak,username")' 2>/dev/null)
[ "$keys" = "history,modes,peak,username" ] || bad "view má jiné klíče: '${keys:-<nečitelná odpověď>}'"

# 2) čtení všech ostatních tabulek musí být odmítnuto (401/403/404), ne 200
tables=$(curl -s --max-time 15 "${H[@]}" "$API/" \
  | python3 -c 'import sys,json; print(" ".join(sorted(k.strip("/") for k in json.load(sys.stdin).get("paths",{}) if k.count("/")==1 and k!="/")))' 2>/dev/null)
[ -n "$tables" ] || tables="players tickets audit_logs bot_config outbox_events player_current_tiers tier_history tier_definitions kits player_peak_tiers"
for t in $tables; do
  [ "$t" = public_players ] && continue
  c=$(status "$API/$t?select=*&limit=1")
  case "$c" in 401|403|404) ;; *) bad "anon čte $t (HTTP $c)";; esac
done

# 3) zápis musí být odmítnut
for m in POST PATCH DELETE; do
  c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 -X "$m" "${H[@]}" -H 'Content-Type: application/json' -d '{}' "$API/players?id=eq.-1")
  case "$c" in 401|403|404|405) ;; *) bad "anon může $m na players (HTTP $c)";; esac
done

[ "$fail" = 0 ] && echo "OK: anon vidí jen public_players"
exit "$fail"
