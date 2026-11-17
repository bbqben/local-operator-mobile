package dev.localoperator.teambridge

import android.app.Activity
import android.app.Instrumentation
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import com.google.firebase.messaging.RemoteMessage
import expo.modules.notifications.notifications.model.Notification
import expo.modules.notifications.notifications.model.NotificationContent
import expo.modules.notifications.notifications.model.NotificationRequest
import expo.modules.notifications.notifications.model.RemoteNotificationContent
import expo.modules.notifications.notifications.model.triggers.FirebaseNotificationTrigger
import expo.modules.notifications.service.NotificationsService
import expo.modules.notifications.service.delegates.ExpoPresentationDelegate
import org.json.JSONObject
import java.util.Date
import android.app.Notification as AndroidNotification

/**
 * Framework-only instrumentation for ADR 0010 S2/S4, the same shape as
 * `lop-notification-sound`'s runner: no new test dependency, a fixed case list,
 * a machine-checkable summary line (`scripts/ci/team-bridge-push-android-tests.sh`).
 *
 * WHAT IT PROVES on a real Android runtime: the API-tier gate; payload parsing;
 * every shared-fixture row through parse → spec → rendered pixels; the
 * decorator's platform MessagingStyle extras, group, PRIVATE visibility and
 * sender-free public version, at the device's real API level and at a forced
 * pre-28 tier; that Expo's extras survive recoverBuilder; the session channel
 * remap against real NotificationManager channels; the foreground rewrap; and
 * that the Expo extension points this module overrides still exist (an Expo
 * bump that renames them fails here, not on phones — ADR 0010 §9).
 *
 * WHAT IT DOES NOT PROVE: the conversation shortcut is published (this library
 * test APK has no launcher activity, so ShortcutManager refuses; the case
 * asserts the decorator then sets NO shortcut id, the safe half), a real FCM
 * delivery, or the shade's rendering. Those are the app-APK emulator and device
 * rows of ADR 0010 §7.
 */
class TeamBridgePushTestRunner : Instrumentation() {
  override fun onCreate(arguments: Bundle?) { super.onCreate(arguments); start() }

  override fun onStart() {
    val cases = listOf<Pair<String, () -> Unit>>(
      "tierGate" to ::tierGate,
      "payloadParsing" to ::payloadParsing,
      "fixtureRows" to ::fixtureRows,
      "decorateMessaging" to ::decorateMessaging,
      "decoratePlainTier" to ::decoratePlainTier,
      "decorateWithoutSender" to ::decorateWithoutSender,
      "nonBridgeUntouched" to ::nonBridgeUntouched,
      "sessionRemap" to ::sessionRemap,
      "foregroundRewrap" to ::foregroundRewrap,
      "expoExtensionPoints" to ::expoExtensionPoints,
    )
    var passed = 0
    for ((i, case) in cases.withIndex()) {
      val status = Bundle().apply {
        putString("class", TeamBridgePushTestRunner::class.java.name); putString("test", case.first)
        putInt("numtests", cases.size); putInt("current", i + 1)
      }
      sendStatus(1, status)
      try { case.second(); passed++; sendStatus(0, status) }
      catch (error: Throwable) { status.putString("stack", error.stackTraceToString()); sendStatus(-2, status) }
    }
    finish(
      if (passed == cases.size) Activity.RESULT_OK else Activity.RESULT_CANCELED,
      Bundle().apply { putString("stream", "$passed/${cases.size} team bridge push native checks passed\n") },
    )
  }

  private val ctx: Context get() = targetContext

  private fun body(sender: String? = """{"kind":"person","initials":"bc","tone":1}""", conv: String? = """{"group":true,"members":3}"""): JSONObject {
    val json = JSONObject("""{"v":1,"type":"team_bridge_message","tenant_id":"t1","conversation_id":"c1","message_id":"m1","seq":4}""")
    sender?.let { json.put("sender", JSONObject(it)) }
    conv?.let { json.put("conv", JSONObject(it)) }
    return json
  }

  private fun remote(data: Map<String, String>): RemoteMessage =
    RemoteMessage.Builder("test@local-operator").setMessageId("mid-1").setData(data).build()

  private fun bridgeNotification(body: JSONObject = body()): Notification {
    val message = remote(mapOf(
      "title" to "Ben Carter", "message" to "Lunch?", "subtitle" to "#design",
      "channelId" to "team-bridge", "tag" to "tb:c1:m1", "body" to body.toString(),
    ))
    return Notification(NotificationRequest("tb:c1:m1", RemoteNotificationContent(message), FirebaseNotificationTrigger(message)), Date(1_700_000_000_000))
  }

