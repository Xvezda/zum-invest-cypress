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
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

beforeEach(() => {
  cy.fixCypressSpec();
  cy.intercept(/https?:\/\/thumb\.zumst\.com\/.*/, req => {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/378x241')) {
      req.reply({fixture: '378x241.jpg'});
    } else if (url.pathname.startsWith('/182x77')) {
      req.reply({fixture: '182x77.jpg'});
    } else if (url.pathname.startsWith('/54x34')) {
      req.reply({fixture: '54x34.jpg'});
    } else {
      req.reply({fixture: 'fallback.jpg'});
    }
  });

chai.use((chai, utils) => {
  utils.addMethod(chai.Assertion.prototype, 'activated', function () {
    const $el = utils.flag(this, 'object');
    new chai.Assertion($el.closest('.active')).to.be.exist;
  });
});