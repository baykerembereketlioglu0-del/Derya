package com.derya.takvim;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Telefon açılınca, uygulama güncellenince veya saat değişince hatırlatmayı yeniden kurar. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        ReminderReceiver.scheduleNext(ctx);
    }
}
