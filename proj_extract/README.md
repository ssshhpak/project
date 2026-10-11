# On-chain Voting (Anchor 0.29 + React)

Прототип голосования на Solana: один кошелёк, один голос.

## Структура
```
programs/voting/src/
  lib.rs               точка входа, 3 инструкции
  state.rs             Poll, VoteRecord (+ InitSpace)
  errors.rs            VotingError
  instructions/        create_poll, vote, close_poll
tests/voting.ts        7 тестов (mocha + chai)
client/client.ts       CLI-демо:  anchor run client
app/                   React + Vite + wallet-adapter (Phantom)
```

## PDA
- `Poll`:       seeds `["poll", authority, poll_id (u64 LE)]`
- `VoteRecord`: seeds `["vote", poll, voter]` — `init` падает, если аккаунт уже есть, поэтому повторный голос невозможен.

## Запуск
```bash
yarn install            # или npm install
anchor keys sync        # подставит реальный program id в lib.rs и Anchor.toml
anchor test             # поднимет локальный валидатор и прогонит тесты
```

## Devnet + фронтенд
```bash
solana config set --url devnet && solana airdrop 2
anchor build && anchor deploy --provider.cluster devnet
cd app
npm install
npm run sync-idl        # копирует target/idl и target/types в app/src/idl
VITE_PROGRAM_ID=<ваш id> npm run dev
```
Для localnet: `VITE_RPC_URL=http://127.0.0.1:8899`.
