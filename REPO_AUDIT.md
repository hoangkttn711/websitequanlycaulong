# Repository audit — 27 October 2026

> Implementation update: this report records the original findings, before the fixes. The repository now includes transactional database RPCs, Supabase Auth authorization, dated reservations with database overlap protection, retry/rollback, corrected inventory/billing, a portable build, and 16 automated tests. Legacy tools are preserved under `archive/legacy_tools/`. See [DEPLOYMENT.md](DEPLOYMENT.md) for migration, data reconciliation, operational changes, and remaining verification limits. The migration and administrator role still need to be applied to the live Supabase project; local tests do not change that project.

Scope: the tracked application pages, shared JavaScript, SQL schema, deployment workflow, builders, maintenance scripts, diagnostics, and existing checks. Findings are ranked by likelihood in normal use, with impact used to break ties. Security findings describe the checked-in configuration; the deployed database policies were not inspected. No live database requests or destructive maintenance scripts were run.

The referenced `C:\Users\tranl\.codex\RTK.md` does not exist in this environment. The three shipped pages contain exactly the same inline application script as `tools_and_scripts/app_logic.js`; shared-code findings therefore apply to index, PC, and mobile. `tools_and_scripts/desktop.html` contains a different, older copy.

## Ranked bugs and risks

### 1. Admin operations and shop orders are not persisted to Supabase — virtually certain during use; critical

Evidence: `tools_and_scripts/app_logic.js:2568`, `2623`, `2662`, `2713`, `2745`, `2979`, `3152`, `3159`.

Check-in, checkout, retail sales, inventory changes, new products, and admin bookings mutate local state only. `syncCourtToSupabase` and `syncInvoiceToSupabase` each occur once: their declarations, with no callers. There is no product-write or booking-status-write path. The customer booking submission is the only business action that calls a cloud writer. The three-second refresh replaces local courts/products/bookings with server data; invoices are replaced whenever the server invoice result is nonempty. Staff see success and then lose their work, and orders submitted on customers' phones never reach reception.

Needed tests: each mutation must survive a fresh server read and be visible on a second client; rejected writes must not report success.

### 2. Reload deletes genuine invoices and the first genuine bookings — virtually certain; critical

Evidence: `tools_and_scripts/app_logic.js:175`, `182`, `2590`, `2680`, `2723`, `2889`, `3000`.

Every new invoice uses `HD-2610-0...`, and loadState removes every invoice with that prefix. Empty-database bookings start at BK-101, but BK-101/102/103/104/106/107 are explicitly removed as mock data. This happens every load rather than in a one-time migration. Confirmed in an isolated VM: one real-shaped invoice and BK-101 both became empty arrays after reload. Cloud reads can later reintroduce cloud records, but local-only records are lost.

Needed tests: save/reload real records with those identifiers; cache migrations must preserve operational data.

### 3. Bookings have no scheduled date — virtually certain across days; critical

Evidence: `supabase_schema.sql:78`; `tools_and_scripts/app_logic.js:3100`, `3113`, `2850`, `1300`.

Today/tomorrow/day-after buttons change presentation, but bookings store only court and a text time range. The selected day is discarded on submit and in database mapping. All days share the same conflicts, and yesterday's reservations continue blocking later days. Court reservation status is also changed immediately for future-day bookings.

Needed tests: same court/time on different dates, local midnight rollover, future reservation versus current court occupancy.

### 4. Admin booking buttons and matrix actions are disconnected — certain on click; high

Evidence: `tools_and_scripts/app_logic.js:642`, `665`, `730`, `734`, `2419`, `2432`, `2459`.

The rendered table uses `data-checkin-booking` / `data-cancel-booking`, but handlers listen for `data-booking-checkin` / `data-booking-cancel`. Matrix buttons render `data-admin-booking-id` and `data-admin-quick-slot-court`, with no matching handlers. The older quick-slot listener expects `data-quick-slot-court`. Receiving a booking, cancelling it, opening its matrix details, and quick creation do nothing through these controls.

Needed tests: click the actual rendered buttons, then assert modal visibility and persisted state transitions.

