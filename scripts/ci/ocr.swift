// Reads the text on a screenshot (macOS Vision), so CI can see what the
// simulator shows — a system alert, the dev launcher, the app.
//   ocr screen.png          prints the text, " | "-separated
//   ocr screen.png Open     prints where the text "Open" is, as "x y" in
//                           0…1 screen fractions from the top left (exit 1
//                           if it is not on screen)
// Build: swiftc -O scripts/ci/ocr.swift -o ocr
import AppKit
import Foundation
import Vision

guard CommandLine.arguments.count > 1,
      let image = NSImage(contentsOfFile: CommandLine.arguments[1]),
      let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil)
else {
  print("(no readable screenshot)")
  exit(0)
}
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
try? VNImageRequestHandler(cgImage: cgImage).perform([request])
let observations = request.results ?? []

if CommandLine.arguments.count > 2 {
  let wanted = CommandLine.arguments[2]
  for observation in observations {
    guard let text = observation.topCandidates(1).first?.string,
          text.trimmingCharacters(in: .whitespaces) == wanted
    else { continue }
    // Vision's origin is the bottom left.
    let box = observation.boundingBox
    print(String(format: "%.4f %.4f", box.midX, 1 - box.midY))
    exit(0)
  }
  exit(1)
}

let lines = observations.compactMap { $0.topCandidates(1).first?.string }
print(lines.isEmpty ? "(no text)" : lines.joined(separator: " | "))
