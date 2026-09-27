import ExpoModulesCore
import Network
#if canImport(Meshmobile)
import Meshmobile
#endif

private let statusEvent = "onStatus"
private let logEvent = "onLog"

final class MeshUnavailableException: Exception {
  override var reason: String {
    "This build of pokket was made without the mesh sidecar"
  }
}

final class MeshGoException: GenericException<String> {
  override var reason: String { param }
}

#if canImport(Meshmobile)
/// Receives the Go sidecar's events (on Go threads) and forwards them to JS.
private final class MeshListener: NSObject, MeshmobileListenerProtocol {
  weak var module: PokketMeshModule?

  func onStatus(_ statusJSON: String?) {
    module?.sendEvent(statusEvent, ["status": statusJSON ?? ""])
  }

  func onLog(_ id_: String?, message: String?) {
    module?.sendEvent(logEvent, ["id": id_ ?? "", "message": message ?? ""])
  }
}
#endif

public final class PokketMeshModule: Module {
  #if canImport(Meshmobile)
  private let listener = MeshListener()
  private let available = true
  /// Tells tsnet which interface carries the default route (Wi-Fi <-> cellular).
  private let pathMonitor = NWPathMonitor()
  #else
  private let available = false
  #endif

  /// Application Support/mesh/<id>, kept out of backups: a restored node key
  /// on a second device would impersonate the first.
  private func stateDir(_ id: String) throws -> URL {
    guard id.range(of: "^[A-Za-z0-9_-]{1,64}$", options: .regularExpression) != nil else {
      throw MeshGoException("invalid mesh id")
    }
    var base = try FileManager.default.url(
      for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true
    ).appendingPathComponent("mesh", isDirectory: true)
    try FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    try? base.setResourceValues(values)
    return base.appendingPathComponent(id, isDirectory: true)
  }

  public func definition() -> ModuleDefinition {
    Name("PokketMesh")

    Events(statusEvent, logEvent)

    OnCreate {
      #if canImport(Meshmobile)
      self.listener.module = self
      MeshmobileSetListener(self.listener)
      self.pathMonitor.pathUpdateHandler = { path in
        let name = path.status == .satisfied ? (path.availableInterfaces.first?.name ?? "") : ""
        MeshmobileSetDefaultRoute(name, "")
      }
      self.pathMonitor.start(queue: DispatchQueue(label: "live.arkitekt.pokket.mesh.path"))
      #endif
    }

    OnDestroy {
      #if canImport(Meshmobile)
      self.pathMonitor.cancel()
      MeshmobileStopAll()
      #endif
    }

    Function("isAvailable") { () -> Bool in
      self.available
    }

    Function("version") { () -> String? in
      #if canImport(Meshmobile)
      return MeshmobileVersion()
      #else
      return nil
      #endif
    }

    AsyncFunction("start") { (id: String, controlUrl: String, hostname: String, authKey: String?) throws in
      #if canImport(Meshmobile)
      let dir = try self.stateDir(id)
      var error: NSError?
      if !MeshmobileStart(id, dir.path, controlUrl, hostname, authKey ?? "", &error) {
        throw MeshGoException(error?.localizedDescription ?? "mesh start failed")
      }
      #else
      throw MeshUnavailableException()
      #endif
    }

    AsyncFunction("forward") { (id: String, host: String, port: Int, tls: Bool) throws -> Int in
      #if canImport(Meshmobile)
      var localPort: Int = 0
      var error: NSError?
      if !MeshmobileForward(id, host, port, tls, &localPort, &error) {
        throw MeshGoException(error?.localizedDescription ?? "mesh forward failed")
      }
      return localPort
      #else
      throw MeshUnavailableException()
      #endif
    }

    AsyncFunction("stop") { (id: String) in
      #if canImport(Meshmobile)
      MeshmobileStop(id)
      #endif
    }

    AsyncFunction("forget") { (id: String) throws in
      #if canImport(Meshmobile)
      MeshmobileStop(id)
      #endif
      let dir = try self.stateDir(id)
      try? FileManager.default.removeItem(at: dir)
    }

    AsyncFunction("status") { (id: String) -> String? in
      #if canImport(Meshmobile)
      return MeshmobileStatus(id)
      #else
      return nil
      #endif
    }

    // iOS lets tsnet see interfaces itself; nothing to push.
    AsyncFunction("refreshNetwork") {}
  }
}
