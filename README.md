# TrueNAS Gotify Adapter

TrueNAS does not natively provide a way to send alerts and notifications to a [Gotify](https://gotify.net/) server. This project "abuses" the TrueNAS **Slack** alert integration by exposing a fake Slack webhook endpoint that forwards alerts to your Gotify server.

> [!NOTE]
> Slack is **not** required at all for this integration to work.

## Configuration

The container is configured through the following environment variables:

| Variable       | Description                | Example                       |
| -------------- | -------------------------- | ----------------------------- |
| `GOTIFY_URL`   | URL of your Gotify server  | `https://gotify.example.com/` |
| `GOTIFY_TOKEN` | Gotify application token   | `cGVla2Fib29v`                |

The adapter listens on port `31662`.

## Installation

### Step 1: Deploy the adapter

Choose **one** of the following options.

#### Option A: Custom App (UI)

1. Go to **Apps → Discover Apps → Custom App**.
2. Fill in the form:
   - **Application Name**: e.g. `truenas-gotify`
   - **Image Repository**: `ghcr.io/asierzunzu/truenas-gotify-adapter`
   - **Image Tag**: `main`
   - **Environment Variables**: add `GOTIFY_URL` and `GOTIFY_TOKEN` (see [Configuration](#configuration)).
   - **Network Configuration**: check **Host Network**.
3. Click **Save**.

#### Option B: Install via YAML

1. Go to **Apps → Discover Apps → Custom App → Install via YAML**.
2. Paste the following, replacing the placeholder values:

   ```yaml
   services:
     gotify-truenas-adapter:
       container_name: gotify-truenas-adapter
       image: ghcr.io/asierzunzu/truenas-gotify-adapter:main
       restart: unless-stopped
       environment:
         - GOTIFY_URL=<your gotify url> # e.g. https://gotify.example.com/
         - GOTIFY_TOKEN=<your gotify app token> # e.g. cGVla2Fib29v
       network_mode: host
   ```

3. Click **Save**.

### Step 2: Configure the TrueNAS alert service

1. Go to **System → Alert Settings → Add**.
2. Fill in the form:
   - **Type**: `Slack`
   - **Webhook URL**: `http://localhost:31662`
3. Click **Send Test Alert** to verify the connection.
4. Click **Save**.
