import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
    testDir: 'src/tests',
    timeout: 30_000,
    expect: { timeout: 5_000 },
    reporter: [
        ['list'],
        ['allure-playwright', { outputFolder: 'allure-results' }],
    ],
    use: {
        trace: 'on-first-retry',
        video: 'retain-on-failure',
        screenshot: 'only-on-failure',
        baseURL: process.env.UI_BASE_URL,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
//# sourceMappingURL=playwright.config.js.map