### 5. Public database policies grant everyone administrative access — guaranteed if this schema is deployed; critical

Evidence: `supabase_schema.sql:139` through the end; `tools_and_scripts/app_logic.js:3034`.

Policies labelled Admin Full Access use `FOR ALL USING (true)` without an authenticated role or ownership condition. The browser's public anon key can therefore read and mutate courts, products, bookings, and invoices under this configuration. The exposed anon key is expected for a browser client; unrestricted policies are the defect. Public booking reads include names and phone numbers. Court reads include customer names, while invoice access exposes financial/customer records.

Needed tests: unauthenticated CRUD authorization matrix, customer ownership rules, admin-only prices/stock/invoices, and a public availability projection without personal data.

### 6. Admin authentication is a client-side flag with admin/admin credentials — certain bypass; critical

Evidence: `tools_and_scripts/app_logic.js:171`, `1053`, `2808`; `README.md`.

Login compares strings in JavaScript and saves isAdminLoggedIn in localStorage. Editing storage bypasses the screen gate. No Supabase authentication or server authorization accompanies the login. renderAll also renders admin tables while in customer mode, leaving private records in hidden DOM. Hiding the workspace cannot enforce access control.

Needed tests: unauthenticated direct requests and DOM inspection; expired/revoked sessions; privileged actions after logout.

### 7. Booking submission can report success when the server rejects it — high; critical

Evidence: `tools_and_scripts/app_logic.js:2941`, `3140`.

syncBookingToSupabase starts unawaited requests; errors only go to the console. The form clears and success appears immediately, including when offline or on duplicate IDs. No durable retry queue exists. Booking insert and court update are independent, so a rejected booking can still reserve a court, or an accepted booking can leave court state stale. Multi-court bookings can partially succeed.

Needed tests: offline submit, timeout, rejected insert/update, partial multi-court failure, and retry idempotency.

### 8. Record IDs collide between clients and after deletions — high; critical

Evidence: `tools_and_scripts/app_logic.js:2589`, `2679`, `2723`, `2760`, `2889`, `3000`.

Booking/invoice/product IDs are derived from local array length. Two devices with the same snapshot choose the same ID; deletions and reload filtering reuse old IDs. Cloud primary keys reject records, while local arrays can contain duplicate identifiers. An unrelated record with a reused booking ID can also appear in a device's My Bookings list.

Needed tests: parallel clients, deletion followed by creation, reload then creation, and ownership under duplicate IDs.

### 9. Double booking has no authoritative prevention — high; critical

Evidence: `tools_and_scripts/app_logic.js:2070`, `2713`, `2850`; `supabase_schema.sql:78`.

Overlap is checked against a browser snapshot when clicking a slot, not on final submission. Another customer can reserve it before submit; selected slots remain in customerCourtSlots. The admin form has no overlap check. SQL has no date/time range representation or exclusion/transaction rule. Different IDs can therefore reserve the same interval.

Needed tests: simultaneous overlapping reservations, stale selections, adjacent intervals, admin/customer races.

### 10. Noncontiguous bookings lose all but the first interval — certain for that feature; high

Evidence: `tools_and_scripts/app_logic.js:50`, `2879`, `2439`.

Submission supports comma-separated ranges, but parseSlotRange splits on hyphens and reads only the first two pieces. Confirmed: `18:00 - 18:30, 20:00 - 20:30` parses as 18:00–18:30. Later intervals appear free and can be sold again; check-in duration/rate calculations also use the first range.

Needed tests: noncontiguous selection, conflict on each interval, and accurate check-in/checkout totals.

### 11. Booking and court state transitions disagree — high; high

Evidence: `tools_and_scripts/app_logic.js:2279`, `2296`, `2432`, `2459`, `2695`.

Court-card check-in/cancel changes only the court. Booking cancel changes only the booking. Checkout frees the court without completing its booking, so its matrix cells remain blocked. The older booking check-in path can replace an already active court's customer/rate without validating occupancy. There is no shared transition that updates court, booking, items, and invoice atomically.

Needed tests: reservation → check-in → checkout, cancellation from every entry point, busy-court refusal, and a subsequent booking on the same court.

