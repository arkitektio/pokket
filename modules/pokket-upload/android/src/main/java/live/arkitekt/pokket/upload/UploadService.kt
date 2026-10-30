package live.arkitekt.pokket.upload

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log

/**
 * Runs for as long as pokket is uploading, so Android lets the upload finish
 * while the app is in the background. It does nothing but exist and show the
 * progress notification the system asks of it: the upload itself is the
 * file system module's, driven from JS.
 */
class UploadService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    try {
      // Stopping goes through here too. A service started for the foreground
      // that is stopped before it got there crashes the app, and a quick
      // upload can stop it that soon.
      val notification = buildProgress(this, intent?.getStringExtra(EXTRA_TEXT) ?: "", null)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
      } else {
        startForeground(NOTIFICATION_ID, notification)
      }
    } catch (error: Exception) {
      // Refused (a restriction of the device): the upload goes on without it,
      // for as long as the app is on screen.
      Log.w(TAG, "could not start the upload service", error)
      stopSelf()
      return START_NOT_STICKY
    }
    if (intent?.action == ACTION_STOP) {
      stopForeground(STOP_FOREGROUND_REMOVE)
      stopSelf()
    }
    // Not restarted by the system: without the app's JS there is no upload.
    return START_NOT_STICKY
  }

  /** Swiped away from the recents: the upload ends with the app. */
  override fun onTaskRemoved(rootIntent: Intent?) {
    stopSelf()
    super.onTaskRemoved(rootIntent)
  }

  /** Android 15 allows this type six hours a day, and crashes a service that stays past them. */
  override fun onTimeout(startId: Int, fgsType: Int) {
    stopSelf()
  }

  companion object {
    const val ACTION_STOP = "live.arkitekt.pokket.upload.STOP"
    const val EXTRA_TEXT = "text"
    private const val TAG = "PokketUpload"
    private const val CHANNEL_ID = "pokket-upload"
    private const val NOTIFICATION_ID = 4712
    private const val SUMMARY_NOTIFICATION_ID = 4713
    private const val PROGRESS_MAX = 100

    fun showProgress(context: Context, text: String, fraction: Double) {
      context.getSystemService(NotificationManager::class.java)
        .notify(NOTIFICATION_ID, buildProgress(context, text, fraction))
    }

    fun showSummary(context: Context, text: String) {
      val notification = builder(context)
        .setContentText(text)
        .setAutoCancel(true)
        .build()
      context.getSystemService(NotificationManager::class.java).notify(SUMMARY_NOTIFICATION_ID, notification)
    }

    private fun buildProgress(context: Context, text: String, fraction: Double?): Notification =
      builder(context)
        .setContentText(text)
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setCategory(Notification.CATEGORY_PROGRESS)
        .setProgress(PROGRESS_MAX, ((fraction ?: 0.0) * PROGRESS_MAX).toInt(), fraction == null)
        .build()

    private fun builder(context: Context): Notification.Builder {
      val open = context.packageManager.getLaunchIntentForPackage(context.packageName)?.let {
        PendingIntent.getActivity(
          context, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
      }
      val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val manager = context.getSystemService(NotificationManager::class.java)
        if (manager.getNotificationChannel(CHANNEL_ID) == null) {
          // Low importance: it is there because it must be, and makes no sound.
          manager.createNotificationChannel(
            NotificationChannel(CHANNEL_ID, "Uploads", NotificationManager.IMPORTANCE_LOW),
          )
        }
        Notification.Builder(context, CHANNEL_ID)
      } else {
        @Suppress("DEPRECATION")
        Notification.Builder(context)
      }
      return builder
        .setContentTitle("Orkestrator")
        .setSmallIcon(context.applicationInfo.icon)
        .setContentIntent(open)
    }
  }
}
