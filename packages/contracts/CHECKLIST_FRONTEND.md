# Frontend Updates Checklist

## Contract Address Updates

- [ ] Update `apps/web/lib/contracts/addresses.ts`
  - [ ] Update `THE_CELLAR` address (CellarHook proxy)
  - [ ] Update `CELLAR_ZAP` address (CellarZapV4 proxy)
  - [ ] Update `FEE_RECIPIENT` if it points to CellarHook

## Contract Registry Updates

- [ ] Update `apps/web/lib/contracts/registry.ts`
  - [ ] Update `THECELLAR` config with proxy address
  - [ ] Update `THECELLAR` config with proxy type: 'UUPS'
  - [ ] Update `THECELLAR` config with implementation address
  - [ ] Update `CELLAR_ZAP` config with proxy address
  - [ ] Update `CELLAR_ZAP` config with proxy type: 'UUPS'
  - [ ] Update `CELLAR_ZAP` config with implementation address
  - [ ] Verify all required functions are in ABI

## Service File Updates

- [ ] Review `apps/web/lib/services/theCellarService.ts`
  - [ ] Verify `getCellarState()` uses correct contract address
  - [ ] Verify `potBalance` read still works (should work the same)
  - [ ] Test that service functions correctly with proxy

- [ ] Review `apps/web/lib/services/rpgService.ts`
  - [ ] Verify any CellarHook references are updated
  - [ ] Check if treasury address needs updating

- [ ] Review `apps/web/lib/services/tavernKeeperService.ts`
  - [ ] Verify treasury address references
  - [ ] Test that fee splitting still works

## Component Updates

- [ ] Review `apps/web/components/TheOfficeView.tsx`
  - [ ] Verify cellar state display works
  - [ ] Test that pot size displays correctly

- [ ] Review `apps/web/components/TheCellarView.tsx`
  - [ ] Verify all contract interactions work
  - [ ] Test raid functionality

- [ ] Review any other components that reference CellarHook or CellarZapV4
  - [ ] Search codebase for `THE_CELLAR` references
  - [ ] Search codebase for `CELLAR_ZAP` references
  - [ ] Update all hardcoded addresses if any

## Environment Variables

- [ ] Check if any `.env` files need updating
- [ ] Verify `NEXT_PUBLIC_` prefixed variables if any
- [ ] Update any deployment-related env vars

## Testing

- [ ] Test frontend loads without errors
- [ ] Test contract reads work (potBalance, prices, etc.)
- [ ] Test contract writes work (raid, mintLP, etc.)
- [ ] Test that UI displays correct data
- [ ] Test that transactions execute successfully
- [ ] Verify no console errors

## Build Verification

- [ ] Run `npm run build` or `pnpm build`
- [ ] Verify no TypeScript errors
- [ ] Verify no build warnings related to contracts
- [ ] Test production build locally

## Notes

- All contract addresses should point to proxy addresses, not implementation addresses
- The contract registry should reflect proxy type and implementation address
- Service files should work the same way - proxy forwards calls to implementation
