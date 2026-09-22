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

While it waits, n8n stores the execution and does not hold a worker for it. Use *Limit Wait Time* if it must not wait forever; after a timeout the workflow continues with the node's input unchanged, so `{{ $json.decision }}` is empty. The item stays pending in SwipeFlow.

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
- **Media upload fails with 413**: the file exceeds the per-file or storage limit; check **Media → Get Usage**.

For API details see the [SwipeFlow API docs](https://swipeflow.io/api).
