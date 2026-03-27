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

const CARD_PATTERNS = {
  Visa: /^4/,
  Mastercard: /^(5[1-5]|2[2-7])/,
  Amex: /^3[47]/,
  Discover: /^(6011|65|64[4-9])/,
};

const CARD_LENGTH_RANGE = { min: 13, max: 19 };
const VALID_MONTH_RANGE = { min: 1, max: 12 };

function sanitizeCardNumber(cardNumber) {
  return cardNumber.replace(/\s+/g, '');
}

function isNumericString(str) {
  return /^\d+$/.test(str);
}

function detectCardType(cardNumber) {
  const cleanNumber = sanitizeCardNumber(cardNumber);
  const found = Object.entries(CARD_PATTERNS).find(([_, pattern]) => pattern.test(cleanNumber));
  return found ? found[0] : 'Unknown';
}

function maskCardNumber(cardNumber) {
  const cleanNumber = sanitizeCardNumber(cardNumber);

  if (cleanNumber.length < 4) {
    return cleanNumber;
  }

  const lastFour = cleanNumber.slice(-4);
  const maskedPortion = '*'.repeat(cleanNumber.length - 4);

  return maskedPortion + lastFour;
}

function validateCardNumber(cardNumber) {
  const cleanNumber = sanitizeCardNumber(cardNumber);

  if (!isNumericString(cleanNumber)) {
    return false;
  }

  const { min, max } = CARD_LENGTH_RANGE;
  if (cleanNumber.length < min || cleanNumber.length > max) {
    return false;
  }

  return luhnCheck(cleanNumber);
}

function validateExpirationDate(month, year) {
  const { min, max } = VALID_MONTH_RANGE;
  if (month < min || month > max) {
    return false;
  }

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return false;
  }

  return true;
}

function luhnCheck(cardNumber) {
  let sum = 0;
  let shouldDouble = false;

  for (let i = cardNumber.length - 1; i >= 0; i -= 1) {
    let digit = parseInt(cardNumber[i], 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit = Math.floor(digit / 10) + (digit % 10);
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

export {
  detectCardType, maskCardNumber, validateCardNumber, validateExpirationDate,
};