### 12. A walk-in active court still appears available to online customers — high; high

Evidence: `tools_and_scripts/app_logic.js:1300`, `1464`, `2623`.

Availability checks bookings and maintenance, not active court occupancy. Walk-in check-in creates no booking interval. The active court can therefore display free customer slots during its session.

Needed tests: walk-in check-in followed by a customer availability read and reservation attempt.

### 13. Future booking add-ons attach to the current court bill — high when used; high

Evidence: `tools_and_scripts/app_logic.js:2905`, `2923`, `1000`.

Customer add-ons are stored in court.items, not in a booking/order. Reserving a later slot on an already active court adds the next customer's purchases to the current player's bill. Multiple reservations have no separate item ownership. Cancelling a reservation does not reverse these additions.

Needed tests: future booking with add-ons while the court is active, two reservations with different add-ons, and cancellation refunds.

### 14. Stock can be oversold and removing items does not restore it — certain; high

Evidence: `tools_and_scripts/app_logic.js:1000`, `1019`, `2575`, `2992`.

Quantities are unlimited and stock is merely clamped to zero after sale. Decrementing court items reduces billed quantity but never restores stock. Confirmed: stock 10 → add 2 → remove 1 leaves stock 8 with one item billed. Even decrementing a nonexistent item adjusts soldToday. Updates are also local-only (finding 1).

Needed tests: out-of-stock sale refusal, stock reservation under concurrency, add/remove symmetry, duplicate products, and cancellation reversal.

### 15. Revenue reports are materially misleading — certain with history/deposits; high

Evidence: `tools_and_scripts/app_logic.js:291`, `297`, `835`, `950`, `2674`.

The weekly graph hardcodes six zero days and puts the sum of every invoice under today. KPIs likewise sum all history. Invoice mapping drops created_at, preventing proper daily grouping. Deposits and genuine discounts share one field: checkout subtracts the deposit from invoice total, but no deposit receipt is recorded, so reported revenue misses that payment. soldToday resets on page load rather than on the business date.

Needed tests: multiple dates, midnight, deposits plus discounts, revenue versus cash collected, and reload-independent sales counters.

### 16. Deposits and paid sales are recorded without payment confirmation — certain on submit; high

Evidence: `tools_and_scripts/app_logic.js:2899`, `2912`, `3001`.

Every customer booking is assigned a 50,000 VND deposit, even though no payment is collected or confirmed. A customer retail order immediately becomes a paid QR invoice and decrements stock. There is no pending order/payment lifecycle. A future checkout can deduct money never received.

Needed tests: unpaid booking/order, payment failure, verified payment, refund, and repeated payment callbacks.

### 17. Stored HTML injection reaches other users and admin views — high exposure; critical impact

Evidence: `tools_and_scripts/app_logic.js:244`, `642`, `710`, `756`, `809`, `1585`, `2506`.

Names, phone numbers, products, notes, and invoice items are interpolated into innerHTML, including HTML attributes, without escaping. Customer-controlled booking names are rendered by other clients; hidden admin views are rendered in customer sessions as well. An HTML event-handler payload can execute with the page's database access. Input required/max-length rules do not provide HTML escaping.

Needed tests: HTML and attribute-breaking payloads for every persisted text field, including data fetched from the database.

### 18. Clear customer cart throws and leaves the display stale — certain on click; medium

Evidence: `tools_and_scripts/app_logic.js:2974`.

renderCustomerShop is called but never declared in the active application. Confirmed ReferenceError in an isolated handler execution. State clears and saves before the exception, but the cart display and success toast do not update.

Needed test: add products, click clear, assert empty visible cart, zero total, and no console errors.

### 19. Court delivery orders have no ownership or session validation — high when misused; high

Evidence: `index.html:366`; `tools_and_scripts/app_logic.js:2985`, `3020`, `1000`.

Any customer can select any court, including a free or unrelated active court, and append charges to it. The handler does not verify that the customer owns a live booking. Delivery notes are discarded for court delivery. Orders have no independent identity or acknowledgement.

Needed tests: unauthorized court, free court, ended session, reception acknowledgement, retained delivery note.

