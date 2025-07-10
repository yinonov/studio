import { Page, expect } from '@playwright/test';

export class AuthHelper {
  constructor(private page: Page) {}

  async loginWithEmail(email: string, password: string) {
    await this.page.goto('/login');

    // Make sure we're on email mode
    const emailTab = this.page.getByText(/אימייל/i);
    if (await emailTab.isVisible()) {
      await emailTab.click();
    }

    await this.page.getByPlaceholder(/אימייל/i).fill(email);
    await this.page.getByPlaceholder(/סיסמה/i).fill(password);
    await this.page.getByRole('button', { name: /התחבר/i }).click();

    // Wait for navigation or error
    await this.page.waitForLoadState('networkidle');
  }

  async signUpWithEmail(name: string, email: string, password: string) {
    await this.page.goto('/signup');

    await this.page.getByPlaceholder(/שם מלא/i).fill(name);
    await this.page.getByPlaceholder(/אימייל/i).fill(email);
    await this.page.getByPlaceholder(/סיסמה/i).fill(password);
    await this.page.getByRole('button', { name: /הרשם/i }).click();

    // Wait for navigation or error
    await this.page.waitForLoadState('networkidle');
  }

  async logout() {
    // Look for logout button/link
    const logoutButton = this.page.getByRole('button', {
      name: /התנתק|יציאה/i,
    });
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    }

    await this.page.waitForLoadState('networkidle');
  }

  async expectToBeLoggedIn() {
    // Check for user-specific elements
    await expect(
      this.page.getByRole('link', { name: /דשבורד|לוח בקרה/i })
    ).toBeVisible();
  }

  async expectToBeLoggedOut() {
    // Check for login/signup links
    await expect(this.page.getByRole('link', { name: /התחבר/i })).toBeVisible();
  }
}

export class ContractHelper {
  constructor(private page: Page) {}

  async createRentalContract(data: {
    party1Name: string;
    party1Email: string;
    party2Name: string;
    party2Email: string;
    address: string;
    rent: string;
  }) {
    await this.page.goto('/templates/rental/create');

    // Fill form fields
    await this.fillFieldByLabel('שם צד א', data.party1Name);
    await this.fillFieldByLabel('אימייל צד א', data.party1Email);
    await this.fillFieldByLabel('שם צד ב', data.party2Name);
    await this.fillFieldByLabel('אימייל צד ב', data.party2Email);
    await this.fillFieldByLabel('כתובת', data.address);
    await this.fillFieldByLabel('שכר דירה', data.rent);

    // Submit form
    await this.page
      .getByRole('button', { name: /שמור|צור|המשך/i })
      .first()
      .click();
    await this.page.waitForLoadState('networkidle');
  }

  private async fillFieldByLabel(label: string, value: string) {
    const field = this.page.getByLabel(new RegExp(label, 'i'));
    if (await field.isVisible()) {
      await field.fill(value);
    } else {
      // Try to find by placeholder
      const placeholderField = this.page.getByPlaceholder(
        new RegExp(label, 'i')
      );
      if (await placeholderField.isVisible()) {
        await placeholderField.fill(value);
      }
    }
  }

  async expectContractCreated() {
    // Check for success indicators
    const successMessages = [/הצלחה/i, /נוצר/i, /נשמר/i, /created/i];

    for (const message of successMessages) {
      const element = this.page.getByText(message);
      if (await element.isVisible()) {
        await expect(element).toBeVisible();
        return;
      }
    }

    // If no success message, check URL change
    expect(this.page.url()).not.toContain('/create');
  }
}

export class TemplateHelper {
  constructor(private page: Page) {}

  async navigateToTemplates() {
    await this.page.goto('/templates');
    await this.page.waitForLoadState('networkidle');
  }

  async selectTemplate(templateName: string) {
    const template = this.page.getByText(templateName);
    if (await template.isVisible()) {
      await template.click();
    } else {
      // Try clicking first available template
      const firstTemplate = this.page.getByTestId('template-card').first();
      if (await firstTemplate.isVisible()) {
        await firstTemplate.click();
      }
    }

    await this.page.waitForLoadState('networkidle');
  }

  async expectTemplatesLoaded() {
    // Wait for either templates or loading state
    await expect(
      this.page
        .getByTestId('template-card')
        .or(this.page.locator('.loading, [data-testid="loading-skeleton"]'))
    ).toBeVisible();
  }
}

// Test data generators
export const TestData = {
  user: {
    email: 'test@example.com',
    password: 'Test123456!',
    name: 'משתמש בדיקה',
  },

  contract: {
    rental: {
      party1Name: 'ישראל ישראלי',
      party1Email: 'israel@example.com',
      party2Name: 'שרה לוי',
      party2Email: 'sarah@example.com',
      address: 'הרצל 1, תל אביב',
      rent: '5000',
    },
  },
};
