/**
 * SomniaGate Embed Widget
 *
 * Drop on any page:
 *   <div data-somniagate="0xPayGateAddress"
 *        data-content="my-article"
 *        data-price="2">
 *     <p>Premium content here (will be blurred until unlocked)</p>
 *   </div>
 *   <script src="embed.js"></script>
 */

import { PAYGATE_ABI, SOMNIA_TESTNET } from './abi';

interface GateElement extends HTMLElement {
  dataset: DOMStringMap & {
    somniagate: string;   // PayGate contract address
    content: string;      // Content identifier
    price: string;        // Price in STT
    label?: string;       // Button text override
    theme?: 'light' | 'dark';
  };
}

// ── Minimal ABI encoding (no viem dependency) ──

function keccak256Hex(text: string): string {
  // We'll use the contract address + content string hashed via the browser
  // For simplicity, encode contentId as bytes32 from the string
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  // Simple hash — in production use proper keccak256
  // For now, pad the content string as bytes32
  let hex = '0x';
  for (let i = 0; i < 32; i++) {
    hex += (data[i] || 0).toString(16).padStart(2, '0');
  }
  return hex;
}

function toBytes32(str: string): string {
  if (str.startsWith('0x') && str.length === 66) return str;
  return keccak256Hex(str);
}

function toWei(stt: string): string {
  const [whole = '0', dec = ''] = stt.split('.');
  const padded = dec.padEnd(18, '0').slice(0, 18);
  const value = BigInt(whole) * BigInt(10 ** 18) + BigInt(padded);
  return '0x' + value.toString(16);
}

// Encode function call: unlock(bytes32)
function encodeUnlock(contentId: string): string {
  // Function selector: bytes4(keccak256("unlock(bytes32)"))
  const selector = '0xec9b5b3a'; // keccak256("unlock(bytes32)")
  const param = contentId.slice(2).padEnd(64, '0');
  return selector + param;
}

// Encode view call: checkAccess(bytes32, address)
function encodeCheckAccess(contentId: string, user: string): string {
  const selector = '0x3e1fd0da'; // keccak256("checkAccess(bytes32,address)")
  const p1 = contentId.slice(2).padEnd(64, '0');
  const p2 = user.slice(2).toLowerCase().padStart(64, '0');
  return selector + p1 + p2;
}

// ── Wallet helpers ──

function getProvider(): any {
  const w = window as any;
  return w.ethereum || null;
}

async function ensureSomniaNetwork(provider: any): Promise<void> {
  const chainId = await provider.request({ method: 'eth_chainId' });
  if (chainId === SOMNIA_TESTNET.chainId) return;

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SOMNIA_TESTNET.chainId }],
    });
  } catch (err: any) {
    if (err.code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [SOMNIA_TESTNET],
      });
    } else {
      throw err;
    }
  }
}

// ── Styles ──

const STYLES = `
.sg-overlay {
  position: relative;
  overflow: hidden;
}
.sg-overlay .sg-content {
  filter: blur(8px);
  pointer-events: none;
  user-select: none;
}
.sg-overlay.sg-unlocked .sg-content {
  filter: none;
  pointer-events: auto;
  user-select: auto;
}
.sg-button-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
.sg-unlocked .sg-button-wrap {
  display: none;
}
.sg-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #fe54ff, #a064ff);
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(254, 84, 255, 0.3);
}
.sg-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(254, 84, 255, 0.4);
}
.sg-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
.sg-button svg {
  width: 16px;
  height: 16px;
}
.sg-success {
  background: #00d084;
  box-shadow: 0 4px 15px rgba(0, 208, 132, 0.3);
}
.sg-error {
  color: #e60026;
  font-size: 13px;
  margin-top: 8px;
  text-align: center;
}
`;

