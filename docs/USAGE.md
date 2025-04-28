# SwipeFlow n8n Node Usage Guide

## 1. Installation (Local Testing)

1. Build the node:
   ```bash
   npm install
   npm run build
   ```
2. Link the package globally:
   ```bash
   npm link
   ```
3. In your n8n root directory, link the node:
   ```bash
   npm link n8n-nodes-swipeflow
   ```
4. Restart your n8n instance. The SwipeFlow node should appear in the node list.

## 2. Credentials Setup
- Open n8n, go to Credentials, and add a new SwipeFlow API credential.
- Enter your API Key and (optionally) the Base URL (`https://api.swipeflow.io/v1`).

## 3. Trigger: Listen for Item Events
- Add the SwipeFlow node to your workflow.
- Set Resource to "Item Event Trigger".
- Enter your Project ID and select events (created, updated, etc.).
- Connect to further workflow steps (e.g., send Slack message).
- Save and activate workflow. n8n will register a webhook with SwipeFlow.

## 4. Action: Create Item
- Add the SwipeFlow node, set Resource to "Create Item".
- Enter Project ID, Title, Description, and optional Metadata (JSON).
- Run the workflow to create a new item in SwipeFlow.

## 5. Action: Generic API Call
- Add the SwipeFlow node, set Resource to "Generic API Call".
- Specify HTTP Method, Endpoint (e.g., `projects/{projectId}/items`), and Body/Query if needed.
- Use for advanced API operations.

## 6. Troubleshooting
- Check n8n logs for errors.
- Ensure your API Key has the correct permissions.
- The webhook trigger must be reachable by SwipeFlow (public URL or tunnel).
- Delete and re-add credentials if you see auth errors.

## 7. Example Workflow
- See `EXAMPLES.md` in this folder for sample JSON workflows.

---
For API details, see [SwipeFlow API Docs](https://docs.swipeflow.io/)
