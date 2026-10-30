package live.arkitekt.pokket.upload

import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.jstasks.HeadlessJsTaskContext
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Starts, updates and stops `UploadService` from JS (modules/pokket-upload/index.ts). */
class PokketUploadModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private var running = false

  /** The headless task keeping JS's timers running. Only touched on the UI thread. */
  private var timersTask: Int? = null

  override fun definition() = ModuleDefinition {
    Name("PokketUpload")

    Function("start") { text: String -> start(text) }

    Function("update") { text: String, fraction: Double -> update(text, fraction) }

    Function("stop") { summary: String? -> stop(summary) }
  }

  private fun start(text: String) {
    holdTimers()
    val intent = Intent(context, UploadService::class.java).putExtra(UploadService.EXTRA_TEXT, text)
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
      running = true
    } catch (error: Exception) {
      // Android refuses this from the background: the upload goes on without it.
      Log.w(TAG, "could not start the upload service", error)
    }
  }

  /** Only while running: a late update after `stop` would put the notification back, with nothing left to remove it. */
  private fun update(text: String, fraction: Double) {
    if (running) UploadService.showProgress(context, text, fraction)
  }

  private fun stop(summary: String?) {
    releaseTimers()
    if (running) {
      running = false
      val intent = Intent(context, UploadService::class.java).setAction(UploadService.ACTION_STOP)
      try {
        context.startService(intent)
      } catch (error: Exception) {
        // The service is gone already, or was never let in the foreground.
        Log.w(TAG, "could not stop the upload service", error)
        context.stopService(intent)
      }
    }
    if (summary != null) UploadService.showSummary(context, summary)
  }

  private fun holdTimers() {
    val react = appContext.reactContext as? ReactContext ?: return
    UiThreadUtil.runOnUiThread {
      try {
        if (timersTask == null) {
          val config = HeadlessJsTaskConfig(TIMERS_TASK_KEY, Arguments.createMap(), 0L, true)
          timersTask = HeadlessJsTaskContext.getInstance(react).startTask(config)
        }
      } catch (error: Exception) {
        Log.w(TAG, "could not keep the timers running", error)
      }
    }
  }

  private fun releaseTimers() {
    val react = appContext.reactContext as? ReactContext ?: return
    UiThreadUtil.runOnUiThread {
      timersTask?.let { HeadlessJsTaskContext.getInstance(react).finishTask(it) }
      timersTask = null
    }
  }

  private companion object {
    const val TAG = "PokketUpload"
    const val TIMERS_TASK_KEY = "PokketUpload"
  }
}