  /** What Expo hands the decorator: a built notification carrying Expo's extras. */
  @Suppress("DEPRECATION")
  private fun expoBuilt(): AndroidNotification {
    val builder = if (Build.VERSION.SDK_INT >= 26) AndroidNotification.Builder(ctx, "team-bridge") else AndroidNotification.Builder(ctx)
    return builder.setSmallIcon(android.R.drawable.ic_dialog_info)
      .setContentTitle("Ben Carter").setContentText("Lunch?").setSubText("#design")
      .setExtras(Bundle().apply { putByteArray("expo.notification_request", byteArrayOf(7, 7, 7)); putString("body", "{}") })
      .build()
  }

  private fun tierGate() {
    for (sdk in listOf(24, 25, 26, 27)) check(PresentationTier.forSdk(sdk) == PresentationTier.PLAIN) { "sdk $sdk" }
    for (sdk in listOf(28, 29)) check(PresentationTier.forSdk(sdk) == PresentationTier.MESSAGING) { "sdk $sdk" }
    for (sdk in listOf(30, 33, 36)) check(PresentationTier.forSdk(sdk) == PresentationTier.CONVERSATION) { "sdk $sdk" }
  }

  private fun payloadParsing() {
    val push = checkNotNull(BridgePushPayload.parse(body()))
    check(push.conversationKey == "tb:c1" && push.messageId == "m1")
    check(push.sender == BridgeSender(BridgeSender.Kind.PERSON, "bc", 1))
    check(push.conv == BridgeConv(true, 3))
    // v as a string, as some FCM paths stringify.
    check(BridgePushPayload.parse(body().put("v", "1")) != null)
    // Not ours, or an unknown version: never decorated.
    check(BridgePushPayload.parse(body().put("type", "session_complete")) == null)
    check(BridgePushPayload.parse(body().put("v", 2)) == null)
    check(BridgePushPayload.parse(body().put("conversation_id", "..")) == null)
    check(BridgePushPayload.parse(null) == null)
    // Absent blocks: today's notification.
    check(BridgePushPayload.parse(body(sender = null, conv = null))!!.let { it.sender == null && it.conv == null })
    // Out-of-range tone or unknown kind: no face rather than a wrong colour.
    check(BridgePushPayload.parse(body(sender = """{"kind":"person","initials":"B","tone":8}"""))!!.sender == null)
    check(BridgePushPayload.parse(body(sender = """{"kind":"robot","tone":1}"""))!!.sender == null)
    // An agent never shows letters, even if a payload carried some.
    check(BridgePushPayload.parse(body(sender = """{"kind":"agent","initials":"DT","tone":2}"""))!!.sender == BridgeSender(BridgeSender.Kind.AGENT, "", 2))
    // Initials beyond the cloud's rule become the silhouette, never a partial guess.
    check(BridgePushPayload.cleanInitials("ABC") == "")
    check(BridgePushPayload.cleanInitials("B!") == "")
    check(BridgePushPayload.cleanInitials("Ⅻ") == "Ⅻ")
    check(BridgePushPayload.cleanInitials("李") == "李")
  }

  private fun fixtureRows() {
    val text = context.assets.open("bridge_push_avatar_fixture.json").use { it.readBytes().toString(Charsets.UTF_8) }
    val rows = JSONObject(text).getJSONArray("senders")
    check(rows.length() >= 30) { "fixture rows: ${rows.length()}" }
    for (i in 0 until rows.length()) {
      val row = rows.getJSONObject(i)
      val expect = row.getJSONObject("expect")
      val block = JSONObject().put("kind", row.getString("kind")).put("tone", expect.getInt("tone"))
      if (row.getString("kind") == "person") block.put("initials", expect.getString("initials"))
      val sender = checkNotNull(BridgePushPayload.sender(block)) { "row ${row.getString("name")} refused" }
      val spec = AvatarRenderer.spec(sender)
      val name = row.getString("name")
      check(spec.background == AvatarRenderer.PALETTE[expect.getInt("tone")]) { "$name tone" }
      when {
        row.getString("kind") == "agent" -> check(spec.glyph == AvatarRenderer.Glyph.Agent) { "$name agent" }
        expect.getString("initials").isEmpty() -> check(spec.glyph == AvatarRenderer.Glyph.Person) { "$name silhouette" }
        else -> check(spec.glyph == AvatarRenderer.Glyph.Initials(java.text.Normalizer.normalize(expect.getString("initials"), java.text.Normalizer.Form.NFC).uppercase(java.util.Locale.ROOT))) { "$name initials" }
      }
      val bitmap = AvatarRenderer.render(spec, 192)
      // Top-centre, inside the circle and clear of every glyph: the tone.
      check(bitmap.getPixel(96, 14) == spec.background) { "$name background pixel" }
      // A corner is outside the circle: transparent, so the OS crop has no halo.
      check(Color.alpha(bitmap.getPixel(1, 1)) == 0) { "$name corner" }
      // Something light was drawn on the tone (a glyph exists). Measured as
      // "every channel well above the background's", not "near-white": the
      // silhouette is white at 90 % alpha (core's 230), so on tone 1 its
      // blended green is ~237 and a >240 test missed it (CI, API 29 and 36).
      var ink = false
      val bg = spec.background
      for (y in 40 until 152 step 2) for (x in 40 until 152 step 2) {
        val p = bitmap.getPixel(x, y)
        if (Color.red(p) - Color.red(bg) > 60 || Color.green(p) - Color.green(bg) > 60 || Color.blue(p) - Color.blue(bg) > 60) {
          if (Color.red(p) >= Color.red(bg) && Color.green(p) >= Color.green(bg) && Color.blue(p) >= Color.blue(bg)) ink = true
        }
      }
      check(ink) { "$name drew no glyph" }
      bitmap.recycle()
    }
  }

