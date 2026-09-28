require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'PokketMesh'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage']
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: 'https://github.com/arkitektio/pokket.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Only the module's own sources: a recursive glob would also pick up the
  # headers inside Meshmobile.xcframework, and CocoaPods would put them in this
  # pod's umbrella header, where they cannot be found.
  s.source_files = "*.swift"
  # The Go half, produced by `pnpm build:mesh:ios` (scripts/build-mesh-mobile.sh).
  # Without it the module still builds (`canImport(Meshmobile)` is false) and
  # reports itself unavailable to JS.
  if File.exist?(File.join(__dir__, 'Meshmobile.xcframework'))
    s.vendored_frameworks = 'Meshmobile.xcframework'
    s.frameworks = 'SystemConfiguration'
  end
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