const LOCK_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
const CHECK_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`;

// ── Widget init ──

function injectStyles() {
  if (document.getElementById('somniagate-styles')) return;
  const style = document.createElement('style');
  style.id = 'somniagate-styles';
  style.textContent = STYLES;
  document.head.appendChild(style);
}

async function initGate(el: GateElement) {
  const contractAddress = el.dataset.somniagate;
  const contentKey = el.dataset.content;
  const price = el.dataset.price || '1';
  const label = el.dataset.label || `Unlock for ${price} STT`;

  const contentId = toBytes32(contentKey);

  // Wrap existing content
  el.classList.add('sg-overlay');
  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'sg-content';
  while (el.firstChild) {
    contentWrapper.appendChild(el.firstChild);
  }
  el.appendChild(contentWrapper);

  // Create button overlay
  const buttonWrap = document.createElement('div');
  buttonWrap.className = 'sg-button-wrap';

  const btn = document.createElement('button');
  btn.className = 'sg-button';
  btn.innerHTML = `${LOCK_ICON} ${label}`;
  buttonWrap.appendChild(btn);
  el.appendChild(buttonWrap);

  // Check if already unlocked
  const provider = getProvider();
  if (provider) {
    try {
      const accounts = await provider.request({ method: 'eth_accounts' }) as string[];
      if (accounts.length > 0) {
        const callData = encodeCheckAccess(contentId, accounts[0]);
        const result = await provider.request({
          method: 'eth_call',
          params: [{ to: contractAddress, data: callData }, 'latest'],
        });
        // Result is bool — 0x...01 = true
        if (result && result.endsWith('1')) {
          el.classList.add('sg-unlocked');
          btn.className = 'sg-button sg-success';
          btn.innerHTML = `${CHECK_ICON} Unlocked`;
          return;
        }
      }
    } catch { /* not connected yet, show button */ }
  }

  // Click handler
  btn.addEventListener('click', async () => {
    const provider = getProvider();
    if (!provider) {
      showError(el, 'No wallet found. Install MetaMask.');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Connecting...';

    try {
      // Connect
      const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[];
      const userAddress = accounts[0];

      // Switch to Somnia
      btn.textContent = 'Switching network...';
      await ensureSomniaNetwork(provider);

      // Send tx
      btn.textContent = 'Confirm in wallet...';
      const txData = encodeUnlock(contentId);
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: userAddress,
          to: contractAddress,
          data: txData,
          value: toWei(price),
        }],
      });

      // Wait for confirmation
      btn.textContent = 'Confirming...';
      await waitForTx(provider, txHash as string);

      // Unlock!
      el.classList.add('sg-unlocked');
      btn.className = 'sg-button sg-success';
      btn.innerHTML = `${CHECK_ICON} Unlocked!`;
      btn.disabled = false;

    } catch (err: any) {
      btn.disabled = false;
      btn.innerHTML = `${LOCK_ICON} ${label}`;
      if (err.code === 4001) {
        showError(el, 'Transaction cancelled');
      } else {
        showError(el, err.message?.slice(0, 60) || 'Transaction failed');
      }
    }
  });
}

async function waitForTx(provider: any, hash: string): Promise<void> {
  for (let i = 0; i < 60; i++) {
    const receipt = await provider.request({
      method: 'eth_getTransactionReceipt',
      params: [hash],
    });
    if (receipt) {
      if (receipt.status === '0x0') throw new Error('Transaction reverted');
      return;
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error('Transaction timeout');
}

function showError(el: HTMLElement, msg: string) {
  let errEl = el.querySelector('.sg-error') as HTMLElement;
  if (!errEl) {
    errEl = document.createElement('div');
    errEl.className = 'sg-error';
    el.querySelector('.sg-button-wrap')?.appendChild(errEl);
  }
  errEl.textContent = msg;
  setTimeout(() => errEl.remove(), 5000);
}

// ── Auto-init ──

function init() {
  injectStyles();
  const elements = document.querySelectorAll<GateElement>('[data-somniagate]');
  elements.forEach(initGate);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
