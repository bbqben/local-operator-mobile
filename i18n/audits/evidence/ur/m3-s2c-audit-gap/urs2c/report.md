# Urdu (ur) audit — M3 S2c audit-gap wave (66 shipped keys)

**Verdict: failed (changes_requested)** — BLOCKER 0 · MAJOR 3 · MINOR 4 · NIT 4 · CODE 2

Source commit `9214ff9b43c58256c49f48a8c2858f9c186d35c8` · brief sha256 `30da94702a51fd850529a049ac446a397ab4bfc23387d14d1a9152e822edbda5` · auditor i18n-auditor (lopdev), session 6ce4c67b2038, model anthropic/claude-opus-5-5, no fallback · independent of translator · redaction-marker hits 0.

Route: git/scratch reads; read_public_copy not used (mobile paths refused by core; sidecars nested JSON, not routable). No catalogue or worktree was edited.

## Mechanical (executed — see audit.log)

- 66/66 parse with the repo's `messages.ts` (@9214ff9b, node, heap 256); 0 placeholder mismatches; no plural/select in this set (ur CLDR one/other n/a). Negative control: a tampered copy was caught (rename + unclosed brace).
- 0 bidi controls, Latin digits only, all NFC, no English-identical values, every sentence ends in ۔ / ؟.
- Glossary: ترتیبات, Radient اکاؤنٹ, فون کی رسائی, فون کی رسائی ترتیب دیں, کریڈٹ شامل کریں, Radient کنسول کھولیں all equal the desktop ur catalogue (local-operator-ui origin/main e6122214); the 4 bodies naming Retry quote `دوبارہ کوشش کریں` = `mobile.refusal.action.retry`. Product names kept Latin.
- Overflow flags (>1.6× on button/label): `setup.checking` 9→16 (see ur-GAP-5, suggestion is 14); `refusal.action.retry` 5→16 (style-guide-mandated term, no finding); `sign_in_confirm.confirm` 7→12 (dialog button, same as `mobile.signin.start`, no finding).

## Findings