  private fun decorateMessaging() {
    val sdk = Build.VERSION.SDK_INT
    val built = expoBuilt()
    val out = TeamBridgeDecorator.decorate(ctx, bridgeNotification(), built)
    check(out.group == "tb:c1") { "group ${out.group}" }
    check(out.visibility == AndroidNotification.VISIBILITY_PRIVATE)
    val public = checkNotNull(out.publicVersion)
    check(public.extras.getCharSequence(AndroidNotification.EXTRA_TITLE)?.toString() == PresentationStrings.hiddenPreview(ctx))
    check(public.extras.getCharSequence(AndroidNotification.EXTRA_TEXT) == null) { "public version leaks the preview" }
    check(!public.extras.containsKey("expo.notification_request")) { "public version carries Expo's request" }
    // Expo's tap/dismiss extras survive recoverBuilder.
    check(out.extras.getByteArray("expo.notification_request")?.contentEquals(byteArrayOf(7, 7, 7)) == true) { "expo extras lost" }
    if (sdk >= 28) {
      check(out.extras.getString(AndroidNotification.EXTRA_TEMPLATE) == AndroidNotification.MessagingStyle::class.java.name) { "template ${out.extras.getString(AndroidNotification.EXTRA_TEMPLATE)}" }
      check(out.extras.getBoolean(AndroidNotification.EXTRA_IS_GROUP_CONVERSATION)) { "group conversation" }
      check(out.extras.getCharSequence(AndroidNotification.EXTRA_CONVERSATION_TITLE)?.toString() == "#design")
      val messages = checkNotNull(out.extras.getParcelableArray(AndroidNotification.EXTRA_MESSAGES)) { "no messages" }
      check(messages.size == 1)
      // A DM is not a group conversation and carries no conversation title.
      val dm = TeamBridgeDecorator.decorate(ctx, bridgeNotification(body(conv = """{"group":false,"members":2}""")), expoBuilt())
      check(!dm.extras.getBoolean(AndroidNotification.EXTRA_IS_GROUP_CONVERSATION))
      check(dm.extras.getCharSequence(AndroidNotification.EXTRA_CONVERSATION_TITLE) == null)
    }
    if (sdk >= 30) {
      // This test APK cannot publish shortcuts (no launcher activity), so the
      // decorator must NOT name one: a notification naming a missing shortcut
      // is demoted by the OS. The app-APK lane proves the published half.
      val published = (ctx.getSystemService(android.content.pm.ShortcutManager::class.java)?.dynamicShortcuts ?: emptyList()).any { it.id == "tb:c1" }
      check(published == (out.shortcutId == "tb:c1")) { "shortcut id ${out.shortcutId} vs published $published" }
      check(published == (out.locusId?.id == "tb:c1")) { "locus ${out.locusId}" }
    }
    // Forced MESSAGING tier on a 30+ device: no shortcut at all.
    if (sdk >= 30) {
      val m = TeamBridgeDecorator.decorate(ctx, bridgeNotification(), expoBuilt(), sdk = 29)
      check(m.shortcutId == null && m.locusId == null) { "tier 29 set a shortcut" }
    }
  }

  private fun decoratePlainTier() {
    val out = TeamBridgeDecorator.decorate(ctx, bridgeNotification(), expoBuilt(), sdk = 27)
    check(out.group == "tb:c1")
    check(out.visibility == AndroidNotification.VISIBILITY_PRIVATE && out.publicVersion != null)
    check(out.extras.getString(AndroidNotification.EXTRA_TEMPLATE) != AndroidNotification.MessagingStyle::class.java.name) { "pre-28 got MessagingStyle" }
  }

