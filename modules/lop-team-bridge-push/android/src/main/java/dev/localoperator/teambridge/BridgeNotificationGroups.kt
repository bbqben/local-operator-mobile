package dev.localoperator.teambridge

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.service.notification.StatusBarNotification

/** One generic summary per conversation. It is not an Expo message or a tap
 * target, and GROUP_ALERT_CHILDREN leaves the child's original alert policy in
 * charge. Never copy sender, preview, avatar or Expo extras into a summary. */
internal object BridgeNotificationGroups {
  const val CHILD_REMOVED = "dev.localoperator.teambridge.CHILD_REMOVED"
  const val CHILD_ID = 0 // Expo’s default getNotifyId().
  private const val SUMMARY_ID = 1
  // notify() queues work in system_server; retirement must cancel submissions
  // even before activeNotifications sees them. The presentation lock owns this
  // set and snapshots drop acknowledged keys instead of retaining message history.
  private val unobserved = mutableSetOf<Pair<String?, Int>>()

  private fun manager(context: Context) = requireNotNull(context.getSystemService(NotificationManager::class.java))

  fun isSummary(record: StatusBarNotification): Boolean = record.id == SUMMARY_ID &&
    isBridge(record) && record.tag == record.notification.group &&
    record.notification.flags and Notification.FLAG_GROUP_SUMMARY != 0

  private fun isBridge(record: StatusBarNotification): Boolean =
    record.notification.group?.startsWith(BridgePush.KEY_PREFIX) == true

  @Suppress("DEPRECATION")
  fun post(context: Context, tag: String, id: Int, child: Notification) {
    val system = manager(context)
    val active = system.activeNotifications
    unobserved.removeAll(active.map { it.tag to it.id }.toSet())
    if (!system.areNotificationsEnabled()) return
    if (Build.VERSION.SDK_INT >= 26 &&
      system.getNotificationChannel(child.channelId)?.importance == NotificationManager.IMPORTANCE_NONE) return
    unobserved.add(tag to id)
    val group = child.group
    val icon = child.smallIcon
    if (group == null || icon == null) {
      system.notify(tag, id, child)
      return
    }
    // Match the individual child's tap/dismiss lifecycle, without changing its
    // Expo content intent. A swipe of the child needs cleanup even with no JS.
    child.deleteIntent = PendingIntent.getBroadcast(context, 0,
      Intent(context, LoNotificationsService::class.java).apply {
        action = CHILD_REMOVED
        data = Uri.Builder().scheme("localoperator").authority("bridge-child-removed").appendPath(tag).build()
      }, PendingIntent.FLAG_IMMUTABLE)
    system.notify(tag, id, child)
    if (active.any { isSummary(it) && it.tag == group } || (group to SUMMARY_ID) in unobserved) return
    val builder = if (Build.VERSION.SDK_INT >= 26) {
      Notification.Builder(context, child.channelId)
        .setGroupAlertBehavior(Notification.GROUP_ALERT_CHILDREN)
    } else Notification.Builder(context)
    val summary = builder
      .setSmallIcon(icon)
      .setColor(child.color)
      .setContentTitle(PresentationStrings.hiddenPreview(context))
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setGroup(group)
      .setGroupSummary(true)
      .setOnlyAlertOnce(true)
      .setShowWhen(false)
      .build()
    unobserved.add(group to SUMMARY_ID)
    system.notify(group, SUMMARY_ID, summary)
  }

  /** Cancel only orphan Bridge summaries; never infer membership from an Expo
   * message tag. Some Android versions do not remove app-posted summaries. */
  fun prune(context: Context, removed: Set<Pair<String?, Int>> = emptySet()) {
    val system = manager(context)
    val records = system.activeNotifications.filter(::isBridge)
    unobserved.removeAll(records.map { it.tag to it.id }.toSet() + removed)
    val remaining = records.filterNot { isSummary(it) || (it.tag to it.id) in removed }
      .mapTo(mutableSetOf()) { it.notification.group }
    records.filter { isSummary(it) && it.notification.group !in remaining }.forEach {
      system.cancel(it.tag, it.id)
    }
  }

  fun removeAll(context: Context) {
    val system = manager(context)
    val active = system.activeNotifications.filter(::isBridge).map { it.tag to it.id }
    (unobserved + active).forEach { (tag, id) -> system.cancel(tag, id) }
    unobserved.clear()
  }
}
