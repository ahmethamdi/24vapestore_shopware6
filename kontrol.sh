#!/bin/bash
# 24VapeStore — ortam sağlık kontrolü
# Kullanım: ./kontrol.sh

URL="http://24vapestore.test:8088"
MYSQL="/opt/homebrew/opt/mysql@8.0/bin/mysql"

ok()   { printf "  \033[32m✅\033[0m %s\n" "$1"; }
fail() { printf "  \033[31m❌\033[0m %s\n" "$1"; }
warn() { printf "  \033[33m⚠️\033[0m  %s\n" "$1"; }

echo ""
echo "════ 24VapeStore ortam kontrolü ════"
echo ""

# 1. hosts kaydı
if grep -q "24vapestore.test" /etc/hosts 2>/dev/null; then
    ok "/etc/hosts kaydı var"
else
    fail "/etc/hosts kaydı YOK — şunu çalıştır:"
    echo "       sudo sh -c 'echo \"127.0.0.1 24vapestore.test\" >> /etc/hosts'"
fi

# 2. Servisler
for svc in httpd mysql@8.0 redis; do
    if brew services list 2>/dev/null | grep -q "^${svc}.*started"; then
        ok "$svc çalışıyor"
    else
        fail "$svc çalışmıyor — 'brew services start $svc'"
    fi
done

# 3. PHP-FPM
if lsof -nP -iTCP:9000 -sTCP:LISTEN >/dev/null 2>&1; then
    ok "PHP-FPM :9000 dinliyor"
else
    fail "PHP-FPM çalışmıyor — 'brew services start php'"
fi

# 4. Veritabanı
TABLES=$("$MYSQL" -h 127.0.0.1 -P 3307 -u root -N -B -e \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='24vapestore';" 2>/dev/null)
if [ "$TABLES" = "252" ]; then
    ok "Veritabanı bağlı ($TABLES tablo)"
elif [ -n "$TABLES" ]; then
    warn "Veritabanı bağlı ama $TABLES tablo var (beklenen 252)"
else
    fail "Veritabanına bağlanılamadı (:3307)"
fi

# 5. Site
CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 30 "$URL/" 2>/dev/null)
if [ "$CODE" = "200" ]; then
    ok "Storefront açılıyor  → $URL"
elif [ "$CODE" = "000" ]; then
    fail "Storefront'a ulaşılamadı — hosts kaydı eksik olabilir"
else
    fail "Storefront HTTP $CODE döndü"
fi

CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 30 "$URL/admin" 2>/dev/null)
if [ "$CODE" = "200" ]; then
    ok "Admin açılıyor       → $URL/admin  (admin / shopware)"
else
    fail "Admin HTTP $CODE döndü"
fi

# 6. Tema
if php bin/console plugin:list 2>/dev/null | grep -q "VapeStoreTheme.*Yes.*Yes"; then
    ok "VapeStoreTheme kurulu ve aktif"
else
    warn "VapeStoreTheme aktif değil — 'php bin/console plugin:list' ile bak"
fi

echo ""
