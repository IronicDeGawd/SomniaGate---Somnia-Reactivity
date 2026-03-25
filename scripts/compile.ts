/**
 * Compile Solidity contracts using solc with import resolution
 * for @somnia-chain and @openzeppelin packages.
 */

import solc from 'solc';
import * as fs from 'fs';
import * as path from 'path';

import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

function resolveImport(importPath: string): { contents: string } | { error: string } {
  // Try node_modules resolution walking up from project root
  let dir = PROJECT_ROOT;
  while (true) {
    const candidate = path.join(dir, 'node_modules', importPath);
    if (fs.existsSync(candidate)) {
      return { contents: fs.readFileSync(candidate, 'utf-8') };
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // Try relative to contracts/
  const contractPath = path.join(PROJECT_ROOT, 'contracts', importPath);
  if (fs.existsSync(contractPath)) {
    return { contents: fs.readFileSync(contractPath, 'utf-8') };
  }

  return { error: `File not found: ${importPath}` };
}

export function compileSolidity(
  contractName: string,
  source: string
): { abi: any[]; bytecode: string } {
  const input = JSON.stringify({
    language: 'Solidity',
    sources: { [`${contractName}.sol`]: { content: source } },
    settings: {
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
      optimizer: { enabled: true, runs: 200 },
    },
  });

  const output = JSON.parse(
    solc.compile(input, { import: (p: string) => resolveImport(p) })
  );

  if (output.errors?.some((e: any) => e.severity === 'error')) {
    const errors = output.errors.filter((e: any) => e.severity === 'error');
    throw new Error(`Compilation failed:\n${errors.map((e: any) => e.formattedMessage).join('\n')}`);
  }

  const contract = output.contracts[`${contractName}.sol`][contractName];
  return {
    abi: contract.abi,
    bytecode: '0x' + contract.evm.bytecode.object,
  };
}

export function compileFromFile(contractName: string): { abi: any[]; bytecode: string } {
  const source = fs.readFileSync(
    path.join(PROJECT_ROOT, 'contracts', `${contractName}.sol`),
    'utf-8'
  );
  return compileSolidity(contractName, source);
}
