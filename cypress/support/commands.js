// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

require('cypress-plugin-snapshots/commands');

const { basename } = require('path');
Cypress.Commands.add('fixCypressSpec', function () {
  // https://github.com/cypress-io/cypress/issues/3090#issuecomment-889470707
  const { absoluteFile, relativeFile } = this.test.invocationDetails;
  Cypress.spec = {
    ...Cypress.spec,
    absolute: absoluteFile,
    name: basename(absoluteFile),
    relative: relativeFile,
  };
});

Cypress.Commands.add('stubThirdParty', () => {
  // 테스트 속도 개선을 위해 외부에서 불러오는 자원을 stub 처리
  const register = pattern => cy.intercept(pattern, {statusCode: 200});

  register(/^https:\/\/((secure)?pubads|stats)\.g\.doubleclick\.net\/.*/);
  register('https://pagead2.googlesyndication.com/**');
  register('https://display.ad.daum.net/**');
  register(/https:\/\/(bidder|gum|ssp-sync)\.criteo\.com\/.*/);
  register(/https:\/\/(zumads|plog)\.vrixon\.com\/.*/);
  register('https://aem-ingest.onkakao.net/**');
});

Cypress.Commands.add(
  'shouldRequestOnScroll',
  (alias, option = {start: 2, count: 3}) => {
    const getPage = page => {
      cy.scrollTo('bottom')
        .wait(alias)
        .its('request.url')
        .should('contain', `page=${page}`)
        .then(() => {
          if (page <= option.count) {
            getPage(page + 1);
          }
        });
    };
    getPage(option.start);
  }
);

Cypress.Commands.add(
  'hideWithinContext',
  (selector, callback) => {
    cy.get(selector)
      .then($el => cy.wrap($el.hide()))
      .then($el => {
        callback($el);
        return cy.wrap($el);
      })
      .then($el => cy.wrap($el.show()));
  }
);
