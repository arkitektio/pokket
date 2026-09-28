// Prints the text on a screenshot (macOS Vision), so a CI log shows what the
// simulator had on screen — a system alert, the dev launcher, the app.
// Usage: swiftc -O scripts/ci/ocr.swift -o ocr && ./ocr screen.png
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
let lines = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }
print(lines.isEmpty ? "(no text)" : lines.joined(separator: " | "))
