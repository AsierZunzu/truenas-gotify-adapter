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
| `LISTEN_HOST`  | Address to listen on (optional, defaults to `127.0.0.1`) | `0.0.0.0` |
| `VERIFY_CERT`  | Set to `false` to accept self-signed Gotify certificates (optional, insecure) | `false` |

The adapter listens on port `31662`.

## Installation

### Step 1: Deploy the adapter

Choose **one** of the following options.

#### Option A: Custom App (UI)

1. Go to **Apps → Discover Apps → Custom App**.
2. Fill in the form:
   - **Application Name**: e.g. `truenas-gotify`
   - **Image Repository**: `ghcr.io/asierzunzu/truenas-gotify-adapter`
   - **Image Tag**: `2` (see [Versions](#versions))
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
       image: ghcr.io/asierzunzu/truenas-gotify-adapter:2
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

## Versions

Releases follow [semantic versioning](https://semver.org/) and are listed on the [releases page](https://github.com/AsierZunzu/truenas-gotify-adapter/releases). Each release publishes several image tags:

| Tag      | Updates to                                         |
| -------- | -------------------------------------------------- |
| `2`      | the latest `2.x.y` release (recommended)           |
| `2.0`    | the latest `2.0.y` release                         |
| `2.0.0`  | nothing, pinned to that exact release              |
| `latest` | the latest release, including breaking changes     |
| `main`   | the latest commit, unreleased                      |

TrueNAS does not update Custom Apps automatically when a new image is published for their tag. The running version is printed in the app logs on startup.

## Development

Requires Node.js 26 or later. The TypeScript sources run directly on Node, no build step needed.

```sh
npm install        # type definitions and the TypeScript compiler
npm run typecheck
npm test
GOTIFY_URL=https://gotify.example.com/ GOTIFY_TOKEN=cGVla2Fib29v npm start
```

### Releasing

```sh
npm version 1.2.3 --no-git-tag-version   # bump package.json and package-lock.json
git commit -am "Release 1.2.3"
git tag v1.2.3
git push origin main v1.2.3
```

The tag must match the `package.json` version. CI then publishes the image tags above and creates a GitHub release with generated notes.
