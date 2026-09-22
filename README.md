# n8n-nodes-swipeflow

Add human approval to your n8n workflows with **SwipeFlow**. A reviewer swipes to approve, reject or request changes on their phone, and your workflow carries on with the decision.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform. Learn more about SwipeFlow at [swipeflow.io](https://swipeflow.io).

[Installation](#installation) · [Credentials](#credentials) · [Wait for approval](#wait-for-approval-in-one-node) · [SwipeFlow node](#swipeflow-node) · [SwipeFlow Trigger](#swipeflow-trigger) · [Upgrading](#upgrading-from-earlier-versions) · [Compatibility](#compatibility) · [Development](#development)

## Installation

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) and install `@swipeflow/n8n-nodes-swipeflow`.

## Credentials

1. In SwipeFlow, open **Settings → API Keys** and create a key.
2. In n8n, add a **SwipeFlow API** credential and paste the key.

**Base URL** defaults to `https://api.swipeflow.io`. Change it only for a staging or self-hosted deployment.

> Treat the API key like a password: it grants access to your SwipeFlow projects.

## Wait for approval in one node

**SwipeFlow → Item → Create and Wait for Decision** creates an item for review and pauses the workflow. When a reviewer decides, the workflow resumes with the outcome:

```json
{
  "decision": "approved",
  "approved": true,
  "comment": "Looks good",
  "decidedBy": "Riley Reviewer",
  "decidedAt": "2026-09-21T12:00:00.000Z",
  "itemId": "66f1f77bcf86cd799439011",
  "projectId": "507f1f77bcf86cd799439011",
  "item": { "...": "the full item" }
}
```

`decision` is `approved`, `rejected`, `change_requested`, or `deleted` if the item was removed while waiting. Branch on it with an IF or Switch node.

**Requesting changes.** A change request ends the wait like any other decision. To loop, revise the content, run **Item → Create Version**, then **Item → Wait for Decision** on the same item ID.

**Time limit.** Turn on *Limit Wait Time* to continue after a while without a decision. The workflow then carries on with the node's input unchanged, as with n8n's own send-and-wait nodes, so there is no `decision` field. Test for that (for example an IF on `{{ $json.decision }}` being empty) to handle a timeout. The item stays pending in SwipeFlow.

**Things to know**

- Only the first input item is used; an execution can be paused once per node. Put the node in a loop (for example Loop Over Items) to review many.
- An automatic retry of the node (*Retry On Fail*) does not create a second item: the item is created with an idempotency key derived from the execution and node. Re-running the workflow does create a new one.
- SwipeFlow has no per-item callbacks, so each wait registers a short-lived webhook on the project (named `n8n wait exec=<id> item=<id> …`) and removes it when the decision arrives.
  - A wait with a time limit that passes, or an execution cancelled after its limit, leaves its webhook behind until the next wait in the same project cleans it up.
  - A cancelled wait with no time limit leaves its webhook until you delete it under the project's webhooks in SwipeFlow. It points at a URL n8n no longer serves, so it does no harm beyond failed delivery entries in the webhook log.
- Other events in the project also reach n8n while a wait is open; the node ignores everything except a decision on its own item.

## SwipeFlow node

| Resource | Operations |
| --- | --- |
| **Item** | Create · Create and Wait for Decision · Wait for Decision · Get · Get Many · Get Next Pending · Get Status · Approve · Reject · Request Changes · Mark as Processed · Create Version · List Versions · Get Version · Delete |
| **Media** | Upload (from binary data) · Import From URL · Get · Get Many · Download · Get Usage · Delete |
| **Project** | Create · Get · Get Many · Get or Create (by name) · Update · Delete |
| **Project Trigger** | Get Many · Create · Run · Delete |
| **Webhook** | Get Many · Create · Send Test · Delete |
| **Other** | Custom API Call |

Pick projects from a searchable list or by ID. **Get Many** operations offer *Return All* and *Limit*.

**Images, video and audio.** Use **Media → Upload** on a binary file, then put the returned `ref` (`media://<id>`) in an item's *Content* (with *Content Type* Image, Video or Audio), or list the media ID under *Additional Fields → Media IDs*.

**Custom API Call** takes a path such as `projects/{projectId}/items` (the `/v1` prefix is added if missing). Full URLs are refused so the credential's API key can only go to SwipeFlow.

The node can also be used as a tool by AI agents.

## SwipeFlow Trigger

Starts a workflow when something happens in a project. It registers a webhook with SwipeFlow when the workflow is activated and removes it when it is deactivated.

Events: Item Created, Updated, Deleted, Approved, Rejected, Change Requested, Processed, and Project Triggered (a manual trigger run from SwipeFlow).

Every event has `event`, `timestamp` and, where they apply, `projectId`, `itemId`, `item`, `decision`, `processed`, `version` and `userId`. Project Triggered events carry `triggerName`, `triggerEvent`, `triggeredBy` and any extra data under `payload`.

**Signature verification.** Each delivery is signed by SwipeFlow, and the trigger checks the signature and rejects unsigned, altered or replayed requests with a 401. The webhook's secret is generated by the trigger and kept in the workflow's static data. Turn it off under *Options → Verify Signature* if a proxy alters requests before they reach n8n.

## Upgrading from earlier versions

Existing workflows keep working: nodes you already have stay on **node version 1** and behave as before. New nodes use **version 2**. To move a workflow over, add a new SwipeFlow node and copy its settings.

What version 2 changes:

- **Fixed:** *Expiration Date* is now sent when creating an item (version 1 accepted it and dropped it).
- **Fixed:** *Metadata* is sent as a JSON object (version 1 sent the text as entered).
- **Fixed:** the Trigger no longer fails on *Item Deleted*, and supports *Item Processed*.
- **Fixed:** *Custom API Call* works with the documented `projects/…` form and no longer requires choosing a project.
- **Added:** wait for approval, media, webhook and project trigger operations, idempotency keys, item status and versions, Return All, searchable project list, signature verification.
- **Changed:** project operations are named *Get* and *Get Many* instead of *Fetch* and *List*; *Update Project* changes only the fields you set.

## Compatibility

Tested end to end against n8n **2.35.7** (loading the package, the Trigger lifecycle and signature checks, waiting and resuming, timeouts, and a version 1 node in a saved workflow) and unit tested against `n8n-workflow` 2.39.

Older n8n versions have not been tested. The wait relies on n8n's signed resume URLs; on a version that does not provide them the node falls back to the unsigned resume URL, which has not been tested.

## Development

```bash
npm install
npm run build      # compile
npm run lint       # n8n community node rules (must pass with no errors)
npm test           # unit tests
npm run dev        # run n8n locally with the node loaded and hot reload
```

The node ships with no runtime dependencies, so it cannot import `@swipeflow/sdk` (which needs axios). The SDK's generated types and media helpers are copied into `nodes/SwipeFlow/sdk` by

```bash
npm run sync-sdk   # reads ../../sdk/swipeflow-sdk-ts, or pass a path
```

Do not edit the copied files; refresh them after the API changes. `nodes/SwipeFlow/sdk/client.ts` is a small hand-written client over n8n's HTTP helpers with the SDK's method names.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [SwipeFlow API docs](https://swipeflow.io/api)
- [SwipeFlow](https://swipeflow.io)

Questions or problems: open an issue or contact [support@swipeflow.io](mailto:support@swipeflow.io).
