Decisions
Notes on the non-obvious parts of this client. Written after implementation, not as a spec.

Seq ordering
The server may deliver frames out of order or twice in chaos mode. I keep a Map<seq, message> and only dispatch contiguous runs starting at nextExpectedSeq. Duplicates are ignored in two cases:

seq < nextExpectedSeq (already rendered)
seq already present in the map
lastProcessedSeq is updated only when a message is actually dispatched to the reducer, not when it arrives on the wire. That value goes into RESUME.last_seq on reconnect.

If the buffer ever hits 10k pending messages, the oldest buffered seq is dropped. That is a deliberate memory bound; in practice the server does not send gaps that large.

Tool calls without layout shift
Tool cards are not inline spans inside the token flow. Each stream is a list of segments:

[text segment] -> optional tool card attached to the segment above
[text segment] -> ...
On TOOL_CALL, the current segment gets a toolCallId and a fresh empty segment opens for post-tool tokens. Tokens are blocked while any tool call on the stream lacks a result (streamHasPendingTools). That handles rapid back-to-back tool calls without unpausing early.

CSS is intentionally plain: whitespace-pre-wrap, separate block elements, and no animated height on the text node.

Timeline performance
Pushing one React state update per token will jank at 30+/s. Tokens accumulate in TimelineAccumulator for about 200ms (or until a non-token event forces a flush) and land in state as a single batched row: Streamed 47 tokens (1.2s). Expand reveals the concatenated text.

Timeline rows also store precomputed searchText. Filtering does not repeatedly stringify full protocol payloads on every keystroke.

Reconnection
On onopen, if lastProcessedSeq > 0, the first frame on the wire is RESUME. Queued user messages flush after that. The chat panel stays scrollable during reconnecting; only sending is gated while the socket is fully down.

Replayed events pass through the same reordering buffer, so duplicates from pre-drop delivery are ignored.

Context diffs
Diffs are root-key diffs for speed, with recursive equality checks bounded by a comparison budget. Normal-sized payloads get a larger budget; oversized payloads get a smaller one so the UI stays responsive under chaos mode. Large arrays/objects render collapsed with manual expand and only the first slice of children is mounted.

Protocol nit: TOOL_ACK timing
The spec waits up to 5s for TOOL_ACK but also allows out-of-order delivery. If a TOOL_CALL sits in the reorder buffer behind a gap, the card is not painted yet, but the server still expects an ack soon. I send TOOL_ACK as soon as the TOOL_CALL clears the buffer (same tick as render state update). Sending earlier would violate the "rendered to the DOM" wording; sending much later risks a logged violation.

If this were an ops dashboard (50 streams)
One socket per agent, keyed reducers per stream_id, virtualized chat columns, timeline filtered per stream, and a shared reordering buffer only if seq spaces are global (they are here). I would not keep all token text in memory; completed streams should spill to indexed summaries.

If responses were 100x longer
Segment list plus virtual scroll in the chat column, chunk storage instead of string[], timeline batches capped to N rows with spill to a downloadable log, and diff only on explicit user action for large contexts.

Tests
npm test runs Vitest against:

reordering buffer edge cases (empty, reversed, duplicate, gap detection)
stream segment ordering through tool interruptions
diff helper correctness
WebSocket chaos itself is manual: run the server in chaos mode and confirm via /log plus the screen recording.
