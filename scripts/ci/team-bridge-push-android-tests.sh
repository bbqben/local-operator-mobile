#!/usr/bin/env bash
# ADR 0010 S2/S4: run the Team Bridge push module's framework-only
# instrumentation (TeamBridgePushTestRunner) from the exact-SHA, already-compiled
# library test APK; no Gradle install/build in the emulator job. Same shape as
# notification-sound-android-tests.sh, whose comments carry the -r rationale.
set -euo pipefail
sh scripts/ci/await-emulator-ready.sh
apk=$(find "$RUNNER_TEMP/team-bridge-apk" -maxdepth 1 -name '*.apk')
adb install "$apk"
trap 'adb uninstall dev.localoperator.teambridge.test >/dev/null' EXIT
timeout 480 adb shell am instrument -w -r dev.localoperator.teambridge.test/dev.localoperator.teambridge.TeamBridgePushTestRunner | tee "$RUNNER_TEMP/team-bridge-push-native.log"
grep -q '10/10 team bridge push native checks passed' "$RUNNER_TEMP/team-bridge-push-native.log"
grep -Eq '^INSTRUMENTATION_CODE: -1[[:space:]]*$' "$RUNNER_TEMP/team-bridge-push-native.log"
if grep -Eq 'INSTRUMENTATION_(FAILED|ABORTED)|INSTRUMENTATION_STATUS_CODE: -[12]' "$RUNNER_TEMP/team-bridge-push-native.log"; then exit 1; fi
