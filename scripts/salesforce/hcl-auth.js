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

import { getConfigValue } from '@dropins/tools/lib/aem/configs.js';
import { events } from '@dropins/tools/event-bus.js';

export async function hclSignIn(logonId, logonPassword) {
  try {
    // Make the login request to HCL Commerce
    const response = await fetch('https://20.40.52.251/wcs/resources/store/715842834/loginidentity?responseFormat=json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        logonId,
        logonPassword,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login failed');
    }

    const data = await response.json();

    if (!data.WCToken || !data.WCTrustedToken) {
      throw new Error('Invalid response from authentication server');
    }

    // Store tokens in session storage
    sessionStorage.setItem('hcl-wctoken', data.WCToken);
    sessionStorage.setItem('hcl-wctrustedtoken', data.WCTrustedToken);
    sessionStorage.setItem('hcl-userid', data.userId || '');

    // Update the runtime config
    const hclConfig = getConfigValue('hcl-commerce') || {};
    hclConfig.WCToken = data.WCToken;
    hclConfig.WCTrustedToken = data.WCTrustedToken;
    hclConfig.userId = data.userId;

    // Update config.json file on the server {commented it as it may not require}
    // try {
    //   await fetch('http://localhost:3001/api/update-hcl-tokens', {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify({
    //       WCToken: data.WCToken,
    //       WCTrustedToken: data.WCTrustedToken,
    //       userId: data.userId || ''
    //     })
    //   });
    // } catch (configError) {
    //   console.warn('Failed to update config.json:', configError);
    //   // Continue even if config update fails
    // }

    // Emit token update event so all modules can react
    events.emit('hcl/tokens-updated', {
      WCToken: data.WCToken,
      WCTrustedToken: data.WCTrustedToken,
      userId: data.userId,
    });

    return {
      WCToken: data.WCToken,
      WCTrustedToken: data.WCTrustedToken,
      userId: data.userId,
    };
  } catch (error) {
    console.error('HCL login error:', error);
    throw error;
  }
}

export function isHclSignedIn() {
  return !!(sessionStorage.getItem('hcl-wctoken') && sessionStorage.getItem('hcl-wctrustedtoken'));
}

export function getHclTokens() {
  return {
    WCToken: sessionStorage.getItem('hcl-wctoken'),
    WCTrustedToken: sessionStorage.getItem('hcl-wctrustedtoken'),
    userId: sessionStorage.getItem('hcl-userid'),
  };
}

export function clearHclTokens() {
  sessionStorage.removeItem('hcl-wctoken');
  sessionStorage.removeItem('hcl-wctrustedtoken');
  sessionStorage.removeItem('hcl-userid');
}
