# O3-b audit — hi / mobile.projects

Auditor: i18n-auditor, session 248a9ead8d63, model anthropic/claude-opus-5-5 (no fallback). Translator session 805773971354 (independent).
Draft sha256 14b806e26a8cd3ddbb802a62c9d93b6e33920804f464c6b1e3eaabe9bc09cda0 · brief sha256 63351e7ead7f78a6d0063e2ff6e5abf5a25b0ce4fcfb363c6017f163c609ddfe · source 39b5e3e5.

**Verdict: passed** — 23 keys, 0 BLOCKER, 0 MAJOR, 1 MINOR, 0 NIT.

Mechanical: placeholders identical, ICU parses with the repo parser, hi CLDR one/other present, NFC, no ZWJ/ZWNJ, danda for full stops, all width hints met, redaction hits 0.

## Findings

- **HI-P1 MINOR** `mobile.projects.empty.next`
  - current: “{action}” से एक प्रोजेक्ट शुरू करें, या किसी एजेंट से उसे खोलने को कहें।
  - problem: 'open one' here means bring a NEW project into being (an agent files it). In this catalogue खोलना means opening/reopening an existing item (mobile.projects.milestone.reopen_hint 'फिर से खोलता है', write_receipt 'फिर खोला गया'), so 'उसे खोलने' reads as 'ask an agent to open it (an existing one)'. Meaning drifts; not unsafe.
  - replacement: “{action}” से एक प्रोजेक्ट शुरू करें, या किसी एजेंट से उसे बनाने को कहें।


## Verified without finding

- Delete vs Remove kept distinct: मिटाएँ (project; matches shipped delete_body '{name} मिटाएँ?') vs हटाएँ (milestone; matches shipped remove_milestone_body). Button and dialog title identical as required.
- load_failed strings mirror shipped 'हम अभी … नहीं पढ़ सके।' (home.folders_read_failed, schedules.read_unreachable).
- detail.gone 'अब उपलब्ध नहीं है' correctly avoids claiming deletion (rename also 404s); matches session.subagent.unavailable_headline.
- milestone → पड़ाव and तारीख़ (nukta) consistent with shipped section.milestones / sidebar.clock_hint.
- target_date_placeholder 'वववव-मम-दिदि': uses the Indian-form letters (वर्ष/माह/दिन, as in 'दिदि/मम/वववव') in ISO year-month-day order with hyphens; 10 graphemes = the 'keep 10 characters' rule. Accepted.
- name_placeholder 'पहला ड्राफ़्ट' is a natural phase example (context: translate naturally, not an identifier); 6 ≤20.
- reopen_hint/complete_hint: third-person present, no final danda, as the platform-hint convention requires.
- {action} quoted “ ” per style guide; renders 'नया प्रोजेक्ट' from shipped create.title.

## Keys

- `mobile.projects.list.load_failed`: हम अभी आपके प्रोजेक्ट नहीं पढ़ सके।
- `mobile.projects.empty.headline`: अभी कोई प्रोजेक्ट नहीं।
- `mobile.projects.empty.next`: “{action}” से एक प्रोजेक्ट शुरू करें, या किसी एजेंट से उसे खोलने को कहें।
- `mobile.projects.detail.gone`: वह प्रोजेक्ट अब उपलब्ध नहीं है।
- `mobile.projects.detail.title_fallback`: प्रोजेक्ट
- `mobile.projects.detail.load_failed`: हम अभी वह प्रोजेक्ट नहीं पढ़ सके।
- `mobile.projects.detail.milestones_empty`: कोई पड़ाव नहीं।
- `mobile.projects.detail.sessions_empty`: कोई सत्र जुड़ा नहीं है।
- `mobile.projects.detail.delete`: प्रोजेक्ट मिटाएँ
- `mobile.projects.detail.delete_confirm`: मिटाएँ
- `mobile.projects.milestone.add`: पड़ाव जोड़ें
- `mobile.projects.milestone.edit_title`: पड़ाव संपादित करें
- `mobile.projects.milestone.add_submit`: जोड़ें
- `mobile.projects.milestone.remove`: पड़ाव हटाएँ
- `mobile.projects.milestone.remove_confirm`: हटाएँ
- `mobile.projects.milestone.name`: नाम
- `mobile.projects.milestone.name_placeholder`: पहला ड्राफ़्ट
- `mobile.projects.milestone.target_date`: लक्ष्य तारीख़
- `mobile.projects.milestone.target_date_placeholder`: वववव-मम-दिदि
- `mobile.projects.milestone.target_date_help`: तारीख़ हटाने के लिए फ़ील्ड खाली करें।
- `mobile.projects.milestone.reopen_hint`: पड़ाव को फिर से खोलता है
- `mobile.projects.milestone.complete_hint`: पड़ाव को पूरा चिह्नित करता है
- `mobile.projects.milestone.edit_label`: {name} संपादित करें
