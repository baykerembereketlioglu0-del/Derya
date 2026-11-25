package com.derya.takvim;

import android.app.Activity;
import android.app.NotificationManager;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.HapticFeedbackConstants;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

/**
 * Uygulamanın tek ekranı: arayüz assets/www içindeki HTML/CSS/JS ile çizilir.
 * Veriler SharedPreferences'ta (sadece telefonda) saklanır.
 */
public class MainActivity extends Activity {
    static final String PREFS = "derya";
    private static final int REQ_NOTIF = 7;
    private static final String NOTIF_PERM = "android.permission.POST_NOTIFICATIONS";

    private WebView web;
    private SharedPreferences prefs;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);

        web = new WebView(this);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.setHapticFeedbackEnabled(true);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setTextZoom(100);
        s.setMediaPlaybackRequiresUserGesture(true);

        web.addJavascriptInterface(new Bridge(), "Android");
        web.setWebViewClient(new WebViewClient() {
            // Uygulama dışına hiçbir sayfaya gidilmez.
            // (API 24+ sürümündeki varsayılan metot da bunu çağırır.)
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, String url) {
                return true;
            }
        });

        applyBars(prefs.getString("barColor", "#FFF0F5"), prefs.getBoolean("barLight", true));
        setContentView(web);
        web.loadUrl("file:///android_asset/www/index.html");
    }

    void applyBars(String color, boolean light) {
        try {
            int c = Color.parseColor(color);
            Window w = getWindow();
            w.setStatusBarColor(c);
            w.setNavigationBarColor(c);
            View d = w.getDecorView();
            int f = d.getSystemUiVisibility();
            final int lightStatus = 0x00002000; // SYSTEM_UI_FLAG_LIGHT_STATUS_BAR (API 23)
            final int lightNav = 0x00000010;    // SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR (API 26)
            f = light ? (f | lightStatus) : (f & ~lightStatus);
            if (Build.VERSION.SDK_INT >= 26) {
                f = light ? (f | lightNav) : (f & ~lightNav);
            }
            d.setSystemUiVisibility(f);
            if (web != null) web.setBackgroundColor(c);
        } catch (Throwable ignored) {
        }
    }

    private void js(final String code) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (web != null) web.evaluateJavascript(code, null);
            }
        });
    }

    @Override
    public void onBackPressed() {
        if (web == null) {
            super.onBackPressed();
            return;
        }
        web.evaluateJavascript("(window.appBack && window.appBack()) ? 'y' : 'n'", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String v) {
                if (v == null || !v.contains("y")) {
                    MainActivity.super.onBackPressed();
                }
            }
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) {
            web.onResume();
            web.evaluateJavascript("window.appResume && window.appResume()", null);
        }
    }

    @Override
    protected void onPause() {
        if (web != null) web.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] results) {
        if (code == REQ_NOTIF) {
            boolean ok = results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED;
            js("window.onNotifyPermission && window.onNotifyPermission(" + ok + ")");
        }
    }

    boolean notificationsAllowed() {
        try {
            if (Build.VERSION.SDK_INT >= 33
                    && checkSelfPermission(NOTIF_PERM) != PackageManager.PERMISSION_GRANTED) {
                return false;
            }
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return true;
            // areNotificationsEnabled() API 24'te geldi; eski SDK ile derlendiği için yansıma.
            Object r = NotificationManager.class.getMethod("areNotificationsEnabled").invoke(nm);
            return !(r instanceof Boolean) || (Boolean) r;
        } catch (Throwable t) {
            return true;
        }
    }

    /** JavaScript tarafının "Android.xxx()" ile çağırdığı köprü. */
    public class Bridge {
        @JavascriptInterface
        public String load() {
            return prefs.getString("data", "");
        }

        @JavascriptInterface
        public void save(String json) {
            prefs.edit().putString("data", json).apply();
        }

        @JavascriptInterface
        public void setReminders(String json) {
            prefs.edit().putString("reminders", json).commit();
            ReminderReceiver.scheduleNext(getApplicationContext());
        }

        @JavascriptInterface
        public void setBars(final String color, final boolean light) {
            prefs.edit().putString("barColor", color).putBoolean("barLight", light).apply();
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    applyBars(color, light);
                }
            });
        }

        @JavascriptInterface
        public void haptic() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (web != null) web.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
                }
            });
        }

        @JavascriptInterface
        public boolean canNotify() {
            return notificationsAllowed();
        }

        @JavascriptInterface
        public void askNotify() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (Build.VERSION.SDK_INT >= 33 && !notificationsAllowed()) {
                        requestPermissions(new String[]{NOTIF_PERM}, REQ_NOTIF);
                    } else {
                        js("window.onNotifyPermission && window.onNotifyPermission(" + notificationsAllowed() + ")");
                    }
                }
            });
        }

        @JavascriptInterface
        public void testNotification(String title, String body) {
            ReminderReceiver.show(getApplicationContext(), title, body, 99);
        }

        @JavascriptInterface
        public void share(final String text) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        Intent i = new Intent(Intent.ACTION_SEND);
                        i.setType("text/plain");
                        i.putExtra(Intent.EXTRA_SUBJECT, "Takvim yedeği");
                        i.putExtra(Intent.EXTRA_TEXT, text);
                        startActivity(Intent.createChooser(i, "Yedeği kaydet / gönder"));
                    } catch (Throwable t) {
                        Toast.makeText(MainActivity.this, "Paylaşılamadı", Toast.LENGTH_SHORT).show();
                    }
                }
            });
        }

        @JavascriptInterface
        public void copy(final String text) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        ClipboardManager cm = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                        cm.setPrimaryClip(ClipData.newPlainText("yedek", text));
                    } catch (Throwable ignored) {
                    }
                }
            });
        }

        @JavascriptInterface
        public void toast(final String msg) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Toast.makeText(MainActivity.this, msg, Toast.LENGTH_SHORT).show();
                }
            });
        }
    }
}
