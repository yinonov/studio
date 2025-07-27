# Testing Guide

This project uses Playwright for end-to-end testing, providing comprehensive coverage of user workflows and integration testing.

## Test Structure

### 🎭 Playwright E2E Tests

Located in `tests/e2e/`, these tests cover:

- **Navigation & UI** (`navigation.spec.ts`)
  - Page loading and basic UI elements
  - Navigation between pages
  - Responsive design

- **Authentication** (`auth.spec.ts`)
  - Login/signup flows
  - Form validation
  - Protected route access
  - Session management

- **Templates** (`templates.spec.ts`)
  - Template listing and filtering
  - Template selection
  - Form validation

- **Contracts** (`contracts.spec.ts`)
  - Contract creation workflow
  - Contract signing flow
  - Dashboard functionality

## Running Tests

### Local Development

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug tests step by step
npm run test:e2e:debug

# Run specific test file
npx playwright test auth.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium
```

### Test Configuration

The Playwright config (`playwright.config.ts`) includes:

- **Multiple Browsers**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Auto Dev Server**: Automatically starts `npm run dev` before tests
- **Screenshots**: Captures on failure
- **Traces**: Records on retry for debugging
- **Parallel Execution**: Runs tests concurrently for speed

## Test Helpers

The `tests/e2e/helpers/` directory contains utilities:

- **AuthHelper**: Login, signup, logout utilities
- **ContractHelper**: Contract creation and validation
- **TemplateHelper**: Template navigation and selection
- **TestData**: Reusable test data

### Example Usage

```typescript
import { test } from '@playwright/test';
import { AuthHelper, ContractHelper, TestData } from './helpers';

test('should create contract after login', async ({ page }) => {
  const auth = new AuthHelper(page);
  const contract = new ContractHelper(page);

  await auth.loginWithEmail(TestData.user.email, TestData.user.password);
  await contract.createRentalContract(TestData.contract.rental);
  await contract.expectContractCreated();
});
```

## Test Data

Tests use Hebrew text and realistic Israeli data:

```typescript
const testData = {
  user: {
    email: 'test@example.com',
    name: 'משתמש בדיקה',
  },
  contract: {
    party1Name: 'ישראל ישראלי',
    party2Name: 'שרה לוי',
    address: 'הרצל 1, תל אביב',
  },
};
```

## CI/CD Integration

Tests run automatically on:

- Push to `main` or `develop` branches
- Pull requests
- Uses GitHub Actions with Ubuntu runners
- Uploads test reports as artifacts

## Debugging Failed Tests

1. **View Test Report**: `npx playwright show-report`
2. **Debug Mode**: `npm run test:e2e:debug`
3. **Screenshot Analysis**: Check `test-results/` folder
4. **Trace Viewer**: Use Playwright's trace viewer for step-by-step debugging

## Best Practices

### 🎯 Test Strategy

- Focus on user journeys, not implementation details
- Test critical paths: auth, contract creation, signing
- Use data-testid attributes for stable selectors
- Handle loading states and async operations

### 🔧 Writing Tests

- Use Hebrew text matching for UI elements
- Handle authentication states properly
- Test both success and error scenarios
- Keep tests independent and isolated

### 📱 Cross-Browser Testing

- Test on multiple browsers (Chrome, Firefox, Safari)
- Include mobile viewports
- Verify responsive design

## Recommended Next Steps

### 1. Add Unit Tests (Jest + RTL)

```bash
npm install -D jest @testing-library/react @testing-library/jest-dom
```

For testing:

- Individual React components
- Utility functions
- Form validation logic
- Firebase service functions

### 2. Add Integration Tests

For testing:

- API endpoints
- Firebase Functions
- Database operations
- External service integrations

### 3. Add Visual Regression Tests

```bash
npm install -D @playwright/test
```

For testing:

- UI consistency
- Design system compliance
- Cross-browser visual differences

### 4. Performance Testing

- Lighthouse CI integration
- Core Web Vitals monitoring
- Load testing for contract generation

## Environment Setup

### Required Environment Variables

```env
# For Firebase testing
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain

# For external service testing (optional)
NEXT_PUBLIC_DROPBOX_SIGN_CLIENT_ID=your_client_id
```

### Test Database

Consider using Firebase Emulator Suite for:

- Isolated test environment
- Consistent test data
- Faster test execution
- No external dependencies

```bash
npm run emu  # Start Firebase emulators
```

This testing setup provides a solid foundation for ensuring your contract management platform works reliably across different browsers and user scenarios.
