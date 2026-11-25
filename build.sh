#!/usr/bin/env bash
# Derya 🌸 — APK derleme betiği (Gradle / Android Studio gerekmez).
#
# Gerekenler (Ubuntu/Debian):
#   sudo apt install openjdk-17-jdk aapt zipalign apksigner dalvik-exchange android-sdk-platform-23
#
# Çıktı: apk/Derya-Regl-Takvimi.apk
set -euo pipefail
cd "$(dirname "$0")"

ANDROID_JAR="${ANDROID_JAR:-/usr/lib/android-sdk/platforms/android-23/android.jar}"
OUT=build
APK=apk/Derya-Regl-Takvimi.apk
KS=keystore/derya.keystore
KS_ALIAS=derya
KS_PASS="${KS_PASS:-derya-takvim-2026}"

for t in aapt javac dalvik-exchange zipalign apksigner keytool; do
  command -v "$t" >/dev/null || { echo "Eksik araç: $t (yukarıdaki apt satırına bakın)"; exit 1; }
done
[ -f "$ANDROID_JAR" ] || { echo "android.jar bulunamadı: $ANDROID_JAR"; exit 1; }

rm -rf "$OUT"
mkdir -p "$OUT/gen" "$OUT/classes" "$OUT/dex" apk keystore

echo "1/6 Kaynaklar (R.java)…"
aapt package -f -m -J "$OUT/gen" -M app/AndroidManifest.xml -S app/res -I "$ANDROID_JAR"

echo "2/6 Java derleniyor…"
javac -source 8 -target 8 -bootclasspath "$ANDROID_JAR" -encoding UTF-8 -nowarn -Xlint:-options \
  -d "$OUT/classes" $(find app/java "$OUT/gen" -name '*.java')

echo "3/6 DEX…"
dalvik-exchange --dex --min-sdk-version=24 --output="$OUT/dex/classes.dex" "$OUT/classes"

echo "4/6 Paketleniyor…"
aapt package -f -M app/AndroidManifest.xml -S app/res -A app/assets -I "$ANDROID_JAR" \
  -F "$OUT/unsigned.apk"
(cd "$OUT/dex" && aapt add ../unsigned.apk classes.dex >/dev/null)
zipalign -f -p 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"

echo "5/6 İmzalanıyor…"
if [ ! -f "$KS" ]; then
  keytool -genkeypair -keystore "$KS" -alias "$KS_ALIAS" -keyalg RSA -keysize 2048 -validity 20000 \
    -storepass "$KS_PASS" -keypass "$KS_PASS" -dname "CN=Derya Takvim, O=Sevgiyle" >/dev/null 2>&1
fi
apksigner sign --ks "$KS" --ks-key-alias "$KS_ALIAS" --ks-pass "pass:$KS_PASS" --key-pass "pass:$KS_PASS" \
  --min-sdk-version 24 --v4-signing-enabled false --out "$APK" "$OUT/aligned.apk"

echo "6/6 Doğrulanıyor…"
apksigner verify --min-sdk-version 24 "$APK"
echo "Hazır: $APK ($(du -h "$APK" | cut -f1))"
