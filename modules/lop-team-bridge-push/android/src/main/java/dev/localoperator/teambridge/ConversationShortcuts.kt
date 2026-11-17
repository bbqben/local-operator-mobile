package dev.localoperator.teambridge

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import androidx.core.app.Person
import androidx.core.content.LocusIdCompat
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat

/**
 * Long-lived conversation shortcuts for Team Bridge (ADR 0010 §4 step 3).
 *
 * WHY. On Android 11+ a notification is shown as a CONVERSATION (its own shade
 * section, the sender's face with the app badge in the corner, priority and
 * bubble controls) only when it carries MessagingStyle AND names a long-lived
 * shortcut with a Person (developer.android.com "People and conversations").
 * The shortcut is a separate object from the notification, so the AndroidX
 * Compat API is fine here even though the notification itself is platform-typed.
 *
 * PRIVACY. A shortcut holds a conversation name and a face, and outlives the
 * notification. They are account data: `removeAll` runs on sign-out and when
 * the Team Bridge switch turns off (`src/team-bridge/push.ts`), and they are
 * excluded from the launcher's long-press menu on API 33+.
 */
internal object ConversationShortcuts {
  /** The deep link the app's router already resolves for a thread
   *  (`teamBridgeThreadPath` in `src/team-bridge/push-payload.ts`; scheme from
   *  `app.config.ts`). Opening the shortcut lands on the conversation. */
  fun deepLink(push: BridgePush): Uri =
    Uri.parse("localoperator://team-bridge/${Uri.encode(push.tenantId)}/${Uri.encode(push.conversationId)}")

  fun publish(context: Context, push: BridgePush, label: String, sender: Person, avatar: Bitmap) {
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
    val intent = (launch ?: Intent()).apply {
      // A shortcut intent must carry an action, and VIEW + data is what the
      // router's deep-link path reads; the launch component keeps it in-app.
      action = Intent.ACTION_VIEW
      data = deepLink(push)
    }
    val shortcut = ShortcutInfoCompat.Builder(context, push.conversationKey)
      .setShortLabel(label)
      .setLongLived(true)
      .setLocusId(LocusIdCompat(push.conversationKey))
      .setPerson(sender)
      .setIcon(IconCompat.createWithBitmap(avatar))
      .setIntent(intent)
      .setExcludedFromSurfaces(ShortcutInfoCompat.SURFACE_LAUNCHER)
      .build()
    // pushDynamicShortcut is not rate-limited (unlike setDynamicShortcuts) and
    // evicts the oldest dynamic shortcut at the launcher's cap.
    ShortcutManagerCompat.pushDynamicShortcut(context, shortcut)
  }

  /** Remove every Team Bridge shortcut, dynamic and cached. */
  fun removeAll(context: Context) {
    val ids = ShortcutManagerCompat
      .getShortcuts(context, ShortcutManagerCompat.FLAG_MATCH_DYNAMIC or ShortcutManagerCompat.FLAG_MATCH_CACHED)
      .map { it.id }
      .filter { it.startsWith(BridgePush.KEY_PREFIX) }
    if (ids.isEmpty()) return
    // removeLongLivedShortcuts also drops the CACHED copy the system keeps for
    // a conversation; removeDynamicShortcuts alone would leave it behind.
    ShortcutManagerCompat.removeLongLivedShortcuts(context, ids)
  }
}
