import { test, expect } from '@playwright/test';

test.describe('User Management (Admin Only)', () => {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'password123';

  // Helper to log in as admin
  async function loginAsAdmin({ page }) {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Ensure we're on the login page
    await page.waitForURL(/.*\/login/, { waitUntil: 'networkidle', timeout: 5000 });
    await expect(page.locator('h2:has-text("Welcome back")')).toBeVisible({ timeout: 5000 });

    // Check if we need to switch to sign in form (if we see sign up form elements)
    const signUpFormIndicator = page.locator('input[placeholder="Full Name"]');
    if (await signUpFormIndicator.isVisible()) {
      // We're on sign up form, click to switch to sign in
      const signInLink = page.locator('text=Sign in');
      await expect(signInLink).toBeVisible({ timeout: 5000 });
      await signInLink.click();
      await page.waitForTimeout(1000);
    }

    // Fill in the sign in form
    await page.locator('input[placeholder="Email"]').fill(adminEmail);
    await page.locator('input[placeholder="Password"]').fill(adminPassword);

    // Submit the form
    await page.click('button[type="submit"]:has-text("Sign in")');

    // Wait for navigation to home page
    await page.waitForURL('/', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(2000);

    // Verify we're logged in as admin
    await expect(page.locator(`text=Welcome back, Admin User!`)).toBeVisible({ timeout: 5000 });
    // Also check for sign out button
    await expect(page.locator('button:has-text("Sign out")')).toBeVisible({ timeout: 5000 });
  }

  // Helper to navigate to user management page
  async function goToUserManagement({ page }) {
    // Assuming there's a link in the navbar or sidebar for user management
    // Adjust the selector based on your actual UI
    const userManagementLink = page.locator('nav >> text=User Management').first();
    await expect(userManagementLink).toBeVisible({ timeout: 5000 });
    await userManagementLink.click();
    await page.waitForURL(/.*\/users/, { waitUntil: 'networkidle', timeout: 5000 });
    await page.waitForTimeout(2000);
  }

  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await loginAsAdmin({ page });
    // Navigate to user management page
    await goToUserManagement({ page });
  });

  test('should display the user list with admin and agent users', async ({ page }) => {
    // Wait for the user table to load
    const userTable = page.locator('table');
    await expect(userTable).toBeVisible({ timeout: 5000 });

    // Check for at least the admin user (admin@example.com)
    await expect(page.locator(`text=${adminEmail}`)).toBeVisible({ timeout: 5000 });

    // Optionally check for the agent user from seed (agent@example.com)
    await expect(page.locator('text=agent@example.com')).toBeVisible({ timeout: 5000 });
  });

  test('should allow creating a new user via the modal form', async ({ page }) => {
    // Generate unique email for the test user to avoid conflicts
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const testEmail = `testuser_${randomSuffix}@example.com`;
    const testName = `Test User ${randomSuffix}`;
    const testPassword = 'TestPass123!';

    // Click the "Add User" button (adjust selector based on your UI)
    const addUserButton = page.locator('button:has-text("Add User")');
    await expect(addUserButton).toBeVisible({ timeout: 5000 });
    await addUserButton.click();

    // Wait for the modal to appear
    const modal = page.locator('dialog, [role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Fill in the form
    await modal.locator('input[placeholder="Full Name"]').fill(testName);
    await modal.locator('input[placeholder="Email"]').fill(testEmail);
    await modal.locator('input[placeholder="Password"]').fill(testPassword);
    // Role dropdown - assuming it's a select or radio buttons
    // We'll set it to AGENT (default) or leave as default
    const roleSelect = modal.locator('select, [role="combobox"]');
    if (await roleSelect.count() > 0) {
      await roleSelect.selectOption('AGENT');
    }

    // Submit the form
    const submitButton = modal.locator('button[type="submit"]:has-text("Create User"), button:has-text("Add User")');
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await submitButton.click();

    // Wait for the modal to close
    await expect(modal).toBeHidden({ timeout: 5000 });
    await page.waitForTimeout(2000);

    // Verify the new user appears in the table
    await expect(page.locator(`text=${testEmail}`)).toBeVisible({ timeout: 5000 });
    await expect(page.locator(`text=${testName}`)).toBeVisible({ timeout: 5000 });
    // Verify role is AGENT (if displayed)
    await expect(page.locator(`text=${testEmail}`)).toBeVisible({ timeout: 5000 });
    // Assuming role is displayed in a cell, we can check for "AGENT" near the email
    const userRow = page.locator(`tr:has-text("${testEmail}")`);
    await expect(userRow).toContainText('AGENT');
  });

  test('should allow editing an existing user', async ({ page }) => {
    // First, create a user to edit (we'll create it via API to avoid UI duplication, but let's do via UI for consistency)
    // However, to keep the test focused on edit, we'll create a user via UI first, then edit it.
    // But note: the create test already covers creation. We can rely on that and then edit the same user.
    // However, to keep tests independent, we'll create a user to edit within this test.

    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const originalEmail = `edituser_${randomSuffix}@example.com`;
    const originalName = `Edit User ${randomSuffix}`;
    const originalPassword = 'OldPass123!';

    // Step 1: Create a user via UI (reuse the create logic)
    const addUserButton = page.locator('button:has-text("Add User")');
    await addUserButton.click();
    const modal = page.locator('dialog, [role="dialog"]');
    await modal.waitFor({ state: 'visible', timeout: 5000 });
    await modal.locator('input[placeholder="Full Name"]').fill(originalName);
    await modal.locator('input[placeholder="Email"]').fill(originalEmail);
    await modal.locator('input[placeholder="Password"]').fill(originalPassword);
    // Set role to AGENT
    const roleSelect = modal.locator('select, [role="combobox"]');
    if (await roleSelect.count() > 0) {
      await roleSelect.selectOption('AGENT');
    }
    await modal.locator('button[type="submit"]:has-text("Create User")').click();
    await modal.waitFor({ state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(2000);

    // Verify the user is in the list
    await expect(page.locator(`text=${originalEmail}`)).toBeVisible({ timeout: 5000 });

    // Step 2: Edit the user
    // Find the row for this user and click the edit button (usually an edit icon or button)
    const userRow = page.locator(`tr:has-text("${originalEmail}")`);
    const editButton = userRow.locator('button:has-text("Edit"), button[title="Edit"], svg[data-testid="EditIcon"]');
    await expect(editButton).toBeVisible({ timeout: 5000 });
    await editButton.click();

    // Wait for the edit modal to appear
    const editModal = page.locator('dialog, [role="dialog"]');
    await expect(editModal).toBeVisible({ timeout: 5000 });

    // Update the user details
    const newName = `Edited User ${randomSuffix}`;
    const newEmail = `edited_${randomSuffix}@example.com`;
    // We'll keep the same password for simplicity (or we can change it)

    await editModal.locator('input[placeholder="Full Name"]').clear();
    await editModal.locator('input[placeholder="Full Name"]').fill(newName);
    await editModal.locator('input[placeholder="Email"]').clear();
    await editModal.locator('input[placeholder="Email"]').fill(newEmail);
    // Role - let's change to ADMIN to test role change
    const roleSelectEdit = editModal.locator('select, [role="combobox"]');
    if (await await roleSelectEdit.count() > 0) {
      await roleSelectEdit.selectOption('ADMIN');
    }

    // Submit the form
    const updateButton = editModal.locator('button[type="submit"]:has-text("Update User"), button:has-text("Save Changes")');
    await expect(updateButton).toBeVisible({ timeout: 5000 });
    await updateButton.click();

    // Wait for the modal to close
    await editModal.waitFor({ state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(2000);

    // Verify the updated user appears in the table
    await expect(page.locator(`text=${newEmail}`)).toBeVisible({ timeout: 5000 });
    await expect(page.locator(`text=${newName}`)).toBeVisible({ timeout: 5000 });
    // Verify the role is now ADMIN
    const updatedUserRow = page.locator(`tr:has-text("${newEmail}")`);
    await expect(updatedUserRow).toContainText('ADMIN');

    // Also verify the old email is no longer present
    await expect(page.locator(`text=${originalEmail}`)).not.toBeVisible({ timeout: 5000 });
  });

  test('should allow deleting a user', async ({ page }) => {
    // First, create a user to delete
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const deleteEmail = `deleteuser_${randomSuffix}@example.com`;
    const deleteName = `Delete User ${randomSuffix}`;
    const deletePassword = 'DeletePass123!';

    // Create the user via UI
    const addUserButton = page.locator('button:has-text("Add User")');
    await addUserButton.click();
    const modal = page.locator('dialog, [role="dialog"]');
    await modal.waitFor({ state: 'visible', timeout: 5000 });
    await modal.locator('input[placeholder="Full Name"]').fill(deleteName);
    await modal.locator('input[placeholder="Email"]').fill(deleteEmail);
    await modal.locator('input[placeholder="Password"]').fill(deletePassword);
    // Set role to AGENT
    const roleSelect = modal.locator('select, [role="combobox"]');
    if (await roleSelect.count() > 0) {
      await roleSelect.selectOption('AGENT');
    }
    await modal.locator('button[type="submit"]:has-text("Create User")').click();
    await modal.waitFor({ state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(2000);

    // Verify the user is in the list
    await expect(page.locator(`text=${deleteEmail}`)).toBeVisible({ timeout: 5000 });

    // Step 2: Delete the user
    // Find the row for this user and click the delete button
    const userRow = page.locator(`tr:has-text("${deleteEmail}")`);
    const deleteButton = userRow.locator('button:has-text("Delete"), button[title="Delete"], svg[data-testid="DeleteIcon"]');
    await expect(deleteButton).toBeVisible({ timeout: 5000 });
    await deleteButton.click();

    // Handle the confirmation dialog (if any)
    // Assuming a confirmation dialog appears with a confirm button
    const confirmDialog = page.locator('dialog:has-text("Confirm"), [role="dialog"]:has-text("Confirm")');
    if (await confirmDialog.count() > 0) {
      await expect(confirmDialog).toBeVisible({ timeout: 5000 });
      await confirmDialog.locator('button:has-text("Yes, Delete"), button:has-text("Confirm")').click();
      await confirmDialog.waitFor({ state: 'hidden', timeout: 5000 });
    }

    // Wait for the row to be removed
    await page.waitForTimeout(2000);

    // Verify the user is no longer in the list
    await expect(page.locator(`text=${deleteEmail}`)).not.toBeVisible({ timeout: 5000 });
    // Optionally, check for a success message
    await expect(page.locator('text=User deleted successfully')).toBeVisible({ timeout: 5000 });
  });

  test('should prevent deleting own account', async ({ page }) => {
    // We are logged in as admin@example.com
    // Try to delete the admin user (own account) - should show an error

    // Find the row for the admin user
    const adminUserRow = page.locator(`tr:has-text("${adminEmail}")`);
    const deleteButton = adminUserRow.locator('button:has-text("Delete"), button[title="Delete"], svg[data-testid="DeleteIcon"]');
    await expect(deleteButton).toBeVisible({ timeout: 5000 });
    await deleteButton.click();

    // Check for an error message (either in a dialog or toast)
    const errorMessage = page.locator('text=Cannot delete your own account, text=Unable to delete, text=Error');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Close the error dialog if present
    const okButton = page.locator('button:has-text("OK"), button:has-text("Close")');
    if (await okButton.count() > 0) {
      await okButton.click();
    }

    // Verify the admin user is still present
    await expect(page.locator(`text=${adminEmail}`)).toBeVisible({ timeout: 5000 });
  });
});