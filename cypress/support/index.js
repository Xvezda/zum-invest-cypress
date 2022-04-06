// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

import './assertions';

beforeEach(() => {
  cy.fixCypressSpec();
  cy.stubCommonApi();
});

const messages = [
  'kakaoPixel is not defined',
  // 서버측 문제 무시
  'Request failed with status code',
  'Network Error',
  // 외부 스크립트 차단으로 인한 deepdive.zum.com 스크립트 오류
  "Cannot read properties of null (reading 'getAttribute')",
];
Cypress.on('uncaught:exception', err => {
  if (messages.some(message => err.message.includes(message))) {
    return false;
  }
});