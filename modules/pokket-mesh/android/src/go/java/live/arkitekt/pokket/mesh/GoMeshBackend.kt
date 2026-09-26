package live.arkitekt.pokket.mesh

import meshmobile.Listener
import meshmobile.Meshmobile

/** The gomobile-bound sidecar (modules/pokket-mesh/go). Loaded by name. */
@Suppress("unused")
class GoMeshBackend : MeshBackend {
  override fun setListener(onStatus: (String) -> Unit, onLog: (String, String) -> Unit) {
    Meshmobile.setListener(object : Listener {
      override fun onStatus(statusJSON: String) = onStatus(statusJSON)
      override fun onLog(id: String, message: String) = onLog(id, message)
    })
  }

  override fun setInterfaces(text: String) = Meshmobile.setInterfaces(text)

  override fun version(): String = Meshmobile.version()

  override fun start(id: String, stateDir: String, controlUrl: String, hostname: String, authKey: String) =
    Meshmobile.start(id, stateDir, controlUrl, hostname, authKey)

  override fun forward(id: String, host: String, port: Long, tls: Boolean): Long =
    Meshmobile.forward(id, host, port, tls)

  override fun stop(id: String) = Meshmobile.stop(id)

  override fun stopAll() = Meshmobile.stopAll()

  override fun status(id: String): String = Meshmobile.status(id)
}