### 20. Polling can overwrite newer state and overlapping requests can move the UI backwards — high under latency; high

Evidence: `tools_and_scripts/app_logic.js:3178`, `3346`, `3353`, `3359`.

Every visible client fetches four entire tables every three seconds, plus focus/visibility requests and realtime events. There is no in-flight guard, generation number, or revision check. An older response can replace a newer realtime state or recently submitted record. Full-court updates also overwrite entire items arrays, allowing competing clients to lose additions.

Needed tests: reordered responses, delayed insert visibility, concurrent court-item changes, focus storms, and reconnect.

### 21. Availability does not advance with time on an idle page — high; medium

Evidence: `tools_and_scripts/app_logic.js:2777`, `3239`.

The only one-second timer updates the clock. Polling rerenders only when business data changes. Past/free cells and date badges can remain stale across time boundaries/midnight. Click-time checking helps new slot clicks, but final submit does not revalidate a selection made before its start time.

Needed tests: idle past a slot boundary and midnight; submit a formerly valid selection after it expires.

### 22. Live elapsed timers never advance — certain; medium

Evidence: `tools_and_scripts/app_logic.js:344`, `2286`, `2448`, `2640`, `2777`.

elapsedMinutes is displayed from stored state and assigned constants such as 1 or 5. No code derives it from startTime or increments it. The advertised live elapsed timer remains frozen.

Needed tests: fake clock progression, background/resume, and reload during a live session.

### 23. Walk-in pricing ignores peak-boundary pricing — high for mixed sessions; high

Evidence: `tools_and_scripts/app_logic.js:2631`, `2636`, `2668`.

Walk-in check-in chooses one normal/peak hourly rate; checkout multiplies all hours by it. A 16:30–17:30 session should total 70,000 VND, but a single selected rate yields 60,000 or 80,000. Editing the duration of a reservation also reuses an averaged old rate rather than recomputing the actual interval.

Needed tests: sessions crossing 17:00/21:00 and extending or shortening a reservation at a rate boundary.

### 24. Time parsing and money calculations silently accept malformed input — medium; high

Evidence: `tools_and_scripts/app_logic.js:7`, `22`, `50`, `2717`.

Booking times are free text. Invalid values are defaulted/coerced rather than rejected; reversed ranges turn into a one-hour charge. The fee loop adds whole 15-minute chunks even for partial minutes. Confirmed: 17:01–17:02 costs 20,000 VND. The database has no time/status/deposit/stock validation constraints beyond types and a few NOT NULL columns.

Needed tests: malformed ranges, invalid clocks, reversed intervals, non-step times, negative amounts/quantities, and direct API input validation.

### 25. The advertised 22:00–23:00 booking hour is absent — certain; medium

Evidence: `tools_and_scripts/app_logic.js:80`; `index.html:600`.

getAloboSlots stops at 22:00, while the UI and README advertise 05:00–23:00. Confirmed last matrix slot: 21:30–22:00. Late-day first-selectable calculations clamp to 22:00, for which no start cell exists, and the start dropdown stops at 21:30.

Needed tests: first/last operating slots, 21:30/22:00/23:00, and after-closing empty states.

### 26. Alternate time/court selection controls do not update the submitted selection — medium; medium

Evidence: `tools_and_scripts/app_logic.js:2163`, `2177`, `2520`, `2531`, `2852`.

Quick duration, start/end selectors, and the legacy court picker update legacy fields only. Submission exclusively reads customerCourtSlots. If these controls are exposed, they can change displayed time/court state without changing what is booked, or submission refuses because no matrix slots were selected. Some legacy controls are deliberately hidden in generated markup, which lowers current exposure.

Needed tests: every supported booking entry path must result in the exact selected slots being submitted.

### 27. Booking status and customer type are rendered incorrectly — certain for cancelled/fixed records; medium

Evidence: `tools_and_scripts/app_logic.js:710`, `720`, `724`, `730`.

The list renders every booking, including cancelled ones. Anything not checked_in is labelled as deposited and receives a check-in button, so cancelled records look reserved. Type rendering expects `fixed`, while forms/schema store other text values. Fixed/monthly customers can be labelled walk-ins.

