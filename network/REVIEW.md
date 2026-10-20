# Self-Review Artefact: Endorsement & Validation Parameters in `network/`

This file documents every line setting endorsement/validation parameters in `network/`. Each line includes a ≤10-word justification.

| File:Line | Parameter / Configuration | 10-Word Justification |
|---|---|---|
| `network/configtx.yaml:81` | `LifecycleEndorsement: MAJORITY Endorsement` | Ensures majority approval across consortium for chaincode definition changes. |
| `network/configtx.yaml:83` | `Endorsement: MAJORITY Endorsement` | Default channel policy requires majority of member org peer endorsements. |
| `network/collections.json:2` | `policy: OR('RegAMSP.member','BankA1MSP.member','AuditorMSP.member')` | Restricts INR A1 private data to RegA, BankA1, Auditor. |
| `network/collections.json:3` | `endorsementPolicy: OR('RegAMSP.member','BankA1MSP.member','AuditorMSP.member')` | Allows payee peer to endorse private credit writes independently. |
| `network/collections.json:6` | `policy: OR('RegAMSP.member','BankB1MSP.member','AuditorMSP.member')` | Restricts INR B1 private data to RegA, BankB1, Auditor. |
| `network/collections.json:7` | `endorsementPolicy: OR('RegAMSP.member','BankB1MSP.member','AuditorMSP.member')` | Allows payee peer to endorse private credit writes independently. |
| `network/collections.json:10` | `policy: OR('RegBMSP.member','BankA1MSP.member','AuditorMSP.member')` | Restricts SGD A1 private data to RegB, BankA1, Auditor. |
| `network/collections.json:11` | `endorsementPolicy: OR('RegBMSP.member','BankA1MSP.member','AuditorMSP.member')` | Allows payee peer to endorse private credit writes independently. |
| `network/collections.json:14` | `policy: OR('RegBMSP.member','BankB1MSP.member','AuditorMSP.member')` | Restricts SGD B1 private data to RegB, BankB1, Auditor. |
| `network/collections.json:15` | `endorsementPolicy: OR('RegBMSP.member','BankB1MSP.member','AuditorMSP.member')` | Allows payee peer to endorse private credit writes independently. |
| `network/scripts/deploy-cc.sh:86` | `SIGNATURE_POLICY="OR('RegAMSP.peer','RegBMSP.peer','BankA1MSP.peer','BankB1MSP.peer','AuditorMSP.peer')"` | Chaincode signature policy permits single-org endorsement per SPEC §4. |
| `network/scripts/deploy-cc.sh:107` | `--collections-config /work/collections.json` | Binds private collections configuration to the committed chaincode definition. |

## Wallet Identity Mapping (`network/scripts/setup-wallets.sh`)

Mapping from cryptogen generated user certificates to `docs/API.md §1` identity names:

| Cryptogen Source User | Target Org | Target Identity (`WALLET_DIR/<identity>/`) | Justification |
|---|---|---|---|
| `User1@rega.consortium.local` | `rega` | `rega-operator` | RegA primary operator identity per API.md §1. |
| `User2@rega.consortium.local` | `rega` | `rega-approver` | RegA second approver identity for dual-control signatures. |
| `User1@regb.consortium.local` | `regb` | `regb-operator` | RegB primary operator identity per API.md §1. |
| `User2@regb.consortium.local` | `regb` | `regb-approver` | RegB second approver identity for dual-control signatures. |
| `User1@banka1.consortium.local` | `banka1` | `a1-trader` | BankA1 primary trader identity per API.md §1. |
| `User2@banka1.consortium.local` | `banka1` | `a1-approver` | BankA1 second approver identity per API.md §1. |
| `User1@bankb1.consortium.local` | `bankb1` | `b1-trader` | BankB1 primary trader identity per API.md §1. |
| `User2@bankb1.consortium.local` | `bankb1` | `b1-approver` | BankB1 second approver identity per API.md §1. |
| `User1@auditor.consortium.local` | `auditor` | `aud-reader` | Auditor read-only audit identity per API.md §1. |
