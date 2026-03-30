/*
 * Copyright 2025 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { rootLink } from '../../../scripts/scripts.js';
import { clearHclTokens } from '../../../scripts/salesforce/hcl-auth.js';

async function handleSignOut(event) {
  event.preventDefault();
  const button = event.target;

  button.disabled = true;
  button.textContent = 'Signing out...';

  try {
    clearHclTokens();
  } catch (error) {
    console.error(error);
  } finally {
    window.location.href = rootLink('/customer/login');
  }
}

export default async function Logout() {
  const component = document.createElement('div');
  component.className = 'sfcc-login-component';
  component.innerHTML = `
    <p>You are already signed in.</p>
    <button type="button" class="sfcc-login-submit-button">Sign out</button>
    <p class="sfcc-login-register-link">
      <a href="/">Return to home page</a>
    </p>
  `;

  const signOutButton = component.querySelector('button');
  signOutButton.addEventListener('click', handleSignOut);

  return component;
}
