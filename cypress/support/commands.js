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
const { recurse } = require('cypress-recurse');

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

Cypress.Commands.add('stubInvestApi', () => {
  cy.intercept('/api/global', {fixture: 'global'})
    .as('apiGlobal');

  cy.intercept('/api/investment', {fixture: 'investment'})
    .as('apiInvestment');
  cy.intercept('/api/investment/authors*', req => {
      req.reply({fixture: 'investment-authors'});
    })
    .as('apiInvestmentAuthors');
  cy.intercept('/api/investment/authors/*', {fixture: 'investment-author'})
    .as('apiInvestmentAuthor');
  cy.intercept('/api/investment/posts*', req => {
      req.reply({fixture: `investment-home-authors-${req.query.page}`});
    })
    .as('posts');
  cy.intercept('/api/investment/posts/*', {fixture: 'investment-posts'})
    .as('apiInvestmentPosts');
  cy.intercept('/api/investment/home/authors*', req => {
      req.reply({fixture: `investment-home-authors-${req.query.page}`});
    })
    .as('apiAuthors');

  cy.intercept('/api/investment/authors/*/posts/recent**', req => {
      req.reply({fixture: `investment-authors-posts-recent-${req.query.page}`});
    })
    .as('apiAuthorsPostsRecent');

  cy.intercept('/api/domestic/common', {fixture: 'domestic-common'})
    .as('apiDomesticCommon');
  cy.intercept('/api/domestic/home', {fixture: 'domestic-home'})
    .as('apiDomesticHome');
  cy.intercept('/api/domestic/home/meko-chart', {fixture: 'domestic-meko-chart'})
    .as('apiMekoChart');

  cy.intercept('/api/*/home/real-time-news*', req => {
      req.reply({fixture: `real-time-news-${req.query.page}`});
    })
    .as('apiRealTimeNews');


  cy.intercept('/api/suggest*', {fixture: 'search-suggest-zum'})
    .as('apiSuggest');
  cy.intercept('/api/home/category-news*', req => {
      req.reply({fixture: `category-news-${req.query.page}`});
    })
    .as('apiCategoryNews');

  // 정적 컨텐츠를 fixture값으로 대체하기 위해 의도적으로 다른 페이지에서 라우팅하여 이동
  cy.intercept('/api/home', {fixture: 'home'})
    .as('apiHome');

  cy.intercept('/article/info/**', {statusCode: 200})
    .as('apiArticleInfo');
  cy.intercept('/api/news/detail/*', {fixture: 'news-detail'})
    .as('apiNewsDetail');

  cy.intercept('/api/discussion/debate-home/**', {statusCode: 200})
    .as('apiDebateHome');

  cy.intercept('/api/overseas/home', {fixture: 'overseas-home'})
    .as('apiOverseasHome');

  cy.intercept('/api/overseas/home/meko-chart', {fixture: 'overseas-meko-chart'})
    .as('apiOverseasMekoChart');
  cy.intercept('/api/overseas/home/representative-stock*', req => {
      switch (req.query.category) {
        case 'DOW':
          req.reply({fixture: 'overseas-representative-stock-dow'});
          break;
        case 'NASDAQ':
          req.reply({fixture: 'overseas-representative-stock-nasdaq'});
          break;
        default:
          req.destroy();
          break;
      }
    })
    .as('apiOverseasRepresentativeStock');
  cy.intercept('/api/overseas/common', {fixture: 'overseas-common'})
    .as('apiOverseasCommon');

  cy.intercept('https://cmnt.zum.com/article/info/**', {fixture: 'cmnt-article-info'})
    .as('apiCmntArticleInfo');

  cy.intercept('https://cmnt.zum.com/cmnt/article-list/**', {fixture: 'cmnt-article-list'})
    .as('apiCmntArticleList');
});

Cypress.Commands.add(
  'shouldRequestOnScroll',
  (
    alias,
    options,
  ) => {
    const defaultOptions = {
      start: 2,
      count: 2,
      beforeEachScroll: () => {},
      afterEachScroll: () => {},
    };

    const combinedOptions = {
      ...defaultOptions,
      ...options,
    };

    const getPage = page => {
      combinedOptions.beforeEachScroll();
      cy.window()
        .scrollTo('bottom')
        .then(() => {
          combinedOptions.afterEachScroll();
          return cy
            .wait(100)
            .wait(alias);
        })
        .its('request.url')
        .should('contain', `page=${page}`)
        .then(() => {
          if (page <= combinedOptions.count) {
            getPage(page + 1);
          }
        });
    };
    getPage(combinedOptions.start);
  }
);

Cypress.Commands.add(
  'withHidden',
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
          .its('0.naturalWidth', {log: false})
          .should('be.greaterThan', 0);
      });
  }
);

Cypress.Commands.add(
  'ignoreKnownError',
  message => {
    return cy
      .on('uncaught:exception', err => {
        if (message instanceof RegExp) {
          if (message.test(err.message)) {
            return false;
          }
        } else {
          if (err.message.includes(message)) {
            return false;
          }
        }
      }
    );
  }
);

Cypress.Commands.add('login', () => 
  cy.setCookie('_ZIL', '1')  // 로그인 & 로그아웃 표시 버튼
    .setCookie('ZSID', '11111111-2222-3333-4444-555555555555')  // 회원관련 API 요청
    .reload()
);

Cypress.Commands.add('logout', () =>
  cy.clearCookie('_ZIL')
    .clearCookie('ZSID')
    .reload()
);

Cypress.Commands.overwrite('visit', (originalFn, url, options) => {
  const overwrittenOptions = {
    ...(options || {}),
    // 서버측의 응답실패로 인한 테스트 실패의 가능성 최소화
    retryOnStatusCodeFailure: true,
  };
  return originalFn(url, overwrittenOptions);
});