# SomniaGate

> Universal on-chain payment gate powered by Somnia Reactivity

**Live App:** https://somniagate.somniaforge.com
**Video Demo:** https://youtu.be/8dLIairu6CM
**Network:** Somnia Testnet (Chain ID 50312)

---

## Problem

Traditional paywalls require a backend server, a payment processor (Stripe, PayPal), monthly fees, and days of integration. They take 15–30% in fees. They don't work on static sites, GitHub Pages, or OBS overlays. And they need constant uptime to verify payments.

## Solution

SomniaGate is two smart contracts and one script tag. Creators register content with a price. Users pay STT from their wallet. Somnia Reactivity pushes a real-time confirmation to the handler contract — no polling, no webhooks, no server. 95% of every payment goes directly to the creator.

**Works everywhere HTML works:** static sites, WordPress, React, Next.js, GitHub Pages, OBS browser sources.

---

## How Reactivity Is Used

This is the core of the project. Without Reactivity, the widget would need to poll the RPC every second asking "did the payment go through?" With Reactivity, the answer is **pushed** the moment it happens.

```
User pays STT → PayGate.unlock()
                    ↓
              AccessGranted event emitted on-chain
                    ↓
              Somnia validators detect the event
                    ↓
              Validators invoke GateSplitter._onEvent()     ← Reactivity
                    ↓
              PaymentConfirmed event emitted by handler
                    ↓
              Browser receives via somnia_watch WebSocket    ← Reactivity
                    ↓
              Widget reveals content instantly
```

### On-Chain Layer (Solidity Subscription)

The GateSplitter contract inherits `SomniaEventHandler` from `@somnia-chain/reactivity-contracts`. During deployment, we call `createSoliditySubscription()` on the Reactivity precompile at `0x0100`:

```javascript
sdk.createSoliditySubscription({
  handlerContractAddress: splitterAddress,
  eventTopics: [keccak256('AccessGranted(bytes32,address,uint256,address)')],
  emitter: payGateAddress,
  priorityFeePerGas: parseGwei('10'),
  maxFeePerGas: parseGwei('20'),
  gasLimit: 3_000_000n,
  isGuaranteed: true,
  isCoalesced: false,
})
```

From this point, whenever PayGate emits `AccessGranted`, validators call `GateSplitter.onEvent()` automatically. The handler verifies the emitter, decodes the event data, increments a confirmation counter, and emits `PaymentConfirmed`.

### Off-Chain Layer (WebSocket Push)

The demo page subscribes to `PaymentConfirmed` events using Somnia's native `somnia_watch` WebSocket protocol — the same protocol the `@somnia-chain/reactivity` SDK uses internally:

```javascript
ws.send(JSON.stringify({
  jsonrpc: '2.0', id: 1,
  method: 'eth_subscribe',
  params: ['somnia_watch', {
    address: [splitterAddress],
    topics: [paymentConfirmedTopic],
    eth_calls: [],
    push_changes_only: false,
  }]
}))
```

Events are pushed to the browser in real-time. The demo page shows a live timeline with measured delivery latency (~4–5s on testnet).

### Key Discovery

During development, we found that `isGuaranteed: true` is **required** for on-chain delivery on testnet. Subscriptions with `isGuaranteed: false` are silently never delivered. This was discovered by comparing ~500 subscriptions across the testnet — every working custom-emitter subscription uses `isGuaranteed: true`.

---

## Architecture

