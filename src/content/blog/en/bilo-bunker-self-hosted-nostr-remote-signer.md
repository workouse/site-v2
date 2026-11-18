---
title: "Introducing Bilo Bunker: Sovereign Nostr Remote Signing (NIP-46) Done Right"
description: "Why pasting your nsec into web apps is a critical security vulnerability, how NIP-46 remote signers establish a zero-trust boundary, and why we built Bilo Bunker—a modern, multi-tenant self-hosted signer with Auto-SSL and real-time audit logs."
pubDate: 2026-08-17
author: "Emre Yılmaz"
lang: "en"
tags: ["Nostr", "NIP-46", "Cryptography", "Security", "Open Source", "Self Hosting", "Docker", "TypeScript"]
draft: false
---

In the open, decentralized world of **Nostr**, your private key (`nsec`) is not just a password—**it is your entire identity, your sovereign reputation, and your cryptographic signature.**

Yet, the most common way newcomers and developers interact with Nostr clients is also the most hazardous: **copy-pasting their raw `nsec` directly into web browsers, desktop apps, and mobile clients.**

To solve this critical key management dilemma, the Nostr community created **NIP-46 (Nostr Connect / Remote Signers)**. Today, we are excited to introduce [**Bilo Bunker**](https://github.com/workouse/bilo-bunker), an open-source, multi-tenant, zero-friction NIP-46 remote signing service and management dashboard designed to make self-hosted key security accessible to everyone.

---

## 1. Nostr 101: Identity Built on Cryptography, Not Gatekeepers

Before diving into remote signing, let’s revisit the core architecture that makes Nostr (*Notes and Other Systems Transmitted by Relays*) revolutionary:

1. **Cryptographic Keypairs as Identity**:
   - **`npub` (Public Key)**: Your public identifier that anyone can follow, mention, or verify.
   - **`nsec` (Private Key / Secret Key)**: A 32-byte Schnorr private key that signs every note, direct message, reaction, profile update, and zap event.
2. **Dumb WebSocket Relays**:
   - Relays are simple message routers. They don't validate your account credentials or maintain session cookies; they simply accept cryptographically signed JSON events and forward them to subscribed clients.
3. **Censorship Resistance & Data Portability**:
   - If a relay operator blocks you, your identity remains completely untouched. You simply connect your client to any other relay in the world, and your followers find your cryptographically signed events.

| Component | Web2 Centralized Networks | Nostr Protocol Model |
| :--- | :--- | :--- |
| **Account Identity** | Username / Password stored in centralized DB | Public keypair (`npub` / `nsec`) |
| **Message Routing** | Proprietary backend server clusters | Distributed open WebSocket relays |
| **Data Ownership** | Platform owns your graph and content | User cryptographically owns their keys and posts |

However, this absolute sovereignty introduces a massive responsibility: **how do you protect your private key?**

---

## 2. The Key Management Crisis: Why Raw `nsec` Entry Is Broken

In traditional Web2 architectures, if someone compromises your account password, you can click *"Forgot Password"*, verify your email or SMS, revoke active sessions on the server, and regain control.

**In Nostr, there is no server, no customer support, and no "Forgot Password" button.**

If an unauthorized party gains access to your `nsec`:
- They permanently control your identity.
- They can publish defamatory messages in your name with valid cryptographic signatures.
- They can decrypt your past and future private direct messages (NIP-04 and NIP-44).
- They can drain Lightning wallet connections and hijack linked zaps.

### The Threat Vectors of Web Clients & XSS

When you paste your raw `nsec` into a web-based Nostr client, that secret key typically resides in browser memory (`window` object), `localStorage`, or `IndexedDB`:

1. **Cross-Site Scripting (XSS)**: A single XSS flaw in the web client allows arbitrary JavaScript to execute in your session, immediately reading `localStorage` and exfiltrating your plaintext `nsec`.
2. **Compromised NPM Dependencies & CDNs**: Modern web frontends pull hundreds of transitive packages. A single supply-chain compromise in a client dependency can silently harvest pasted keys.
3. **Malicious Browser Extensions**: Rogue extensions with generic DOM read permissions can scrape input fields and storage engines.

### Key Management Solutions Compared

| Method | Security Level | Usability | Attack Surface |
| :--- | :--- | :--- | :--- |
| **Raw `nsec` in Browser** | Extremely Dangerous | High (Simple paste) | Full key exfiltration on XSS or extension exploit |
| **NIP-07 Extension (Alby/nos2x)** | Moderate | Desktop Only | Limited to extension-supporting desktop browsers |
| **NIP-46 Self-Hosted Bunker** | Maximum (Zero-Trust) | Cross-device & Mobile | Master key locked in isolated host; zero web exposure |

---

## 3. The Solution: NIP-46 Remote Signing (Bunkers)

**NIP-46 (Nostr Connect)** redefines the security model by establishing an isolated, zero-trust cryptographic boundary.

Instead of distributing your private key to every client application, your `nsec` remains strictly locked inside an isolated remote server daemon—the **Bunker**.

### How NIP-46 Protocol Signing Works

1. **Handshake**: The client initiates an encrypted connection with the bunker via `bunker://<pubkey>?relay=...&secret=...`.
2. **RPC Request**: When you publish a post, the client sends an encrypted JSON-RPC `sign_event` request over standard Nostr relays.
3. **Policy & Permission Check**: The bunker checks your client permissions (allowed kinds, rate limits, token expiration).
4. **Isolated Signing**: The bunker signs the event using the internal `nsec` and returns only the valid Schnorr signature.
5. **Zero Exposure**: The client application *never* sees or handles your private key.

---

## 4. Policy Engine & Access Control Architecture

Bilo Bunker protects your identity by acting as a strict cryptographic gatekeeper:

- **Granular Method Whitelisting**: Grant client applications access only to the exact RPC methods they need (e.g. allow `sign_event` while blocking `nip04_decrypt` or `get_public_key`).
- **Event Kind Restrictions**: Restrict specific clients to particular event kinds (e.g. allow a microblogging client to sign only Kind 1 short notes, preventing it from signing Kind 0 profile metadata or Kind 4 direct messages).
- **Time-Bound Ephemeral Tokens**: Create temporary access tokens with automatic expiry for new devices, public computers, or test environments.
- **Real-Time Audit Logging**: Inspect every incoming RPC request, timestamp, client public key, and signature status directly from the web dashboard.
- **Instant Revocation**: Revoke any client's access instantly with a single click, immediately cutting off signature capabilities without ever needing to rotate your master key.

---

## 5. The Motivation: Why We Built Bilo Bunker

If NIP-46 is so powerful, why isn't everyone using it?

Until recently, running a self-hosted NIP-46 bunker was unnecessarily complex. Most users faced two bad choices:
1. **Centralized Third-Party Bunkers**: Using hosted cloud signers where someone else manages the bunker server. This creates a custodial honeypot—defeating the entire premise of sovereign identity.
2. **High DevOps Friction**: Existing self-hosted bunker scripts were CLI-heavy, lacked multi-tenant key management, required manual TLS/Certbot proxy configuration, and lacked real-time visibility into signing activities.

### 🎭 The Cultural Backstory: Why "Bilo Bunker"?

In the legendary 1980 Turkish cinema classic ***Banker Bilo*** (directed by Ertem Eğilmez, starring İlyas Salman and Şener Şen), the deceitful Maho promises naive villagers safe passage to Germany, takes their life savings, and dumps them on an empty construction lot in Istanbul claiming *"Here is Munich!"*.

In the decentralized ecosystem, relying on custodial key management providers is the modern equivalent of trusting **Maho**. They promise convenience, but they hold custody of your digital life.

Bilo eventually learned the hard lesson, took charge of his own fate, and built sovereign financial power as **Banker Bilo**. 

With **Bilo Bunker**, you own your signing infrastructure, run your own isolated signing engine, and never have to ask:
> *"Yaptım ama bir sor niye yaptım?"* (*"I did it, but ask me why I did it!"*)

---

## 6. Architecture & Technical Breakdown

[**Bilo Bunker**](https://github.com/workouse/bilo-bunker) was engineered from the ground up as a production-grade, stateful, multi-tenant Nostr remote signing platform.

```text
bilo-bunker/
├── .github/              # CI/CD workflows (Vitest, GHCR Docker publishing)
├── Caddyfile             # Automated TLS Reverse Proxy (Let's Encrypt / ZeroSSL)
├── Dockerfile            # Unified multi-stage production container build
├── docker-compose.yml    # Production orchestration stack
├── Makefile              # Developer shortcuts (blackstart, dev, backup, deploy)
├── packages/
│   ├── app/              # Hono + Node.js backend engine (NIP-46 RPC, tokenized auth, SQLite)
│   └── ui/               # TailAdmin React SPA dashboard (NIP-07 login, live audit logs)
└── scripts/              # Automated installation & deployment scripts
```

### Core Components

#### 1. Backend Application Engine (`packages/app`)
- Built on **Node.js** with **Hono** framework for high-throughput, low-latency performance.
- Direct integration with `nostr-tools` for cryptographic verification, Schnorr signatures, and NIP-46 RPC command negotiation.
- **Multi-Tenant SQLite Persistence (`better-sqlite3`)**: Stores encrypted key stores, client authorizations, secret connection tokens, and audit event streams with ACID guarantees.
- **Tokenized Access & Policy Enforcement**: Enforces granular permissions per connected client and provides instantaneous token revocation.

#### 2. Auto-SSL Reverse Proxy (Caddy 2)
- Built directly into the `docker-compose.yml` stack.
- Provisions and automatically renews HTTPS certificates via Let's Encrypt / ZeroSSL on ports 80 and 443 with zero manual Certbot maintenance.

#### 3. Management Dashboard (`packages/ui`)
- Responsive SPA built with **React** and **TailAdmin**.
- **NIP-07 Master Authentication**: Log in securely to your bunker dashboard using your browser extension without typing passwords.
- **Connection URI & QR Code Generator**: One-click generation of `bunker://` connection strings with customizable secret tokens and relay preferences.
- **Permission Matrix**: Inspect and revoke connected client applications on the fly.
- **Live RPC Audit Stream**: Real-time WebSocket log stream displaying every incoming signature request, method call, and execution timestamp.

---

## 7. Quickstart: Deploying Bilo Bunker in 2 Minutes

Bilo Bunker is designed for instant deployment on any Linux VPS (Ubuntu, Debian, Fedora, Arch).

### Option A: One-Line Automated Installer

Run the single-line deployment script on your remote server:

```bash
curl -fsSL https://raw.githubusercontent.com/workouse/bilo-bunker/main/scripts/install.sh | bash
```

The interactive wizard will:
1. Verify Docker and Docker Compose prerequisites.
2. Prompt for your domain name (e.g., `bunker.yourdomain.com`) and your owner `npub`/pubkey.
3. Automatically configure environment variables and initialize SQLite storage.
4. Launch the Caddy Auto-SSL reverse proxy and Node.js engine.

### Option B: Manual Docker Compose Stack

If you prefer manual control:

```bash
# 1. Clone the repository
git clone https://github.com/workouse/bilo-bunker.git
cd bilo-bunker

# 2. Set up your environment
cp .env.dist .env

# Edit .env to set your DOMAIN and OWNER_PUBKEY
nano .env

# 3. Launch the production stack
docker compose up -d
```

### Environment Configuration Reference

| Variable | Description | Required | Default |
| :--- | :--- | :--- | :--- |
| `DOMAIN` | Public domain name for your bunker (e.g., `bunker.example.com`) | Yes | `localhost` |
| `OWNER_PUBKEY` | 64-character lowercase hex Nostr public key of the administrator | Yes | `""` |
| `CERTBOT_EMAIL` | Contact email for Let's Encrypt / ZeroSSL TLS notifications | Optional | `""` |
| `DEFAULT_RELAYS`| Comma-separated Nostr relays for NIP-46 communication | No | `wss://relay.damus.io,...` |
| `PORT` | Internal Node.js application port | No | `3000` |
| `DB_PATH` | Path to SQLite database file inside container | No | `/data/bunker.db` |
| `LOG_LEVEL` | Application logging verbosity (`debug`, `info`, `warn`, `error`) | No | `info` |

---

## 8. Connecting Your Nostr Clients

Once your Bilo Bunker instance is running:

1. Open your bunker dashboard at `https://bunker.yourdomain.com` and log in via NIP-07.
2. Click **Create Connection URI**. Specify an app name (e.g., *Damus Mobile* or *Coracle Web*).
3. Copy the generated `bunker://` connection string or scan the QR code:
   ```text
   bunker://<bunker_pubkey>?relay=wss://relay.damus.io&secret=3f8a9e...
   ```
4. In your Nostr client:
   - Select **Log in with Nostr Connect / Bunker**.
   - Paste your `bunker://` URI.
5. Your client will immediately pair over encrypted relays, and your private key stays 100% safe on your server.

---

## Summary & What's Next

True decentralization requires not just decentralized protocols, but **sovereign user tooling**. By shifting from raw private key exposure to self-hosted NIP-46 remote signing, you eliminate the single largest attack vector in the Nostr ecosystem.

- ⭐️ **Star & Contribute on GitHub**: [workouse/bilo-bunker](https://github.com/workouse/bilo-bunker)
- 📖 **Read Contribution Guidelines**: Check out the [monorepo architecture](https://github.com/workouse/bilo-bunker/blob/master/CONTRIBUTING.md) and join our open-source development.

---

## Need Custom Decentralized Infrastructure?

At **[Workouse](https://workouse.com)**, we build dependable, high-performance web systems, decentralized protocols, and custom integrations for founders and growing businesses.

[**Talk with our engineering team**](https://workouse.com) to discuss your project.
