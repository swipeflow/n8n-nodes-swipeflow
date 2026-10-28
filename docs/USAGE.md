# SwipeFlow n8n node: usage guide

## Local testing

```bash
npm install
npm run dev        # starts n8n with the node loaded; rebuilds on change
```

To load a build into an existing n8n instead, run `npm run build`, then install the package into `~/.n8n/nodes` (`npm install /path/to/this/folder` there) and restart n8n.

## Credentials

Add a **SwipeFlow API** credential in n8n. Paste an API key from SwipeFlow (Settings → API Keys). Leave **Base URL** as `https://api.swipeflow.io` unless you use a staging or self-hosted deployment. The credential's **Test** button calls `GET /v1/projects`.

## Approve before continuing

1. Add **SwipeFlow → Item → Create and Wait for Decision**.
2. Choose the project, set *Title*, *Content Type* and *Content*.
3. Add an **IF** (or **Switch**) node on `{{ $json.decision }}`:
   - `approved`: publish, send, or whatever the approval was for.
   - `rejected`: stop, or notify someone.
   - `change_requested`: revise using `{{ $json.comment }}`, then **Item → Create Version** and **Item → Wait for Decision** with the same `{{ $json.itemId }}`.

While it waits, n8n stores the execution and does not hold a worker for it. Use *Limit Wait Time* if it must not wait forever. After the limit the workflow continues with the node's input unchanged, so `{{ $json.decision }}` is empty. The item stays pending in SwipeFlow. Polling mode requires a limit.

Both wait operations also take **Delivery Mode → Polling**, for installs where SwipeFlow cannot call n8n. See *Polling instead of webhooks* below.

## Approval node with separate outputs

**SwipeFlow Approval** (listed under *Human review* in the node picker) does the same wait, with one output per outcome, so no IF node is needed:

| Output | Runs when |
| --- | --- |
| **Timed out** | The *Limit Wait Time* passed with no decision. In polling mode the output's JSON also has `timeoutSource: "n8n"`. |
| **Approved** | The item is approved. |
| **Rejected** | The item is rejected, or deleted while waiting. |
| **Change requested** | A change is requested. The comment is in `{{ $json.comment }}`. |
| **Always** | Every run, whatever the decision. Use it for audit logging or notifications. |

Each output receives the same JSON as the Create and Wait outcome, so `{{ $json.decision }}` and `{{ $json.itemId }}` work the same way.

Set *Title*, *Content Type* and *Content* as for Create and Wait for Decision. *Additional Fields* (expiration, idempotency key, media, metadata) work the same way too.

A decision on a webhook wait runs exactly one of the four decision outputs, and the **Always** output alongside it. n8n runs every output that has items, so a run can continue down two branches at once.

**Timeouts.** The **Timed out** output runs when *Limit Wait Time* passes with no decision, in either delivery mode. In webhook mode n8n's own timer resumes the run, so that timeout's JSON is the node's input without a `decision` field; the branch itself tells you it timed out. Expiry on the SwipeFlow side (requests expiring before the limit) is not wired yet: it needs swipeflow/swipeflow#424, and will get its own output when it is.

## Using the approval as an AI agent tool

Connect the **SwipeFlow Approval** node to an AI Agent's *Tool* input. The agent then calls it to ask a person before acting, and gets the decision back as its tool result.

- Set **Delivery Mode** to **Polling** and turn on **Limit Wait Time** for tool use. In webhook mode the wait is paused between runs, and the tool result after a webhook resume is not verified.
- The tool returns the decision JSON on one output, so the agent can read it. The agent sees the approval's `decision` field (for example `approved`) and `comment`.
- The title and content come from the agent through `$fromAI`. Ask the agent to put enough context in the content for the reviewer.
- Tested against OpenAI's `gpt-4o-mini` in a local n8n 2.42.3, in polling mode. The agent replied `approved` after the reviewer approved in SwipeFlow.

## Polling instead of webhooks

Set **Delivery Mode** to **Polling** on the Approval node, or on Create and Wait for Decision or Wait for Decision. n8n then reads the item every *Polling Interval* (at least 1 minute, default 5) until a decision is made or *Limit Wait Time* passes. Polling needs a time limit, so the node refuses to start without one.

- Use polling when SwipeFlow cannot reach your n8n instance (a private network, or no public URL).
- Polling holds an n8n worker for the whole wait. Keep the timeout short enough for that, and make sure the n8n execution timeout is longer than the polling timeout.
- On timeout the Approval node takes **Timed out**. The SwipeFlow node continues with its input unchanged, as a time-limited webhook wait does.
- Webhook delivery is the default and does not hold a worker. Use it whenever SwipeFlow can reach n8n.

## React to events in another workflow

Use **SwipeFlow Trigger** when a decision should start a separate workflow rather than resume a paused one. Choose the project and events, then activate the workflow. n8n registers the webhook with SwipeFlow, and removes it when the workflow is deactivated.

The n8n instance must be reachable from the internet (a public URL or a tunnel) for SwipeFlow to deliver events. Set `WEBHOOK_URL` in n8n if it sits behind a proxy.

## Files for review

1. **Media → Upload**, with the file in a binary field (for example from an HTTP Request or Read Binary File node).
2. **Item → Create** with *Content Type* Image, Video or Audio and *Content* `{{ $json.ref }}`.

Media referenced by an item cannot be deleted until it is detached.

## Troubleshooting

- **401 or "Invalid API key"**: recreate the key and update the credential.
- **The Trigger never fires**: check the workflow is active, the n8n URL is public, and the webhook logs in SwipeFlow show deliveries. A `401` from n8n in those logs means the signature check failed; see *Options → Verify Signature* in the README.
- **A waiting execution never resumes**: open the project's webhooks in SwipeFlow. There should be one named `n8n wait exec=<execution id> …`. If it is missing, check the execution for an error from the node.
- **The Timed out output never runs**: check that *Limit Wait Time* is on and set. Without a limit, a webhook wait waits for the decision indefinitely.
- **Media upload fails with 413**: the file exceeds the per-file or storage limit; check **Media → Get Usage**.

For API details see the [SwipeFlow API docs](https://swipeflow.io/api).
