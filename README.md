# n8n-nodes-swipeflow

Easily add human-in-the-loop approvals to your n8n workflows with **SwipeFlow** — approve, reject, or revise content with a simple swipe on your phone.

This integration allows you to:
- Create approval items
- Watch real-time SwipeFlow events via webhooks
- Perform custom API calls against the SwipeFlow API

Use SwipeFlow to streamline your decision-making, validate AI-generated content, approve tasks, and add flexible human review points inside your automation flows.

Learn more about SwipeFlow at [https://swipeflow.io](https://swipeflow.io).

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Compatibility](#compatibility)  
[Usage](#usage)  
[Resources](#resources)  
[Version history](#version-history)  

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

Alternatively, for local development:

```bash
pnpm install
pnpm run build
```
Restart your n8n instance. The SwipeFlow node should now appear in the node list.

## Credentials

This node uses **API Key** authentication.

To generate an API key:
1. Log in to your [SwipeFlow](https://swipeflow.io) account.
2. Navigate to `Settings` → `API Keys`.
3. Create a new API key or use an existing one.
4. Enter the API key when configuring the SwipeFlow credentials in n8n.

> 🔒 **Security Note**: Treat your API key like a password — it grants full access to your SwipeFlow workspace.

## Operations

The SwipeFlow node supports the following operations:

- **Trigger**: Listen for item events using dynamic webhooks (create, update, delete, approve, reject, etc.)
- **Item Operations**: Create, update, review and delete items
- **Project Operations**: List, fetch, create, update, and delete projects
- **Generic API Call**: Make any API call to the SwipeFlow REST API

## Usage

### Common Use Cases

- **Approval Workflows**: Add manual approval checkpoints into any kind of automated processes.
- **AI Content Review**: Route AI-generated content, e.g. media files, articles, blog posts, emails, product descriptions, newsletters for human validation before publishing. Request changes directly from SwipeFlow.
- **Task Management**: Create, approve, or reject tasks that require human oversight.
- **Compliance & Moderation**: Insert reviews for regulated or sensitive workflows to ensure compliance.
- **Customer Requests**: Handle incoming customer service or onboarding requests that need a human decision.

### Example Scenario

1. A **scheduled trigger** in n8n starts an automated workflow to generate new product descriptions using **ChatGPT** (or another AI model).
2. The generated content is passed to a **SwipeFlow → Create Item** node for human review and approval.
3. A **reviewer** receives a real-time **notification** and swipes to **approve**, **reject**, or **request changes**.
4. The **SwipeFlow → Webhook** node in n8n captures the reviewer's decision and triggers different branches based on the action taken:
   - **Approved**: The content is automatically published to the target platform (e.g., CMS, eCommerce site).
   - **Rejected**: The content is permanently rejected and not published.
   - **Changes Requested**: The reviewer's comments are sent back to the AI model.
     - A **new version** of the content is generated based on the feedback.
     - The new version of the item is pushed back to **SwipeFlow** for another review.
5. The cycle repeats until the content is **approved** or **rejected**.

## Compatibility

- Minimum n8n version: **1.118.0**
- Tested with n8n versions: 1.118.x
- No known compatibility issues.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [SwipeFlow API Docs](https://swipeflow.io/api)
* [SwipeFlow Website](https://swipeflow.io)

## Version history

- **1.0.0** — Initial release: Trigger node, item/project actions, generic API call support.

---


If you have feedback or issues, please open an issue in the repository or contact the [SwipeFlow team](mailto:support@swipeflow.io).