| ID | Sev | Key | Current | Suggested | Why |
|---|---|---|---|---|---|
| ur-GAP-1 | MAJOR | `mobile.computers.setup.open_settings` | اپنے کمپیوٹر پر Local Operator کھولیں اور ترتیبات → Radient اکاؤنٹ → فون کی رسائی → فون کی رسائی ترتیب دیں منتخب کریں۔ | اپنے کمپیوٹر پر Local Operator کھولیں اور ترتیبات ← Radient اکاؤنٹ ← فون کی رسائی میں “فون کی رسائی ترتیب دیں” منتخب کریں۔ | U+2192 is bidi ON, not mirrored: in this RTL paragraph every → resolves R and points right, back at the previous item, so the menu path reads backwards. Same class as URS2B1-02 (MAJOR); mobile ur already ships ← (verdict_local_network_ios). The unquoted button label run-on 'فون کی رسائی → فون کی رسائی ترتیب دیں منتخب کریں' also parses badly; quote the desktop button label. |
| ur-GAP-2 | MAJOR | `mobile.refusal.tunnel_gone.body` | اسے Local Operator → ترتیبات → Radient اکاؤنٹ → فون کی رسائی میں آن کریں۔ | اسے Local Operator ← ترتیبات ← Radient اکاؤنٹ ← فون کی رسائی میں آن کریں۔ | Same arrow defect as ur-GAP-1: three U+2192 resolve R in the RTL paragraph and point backwards along the path. Labels themselves match the desktop ur catalogue (ترتیبات / Radient اکاؤنٹ / فون کی رسائی). |
| ur-GAP-3 | MAJOR | `mobile.refusal.how_to.body` | اپنے کمپیوٹر پر Local Operator → ترتیبات → Radient اکاؤنٹ → فون کی رسائی کھولیں اور فون کی رسائی ترتیب دیں منتخب کریں۔ کچھ بھی آن ہونے سے پہلے آپ کو قیمت دکھائی جائے گی۔ | اپنے کمپیوٹر پر Local Operator ← ترتیبات ← Radient اکاؤنٹ ← فون کی رسائی کھولیں اور “فون کی رسائی ترتیب دیں” منتخب کریں۔ کچھ بھی آن ہونے سے پہلے آپ کو قیمت دکھائی جائے گی۔ | Same arrow defect (3× U+2192 pointing backwards in RTL). Also quote the button label so 'اور فون کی رسائی ترتیب دیں منتخب کریں' does not read as 'and set up phone access, choose'. Price-first sentence is accurate. |
| ur-GAP-4 | MINOR | `mobile.refusal.balance_out.body, mobile.refusal.suspended.body, mobile.refusal.relay_stopped.body, mobile.refusal.relay_refused.body` | … پھر ”دوبارہ کوشش کریں“ پر ٹیپ کریں۔ (×4) | Replace ”دوبارہ کوشش کریں“ with “دوبارہ کوشش کریں” in all four values (label itself correct: equals mobile.refusal.action.retry). | Quote order reversed (U+201D first). ur.md 'Punctuation': quotes “ ”; all 12 other quoted labels in the mobile ur catalogues use “…”. Typographic inconsistency only; meaning unaffected. |
| ur-GAP-5 | MINOR | `mobile.computers.setup.check_again, mobile.computers.setup.checking` | دوبارہ دیکھیں · دیکھا جا رہا ہے… | check_again: دوبارہ جانچیں · checking: جانچ جاری ہے… | 'دوبارہ دیکھیں' (look again) / 'دیکھا جا رہا ہے…' (is being looked at — awkward impersonal passive for a status) diverge from the desktop's own labels for the same control family (ui.providers.phone.action.check_again دوبارہ جانچیں, status.checking جانچ جاری ہے) and mobile's 31 uses of جانچ. Suggested status is 14 chars vs 16 now. |
| ur-GAP-6 | MINOR | `mobile.refusal.suspended.title` | Radient نے {computer} کے لیے فون کی رسائی روک دی ہے۔ | Radient نے {computer} کے لیے فون کی رسائی عارضی طور پر روک دی ہے۔ | 'روک دی ہے' reads as stopped/blocked; English 'paused' and the context ('for a moment… normally clears on its own') need the temporary sense, otherwise it overlaps console_disabled/tunnel_gone. |
| ur-GAP-7 | MINOR | `mobile.refusal.refused.title` | Radient نے ابھی {computer} تک فون کی رسائی کی اجازت نہیں دی۔ | Radient نے اس وقت {computer} تک فون کی رسائی کی اجازت نہیں دی۔ | With a past negative, 'ابھی … نہیں دی' reads as 'has not yet allowed' — implying approval is pending. Source means a refusal right now; 'اس وقت' keeps that without the 'yet' promise. |
| ur-GAP-8 | NIT | `mobile.refusal.wait_network.body` | نیٹ ورک بحال ہوتے ہی یہ خود بخود دوبارہ جڑ جائے گا۔ | اس کا نیٹ ورک بحال ہوتے ہی یہ خود بخود دوبارہ جڑ جائے گا۔ | Source says 'its network' (the computer's); bare 'نیٹ ورک' lets a phone reader think of their own network. |
| ur-GAP-9 | NIT | `mobile.settings.diagnostics.copy, mobile.settings.diagnostics.copied` | تشخیص کاپی کریں · تشخیص کاپی ہو گئی | copy: تشخیصی معلومات کاپی کریں · copied: تشخیصی معلومات کاپی ہو گئیں | 'تشخیص' alone means 'diagnosis'; desktop says تشخیصی معلومات. Optional: the section heading is تشخیص, and the longer button (24 chars) costs width. |
| ur-GAP-10 | NIT | `mobile.settings.diagnostics.copy_failed` | کاپی نہیں ہو سکا۔ دوبارہ کوشش کریں۔ | کاپی نہیں ہو سکی۔ دوبارہ کوشش کریں۔ | Gender agreement: sibling 'تشخیص کاپی ہو گئی' is feminine; 'ہو سکا' is masculine. |
| ur-GAP-11 | NIT | `mobile.refusal.wait_reconnect.title` | {computer} دوبارہ جڑ رہا ہے۔ | {computer} دوبارہ منسلک ہو رہا ہے۔ | House term for reconnect is منسلک/رابطہ (26 non-gap uses; relay.health.reconnecting, chrome.home.reconnecting). 'جڑ' is idiomatic too; align only if cheap. Same verb in balance_out/suspended/wait_network bodies. |

## Code items (not translation findings; not counted in the verdict)

### ur-GAP-C1 — src/features/auth/transient-notice.tsx:27-31 + src/ui/components/alert.tsx (title <Text>)
- Keys: `mobile.refusal.radient_unreachable.title`, `mobile.refusal.relay_wait.title`, `mobile.refusal.wait_network.title`, `mobile.refusal.wait_reconnect.title`
- Problem: TransientNotice passes bodyDir={composedDir} but the Alert title has no direction prop, so RN-web dir=auto lays these titles out LTR when they open with Latin: radient_unreachable.title always ('Radient ابھی…'), the other three whenever {computer} is a Latin name or the 'Your computer' fallback. Reasoned from source; no frame captured.
- Fix: Add titleDir to Alert (mirror bodyDir) and pass composedDir from TransientNotice; add these keys to the Latin-initial site test. Copy-side stopgap for radient_unreachable.title only: 'اس وقت Radient جواب نہیں دے رہا۔'.

### ur-GAP-C2 — src/features/auth/connection-provider.tsx:2588 (pre-existing) and :2623 (added e64edd28, PR #261)
- Keys: all 11 {computer} titles
- Problem: {computer} receives the English literal 'Your computer' (and 'Radient' at :2588 when no route) in every locale, so ur shows e.g. 'Your computer پر Local Operator کو توجہ کی ضرورت ہے۔' — an English leak no catalogue value can fix; the sidecars sanction the literal.
- Fix: Resolve the fallback subject through a catalogue key (e.g. a mobile.refusal.subject.your_computer), not a literal.

## RTL control

- First strong character: AL 48 · Latin 7 · `{computer}`-initial 11. No bidi controls; Latin digits.
- Latin-initial (need composed direction): `mobile.refusal.suspended.title`, `mobile.refusal.provisioning.title`, `mobile.refusal.refused.title`, `mobile.refusal.radient_unreachable.title`, `mobile.refusal.action.open_billing`, `mobile.refusal.action.open_console`, `mobile.settings.account.signed_in_radient`. Render sites: refusal-surface headline/body spread `composedDir`, action buttons pass `labelDir` (open_billing/open_console OK), account-card title spreads `composedDir` — OK. The transient-notice Alert **title** has no direction → ur-GAP-C1.
- `{computer}`-initial titles: console_disabled, offline, relay_stopped, relay_refused, tunnel_gone, relay_wait, wait_network, wait_reconnect, computer_sign_in, computer_attention, open_console (.title). Direction then depends on the computer's name; same render sites as above.
- Arrows: three keys use → (U+2192, ON, not mirrored) — resolves R in an RTL paragraph and points back at the previous item → ur-GAP-1..3; use ← as the shipped `verdict_local_network_ios` does (URS2B1-02). Out of scope note: the desktop ur catalogue (`ui.phone_pairing.popup.*_where`) still ships → in RTL paths.
- Quotes: 4 keys open with ” → ur-GAP-4.
- Method: unicodedata + UBA reasoning; no rendered RTL frame captured in this lane.

## PASS (50 keys, no finding)

`mobile.chrome.clear_search`, `mobile.computers.hint.radient_unreachable`, `mobile.computers.setup.list_updates`, `mobile.home.transcript.needs_answer`, `mobile.notifications.computer_registration.failed`, `mobile.notifications.computer_registration.no_token`, `mobile.notifications.computer_registration.refused`, `mobile.notifications.computer_registration.registered`, `mobile.notifications.computer_registration.registering`, `mobile.notifications.computer_registration.relay_missing`, `mobile.refusal.action.add_credit`, `mobile.refusal.action.how_to`, `mobile.refusal.action.open_billing`, `mobile.refusal.action.open_console`, `mobile.refusal.action.refresh_list`, `mobile.refusal.action.retry`, `mobile.refusal.balance_out.title`, `mobile.refusal.computer_attention.body`, `mobile.refusal.computer_attention.title`, `mobile.refusal.computer_sign_in.body`, `mobile.refusal.computer_sign_in.title`, `mobile.refusal.console_disabled.title`, `mobile.refusal.how_to.title`, `mobile.refusal.offline.body`, `mobile.refusal.offline.title`, `mobile.refusal.open_console.title`, `mobile.refusal.phone_access_off.body`, `mobile.refusal.phone_access_off.title`, `mobile.refusal.provisioning.body`, `mobile.refusal.provisioning.title`, `mobile.refusal.radient_unreachable.body`, `mobile.refusal.radient_unreachable.title`, `mobile.refusal.refused.body`, `mobile.refusal.relay_refused.title`, `mobile.refusal.relay_stopped.title`, `mobile.refusal.relay_wait.body`, `mobile.refusal.relay_wait.title`, `mobile.refusal.terminal.label`, `mobile.refusal.terminal.toggle`, `mobile.refusal.tunnel_gone.title`, `mobile.refusal.wait_network.title`, `mobile.refusal.wait_reconnect.body`, `mobile.session.pending_echo.not_confirmed_plain`, `mobile.settings.account.signed_in_radient`, `mobile.settings.diagnostics.address`, `mobile.settings.diagnostics.reason`, `mobile.settings.diagnostics.tunnel`, `mobile.settings.sign_in_confirm.body`, `mobile.settings.sign_in_confirm.confirm`, `mobile.settings.sign_in_confirm.title`


Audit notes are analysis, not an execution log; commands and outputs are in audit.log.
