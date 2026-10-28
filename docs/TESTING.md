# Testing the SwipeFlow node

How the node was tested, and how to repeat it. Importable workflows are in [test-workflows/](test-workflows/).

## What was tested, and where

| Layer | What | Result |
| --- | --- | --- |
| Unit tests | `npm test`: 210 tests covering signature verification, every webhook event shape, the wait and resume lifecycle, every operation, carousel validation, the Content input per type, and that every dropdown method a field uses is declared | pass |
| Static checks | `n8n-node lint` (strict) and `tsc --noEmit` | pass |
| Package scan | `npx @n8n/scan-community-package @swipeflow/n8n-nodes-swipeflow` (provenance and security checks) | pass |
| Live runs | The workflows below, run on n8n 2.45.4 against the real SwipeFlow API (`api.swipeflow.io`), on package versions 1.2.0-beta.4 to beta.12 | pass, see the run log |
| Editor checks | Project picker (*From list* and search), Content Type options and per-type Content field, node picker listing under *Human review*, docs links | pass |

## Before you run anything

1. Install `@swipeflow/n8n-nodes-swipeflow` (Settings → Community nodes).
2. Create a SwipeFlow API key (SwipeFlow app → Settings → API Keys). For these workflows it needs `reviews:request`, `reviews:read`, `reviews:decide`, `projects:read` and `projects:write`. See [Scopes in the README](../README.md#scopes).
3. In n8n add a **SwipeFlow API** credential with that key.
4. Import a workflow from [test-workflows/](test-workflows/) (workflow menu → Import from file).
5. Select your credential on the SwipeFlow nodes, and pick a project in the **Project** field (the exports leave it empty). Workflow 1 and 5 create and use a project named "n8n v2 node tests" themselves.

Steps that need a person are marked **swipe**: open the SwipeFlow app, find the item the workflow just created, and approve, reject or request changes.

## Workflows

| # | File | Covers | Needs a swipe | Expected result |
| --- | --- | --- | --- | --- |
| 1 | `01-api-lifecycle.json` | Project resolve; item create, get status, request changes, create version, list versions, approve, mark processed, get (with versions), get many (filters), delete | no | Runs to the end with no error |
| 2 | `02-trigger-events.json` | SwipeFlow Trigger receiving every event type (created, updated, change requested, approved, rejected, processed, deleted, project trigger); manual triggers create, run and delete | no | **Publish** it, then run the manual branch. The trigger branch records one execution per event, all `success` |
| 3 | `03-wait-for-decision.json` | Create and Wait for Decision, routing by decision, Mark as Processed, the change-request loop with Create Version and Wait for Decision, timeout | **swipe** | Approve: *Result: approved*. Reject: *Result: rejected*. Request changes: a revised version appears in the app; approve it and the run ends on *Result: after revision*. No action for 10 minutes: *Result: timeout* |
| 4 | `04-media.json` | Media usage, upload from binary, image item with a media reference, resolve media, import from URL, get, list unattached, download, delete | no | Runs to the end with no error. The imported file is listed as unattached, downloaded and then deleted |
| 5 | `05-projects-webhooks-triggers-custom-call.json` | Project create, update, get, get many, delete; webhook create, test, get many, delete; manual trigger create, get many, run, delete; Get Next Pending; Custom API Call | no | **Publish** it and put its production URL in *Create webhook*. The last step (a full URL) is refused on purpose and continues past the error |
| 10 | `10-approval-node.json` | SwipeFlow Approval node: one output per outcome, 2 minute limit | **swipe** | Approved, Rejected and Change requested leave on their own output (and *Always*); no action for 2 minutes leaves on *Timed out* |
| 11 | `11-ux-audit-operations.json` | Carousel create with a media reference; invalid carousel JSON and an empty carousel (both caught before the request); Simplify on and off; Get Many; Reject | no | Both bad-carousel steps output `{"error": "…"}` and the run continues. The final Delete fails on purpose, because SwipeFlow only deletes pending items with no decisions |

Not exported, because they need third-party credentials: Gmail reply approval, Google Doc to Notion, and an AI agent with the SwipeFlow HITL tool. They exercise the same nodes, with Gmail, Google Docs, Notion and Anthropic in front.

## Things to try by hand

These are the parts a workflow cannot show:

- **Human review.** Open the node panel and choose *Human review*. **SwipeFlow Approval** is listed next to the other approval nodes.
- **Project picker.** On any SwipeFlow node, set Project to *From list*, open it and type part of a project name.
- **Content.** On *Create*, switch Content Type between Text, HTML, Image, Video, Audio and Carousel. The Content field and its help change with the type.
- **Simplify.** Turn it off on *Get* and compare the output.
- **AI agent.** Connect a SwipeFlow node to an AI Agent's tool input. Both the node and the approval step are available as tools.
- **Timeout cleanup.** Run workflow 10 and leave it. After 2 minutes the run takes *Timed out*. The SwipeFlow project's webhook list no longer has the `n8n wait exec=…` entry the run registered.

## Run log

Runs on n8n.swipeflow.io (n8n 2.45.4), 27 to 28 October 2026. Execution ids are from that instance.

| Workflow | Package | Execution | Outcome |
| --- | --- | --- | --- |
| 1 API lifecycle | 1.2.0-beta.2 | n/a | passed |
| 1 API lifecycle | 1.2.0-beta.6, 1.2.0-beta.7 | 156, 168 | passed; beta.7 returns `versions` with Simplify on |
| 3 Wait for decision | 1.2.0-beta.4 | 131 | approve, resumed, success |
| 3 Wait for decision | 1.2.0-beta.4 | 136 | request changes, then approve the revision, success |
| 10 Approval node | 1.2.0-beta.4 | 144 | approve, Approved output |
| 10 Approval node | 1.2.0-beta.4 | 148 | change request, Change requested output |
| 10 Approval node | 1.2.0-beta.5 | 152 | no action, took Timed out at the 2 minute limit; its webhook was removed by SwipeFlow |
| 10 Approval node | 1.2.0-beta.10 | 183 | reject, Rejected output with the reviewer's comment |
| 10 Approval node | 1.2.0-beta.10 | 189 | polling without a time limit refused: "Polling needs a time limit" |
| 11 UX audit | 1.2.0-beta.9 or later | 180 | carousel with three slides created; both invalid carousels reported; Simplify and Get Many correct; Reject recorded; Delete refused by the API as expected |
| 2 Trigger events | 1.2.0-beta.4 to beta.10 | 140 to 151 | every received event processed |

Failures found and fixed along the way:

- Wait for Decision and the Approval node failed on resume with `Invalid token`: n8n validates send-and-wait nodes by signature and other waiting nodes by the execution's resume token (fixed in beta.4).
- The Approval node's project picker raised a missing `searchProjects` method (fixed in beta.10).
- Simplify dropped `versions` when *Include All Versions* was on (fixed in beta.7).
- Carousel was missing from the Content Type options (added in beta.9).

## Notes on the exports

The files were generated from the workflows used in the runs above and have not been re-imported on a fresh instance. They contain no credentials or project ids. If an import complains about a node, check that the package version is 1.2.0-beta.12 or later and that a project is selected.
