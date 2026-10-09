package live.arkitekt.pokket.call

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log

/**
 * Runs for as long as pokket is in a call, so Android keeps the call's audio
 * (and, when granted, the microphone) going while the app is in the
 * background or the screen is locked. It does nothing but exist and show the
 * ongoing notification the system asks of it: the call itself is LiveKit's,
 * in JS.
 */
class CallService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val title = intent?.getStringExtra(EXTRA_TITLE)?.takeIf { it.isNotBlank() } ?: "Call"
    val wantsMicrophone = intent?.getBooleanExtra(EXTRA_MICROPHONE, false) ?: false
    // Android 14 throws on a microphone service without the microphone.
    val microphone = wantsMicrophone &&
      checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED

    try {
      val notification = buildNotification(title)
      when {
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.R -> {
          var type = ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
          if (microphone) type = type or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
          startForeground(NOTIFICATION_ID, notification, type)
        }
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q ->
          startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
        else -> startForeground(NOTIFICATION_ID, notification)
      }
    } catch (error: Exception) {
      // Refused (started from the background, a restriction of the device):
      // the call goes on in the foreground without it.
      Log.w(TAG, "could not start the call service", error)
      stopSelf()
    }
    // Not restarted by the system: without the app's JS there is no call.
    return START_NOT_STICKY
  }

  /** Swiped away from the recents: the call ends with the app. */
  override fun onTaskRemoved(rootIntent: Intent?) {
    stopSelf()
    super.onTaskRemoved(rootIntent)
  }

  private fun buildNotification(title: String): Notification {
    val open = packageManager.getLaunchIntentForPackage(packageName)?.let {
      PendingIntent.getActivity(
        this, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )
    }
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val manager = getSystemService(NotificationManager::class.java)
      if (manager.getNotificationChannel(CHANNEL_ID) == null) {
        // Low importance: it is there because it must be, and makes no sound.
        manager.createNotificationChannel(
          NotificationChannel(CHANNEL_ID, "Calls in progress", NotificationManager.IMPORTANCE_LOW),
        )
      }
      Notification.Builder(this, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this)
    }
    return builder
      .setContentTitle(title)
      .setContentText("In a call. Tap to return to it.")
      .setSmallIcon(applicationInfo.icon)
      .setContentIntent(open)
      .setOngoing(true)
      .setCategory(Notification.CATEGORY_CALL)
      .build()
  }

  companion object {
    const val EXTRA_TITLE = "title"
    const val EXTRA_MICROPHONE = "microphone"
    private const val TAG = "PokketCall"
    private const val CHANNEL_ID = "pokket-call"
    private const val NOTIFICATION_ID = 4711
  }
}
