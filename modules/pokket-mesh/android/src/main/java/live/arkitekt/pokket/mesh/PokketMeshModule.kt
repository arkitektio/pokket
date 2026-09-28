package live.arkitekt.pokket.mesh

import android.content.Context
import android.net.ConnectivityManager
import android.net.LinkProperties
import android.net.Network
import java.net.Inet4Address
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
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

  /**
   * Keeps tsnet told which interface and gateway carry the default route —
   * on Android it cannot read the route table itself — and re-hands it the
   * interface list whenever the network changes (Wi-Fi <-> cellular).
   */
  private val networkCallback = object : ConnectivityManager.NetworkCallback() {
    override fun onLinkPropertiesChanged(network: Network, lp: LinkProperties) {
      val b = backend ?: return
      val gateway = lp.routes
        .firstOrNull { it.isDefaultRoute && it.gateway is Inet4Address }
        ?.gateway?.hostAddress ?: ""
      b.setDefaultRoute(lp.interfaceName ?: "", gateway)
      pushInterfaces(b)
    }

    override fun onLost(network: Network) {
      val b = backend ?: return
      b.setDefaultRoute("", "")
      pushInterfaces(b)
    }
  }
  private var callbackRegistered = false

  /** Set once this instance is gone (a JS reload makes a new one). */
  @Volatile private var destroyed = false

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
      val b = backend ?: return@OnCreate
      b.setListener(
        onStatus = { json -> if (!destroyed) sendEvent(STATUS_EVENT, mapOf("status" to json)) },
        onLog = { id, message -> if (!destroyed) sendEvent(LOG_EVENT, mapOf("id" to id, "message" to message)) },
      )
      pushInterfaces(b)
      try {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        cm.registerDefaultNetworkCallback(networkCallback)
        callbackRegistered = true
      } catch (_: Exception) {
        // Without it tsnet still runs; it just learns less about the network.
      }
    }

    // The nodes belong to the app process, not to this module instance: a JS
    // reload (dev builds, OTA updates) destroys and recreates the module, and
    // the new JS reattaches to the running nodes (Start is idempotent, Forward
    // keeps its ports) instead of rejoining from scratch.
    OnDestroy {
      destroyed = true
      if (callbackRegistered) {
        try {
          val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
          cm.unregisterNetworkCallback(networkCallback)
        } catch (_: Exception) {
        }
        callbackRegistered = false
      }
    }

    Function("isAvailable") { backend != null }

    Function("version") { backend?.version() }

    Function("setVerbose") { on: Boolean -> backend?.setVerbose(on) }

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
