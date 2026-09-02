# recon

Evidence behind the numbers in `../see.md`. Reads BSC mainnet over public RPC, no keys.

```bash
python3 audit.py      # samples 300 random agents: dedup, endpoints, reputation, categories
```

- `keccak.py` — pure-python keccak-256 (selectors/topics), no deps
- `audit.py`  — the sample. `random.seed(11)`, so it reproduces exactly.

Contracts read (BSC mainnet):
- IdentityRegistry   `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- ReputationRegistry `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`

Max agent id (329,359 as of Sep 2 2026) was found by binary search on `ownerOf(id)`.
