package live.arkitekt.pokket.mesh

/**
 * The Go sidecar as the module sees it. The real one (GoMeshBackend) is only
 * compiled when the gomobile library has been built; see build.gradle.
 */
interface MeshBackend {
  fun setListener(onStatus: (String) -> Unit, onLog: (String, String) -> Unit)
  fun setInterfaces(text: String)
  fun setDefaultRoute(ifName: String, gateway: String)
  fun version(): String
  fun setVerbose(on: Boolean)
  fun start(id: String, stateDir: String, controlUrl: String, hostname: String, authKey: String)
  fun forward(id: String, host: String, port: Long, tls: Boolean): Long
  fun stop(id: String)
  fun status(id: String): String
}
