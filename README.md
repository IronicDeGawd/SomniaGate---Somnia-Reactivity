# SomniaGate

Universal on-chain payment gate. Creators set a price, embed one script tag, users pay from their wallet. 95% to creator, no backend, no middlemen.

**Live:** [somniagate.somniaforge.com](https://somniagate.somniaforge.com)
**Demo Video:** [youtu.be/8dLIairu6CM](https://youtu.be/8dLIairu6CM)

---

## What It Does

SomniaGate replaces traditional paywalls with two smart contracts. A creator registers content with a price. A user pays STT to unlock. Somnia Reactivity pushes a real-time confirmation to the handler contract — the widget detects this and reveals the content instantly. No server, no payment processor, no monthly fees.

Works on any website: static sites, WordPress, React, Next.js, GitHub Pages, OBS overlays — anywhere HTML works.

---

## How Reactivity Is Used

```
User pays STT → PayGate.unlock()
                    ↓
              AccessGranted event emitted
                    ↓
         Somnia validators detect event (~100ms)
                    ↓
         Validators invoke GateSplitter._onEvent()
                    ↓
              PaymentConfirmed event emitted
                    ↓
         Browser receives via somnia_watch WebSocket push
                    ↓
              Widget reveals content instantly
```

**Two Reactivity layers:**

1. **On-chain subscription** — Validators call `GateSplitter.onEvent()` when PayGate emits `AccessGranted`. Created via `createSoliditySubscription()` on the precompile at `0x0100`.

2. **Off-chain WebSocket** — The demo page subscribes to `PaymentConfirmed` events using Somnia's `somnia_watch` protocol over WebSocket. Events are pushed to the browser in real-time — no polling.

**Without Reactivity**, the widget would poll the RPC every second. With Reactivity, the event is pushed the moment the handler fires.

---

## Architecture

```
Widget (embed.js)              → Drop-in IIFE for any website
Dashboard (React + Vite)       → Creator portal: create gates, view revenue, demo
         ↓ RPC
PayGate (Solidity)             → Payment logic: create, unlock, withdraw (95/5 split)
GateSplitter (Solidity)        → Reactivity handler: confirms payments in real-time
         ↓ Reactivity
Somnia Testnet (ID 50312)      → Validators invoke handler on every payment
```

## Tech Stack

| Layer | Technology |
|---|---|
| Contracts | Solidity 0.8.30 (PayGate + GateSplitter) |
| Reactivity | `@somnia-chain/reactivity` SDK + `somnia_watch` WebSocket |
| Dashboard | React 18, Vite, TypeScript, Tailwind, Framer Motion, Zustand |
| Widget | Vanilla TypeScript IIFE — zero runtime dependencies, ~20KB |
| Wallet | Raw EIP-1193 (no wagmi) |

## Smart Contracts

| Function | Description |
|---|---|
| `createGate(bytes32, uint256)` | Register content with a price |
| `unlock(bytes32)` | Pay STT to access |
| `checkAccess(bytes32, address)` | Check if user has access |
| `withdraw()` | Creator pulls 95% revenue |
| `withdrawPlatform()` | Platform pulls 5% fee |
| `getGate(bytes32)` | Get gate details |

Security: reentrancy guard, CEI pattern, pull-based withdrawals, platform fee accumulator.

---

## Widget Embed

```html
<div data-somniagate="0x87300fb8ae589141271f8840439288f6603fe1f6"
     data-content="my-article"
     data-price="2"
     data-theme="dark">
  <p>Your premium content here...</p>
</div>
<script src="embed.js"></script>
```

Handles wallet connect, network switching, payment, and content reveal automatically.

---

## Dashboard Pages

| Route | What It Does |
|---|---|
| `/` | Landing page |
| `/demo` | **Interactive demo** — live unlock with Reactivity WebSocket timeline |
| `/dashboard` | Creator portal — create gates, view embed code, track revenue |
| `/g/:id` | Public gate page — fetches real price, unlock flow |
| `/docs` | Documentation |

---

## Getting Started

```bash
git clone <repo-url> && cd SomniaGate
pnpm install
cp .env.example .env  # Add PRIVATE_KEY

pnpm deploy           # Deploy contracts + create Reactivity subscription
pnpm dev:dashboard    # Start dashboard at localhost:5173
pnpm build:widget     # Build embed.js
```

## Testing

```bash
npx tsx scripts/test-e2e.ts   # 23/23 passing on Somnia testnet
```

---

## Deployed

| Resource | URL |
|---|---|
| Live App | [somniagate.somniaforge.com](https://somniagate.somniaforge.com) |
| Demo Video | [youtu.be/8dLIairu6CM](https://youtu.be/8dLIairu6CM) |
| PayGate | [`0x87300fb8...fe1f6`](https://shannon-explorer.somnia.network/address/0x87300fb8ae589141271f8840439288f6603fe1f6) |
| GateSplitter | [`0xec5ce4ac...bf765`](https://shannon-explorer.somnia.network/address/0xec5ce4acd506db15ed71175e47e5afd5e0bbf765) |
| Reactivity Sub | #26135 (`isGuaranteed: true`) |
| Network | Somnia Testnet (Chain ID 50312) |
| Faucet | [testnet.somnia.network](https://testnet.somnia.network) |

---

## Key Reactivity Parameters

| Param | Value | Why |
|---|---|---|
| `isGuaranteed` | `true` | Required for delivery on testnet |
| `priorityFeePerGas` | 10 gwei | Matches working subscriptions |
| `gasLimit` | 3,000,000 | Handler execution + event emission |
| Handler balance | 33+ STT | Minimum for validator invocation |

---

## License

MIT
