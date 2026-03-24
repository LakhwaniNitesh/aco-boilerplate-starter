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

import { isHclSignedIn } from '../../scripts/salesforce/hcl-auth.js';
import { LoginForm } from './components/login-form.js';
import { Logout } from './components/logout.js';

export default async function decorate(block) {
  const container = document.createElement('div');
  container.className = 'sfcc-login-container';

  if (isHclSignedIn()) {
    block.innerHTML = '<h3>My Account</h3><hr/>';
    container.appendChild(await Logout());
  } else {
    block.innerHTML = '<h3>Sign in to your account</h3><hr/>';
    container.appendChild(await LoginForm());
  }

  block.appendChild(container);
}
