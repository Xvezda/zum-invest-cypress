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
  cy.intercept(/https?:\/\/thumb\.zumst\.com\/.*/,
    {
      middleware: true
    },
    req => {
      const url = new URL(req.url);
      const pathRegex = /^\/(\d+)x(\d+)\//;
      if (pathRegex.test(url.pathname)) {
        const [, w, h] = url.pathname.match(pathRegex);
        // 사진을 크기에 따라 동일한 플레이스홀더로 치환
        if (w !== '0' && h !== '0') {
          req.redirect(`https://picsum.photos/id/56/${w}/${h}`);
        } else {
          req.redirect(`https://picsum.photos/id/56/${w === '0' ? h : w}`);
        }
      } else {
        req.destroy();
      }
    }
  );
});