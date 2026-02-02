# Admin UI Testing Guide

This document provides comprehensive guidance for testing the pbjs_engine Admin UI application.

## Table of Contents

- [Overview](#overview)
- [Test Infrastructure](#test-infrastructure)
- [Running Tests](#running-tests)
- [Test Organization](#test-organization)
- [Writing Tests](#writing-tests)
- [Test Coverage](#test-coverage)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The Admin UI uses a modern testing stack:

- **Vitest** - Fast unit test framework (Vite-native alternative to Jest)
- **React Testing Library** - Component testing utilities
- **jsdom** - Browser environment simulation
- **@testing-library/user-event** - User interaction simulation
- **@testing-library/jest-dom** - Custom matchers for DOM assertions

## Test Infrastructure

### Configuration

**vitest.config.ts** - Main test configuration:
```typescript
{
  test: {
    globals: true,           // Enable global test APIs
    environment: 'jsdom',    // Browser-like environment
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  }
}
```

**src/__tests__/setup.ts** - Global test setup:
- Extends Vitest expect with jest-dom matchers
- Configures automatic cleanup after each test
- Mocks window APIs (matchMedia, localStorage)
- Provides global fetch mock

## Running Tests

### Available Commands

```bash
# Run tests in watch mode (recommended for development)
npm test

# Run tests with UI dashboard
npm run test:ui

# Run tests once (CI/production)
npm run test:run

# Run tests with coverage report
npm run test:coverage
```

### Watch Mode

The default `npm test` runs in watch mode with smart test re-running:
- Only re-runs tests related to changed files
- Provides interactive CLI for filtering tests
- Shows real-time feedback

### UI Mode

`npm run test:ui` opens a browser-based dashboard:
- Visual test exploration
- Detailed test output
- Coverage visualization
- Perfect for debugging

### Coverage Reports

`npm run test:coverage` generates coverage reports in:
- Terminal (text summary)
- `coverage/index.html` (detailed HTML report)
- `coverage/coverage-final.json` (machine-readable)

**Coverage Goals:**
- Statements: >80%
- Branches: >75%
- Functions: >80%
- Lines: >80%

## Test Organization

### Directory Structure

```
apps/admin/src/
├── __tests__/
│   ├── setup.ts                    # Global setup
│   ├── integration/                # Integration tests
│   │   └── login-flow.test.tsx     # Full user flows
│   └── utils/                      # Utility function tests
│       └── validation.test.ts
├── components/
│   └── __tests__/                  # Component tests
│       ├── ErrorBoundary.test.tsx
│       ├── ParameterField.test.tsx
│       └── WebsiteCard.test.tsx
├── hooks/
│   └── __tests__/                  # Hook tests
│       ├── useLoadingState.test.ts
│       └── useFormValidation.test.ts
└── stores/
    └── __tests__/                  # Store tests
        └── authStore.test.ts
```

### Test Types

**1. Unit Tests** - Test individual functions/components in isolation
- Location: Co-located with source files in `__tests__/` folders
- Examples: Hook tests, utility function tests

**2. Component Tests** - Test UI components with user interactions
- Location: `components/__tests__/`
- Examples: ErrorBoundary, ParameterField, WebsiteCard

**3. Integration Tests** - Test multiple components/systems together
- Location: `__tests__/integration/`
- Examples: Login flow, form submission workflows

**4. Store Tests** - Test Zustand state management
- Location: `stores/__tests__/`
- Examples: authStore, themeStore

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('ComponentName', () => {
  beforeEach(() => {
    // Reset state, clear mocks
  });

  it('should render correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText('Expected text')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    render(<ComponentName />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Result')).toBeInTheDocument();
  });
});
```

### Testing Hooks

```typescript
import { renderHook, act } from '@testing-library/react';
import { useCustomHook } from '../useCustomHook';

it('should update state', () => {
  const { result } = renderHook(() => useCustomHook());

  act(() => {
    result.current.update('new value');
  });

  expect(result.current.value).toBe('new value');
});
```

### Testing Components

```typescript
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('should handle form submission', async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();

  render(<Form onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText('Name'), 'John Doe');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(onSubmit).toHaveBeenCalledWith({ name: 'John Doe' });
});
```

### Testing Zustand Stores

```typescript
import { renderHook, act } from '@testing-library/react';
import { useStore } from '../store';

beforeEach(() => {
  // Reset store state
  act(() => {
    useStore.getState().reset();
  });
});

it('should update store state', () => {
  const { result } = renderHook(() => useStore());

  act(() => {
    result.current.setValue(42);
  });

  expect(result.current.value).toBe(42);
});
```

### Mocking API Calls

```typescript
beforeEach(() => {
  global.fetch = vi.fn();
});

it('should fetch data', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: 'test' }),
  });

  // Test code that uses fetch

  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining('/api/endpoint'),
    expect.objectContaining({
      method: 'POST',
    })
  );
});
```

### Testing Async Operations

```typescript
import { waitFor } from '@testing-library/react';

