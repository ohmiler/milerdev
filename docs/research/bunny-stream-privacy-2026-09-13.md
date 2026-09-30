# Bunny Stream privacy controls

Research date: 2026-09-13. Primary-source documentation review plus a limited browser observation of an owner-designated public preview lesson. No private account records, credentials, or vendor settings were accessed or changed.

## Public preview observation

The owner supplied the HTML CSS Masterful Introduction preview on milerdev.com. An isolated anonymous browser opened the lesson successfully; opening the standalone Bunny play link had returned 403. The reason for that difference is not established. No login, purchase, enrollment or library configuration changes were performed.

On a reload with no play click and a 12-second observation window:

- The iframe contacted Bunny asset/font services, edgezone hosts, `metrics-bunny.net`, a varying subdomain of that host, and `rum-metrics.bunny.net`.
- A second eight-second sample identified `zone` and `latency` query field names on the RUM GET request. No values, raw request URLs, session identifiers or payloads were retained in this report. This supports a routing-performance interpretation but does not prove every metric's purpose or server-side retention.
- Cookie metadata contained only two first-party Auth.js session cookies; no Bunny cookies were observed in that browser context. This is a bounded observation, not proof across all devices, configurations or playback states.
- The iframe had localStorage keys `cache-sprite-plyr` and a library-scoped `plyr--lib-*` key. Values were not inspected. Their lifetimes were not established; the documented seven-day resume-position limit must not be assigned to these keys without evidence.
- The video was paused with readyState 4 at the sample endpoint. An earlier opening had shown playback active without a click. Autoplay is therefore not consistently characterized by these samples.

The consent branch is not deployed to the public site. Accepted/refused/withdrawn comparisons of that implementation were not performed here. The audit does not establish the complete telemetry schema, behavior throughout playback, server-side anonymization, or library logging settings.

## Vendor statements

Bunny's Stream-specific privacy page, updated 2026-07-09, says its player does not set cookies or send personally identifying information through playback/analytics. It describes anonymized quality, error, buffering, and CDN performance telemetry for service reliability and routing optimization. These are vendor statements, not an independent audit of anonymization or a legal classification. The same page says resumable playback uses browser localStorage, retains positions for up to seven days, and does not transmit those saved positions to Bunny. This scope is narrower than saying a browser never sends any playback-related request. [Stream Data and Privacy](https://bunny.net/docs/stream/data-and-privacy)

Bunny also documents video views, watch-time history, per-country statistics, and timeline heatmaps. Thus a metrics endpoint name alone cannot distinguish operational telemetry from video engagement measurement. [Stream metrics announcement](https://bunny.net/blog/better-streaming-insights-with-new-stream-metrics/)

## Documented controls and limits

| Control | Documented meaning | Limit |
| --- | --- | --- |
| `autoplay=false` | Require playback to be requested | Does not promise no iframe requests |
| `preload=false` | Avoid downloading video before requested playback | Does not promise no player telemetry |
| `rememberPosition=false` | Disable browser position restoration | Separate from telemetry |
| `rememberSettings=false` | Disable saving/restoring player preferences, including position | Current docs describe the new player; verify legacy support |
| `showHeatmap=false` | Hide the progress-bar heatmap | Does not disable collection |

The current embed documentation lists these parameters but no analytics/telemetry opt-out parameter. It also recommends origin-only cross-origin referrers for domain restrictions; removing the referrer can cause 403. This is an absence in the reviewed public documentation, not proof that no support-managed option exists. [Embedding videos, updated 2026-09-08](https://bunny.net/docs/stream/embedding)

The library update API exposes `RememberPlayerPosition`, `ShowHeatmap`, and `PlayerVersion`; it does not document an analytics-disable field in the reviewed schema. Do not invent `disableAnalytics` or equate hiding the heatmap with stopping requests. [Update Video Library](https://docs.bunny.net/reference/videolibrarypublic_update)

The new player uses `player.mediadelivery.net`; the legacy endpoint remains `iframe.mediadelivery.net`. Bunny documents migration as both a library version setting and an embed URL change. Do not silently migrate a production library solely to obtain newer privacy parameters. [Player migration and versions](https://bunny.net/docs/stream/player)

## CDN logs are a separate data path

For enabled Pull Zone logging, Bunny documents three-day raw log retention and optional permanent archives. It says IP anonymization applies at API read time; fields can include request URL, referrer, user agent, country and network details. A cookie-free player therefore does not establish that delivery infrastructure stores no request information. The actual zone's logging and archive settings remain unverified. [CDN Logging](https://bunny.net/docs/cdn/logging/index)

The DPA can be reviewed and accepted in the owner account, then downloaded. This review did not inspect or accept it. [Data Processing Agreement](https://bunny.net/docs/account/data-processing-agreement)

## Implementation implications

- Preserve learning access after optional analytics refusal. A player-start action must not silently grant optional analytics consent.
- If avoiding all third-party player requests before deliberate playback is desired, defer iframe creation until an explicit play action. Merely disabling autoplay/preload cannot establish that boundary. This is an engineering inference from iframe loading behavior and the documented parameter scope, not a Bunny compliance guarantee.
- Inspect sanitized request field names and cookie/localStorage key names before/after play on the authorized public test. Avoid storing raw tokens, IDs generated for the browser session, request payloads or sensitive headers in committed artifacts.
- Keep MilerDev's optional statistics policy separate from Bunny's documented operational telemetry. Do not label all metrics as necessary based solely on the vendor wording.
- Remaining vendor questions: exact purpose/schema and retention of `metrics-bunny.net` versus `rum-metrics.bunny.net`; whether either can be disabled while preserving playback; legacy versus new-player behavior; and where telemetry processing occurs. The reviewed sources do not resolve these endpoint-specific questions.
