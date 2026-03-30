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
import { hclSignIn } from '../../../scripts/salesforce/hcl-auth.js';

function showError(form, message) {
  let errorDiv = form.querySelector('.error-message');
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    form.insertBefore(errorDiv, form.firstChild);
  }
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

function hideError(form) {
  const errorDiv = form.querySelector('.error-message');
  if (errorDiv) {
    errorDiv.style.display = 'none';
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  hideError(event.target);

  const form = event.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const email = form.querySelector('#email').value.trim();
  const password = form.querySelector('#password').value;

  // Disable submit button during sign in
  submitButton.disabled = true;
  submitButton.textContent = 'Signing in...';

  try {
    await hclSignIn(email, password);
    window.location.href = rootLink('/');
  } catch (error) {
    console.error(error);
    showError(form, 'Invalid email or password. Please try again.');
    submitButton.disabled = false;
    submitButton.textContent = 'Sign in';
  }
}

export default async function LoginForm() {
  const component = document.createElement('div');
  component.className = 'sfcc-login-component';
  component.innerHTML = `
    <form class="sfcc-login-form">
      <div class="sfcc-login-form-group">
        <label for="email">Email address</label>
        <input 
          id="email" 
          name="email" 
          autocomplete="email"
          required
        />
      </div>
      
      <div class="sfcc-login-form-group">
        <label for="password">Password</label>
        <input 
          type="password" 
          id="password" 
          name="password" 
          autocomplete="current-password"
          required
        />
      </div>
      
      <button type="submit" class="sfcc-login-submit-button">Sign in</button>
    </form>
    
    <p class="sfcc-login-register-link">
      Not a member? <a href="/customer/register">Sign up for a free account</a>
    </p>
  `;

  const form = component.querySelector('form');
  form.addEventListener('submit', handleSubmit);

  return component;
}
