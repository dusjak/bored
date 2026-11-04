import ExpoModulesCore
import UIKit

/// Public stand-in for a locked screen.
/// `AppState` cannot tell a lock from an app switch. `protectedDataWillBecomeUnavailable`
/// is the supported signal, and it only arrives if the device has a passcode and the
/// process is still awake. A short background task keeps the process up long enough
/// to hear it. Devices without a passcode never send it.
public class ScreenLockModule: Module {
  private var observers: [NSObjectProtocol] = []
  private var backgroundTask: UIBackgroundTaskIdentifier = .invalid
  private var endWork: DispatchWorkItem?

  public func definition() -> ModuleDefinition {
    Name("ScreenLock")

    Events("onProtectedDataWillBecomeUnavailable")

    OnStartObserving {
      self.startObserving()
    }

    OnStopObserving {
      self.stopObserving()
    }

    OnDestroy {
      self.stopObserving()
    }
  }

  private func startObserving() {
    guard observers.isEmpty else { return }
    let center = NotificationCenter.default

    observers.append(
      center.addObserver(
        forName: UIApplication.protectedDataWillBecomeUnavailableNotification,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        self?.sendEvent("onProtectedDataWillBecomeUnavailable")
        self?.endBackgroundTask()
      }
    )

    observers.append(
      center.addObserver(
        forName: UIApplication.didEnterBackgroundNotification,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        self?.beginBackgroundTask()
      }
    )

    observers.append(
      center.addObserver(
        forName: UIApplication.willEnterForegroundNotification,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        self?.endBackgroundTask()
      }
    )
  }

  private func stopObserving() {
    let center = NotificationCenter.default
    observers.forEach { center.removeObserver($0) }
    observers.removeAll()
    endBackgroundTask()
  }

  /// The lock notification can land a few seconds after the app backgrounds.
  /// Ten seconds is enough to hear it, and short enough that an app switch
  /// does not keep the process awake for the whole background window.
  private func beginBackgroundTask() {
    guard backgroundTask == .invalid else { return }
    backgroundTask = UIApplication.shared.beginBackgroundTask(withName: "bored.screen-lock") { [weak self] in
      self?.endBackgroundTask()
    }
    let work = DispatchWorkItem { [weak self] in
      self?.endBackgroundTask()
    }
    endWork = work
    DispatchQueue.main.asyncAfter(deadline: .now() + 10, execute: work)
  }

  private func endBackgroundTask() {
    endWork?.cancel()
    endWork = nil
    guard backgroundTask != .invalid else { return }
    let task = backgroundTask
    backgroundTask = .invalid
    UIApplication.shared.endBackgroundTask(task)
  }
}
