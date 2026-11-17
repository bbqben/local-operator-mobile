package dev.localoperator.teambridge

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * The JS surface of the Team Bridge Android presentation
 * (`src/team-bridge/android-presentation.ts`). Two calls only:
 *
 * - `setPresentationStrings`: the localised "me" name and lock-screen
 *   placeholder the decorator draws with while no JS runs (`PresentationStrings`).
 * - `removeConversationShortcuts`: sign-out and switch-off cleanup of the
 *   long-lived shortcuts, which are account data (`ConversationShortcuts`).
 *
 * Android only (`expo-module.config.json`); iOS and web resolve no module and
 * the JS side degrades to a no-op.
 */
class LopTeamBridgePushModule : Module() {
  private val context get() = requireNotNull(appContext.reactContext)

  override fun definition() = ModuleDefinition {
    Name("LopTeamBridgePush")

    Function("setPresentationStrings") { selfName: String, hiddenPreview: String ->
      PresentationStrings.save(context, selfName, hiddenPreview)
    }

    AsyncFunction("removeConversationShortcuts") {
      ConversationShortcuts.removeAll(context)
    }
  }
}
