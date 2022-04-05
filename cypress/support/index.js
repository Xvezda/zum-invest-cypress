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

  cy.intercept('https://finance.zumst.com/content/**', {statusCode: 200});
  cy.intercept('https://cmnt.zum.com/member/login', {fixture: 'cmnt.zum.com/member/login.json'})
    .as('apiMemberLogin');

  cy.fixture('userapi.zum.com/getUserInfo.json')
    .then(userInfo => {
      cy.intercept('https://userapi.zum.com/getUserInfo*', req => {
        req.reply({
          headers: {
            'Content-Type': 'application/javascript',
          },
          statusCode: 200,
          body: `${req.query.callback}(${JSON.stringify(userInfo)})`,
        });
      });
    });
});

const messages = [
  'kakaoPixel is not defined',
  'Request failed with status code 400',
  'Network Error',
  // 외부 스크립트 차단으로 인한 deepdive.zum.com 스크립트 오류
  "Cannot read properties of null (reading 'getAttribute')",
];
Cypress.on('uncaught:exception', err => {
  if (messages.some(message => err.message.includes(message))) {
    return false;
  }
});