Needed tests: all supported statuses and type values; cancelled/completed records must not offer invalid transitions.

### 28. Sync errors can still display “Realtime Cloud” — high during backend errors; medium

Evidence: `tools_and_scripts/app_logic.js:3184`, `3244`, `3322`.

Supabase result.error fields are not checked by syncFromSupabase; it marks the connection online after resolved error responses. Subscription errors/timeouts also do not set an offline badge. The badge cannot tell staff whether their data was saved.

Needed tests: permission failure, expired credentials, unavailable table, websocket failure, and failed mutation status.

### 29. Full-table reads are unbounded and unpaginated — increases with usage; high

Evidence: `tools_and_scripts/app_logic.js:3185`.

All business history is downloaded repeatedly, without pagination/date predicates. Server row limits can produce an incomplete snapshot that replaces local data. Booking reads have no deterministic ordering; length-based IDs and My Bookings then operate on incomplete collections. Even before truncation, four requests every three seconds per tab plus full rendering create unnecessary load.

Needed tests: history larger than a server page, deterministic ordering, date filtering, bounded request volume, and reconciliation across pages.

### 30. Realtime handling misses valid changes — medium; medium

Evidence: `tools_and_scripts/app_logic.js:3256`, `3287`, `3299`, `3216`.

Court/product deletes are ignored, product inserts are ignored if the ID is unknown, and invoices only handle inserts. Polling partly repairs this, but products/courts/invoices are not replaced when the server returns an empty table, leaving stale final records indefinitely. Local invoice ordering also differs from fetched ordering and renderReports reverses both indiscriminately.

Needed tests: insert/update/delete on every table, deletion of the last record, and stable newest-first invoice ordering.

### 31. New products cannot be initialized with zero stock or a zero price — certain for those inputs; medium

Evidence: `tools_and_scripts/app_logic.js:2752`, `2753`.

`Number(value) || 20` converts explicit zero stock into 20; `|| 15000` converts a free product into a priced product. Similar truthiness defaults in court mapping erase legitimate zeros. Rental stock is never decremented or restored, so it is not a real availability counter.

Needed tests: zero versus blank versus invalid numbers and rental checkout/return capacity.

### 32. Cache reset behavior is destructive and hides persistence failures — medium; high

Evidence: `tools_and_scripts/app_logic.js:161`, `191`, `207`, `226`.

Loading clears both customer and POS carts, forces selected product prices, resets sales counters, and deletes older storage keys without data migration. localStorage write errors are ignored. In offline mode the application may appear to save while quota/privacy errors discard the only copy. Two tabs share storage without a storage-event reconciliation strategy.

Needed tests: refresh mid-order, migration from prior versions, quota errors, malformed cached records, and simultaneous tabs.

### 33. Checkout can mutate a session without completing payment — medium; medium

Evidence: `tools_and_scripts/app_logic.js:961`, `2330`, `2662`.

Changing checkout hours writes directly to court.bookedHours, even if staff close the modal. Adding/removing items commits immediately while checkout is still open. Confirmation does not validate that the court is still active or that an invoice for that session was already created, so duplicate/stale checkout actions can generate extra invoices.

Needed tests: cancel modal after editing, checkout after remote session change, repeated confirmation, and immutable session/invoice linkage.

### 34. Clean-install build depends on an untracked personal Downloads file — certain on another machine; high

Evidence: `tools_and_scripts/build_index.js:3`, `build_pc.js:3`, `build_mobile.js:3`.

The builders extract head/modals/admin fragments from a personal absolute Downloads path. That file exists on this machine, but is outside Git. Most reads/writes also hardcode `C:\Quan ly san cau`. A fresh clone or Linux CI cannot reproduce the committed pages. There is no package manifest, documented build command, or reproducible source template in the repo.

Needed tests: build in a fresh checkout without Downloads, deterministic output comparison, and build on a different working directory/OS.

### 35. Two apparent build entry points are unfinished/broken — certain when used; medium

Evidence: `tools_and_scripts/make_sites.js:342`; `build_all.js:656`; `build_clean_files.js:57`.

