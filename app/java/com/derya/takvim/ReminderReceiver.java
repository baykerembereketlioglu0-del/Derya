package com.derya.takvim;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Hatırlatmalar: JavaScript tarafı gelecekteki hatırlatmaların listesini
 * ("reminders" = [{t, title, body}]) kaydeder; burada sıradaki tek bir alarm kurulur.
 * Alarm çalınca bildirim gösterilir ve bir sonraki kurulur.
 */
public class ReminderReceiver extends BroadcastReceiver {
    static final String ACTION_FIRE = "com.derya.takvim.FIRE";
    static final String CHANNEL = "regl_hatirlatma";
    private static final long DAY = 24L * 60 * 60 * 1000;

    @Override
    public void onReceive(Context ctx, Intent intent) {
        try {
            if (intent != null && ACTION_FIRE.equals(intent.getAction())) {
                long t = intent.getLongExtra("t", 0);
                SharedPreferences p = prefs(ctx);
                p.edit().putLong("lastFired", Math.max(t, p.getLong("lastFired", 0))).commit();
                String title = intent.getStringExtra("title");
                String body = intent.getStringExtra("body");
                // Telefon uzun süre kapalı kaldıysa eski hatırlatmayı gösterme.
                if (title != null && System.currentTimeMillis() - t < DAY) {
                    show(ctx, title, body == null ? "" : body, (int) ((t / 60000L) % 100000));
                }
            }
        } catch (Throwable ignored) {
        }
        scheduleNext(ctx);
    }

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(MainActivity.PREFS, Context.MODE_PRIVATE);
    }

    static void scheduleNext(Context ctx) {
        try {
            SharedPreferences p = prefs(ctx);
            AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;
            Intent i = new Intent(ctx, ReminderReceiver.class).setAction(ACTION_FIRE);

            long after = Math.max(System.currentTimeMillis(), p.getLong("lastFired", 0));
            JSONArray arr = new JSONArray(p.getString("reminders", "[]"));
            JSONObject best = null;
            long bestT = Long.MAX_VALUE;
            for (int k = 0; k < arr.length(); k++) {
                JSONObject o = arr.optJSONObject(k);
                if (o == null) continue;
                long t = o.optLong("t", 0);
                if (t > after && t < bestT) {
                    best = o;
                    bestT = t;
                }
            }

            if (best == null) {
                PendingIntent old = PendingIntent.getBroadcast(ctx, 1, i,
                        PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
                if (old != null) {
                    am.cancel(old);
                    old.cancel();
                }
                return;
            }

            i.putExtra("t", bestT);
            i.putExtra("title", best.optString("title", "Hatırlatma"));
            i.putExtra("body", best.optString("body", ""));
            PendingIntent pi = PendingIntent.getBroadcast(ctx, 1, i,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, bestT, pi);
        } catch (Throwable ignored) {
        }
    }

    static void show(Context ctx, String title, String body, int id) {
        try {
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            Notification.Builder b = new Notification.Builder(ctx);

            if (Build.VERSION.SDK_INT >= 26) {
                // NotificationChannel API 26'da geldi; eski SDK ile derlendiği için yansıma ile çağrılıyor.
                try {
                    Class<?> chClass = Class.forName("android.app.NotificationChannel");
                    Object ch = chClass.getConstructor(String.class, CharSequence.class, int.class)
                            .newInstance(CHANNEL, ctx.getString(R.string.channel_name), 4 /* IMPORTANCE_HIGH */);
                    NotificationManager.class.getMethod("createNotificationChannel", chClass).invoke(nm, ch);
                    Notification.Builder.class.getMethod("setChannelId", String.class).invoke(b, CHANNEL);
                } catch (Throwable ignored) {
                }
            }

            Intent open = new Intent(ctx, MainActivity.class)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pi = PendingIntent.getActivity(ctx, 2, open,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            b.setSmallIcon(R.drawable.ic_notif)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setStyle(new Notification.BigTextStyle().bigText(body))
                    .setColor(0xFFFF4F8B)
                    .setAutoCancel(true)
                    .setContentIntent(pi)
                    .setPriority(Notification.PRIORITY_HIGH)
                    .setDefaults(Notification.DEFAULT_SOUND | Notification.DEFAULT_LIGHTS);
            nm.notify(id, b.build());
        } catch (Throwable ignored) {
        }
    }
}
