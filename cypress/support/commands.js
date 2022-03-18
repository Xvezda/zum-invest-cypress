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
  register('https://www.googleadservices.com/**');
  register('https://www.googletagmanager.com/**');
  register('https://analytics.google.com/**');
  register('https://t1.daumcdn.net/**');
  register(/^https:\/\/(bc|display)\.ad\.daum\.net\/.*/);
  register(/https:\/\/(bidder|gum|ssp-sync)\.criteo\.com\/.*/);
  register(/https:\/\/(zumads|plog)\.vrixon\.com\/.*/);
  register('https://aem-ingest.onkakao.net/**');
  register('https://static.dable.io/**');
  register('https://wcs.naver.net/**');

  cy.on('uncaught:exception', err => {
    if (err.message.includes('kakaoPixel is not defined')) {
      return false;
    }
  });
});

Cypress.Commands.add(
  'shouldRequestOnScroll',
  (alias, option = {start: 2, count: 3}) => {
    const getPage = page => {
      cy.window()
        .scrollTo('bottomLeft', {
          duration: 10,
          ensureScrollable: false,
        })
        .get('.site_footer')
        .scrollIntoView({
          duration: 10,
          offset: {top: 100, left: 0}
        })
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
  'createHidingContext',
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

Cypress.Commands.add(
  'waitForImage',
  (selector = 'img') => {
    cy.get(selector, {log: false})
      .each($img => {
        cy.wrap($img, {log: false})
          .its('0.naturalWidth').should('be.greaterThan', 0);
      });
  }
);