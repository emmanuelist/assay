/**
 * Only reads that were verified live against BSC mainnet on Sep 2 2026.
 *
 * Verified to REVERT on these contracts — do not add them back:
 *   IdentityRegistry.totalSupply()          (registry is not enumerable)
 *   ReputationRegistry.getFeedbackCount()
 *   ReputationRegistry.getSummary()
 */

export const IDENTITY_REGISTRY =
  "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as const;

export const REPUTATION_REGISTRY =
  "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63" as const;

/** 26 agents, agent #1 is literally named "Test". Never index this. */
export const DECOY_BRC8004_REGISTRY =
  "0xfA09B3397fAC75424422C4D28b1729E3D4f659D7" as const;

export const identityRegistryAbi = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
] as const;

export const reputationRegistryAbi = [
  {
    type: "function",
    name: "getClients",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ type: "address[]" }],
  },
] as const;