make_sites.js fails JavaScript parsing at an escaped opening backtick. build_all.js only declares generatePC and logs readiness; calling generatePC encounters undeclared INITIAL_DATA_JS/APP_LOGIC_JS. build_clean_files.js only declares a head string and logs. None is a functional all-pages build command.

Needed tests: syntax-check every script and require documented build commands to emit all expected artifacts.

### 36. Source patch scripts silently skip required changes — demonstrated; medium

Evidence: `tools_and_scripts/apply_complete_admin_matrix.js:240`, `296`; `inject_supabase_module.js:317`, `349`.

The matrix patch inserts markup containing `data-admin-quick-slot-court` and then uses the presence of that same string to decide whether handlers already exist. Its fallback insertion anchor is DOMContentLoaded, absent from the current IIFE. The Supabase injector searches exact old handler text that no longer matches. These scripts write files and report progress even when critical replacements never happen, explaining the dead actions and missing cloud writers.

Needed tests: patch preconditions, replacement counts, idempotency, and behavior of the resulting generated page.

### 37. Tests do not protect deployment and can report failure with exit code zero — certain; high

Evidence: `tools_and_scripts/verify_all.js:61`; `test_slot_overlap.js`; `.github/workflows/deploy.yml`.

verify_all prints failures without setting a failure exit code. It flagged two absent mobile scroll buttons but returned zero. Those accesses are guarded, so this is not itself a page crash. The privacy test only searches for one exact string and misses public API/hidden DOM leaks. The overlap test prints booleans without assertions; builder tests print extraction lengths. Deployment runs no build, syntax, behavior, or security checks.

Needed tests: assert failures exit nonzero, execute them in CI before deploy, and test actual contracts rather than source spelling.

### 38. Destructive maintenance and test scripts target the real shared backend — certain if run; critical impact

Evidence: `tools_and_scripts/clean_supabase_data.js:34`, `41`, `65`, `76`; `test_supabase_ops.js:34`.

The cleaner calls itself immediately, deletes every returned booking and invoice, and resets all four courts, despite comments calling the records mock data. It has no environment guard, dry run, or backup. test_supabase_ops inserts/deletes real backend data; failed cleanup can leave fixtures, and failure is caught/logged without a failing exit status. Neither script is safe to include in an automatic “run all scripts” test command.

Needed tests: maintenance scripts against isolated fixtures, explicit target validation, dry-run output, and failure-safe cleanup.

### 39. Local development server permits path traversal and exposes repository internals — reachable when running; high

Evidence: `tools_and_scripts/server.js:21`, `25`, `29`, `43`.

Raw request paths are joined to ROOT_DIR without checking containment. Confirmed locally that joining `/../audit-outside-proof.txt` resolves to `C:\audit-outside-proof.txt`. A raw HTTP request can request parent files; `.git` and other dotfiles are also served. listen(PORT) has no loopback host restriction, and responses allow any origin. Synchronous exists/stat calls and an unhandled stream error can also fail the process on file races.

Needed tests: raw traversal requests, dotfile denial, allowed-root enforcement, missing/unreadable files, and loopback binding.

### 40. Deployment publishes the entire repository tree — certain; medium

Evidence: `.github/workflows/deploy.yml:33`.

The upload path is `.` rather than a prepared public directory. Maintenance sources, SQL, debug pages, and stale desktop.html are included in the publication input. No build proves the committed HTML reflects the source. Publishing code is not itself a secret leak, but this unnecessarily exposes stale entry points and operational internals.

Needed tests: artifact allowlist and generated HTML freshness before upload.

### 41. Runtime depends on remote scripts, including an unpinned Supabase major — medium; medium

Evidence: `index.html:7`, `8`, `53` and corresponding PC/mobile heads.

Tailwind is compiled by a remote runtime script; Chart.js and Supabase also come from CDNs without integrity attributes. Supabase is pinned only to @2. A blocked CDN can remove styling or cloud connectivity; an allowed upstream version change can alter behavior independently of this repo. The app silently falls back to local mode when Supabase is unavailable, where the persistence defects above are particularly damaging.

