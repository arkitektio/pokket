package live.arkitekt.pokket.mesh

import android.content.Context
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.net.Inet6Address
import java.net.NetworkInterface

private const val STATUS_EVENT = "onStatus"
private const val LOG_EVENT = "onLog"

class MeshUnavailableException :
  CodedException("This build of pokket was made without the mesh sidecar")

/** Only ids the JS side minted (uuids): they become directory names. */
private val MESH_ID = Regex("^[A-Za-z0-9_-]{1,64}$")

class PokketMeshModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val backend: MeshBackend? by lazy {
    try {
      Class.forName("live.arkitekt.pokket.mesh.GoMeshBackend")
        .getDeclaredConstructor()
        .newInstance() as MeshBackend
    } catch (_: Throwable) {
      null
    }
  }

  private fun requireBackend(): MeshBackend = backend ?: throw MeshUnavailableException()

  private fun stateDir(id: String): File {
    require(MESH_ID.matches(id)) { "invalid mesh id" }
    return File(File(context.filesDir, "mesh"), id)
  }

  /**
   * Android 11+ keeps netlink from apps, so tsnet cannot enumerate interfaces
   * itself; hand it the list java.net sees (format: see go/interfaces.go).
   */
  private fun pushInterfaces(b: MeshBackend) {
    val lines = StringBuilder()
    try {
      for (nif in NetworkInterface.getNetworkInterfaces()?.toList().orEmpty()) {
        val addrs = nif.interfaceAddresses.mapNotNull { ia ->
          val host = ia.address?.hostAddress?.substringBefore('%') ?: return@mapNotNull null
          "$host/${ia.networkPrefixLength}"
        }
        lines.append(nif.name).append(' ')
          .append(nif.index).append(' ')
          .append(nif.mtu).append(' ')
          .append(nif.isUp).append(' ')
          .append(nif.interfaceAddresses.any { it.broadcast != null }).append(' ')
          .append(nif.isLoopback).append(' ')
          .append(nif.isPointToPoint).append(' ')
          .append(nif.supportsMulticast())
          .append(" | ")
          .append(addrs.joinToString(" "))
          .append('\n')
      }
    } catch (_: Exception) {
      // An empty list only costs tsnet its interface hints; it still works.
    }
    b.setInterfaces(lines.toString())
  }

  override fun definition() = ModuleDefinition {
    Name("PokketMesh")

    Events(STATUS_EVENT, LOG_EVENT)

    OnCreate {
      backend?.setListener(
        onStatus = { json -> sendEvent(STATUS_EVENT, mapOf("status" to json)) },
        onLog = { id, message -> sendEvent(LOG_EVENT, mapOf("id" to id, "message" to message)) },
      )
    }

    OnDestroy {
      backend?.stopAll()
    }

    Function("isAvailable") { backend != null }

    Function("version") { backend?.version() }

    AsyncFunction("start") { id: String, controlUrl: String, hostname: String, authKey: String? ->
      val b = requireBackend()
      pushInterfaces(b)
      b.start(id, stateDir(id).absolutePath, controlUrl, hostname, authKey ?: "")
    }

    AsyncFunction("forward") { id: String, host: String, port: Int, tls: Boolean ->
      requireBackend().forward(id, host, port.toLong(), tls).toInt()
    }

    AsyncFunction("stop") { id: String ->
      backend?.stop(id)
    }

    AsyncFunction("forget") { id: String ->
      backend?.stop(id)
      stateDir(id).deleteRecursively()
    }

    AsyncFunction("status") { id: String ->
      backend?.status(id)
    }

    AsyncFunction("refreshNetwork") {
      backend?.let { pushInterfaces(it) }
    }
  }
}
