import { expect, test, type Page } from '@playwright/test';

const email = process.env.BRANCHES_E2E_EMAIL;
const password = process.env.BRANCHES_E2E_PASSWORD;
const graphId = process.env.BRANCHES_E2E_GRAPH_ID;
const conversationId = process.env.BRANCHES_E2E_CONVERSATION_ID;

async function signIn(page: Page) {
  test.skip(!email || !password, 'Set BRANCHES_E2E_EMAIL and BRANCHES_E2E_PASSWORD.');
  await page.goto('/login');
  await page.getByPlaceholder('your@email.com').fill(email as string);
  await page.getByPlaceholder('Password').fill(password as string);
  await page.getByRole('button', { name: /Sign In/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

test('invite route renders without blank screen', async ({ page }) => {
  await page.goto('/invite/invalid-token-smoke');
  await expect(page.locator('body')).toContainText(/Invite|expired|Sign In/i);
});

test('login redirects into app shell', async ({ page }) => {
  await signIn(page);
});

test('chat thread composer is visible and stable', async ({ page }) => {
  test.skip(
    !email || !password || !graphId || !conversationId,
    'Set BRANCHES_E2E_EMAIL, BRANCHES_E2E_PASSWORD, BRANCHES_E2E_GRAPH_ID and BRANCHES_E2E_CONVERSATION_ID.'
  );

  await signIn(page);

  await page.goto(`/${graphId}/chat/${conversationId}`);
  await expect(page.getByPlaceholder('Type a message...')).toBeVisible();
  await expect(page.getByRole('button', { name: /Send message|Sending message/i })).toBeVisible();
});

test('settings page exposes account deletion entry', async ({ page }) => {
  test.skip(
    !email || !password || !graphId,
    'Set BRANCHES_E2E_EMAIL, BRANCHES_E2E_PASSWORD and BRANCHES_E2E_GRAPH_ID.'
  );

  await signIn(page);

  await page.goto(`/${graphId}/settings`);
  await expect(page.getByRole('button', { name: /Delete Account/i })).toBeVisible();
});

test('mobile FAB actions appear on core routes', async ({ page }) => {
  test.skip(
    !email || !password || !graphId,
    'Set BRANCHES_E2E_EMAIL, BRANCHES_E2E_PASSWORD and BRANCHES_E2E_GRAPH_ID.'
  );

  await signIn(page);

  await page.goto(`/${graphId}`);
  await expect(page.getByRole('button', { name: /Add family member/i })).toBeVisible();

  await page.goto(`/${graphId}/memories`);
  await expect(page.getByRole('button', { name: /Add memory/i })).toBeVisible();

  await page.goto(`/${graphId}/invites`);
  await expect(page.getByRole('button', { name: /Invite member/i })).toBeVisible();

  await page.goto(`/${graphId}/chat`);
  await expect(page.getByRole('button', { name: /New conversation/i })).toBeVisible();
});

test('mobile create sheets open and close predictably', async ({ page }) => {
  test.skip(
    !email || !password || !graphId,
    'Set BRANCHES_E2E_EMAIL, BRANCHES_E2E_PASSWORD and BRANCHES_E2E_GRAPH_ID.'
  );

  await signIn(page);

  await page.goto(`/${graphId}/invites`);
  await page.getByRole('button', { name: /Invite member/i }).click();
  await expect(page.getByRole('dialog', { name: /Send invitation modal/i })).toBeVisible();
  await page.getByRole('button', { name: /Close Send Invitation/i }).click();
  await expect(page.getByRole('dialog', { name: /Send invitation modal/i })).toBeHidden();

  await page.goto('/dashboard');
  await page.getByRole('button', { name: /Create new family tree/i }).click();
  await expect(page.getByRole('dialog', { name: /Create a family tree/i })).toBeVisible();
});
