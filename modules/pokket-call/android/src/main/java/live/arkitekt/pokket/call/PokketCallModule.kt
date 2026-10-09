package live.arkitekt.pokket.call

import android.content.Context
import android.content.Intent
import android.os.Build
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Starts and stops `CallService` from JS (modules/pokket-call/index.ts). */
class PokketCallModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("PokketCall")

    // Starting again updates the running service: a call that gains the
    // microphone later (granted in Settings) calls this a second time.
    Function("start") { title: String, microphone: Boolean ->
      val intent = Intent(context, CallService::class.java)
        .putExtra(CallService.EXTRA_TITLE, title)
        .putExtra(CallService.EXTRA_MICROPHONE, microphone)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    Function("stop") {
      context.stopService(Intent(context, CallService::class.java))
    }
  }
}