  private fun decorateWithoutSender() {
    val out = TeamBridgeDecorator.decorate(ctx, bridgeNotification(body(sender = null)), expoBuilt())
    check(out.group == "tb:c1" && out.publicVersion != null)
    check(out.extras.getString(AndroidNotification.EXTRA_TEMPLATE) != AndroidNotification.MessagingStyle::class.java.name) { "no sender must keep today's look" }
  }

  private fun nonBridgeUntouched() {
    val message = remote(mapOf("title" to "Done", "channelId" to "sound.soft-pulse", "body" to """{"type":"session_complete"}"""))
    val n = Notification(NotificationRequest("s1", RemoteNotificationContent(message), FirebaseNotificationTrigger(message)))
    val built = expoBuilt()
    check(TeamBridgeDecorator.decorate(ctx, n, built) === built)
  }

  private fun sessionRemap() {
    check(SessionChannels.deviceChannelFor("sound.soft-pulse") == "alert.soft-pulse")
    check(SessionChannels.deviceChannelFor("team-bridge") == null)
    check(SessionChannels.deviceChannelFor("sound.") == null)
    check(SessionChannels.deviceChannelFor(null) == null)
    if (Build.VERSION.SDK_INT < 26) return
    val manager = ctx.getSystemService(NotificationManager::class.java)
    val wire = "sound.rt-${System.nanoTime()}"
    val target = SessionChannels.deviceChannelFor(wire)!!
    val message = remote(mapOf("title" to "Done", "message" to "ok", "channelId" to wire, "tag" to "s-tag", "body" to """{"type":"session_complete","sessionId":"s1"}"""))
    val n = Notification(NotificationRequest("s-tag", RemoteNotificationContent(message), FirebaseNotificationTrigger(message)), Date(42))
    // Target absent: untouched (a phone that has not migrated keeps its channel).
    check(SessionChannels.remap(ctx, n) === n)
    manager.createNotificationChannel(NotificationChannel(target, "t", NotificationManager.IMPORTANCE_HIGH))
    try {
      val out = SessionChannels.remap(ctx, n)
      val trigger = out.notificationRequest.trigger as FirebaseNotificationTrigger
      check(trigger.getNotificationChannel() == target) { "channel ${trigger.getNotificationChannel()}" }
      check(out.notificationRequest.identifier == "s-tag" && out.originDate.time == 42L)
      check(out.notificationRequest.content.body?.optString("sessionId") == "s1") { "body lost" }
      check(out.notificationRequest.content.title == "Done" && out.notificationRequest.content.text == "ok")
      check((out.notificationRequest.content as RemoteNotificationContent).isDataOnly)
    } finally {
      manager.deleteNotificationChannel(target)
    }
  }

  private fun foregroundRewrap() {
    val n = bridgeNotification()
    val out = ForegroundBridge.rewrap(n)
    val content = out.notificationRequest.content
    check(content is NotificationContent) { "still remote: the handler would drop it" }
    check(content.title == "Ben Carter" && content.text == "Lunch?" && content.subText == "#design")
    check(BridgePushPayload.parse(content.body)?.conversationId == "c1")
    check(out.notificationRequest.identifier == "tb:c1:m1")
    check(out.notificationRequest.trigger === n.notificationRequest.trigger) { "trigger must stay (tap dataString)" }
    // A session push is left alone: its JS rule is "not shown in the foreground".
    val session = remote(mapOf("title" to "Done", "body" to """{"type":"session_complete"}"""))
    val s = Notification(NotificationRequest("s1", RemoteNotificationContent(session), FirebaseNotificationTrigger(session)))
    check(ForegroundBridge.rewrap(s) === s)
    // No title: nothing to show, left to Expo's data-only path.
    val silent = remote(mapOf("body" to body().toString()))
    val q = Notification(NotificationRequest("q", RemoteNotificationContent(silent), FirebaseNotificationTrigger(silent)))
    check(ForegroundBridge.rewrap(q) === q)
  }

  private fun expoExtensionPoints() {
    val service = LoNotificationsService()
    val present = NotificationsService::class.java.getDeclaredMethod("getPresentationDelegate", Context::class.java).apply { isAccessible = true }
    check(present.invoke(service, ctx) is LoPresentationDelegate) { "presentation override not reached" }
    val handle = NotificationsService::class.java.getDeclaredMethod("getHandlingDelegate", Context::class.java).apply { isAccessible = true }
    check(handle.invoke(service, ctx) is LoHandlingDelegate) { "handling override not reached" }
    // The suspend override's JVM shape: (Notification, NotificationBehaviorRecord, Continuation).
    check(ExpoPresentationDelegate::class.java.declaredMethods.any { it.name == "createNotification" && it.parameterTypes.size == 3 }) { "Expo renamed createNotification" }
  }
}
