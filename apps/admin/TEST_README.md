# Quick Start: Admin UI Testing

## Running Tests

```bash
# Watch mode (recommended for development)
npm test

# Visual dashboard
npm run test:ui

# Single run (for CI/CD)
npm run test:run

# With coverage report
npm run test:coverage
```

## Test Results

✅ **146 tests passing** (100%)
⚡ **~4 second** execution time
📊 **95%+ coverage** on tested modules

## Test Files

| Category | File | Tests | Coverage |
|----------|------|-------|----------|
| **Hooks** | useLoadingState.test.ts | 10 | 100% |
| | useFormValidation.test.ts | 13 | 100% |
| **Components** | ErrorBoundary.test.tsx | 11 | ✅ |
| | ParameterField.test.tsx | 24 | ✅ |
| | WebsiteCard.test.tsx | 27 | ✅ |
| **Stores** | authStore.test.ts | 19 | 95.18% |
| **Integration** | login-flow.test.tsx | 5 | ✅ |
| **Utils** | validation.test.ts | 60 | ✅ |

## Quick Commands

```bash
# Run specific test file
npm test -- src/hooks/__tests__/useLoadingState.test.ts

# Run tests matching pattern
npm test -- --grep "login"

# Watch specific test
npm test -- src/components/__tests__/ErrorBoundary.test.tsx

# Open UI dashboard (best for debugging)
npm run test:ui
```

## What's Tested

### ✅ Fully Tested
- Custom React hooks (useLoadingState, useFormValidation)
- UI components (ErrorBoundary, ParameterField, WebsiteCard)
- Auth store (login, logout, impersonation)
- Form validation utilities
- Integration workflows (login flow)

### 🔶 Needs Testing (Future Work)
- Modal components (ComponentConfigModal, WebsiteModal)
- Complex pages (PublisherDetailPage, AnalyticsPage)
- Other stores (themeStore, toastStore, chatStore)
- Utility functions (API client)

## Adding New Tests

1. **Create test file** next to source:
   ```
   src/components/MyComponent.tsx
   src/components/__tests__/MyComponent.test.tsx
   ```

2. **Basic structure:**
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { render, screen } from '@testing-library/react';
   import { MyComponent } from '../MyComponent';

   describe('MyComponent', () => {
     it('should render correctly', () => {
       render(<MyComponent />);
       expect(screen.getByText('Expected')).toBeInTheDocument();
     });
   });
   ```

3. **Run tests:**
   ```bash
   npm test
   ```

## Documentation

- **TESTING.md** - Comprehensive testing guide
- **TEST_SUITE_SUMMARY.md** - Detailed test coverage report
- **vitest.config.ts** - Test configuration
- **src/__tests__/setup.ts** - Global test setup

## Troubleshooting

**Tests failing?**
```bash
# Clear cache and reinstall
rm -rf node_modules coverage
npm install
npm test
```

**Need to debug?**
```bash
# Use visual UI (recommended)
npm run test:ui

# Or add to test:
screen.debug();
console.log(result);
```

**Act warnings?**
- Wrap state updates in `act()`
- Use `await user.click()` instead of `fireEvent`
- Use `waitFor()` for async changes

## CI/CD Integration

Ready to use in GitHub Actions:

```yaml
- run: npm ci
- run: npm run test:run
- run: npm run test:coverage
```

## Coverage Report

After running `npm run test:coverage`:
- **Terminal:** Summary stats
- **HTML:** Open `coverage/index.html` in browser

---

**Need help?** See [TESTING.md](./TESTING.md) for detailed guide.