it('should handle async state changes', async () => {
  render(<AsyncComponent />);

  await user.click(screen.getByRole('button', { name: /load/i }));

  await waitFor(() => {
    expect(screen.getByText('Loaded data')).toBeInTheDocument();
  });
});
```

## Common Patterns

### Testing Error States

```typescript
it('should display error message', async () => {
  global.fetch = vi.fn().mockRejectedValue(new Error('API Error'));

  render(<Component />);

  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent('API Error');
  });
});
```

### Testing Loading States

```typescript
it('should show loading indicator', async () => {
  let resolvePromise: () => void;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });

  global.fetch = vi.fn().mockReturnValue(promise);

  render(<Component />);

  await user.click(screen.getByRole('button', { name: /load/i }));

  expect(screen.getByText('Loading...')).toBeInTheDocument();

  await act(async () => {
    resolvePromise!();
    await promise;
  });

  expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
});
```

### Testing Forms

```typescript
it('should validate form inputs', async () => {
  const user = userEvent.setup();

  render(<FormComponent />);

  // Submit without filling required field
  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(screen.getByText('Field is required')).toBeInTheDocument();

  // Fill field and submit
  await user.type(screen.getByLabelText('Email'), 'test@example.com');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(screen.queryByText('Field is required')).not.toBeInTheDocument();
});
```

### Accessibility Testing

```typescript
it('should be accessible', () => {
  render(<Component />);

  // Check for accessible labels
  expect(screen.getByLabelText('Field name')).toBeInTheDocument();

  // Check for ARIA attributes
  const button = screen.getByRole('button', { name: /action/i });
  expect(button).toHaveAttribute('aria-label', 'Expected label');

  // Check for keyboard navigation
  expect(button).not.toHaveAttribute('tabindex', '-1');
});
```

## Test Coverage

### Current Coverage

Run `npm run test:coverage` to see detailed coverage report.

**Covered Areas:**
- ✅ Custom hooks (useLoadingState, useFormValidation)
- ✅ UI components (ErrorBoundary, ParameterField, WebsiteCard)
- ✅ Zustand stores (authStore)
- ✅ Utility functions (validation helpers)
- ✅ Integration flows (login flow)

**Areas Needing Coverage:**
- Modal components (ComponentConfigModal, WebsiteModal)
- Complex pages (PublisherDetailPage, AnalyticsPage)
- Chart components (if using Recharts)
- Routing and navigation

### Improving Coverage

**Priority 1 - Critical Paths:**
1. Authentication and authorization
2. Form submission workflows
3. Data fetching and display
4. Error handling

**Priority 2 - User Interactions:**
1. Modal open/close
2. Form validation
3. Button clicks and state changes
4. Navigation flows

**Priority 3 - Edge Cases:**
1. Error boundaries
2. Loading states
3. Empty states
4. Permission checks

## Best Practices

### DO's

✅ **Use semantic queries**
```typescript
// Good - accessible and robust
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText('Email')

// Avoid - fragile
screen.getByClassName('submit-btn')
```

✅ **Test user behavior, not implementation**
```typescript
// Good - tests what user sees
expect(screen.getByText('Success!')).toBeInTheDocument();

// Avoid - tests internal state
expect(component.state.isSuccess).toBe(true);
```

✅ **Use userEvent for interactions**
```typescript
// Good - simulates real user interactions
const user = userEvent.setup();
await user.click(button);
await user.type(input, 'text');

// Avoid - synthetic events
fireEvent.click(button);
```

✅ **Clean up after tests**
```typescript
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});
```

✅ **Test error cases**
```typescript
it('should handle API errors', async () => {
  global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
  // Test error handling
});
```

### DON'Ts

❌ **Don't test implementation details**
```typescript
// Bad - testing internal state
expect(wrapper.find('.internal-class')).toHaveLength(1);

// Good - testing user-visible behavior
expect(screen.getByText('Visible text')).toBeInTheDocument();
```

❌ **Don't use brittle selectors**
```typescript
// Bad
container.querySelector('.css-abc123');

// Good
screen.getByRole('button', { name: /action/i });
```

❌ **Don't forget to await async operations**
```typescript
// Bad - race condition
user.click(button);
expect(screen.getByText('Result')).toBeInTheDocument();

// Good
await user.click(button);
await waitFor(() => {
  expect(screen.getByText('Result')).toBeInTheDocument();
});
```

❌ **Don't test external libraries**
```typescript
// Bad - testing React itself
it('should call useState', () => { ... });

// Good - testing your component's behavior
it('should update counter on click', () => { ... });
```

## Troubleshooting

### Common Issues

**1. "Not wrapped in act(...)" warning**
```typescript
// Problem: State update not wrapped in act
user.click(button);

// Solution: Await async operations
await user.click(button);
```

**2. "Unable to find element"**
```typescript
// Problem: Element not rendered yet
expect(screen.getByText('Async result')).toBeInTheDocument();

// Solution: Wait for element
await waitFor(() => {
  expect(screen.getByText('Async result')).toBeInTheDocument();
});
```

**3. "localStorage is not defined"**
```typescript
// Problem: Missing setup
// Solution: Add to setup.ts (already configured)
```

**4. "fetch is not defined"**
```typescript
// Problem: Missing fetch mock
// Solution: Mock in beforeEach
beforeEach(() => {
  global.fetch = vi.fn();
});
```

**5. Tests timing out**
```typescript
// Problem: Unresolved promise
// Solution: Always resolve/reject mocked promises
await act(async () => {
  resolvePromise();
  await promise;
});
```

### Debugging Tests

**Enable Vitest UI:**
```bash
npm run test:ui
```

**Use screen.debug():**
```typescript
it('should render', () => {
  render(<Component />);
  screen.debug(); // Prints entire DOM
  screen.debug(screen.getByRole('button')); // Prints specific element
});
```

**Check what's rendered:**
```typescript
console.log(screen.getByRole('button').innerHTML);
```

**Pause test execution:**
```typescript
it('should work', async () => {
  render(<Component />);
  await new Promise(r => setTimeout(r, 10000)); // Pause 10s
});
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Zustand Testing Guide](https://github.com/pmndrs/zustand#testing)

## Contributing

When adding new features:
1. Write tests BEFORE implementation (TDD)
2. Ensure >80% code coverage for new code
3. Test happy path AND error cases
4. Add integration tests for user workflows
5. Update this documentation if adding new patterns

---

**Last Updated:** 2026-02-01
**Maintainer:** Development Team