Needed tests: each dependency unavailable, explicit startup failure state for required services, and tested pinned assets.

### 42. Accessibility and mobile control sizes are incomplete — frequent for affected users; medium

Evidence: `tools_and_scripts/app_logic.js:989`, `1333`, `1626`; dialog markup in `index.html`.

Free matrix buttons have no textual accessible name beyond a title, quantity controls are often 24–28px rather than the documented 40–44px targets, and modal containers lack dialog semantics, focus trapping/return, and Escape handling. The fixed-width minimum matrices require horizontal scrolling; this is intentional, but keyboard and touch behavior needs real browser coverage. The older build_clean_files head additionally disables user zoom, though the shipped pages do not.

Needed tests: keyboard-only booking/checkout, focus management, accessible names, screen-reader dialog state, 360px touch layout, and zoom.

### 43. Schema script is not safely repeatable and seeds operational demo state — likely during setup; medium

Evidence: `supabase_schema.sql:25`, `92`, `128`, `139`.

Re-running the script encounters duplicate publication membership/policy names; CREATE TABLE IF NOT EXISTS does not migrate schema changes. Fresh setup seeds active courts, fake names/phone numbers, preexisting reservations, and sold_today counts, while the browser initial state says courts are free and no bookings exist. Product conflict handling also overwrites names/prices on rerun. There is no separate demo seed or versioned migration history.

Needed tests: migration on empty and existing databases, repeat execution, and production setup without demo operational records.

## Dead code and file inventory

“Archive candidate” means no active runtime/build dependency was found in the repository. It does not prove a developer never invokes the script manually. Nothing was deleted.

### Confirmed dead/disconnected code

- `app_logic.js:3152` — syncCourtToSupabase has no caller.
- `app_logic.js:3159` — syncInvoiceToSupabase has no caller.
- `app_logic.js:2419`, `2432`, `2459` — older quick-slot/check-in/cancel selectors do not match the current rendered attributes.
- `app_logic.js:2974` — call to nonexistent renderCustomerShop.
- `build_all.js` — unused generatePC declaration with unresolved template inputs; no output write.
- `build_clean_files.js` — unused SHARED_HEAD declaration; no output write.
- `make_sites.js` — syntactically invalid scratch generator.
- `modals_clean.html`, `desktop.html`, `test_utf8.txt` under tools_and_scripts — no active builder/runtime consumer found. desktop.html is a stale executable page, not the current PC output.

### Broken path references

These still reference the absent repository-root app_logic.js rather than tools_and_scripts/app_logic.js:

`check_admin_fn.js`, `check_admin_toggle.js`, `check_dom_traversal.js`, `check_js_viewport.js`, `find_matrix_line.js`, `inspect_matrix_court.js`, `inspect_matrix_fn.js`, `inspect_matrix_rows.js`, `test_builder_engine.js`, `verify_mobile.js`, `verify_pc.js`.

`extract_logic.js` writes that obsolete root path; `extract_modals.js` likewise writes a root modals_clean.html that the current builders do not consume.

### One-off transformation scripts to archive after consolidating the build

All are in tools_and_scripts:

`apply_admin_alobo_matrix.js`, `apply_complete_admin_matrix.js`, `apply_privacy_fix.js`, `apply_scroll_enhancement.js`, `clean_mock_state.js`, `enhance_sync.js`, `fix_auto_select_cart.js`, `fix_build_paths.js`, `fix_clean_all_demo.js`, `inject_supabase_module.js`, `update_builders_supabase.js`.

These modify source/builders using historical exact strings; they are not dependencies of the currently shipped application. Preserve any intended behavior in maintained source before removal.

### Scratch inspection/diagnostic archive candidates

All are in tools_and_scripts:

