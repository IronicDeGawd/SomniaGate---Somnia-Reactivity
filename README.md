# SomniaGate

Universal on-chain payment gate for the Somnia blockchain. Creators set a price, embed one line of code, and users pay directly from their wallet. No accounts, no credit cards, no middlemen. 95% goes to the creator.

Built for the **Somnia Reactivity Hackathon** — showcasing real-time event-driven payment confirmation via Somnia's native Reactivity protocol.

## How It Works

```
Creator registers gate (contentId + price)
        │
User visits page → sees locked content
        │
User pays STT from wallet
        │
PayGate emits AccessGranted event
        │
Somnia Reactivity pushes event to GateSplitter handler (~100ms)
        │
GateSplitter emits PaymentConfirmed → widget unlocks content instantly
```

The key innovation is **Somnia Reactivity**: validators detect the `AccessGranted` event on-chain and push a callback to the `GateSplitter` handler contract. No polling, no webhooks — the content unlocks in real-time via `somnia_watch` WebSocket subscription.

## Architecture

```
SomniaGate/
├── contracts/          Solidity smart contracts
│   ├── PayGate.sol         Payment gate (create, unlock, withdraw, 95/5 split)
│   └── GateSplitter.sol    Reactivity handler (watches AccessGranted, emits PaymentConfirmed)
├── dashboard/          React SPA (Vite + Tailwind)
│   └── src/
│       ├── pages/          Landing, Dashboard, Demo, GatePage, Docs
│       ├── components/     UI components (Positivus design system)
│       ├── store/          Zustand auth state
│       └── lib/            Contract helpers, wallet utils
├── widget/             Embeddable IIFE script
│   └── src/index.ts        Drop-in payment overlay for any website
└── scripts/            Deployment, testing, and demo utilities
```

## Deployed Contracts (Somnia Testnet)

