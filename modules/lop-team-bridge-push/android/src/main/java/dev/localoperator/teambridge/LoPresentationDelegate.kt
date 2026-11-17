package dev.localoperator.teambridge

import android.content.Context
import expo.modules.notifications.notifications.model.Notification
import expo.modules.notifications.notifications.model.NotificationBehaviorRecord
import expo.modules.notifications.service.delegates.ExpoPresentationDelegate

/**
 * Expo's presentation delegate, with two additions (ADR 0010 S2/S4):
 *
 * 1. the session channel remap (`SessionChannels`) BEFORE Expo builds, so
 *    Expo looks up the HIGH `alert.*` channel instead of the deleted `sound.*`
 *    one (and never falls back to its generic "Miscellaneous" channel);
 * 2. the Team Bridge decoration (`TeamBridgeDecorator`) AFTER Expo builds, so
 *    Expo's content intent, extras and marshalled request stay intact.
 *
 * WHY SUBCLASS EXPO, NOT A SECOND FIREBASE SERVICE. `ExpoPresentationDelegate`
 * is `open` with `protected open suspend fun createNotification`
 * (expo-notifications 57.0.21, `ExpoPresentationDelegate.kt:159`). Building on
 * it keeps Expo's tap pipeline, `getPresentedNotificationsAsync` and
 * `dismissNotificationAsync` working; a second messaging service would bypass
 * all three. The instrumentation runner (`TeamBridgePushTestRunner`) pins that
 * this override is still reached, so an Expo bump that renames it fails CI.
 */
class LoPresentationDelegate(context: Context) : ExpoPresentationDelegate(context) {
  override suspend fun createNotification(
    notification: Notification,
    notificationBehavior: NotificationBehaviorRecord?,
  ): android.app.Notification {
    val routed = SessionChannels.remap(context, notification)
    val built = super.createNotification(routed, notificationBehavior)
    return try {
      TeamBridgeDecorator.decorate(context, routed, built)
    } catch (_: Throwable) {
      // Never cost delivery: Expo's own notification is today's behaviour.
      built
    }
  }
}