`analyze_scripts.js`, `check_admin_fn.js`, `check_admin_toggle.js`, `check_demo_data.js`, `check_dom_traversal.js`, `check_ids.js`, `check_js_viewport.js`, `check_refs.js`, `extract_logic.js`, `extract_modals.js`, `find_all_customers.js`, `find_cust_bookings.js`, `find_matrix_line.js`, `inspect.js`, `inspect_admin.js`, `inspect_admin_flag.js`, `inspect_build_head.js`, `inspect_cust_elements.js`, `inspect_cust_render.js`, `inspect_cust1.js`, `inspect_cust2.js`, `inspect_default_state.js`, `inspect_default_state2.js`, `inspect_end_logic.js`, `inspect_exact_lines.js`, `inspect_header.js`, `inspect_init_state.js`, `inspect_load_state.js`, `inspect_matrix_court.js`, `inspect_matrix_fn.js`, `inspect_matrix_locked.js`, `inspect_matrix_rows.js`, `inspect_my_bk.js`, `inspect_schedule_chunk.js`, `inspect_structure.js`, `inspect_submit.js`, `search_mock_names.js`.

`check_actions.js`, `check_status.js`, `check_incident_details.js` are manually invoked external-service diagnostics with no application/build consumer; retain only if they are part of a documented operations workflow. Their network error/status handling is inconsistent and they have no request timeouts.

### Existing checks to replace or repair, not mistake for coverage

`test_builder_engine.js`, `test_slices.js`, `test_slot_overlap.js`, `test_supabase_ops.js`, `verify_all.js`, `verify_mobile.js`, `verify_pc.js`.

The current application files, app_logic.js, build_index/build_pc/build_mobile, server.js, SQL, README, standards, and deploy workflow are not classified as dead merely because some need repair.

## Missing test coverage, in priority order

1. Authorization/RLS and personal-data isolation: anonymous/customer/admin CRUD, booking ownership, hidden DOM, malicious text.
2. Save/reload and cloud persistence for every mutation, including errors and offline recovery.
3. Booking dates, overlap, stale submit, multi-client races, unique IDs, partial failures, and noncontiguous intervals.
4. Actual rendered admin matrix/table actions and all supported customer booking paths.
5. Session lifecycle invariants: check-in/cancel/checkout and court/booking/invoice agreement.
6. Inventory accounting, returns/cancellations, rentals, zero stock, atomic competing sales.
7. Billing: peak boundaries, deposits versus discounts, payment confirmation, repeated checkout, accurate daily/weekly reports.
8. Time progression, midnight, operating-hour edges, malformed input, and business timezone independent of device timezone.
9. Realtime/poll reconciliation: out-of-order snapshots, reconnect, errors, all CRUD events, empty tables, and pagination.
10. Fresh-clone deterministic builds, all-script syntax, source/output consistency, schema migrations, and failure exit codes enforced in CI.
11. Browser smoke tests for index/PC/mobile: startup, booking, shop, cart clear, admin operations, invoice display, and console errors.
12. Keyboard/accessibility, narrow-screen scrolling, zoom, dependency outages, storage failures, and local-server path containment.

## Verification performed

- Parsed every JavaScript tool with Node's VM parser: make_sites.js fails; the other tool scripts parse.
- Parsed the inline JavaScript in index.html, pc.html, mobile.html, and tools_and_scripts/desktop.html: all parse.
- Compared the three shipped inline scripts against app_logic.js: exact matches after trimming. The old desktop copy differs.
- Checked static HTML IDs in those four pages: no duplicate IDs found.
- Ran verify_all.js: it prints two missing mobile scroll-button IDs and “SOME CHECKS FAILED”, but exits zero. Both missing button accesses are guarded.
- Ran test_slot_overlap.js: it prints the expected true results for its two simple overlapping half-hour examples; it has no assertions.
- Reproduced cache deletion, stock decrement asymmetry, and cart-clear ReferenceError in a local VM with storage/DOM stubs.
- Reproduced noncontiguous parsing, 15-minute overbilling, and the missing final operating hour by executing the actual helper functions.
- Inspected the server's path resolution without requesting outside files or exposing data.
- Did not run cloud-write tests, destructive cleanup scripts, source patchers, or builders that overwrite shipped output. No application or database fixes were made in this audit.

Static review cannot prove that no other bugs exist. Findings distinguish verified code behavior, checked-in configuration, and future/conditional risks; live deployment, real browser interaction, and backend policy state remain unverified.
