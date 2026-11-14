import CoreHaptics
import ExpoModulesCore

/// One transient haptic at a caller-supplied intensity and sharpness, both 0...1.
/// `CHHapticEventParameter` hapticIntensity is the public intensity control.
/// This module does not choose a UIImpactFeedbackGenerator style and does not
/// emit a train of pulses. The hold clock does not call it.
public class HapticIntensityModule: Module {
  private var engine: CHHapticEngine?

  public func definition() -> ModuleDefinition {
    Name("HapticIntensity")

    Function("playTransient") { (intensity: Double, sharpness: Double) -> Bool in
      self.onMain {
        self.play(intensity: intensity, sharpness: sharpness)
      }
    }
  }

  private func onMain<T>(_ body: () -> T) -> T {
    if Thread.isMainThread {
      return body()
    }
    return DispatchQueue.main.sync(execute: body)
  }

  private func play(intensity: Double, sharpness: Double) -> Bool {
    guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else { return false }
    let level = Float(min(1, max(0, intensity)))
    let edge = Float(min(1, max(0, sharpness)))
    do {
      let engine = try prepareEngine()
      let event = CHHapticEvent(
        eventType: .hapticTransient,
        parameters: [
          CHHapticEventParameter(parameterID: .hapticIntensity, value: level),
          CHHapticEventParameter(parameterID: .hapticSharpness, value: edge),
        ],
        relativeTime: 0
      )
      let pattern = try CHHapticPattern(events: [event], parameters: [])
      let player = try engine.makePlayer(with: pattern)
      try player.start(atTime: CHHapticTimeImmediate)
      return true
    } catch {
      return false
    }
  }

  private func prepareEngine() throws -> CHHapticEngine {
    if let engine {
      try? engine.start()
      return engine
    }
    let created = try CHHapticEngine()
    created.isAutoShutdownEnabled = true
    engine = created
    try created.start()
    return created
  }
}