```
┌─────────────────────────────┐
│  Widget (embed.js)          │  Drop-in IIFE for any website (~20KB)
│  Zero runtime dependencies  │  Handles wallet, payment, reveal
└──────────────┬──────────────┘
               │ EIP-1193 (MetaMask)
┌──────────────▼──────────────┐
│  Dashboard (React + Vite)   │  Creator portal, demo page, docs
│  Tailwind · Zustand · SIWE  │  somnia_watch WebSocket for live events
└──────────────┬──────────────┘
               │ RPC / WebSocket
┌──────────────▼──────────────┐
│  PayGate.sol                │  Payment logic: create, unlock, withdraw
│  95/5 split · pull pattern  │  Emits AccessGranted
├─────────────────────────────┤
│  GateSplitter.sol           │  Reactivity handler: confirms payments
│  SomniaEventHandler         │  Invoked by validators, emits PaymentConfirmed
└──────────────┬──────────────┘
               │ Reactivity precompile (0x0100)
┌──────────────▼──────────────┐
│  Somnia Testnet             │  Validators push events to handlers
│  Chain ID 50312             │  Sub-second finality, 1M TPS
└─────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Solidity 0.8.30 — PayGate (payment logic) + GateSplitter (Reactivity handler) |
| Reactivity SDK | `@somnia-chain/reactivity` v0.1.10 + `@somnia-chain/reactivity-contracts` v0.1.6 |
| Dashboard | React 18, Vite, TypeScript, Tailwind CSS, Framer Motion, Zustand |
| Widget | Vanilla TypeScript compiled to IIFE via Vite — zero runtime dependencies |
| Wallet Integration | Raw EIP-1193 provider (no wagmi/rainbowkit) |
| Compilation | solc 0.8.30 with custom import resolution for pnpm |

---

## Smart Contracts

### PayGate

| Function | Description |
|---|---|
| `createGate(bytes32 contentId, uint256 price)` | Register gated content with a price in STT |
| `unlock(bytes32 contentId) payable` | Pay to unlock — emits `AccessGranted` |
| `checkAccess(bytes32 contentId, address user) view` | Check if a user has permanent access |
| `withdraw()` | Creator pulls accumulated 95% revenue |
| `withdrawPlatform()` | Platform pulls accumulated 5% fees |
| `updateGate(bytes32 contentId, uint256 newPrice, bool active)` | Modify price or deactivate |
| `getGate(bytes32 contentId) view` | Returns creator, price, active, totalRevenue, unlockCount |

**Security:** Reentrancy guard on all state-changing functions. Checks-Effects-Interactions pattern. Pull-based withdrawals (no direct ETH transfers during unlock). Platform fee uses accumulator pattern to prevent bricking.

### GateSplitter (Reactivity Handler)

Inherits `SomniaEventHandler`. Validators call `onEvent()` when PayGate emits `AccessGranted`.

- Validates emitter is the registered PayGate address
- Validates topic array length before accessing indexed params
- Decodes contentId, user, creator from topics; amount from data
- Increments `confirmationCount` (on-chain proof of Reactivity delivery)
- Emits `PaymentConfirmed(contentId, user, amount, creator)`
- Includes `receive() external payable` to accept STT funding (33+ STT required)

---

## Widget

Embeddable on any HTML page with one script tag:

```html
<div data-somniagate="0x87300fb8ae589141271f8840439288f6603fe1f6"
     data-content="my-article"
     data-price="2"
     data-theme="dark">
  <p>Your premium content here...</p>
</div>
<script src="embed.js"></script>
```

| Attribute | Required | Description |
|---|---|---|
| `data-somniagate` | Yes | PayGate contract address |
| `data-content` | Yes | Content identifier (encoded as bytes32) |
| `data-price` | Yes | Price in STT |
| `data-label` | No | Custom button text |
| `data-theme` | No | `light` or `dark` |

The widget auto-discovers all `[data-somniagate]` elements, checks on-chain access, and renders a payment overlay. Handles wallet connection, Somnia network switching, transaction submission, receipt polling, and content reveal.

---

## Dashboard

| Route | Description |
|---|---|
| `/` | Landing page — hero, features, how-it-works |
| `/demo` | **Interactive demo** — live unlock with Reactivity WebSocket timeline showing delivery latency |
| `/dashboard` | Creator portal — register, create gates, view embed code, track revenue |
| `/g/:id` | Public gate page — fetches real price from contract, full unlock flow |
| `/docs` | Documentation with sticky sidebar |

---

## Deployed Contracts

| Contract | Address | Explorer |
|---|---|---|
| PayGate | `0x87300fb8ae589141271f8840439288f6603fe1f6` | [View](https://shannon-explorer.somnia.network/address/0x87300fb8ae589141271f8840439288f6603fe1f6) |
| GateSplitter | `0xec5ce4acd506db15ed71175e47e5afd5e0bbf765` | [View](https://shannon-explorer.somnia.network/address/0xec5ce4acd506db15ed71175e47e5afd5e0bbf765) |
| Reactivity Subscription | #26135 (`isGuaranteed: true`, `gasLimit: 3M`, `priorityFee: 10 gwei`) | — |

---

## Setup & Run

```bash
git clone <repo-url> && cd SomniaGate
pnpm install
cp .env.example .env   # Add PRIVATE_KEY (funded with STT)

pnpm deploy            # Deploy contracts + fund handler + create Reactivity subscription
pnpm dev:dashboard     # Dashboard at localhost:5173
pnpm build:widget      # Build embed.js
```

## Tests

```bash
npx tsx scripts/test-e2e.ts    # 23/23 passing on Somnia testnet
```

Covers: gate creation, unlock, access verification, revenue tracking, withdrawal, double-unlock prevention, underpayment revert, overpayment refund, gate deactivation, platform withdrawal.

---

## License

MIT