| Contract | Address |
|---|---|
| PayGate | [`0x87300fb8ae589141271f8840439288f6603fe1f6`](https://shannon-explorer.somnia.network/address/0x87300fb8ae589141271f8840439288f6603fe1f6) |
| GateSplitter | [`0xec5ce4acd506db15ed71175e47e5afd5e0bbf765`](https://shannon-explorer.somnia.network/address/0xec5ce4acd506db15ed71175e47e5afd5e0bbf765) |
| Reactivity Subscription | #26135 (`isGuaranteed: true`) |

Network: Somnia Testnet (Chain ID 50312) · RPC: `https://dream-rpc.somnia.network`

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm
- A wallet with STT on Somnia testnet ([get free STT](https://testnet.somnia.network))

### Setup

```bash
git clone <repo-url> && cd SomniaGate
pnpm install
cp .env.example .env
# Add your PRIVATE_KEY to .env
```

### Deploy Contracts

```bash
pnpm deploy
```

This compiles and deploys PayGate + GateSplitter, funds the handler with 33 STT, and creates a Reactivity subscription. Deployed addresses are printed — add them to `.env`.

### Run Dashboard

```bash
pnpm dev:dashboard
```

Open `http://localhost:5173`. Navigate to `/demo` to try the live payment flow.

### Build Widget

```bash
pnpm build:widget
```

Outputs `widget/dist/embed.js` — a self-contained IIFE for embedding on any website.

### Run Tests

```bash
npx tsx scripts/test-e2e.ts
```

23 test cases covering the full PayGate lifecycle on Somnia testnet.

## Widget Embed

Drop this on any HTML page:

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
| `data-somniagate` | yes | PayGate contract address |
| `data-content` | yes | Content identifier (encoded as bytes32) |
| `data-price` | yes | Price in STT |
| `data-theme` | no | `light` or `dark` |
| `data-label` | no | Custom button text |

The widget handles wallet connection, network switching, payment, and content reveal automatically.

## Smart Contracts

### PayGate

The core payment gate contract. Creators register content with a price, users pay to unlock.

| Function | Description |
|---|---|
| `createGate(bytes32 contentId, uint256 price)` | Register new gated content |
| `unlock(bytes32 contentId)` | Pay to access (sends STT) |
| `withdraw()` | Creator pulls accumulated revenue |
| `withdrawPlatform()` | Platform pulls 5% fees |
| `updateGate(bytes32 contentId, uint256 newPrice, bool active)` | Modify gate |
| `checkAccess(bytes32 contentId, address user)` | Check if user has access |
| `getGate(bytes32 contentId)` | Get gate details |

Security: reentrancy guard, CEI pattern, pull-based withdrawals, platform fee accumulator.

### GateSplitter (Reactivity Handler)

Inherits `SomniaEventHandler`. Validators call `onEvent()` when `AccessGranted` is emitted by PayGate. The handler validates the emitter, decodes topics, increments `confirmationCount`, and emits `PaymentConfirmed`.

```solidity
function _onEvent(address emitter, bytes32[] calldata eventTopics, bytes calldata data)
```

Funded with 33+ STT so validators can invoke it. The `receive()` function accepts STT deposits.

## Reactivity Integration

SomniaGate uses two layers of Reactivity:

### On-Chain (Solidity Subscription)

```javascript
sdk.createSoliditySubscription({
  handlerContractAddress: splitterAddress,
  eventTopics: [keccak256('AccessGranted(bytes32,address,uint256,address)')],
  emitter: payGateAddress,
  priorityFeePerGas: parseGwei('10'),
  maxFeePerGas: parseGwei('20'),
  gasLimit: 3_000_000n,
  isGuaranteed: true,    // Required for delivery on testnet
  isCoalesced: false,
})
```

When PayGate emits `AccessGranted`, validators invoke `GateSplitter._onEvent()` which emits `PaymentConfirmed`.

### Off-Chain (WebSocket Push)

The demo page uses Somnia's `somnia_watch` WebSocket protocol to receive `PaymentConfirmed` events in the browser in real-time:

```javascript
const ws = new WebSocket('wss://dream-rpc.somnia.network/ws')
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

No polling — the event is pushed to the browser the moment the handler fires.

### Key Parameters

| Parameter | Value | Why |
|---|---|---|
| `isGuaranteed` | `true` | **Required** — `false` subscriptions are silently never delivered on testnet |
| `priorityFeePerGas` | 10 gwei | Matches working subscriptions observed on-chain |
| `maxFeePerGas` | 20 gwei | Upper bound for fee bidding |
| `gasLimit` | 3,000,000 | Sufficient for handler execution + event emission |
| Handler balance | 33+ STT | Minimum 32 STT required for validator invocation |

## Dashboard Pages

| Route | Description |
|---|---|
| `/` | Landing page with hero, how-it-works, features, and component showcase |
| `/demo` | **Interactive demo** — live unlock with Reactivity WebSocket timeline |
| `/dashboard` | Creator dashboard — register, create gates, view embed code, track revenue |
| `/g/:id` | Public gate page — fetches real price from contract, unlock flow |
| `/docs` | Documentation with sticky sidebar navigation |

## Environment Variables

```env
PRIVATE_KEY=0x...          # Deployer wallet (must have STT)
PAYGATE_ADDRESS=0x...      # Set after deploy
SPLITTER_ADDRESS=0x...     # Set after deploy
PLATFORM_ADDRESS=0x...     # Optional: fee recipient (defaults to deployer)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Somnia Testnet (EVM L1, chain ID 50312) |
| Contracts | Solidity 0.8.30, compiled with solc |
| Reactivity | `@somnia-chain/reactivity` SDK + `somnia_watch` WebSocket |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| State | Zustand with localStorage persistence |
| Animation | Framer Motion |
| Wallet | Raw EIP-1193 (no wagmi — zero-dependency wallet connect) |
| Widget | Vanilla TypeScript IIFE (Vite build, no runtime deps) |

## License

MIT
