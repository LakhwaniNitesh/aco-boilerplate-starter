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

import { rootLink } from '../../scripts/commerce.js';
import { registerNewCustomer } from '../../scripts/salesforce/api.js';

const ALLOWED_SPECIAL_CHARACTERS = '!@#$%^&*(),.?":{}|<>';

const passwordRequirements = [
  {
    id: 'length',
    label: 'At least 8 characters long',
    test: (password) => password.length >= 8,
  },
  {
    id: 'uppercase',
    label: 'Contains at least one uppercase letter',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: 'lowercase',
    label: 'Contains at least one lowercase letter',
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: 'number',
    label: 'Contains at least one number',
    test: (password) => /\d/.test(password),
  },
  {
    id: 'special',
    label: 'Contains at least one special character',
    test: (password) =>
      new RegExp(`[${ALLOWED_SPECIAL_CHARACTERS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`).test(
        password
      ),
  },
];

function validatePassword(password) {
  return passwordRequirements.every((req) => req.test(password));
}

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

function updatePasswordRequirements(password, requirementsContainer) {
  passwordRequirements.forEach((requirement) => {
    const requirementElement = requirementsContainer.querySelector(
      `[data-requirement="${requirement.id}"]`
    );
    const isMet = requirement.test(password);

    if (isMet) {
      requirementElement.classList.add('met');
    } else {
      requirementElement.classList.remove('met');
    }
  });
}

function createPasswordRequirementsHTML() {
  return `
    <div class="sfcc-register-password-requirements">
      <p class="sfcc-register-requirements-label">Password requirements:</p>
      <div class="sfcc-register-requirements-list">
        ${passwordRequirements
          .map(
            (req) => `
          <div class="sfcc-register-requirement" data-requirement="${req.id}">
            <div class="sfcc-register-requirement-indicator">
              <svg class="sfcc-register-requirement-checkmark" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
            <span class="sfcc-register-requirement-label">${req.label}</span>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `;
}

async function handleSubmit(event) {
  event.preventDefault();
  hideError(event.target);

  const form = event.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const firstName = form.querySelector('#firstName').value.trim();
  const lastName = form.querySelector('#lastName').value.trim();
  const email = form.querySelector('#email').value.trim();
  const password = form.querySelector('#password').value;

  // Validate password
  if (!validatePassword(password)) {
    showError(form, 'Password does not meet all requirements.');
    return;
  }

  // Disable submit button during registration
  submitButton.disabled = true;
  submitButton.textContent = 'Creating account...';

  try {
    await registerNewCustomer(firstName, lastName, email, password);
    window.location.href = rootLink('/');
  } catch (error) {
    console.error(error);
    showError(form, 'Unable to create account. Please try again or contact support.');
    submitButton.disabled = false;
    submitButton.textContent = 'Create account';
  }
}

export default async function decorate(block) {
  const container = document.createElement('div');
  container.innerHTML = '<h3>Create an account</h3><hr/>';

  const wrapper = document.createElement('div');
  wrapper.className = 'sfcc-register-wrapper';

  wrapper.innerHTML = `
    <form class="sfcc-register-form">
      <div class="sfcc-register-form-group">
        <label for="firstName">First name</label>
        <input 
          type="text" 
          id="firstName" 
          name="firstName" 
          autocomplete="given-name"
          required
        />
      </div>

      <div class="sfcc-register-form-group">
        <label for="lastName">Last name</label>
        <input 
          type="text" 
          id="lastName" 
          name="lastName" 
          autocomplete="family-name"
          required
        />
      </div>
      
      <div class="sfcc-register-form-group">
        <label for="email">Email address</label>
        <input 
          type="email" 
          id="email" 
          name="email" 
          autocomplete="email"
          required
        />
      </div>
      
      <div class="sfcc-register-form-group">
        <label for="password">Password</label>
        <input 
          type="password" 
          id="password" 
          name="password" 
          autocomplete="new-password"
          required
        />
      </div>

      ${createPasswordRequirementsHTML()}
      
      <button type="submit" class="sfcc-register-submit-button">Create account</button>
    </form>
    
    <p class="sfcc-register-login-link">
      Already have an account? <a href="/customer/login">Sign in</a>
    </p>
  `;

  const form = wrapper.querySelector('form');
  const passwordInput = form.querySelector('#password');
  const requirementsContainer = form.querySelector('.sfcc-register-password-requirements');

  // Update password requirements on input
  passwordInput.addEventListener('input', (e) => {
    updatePasswordRequirements(e.target.value, requirementsContainer);
  });

  form.addEventListener('submit', handleSubmit);

  container.appendChild(wrapper);
  block.appendChild(container);
}
