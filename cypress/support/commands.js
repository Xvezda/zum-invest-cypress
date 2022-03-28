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
      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get('page'), 10);
      req.reply({fixture: `investment-home-authors-${page}`});
    })
    .as('posts');
  cy.intercept('/api/investment/posts/*', {fixture: 'investment-posts'})
    .as('apiInvestmentPosts');
  cy.intercept('/api/investment/home/authors*', req => {
      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get('page'), 10);
      req.reply({fixture: `investment-home-authors-${page}`});
    })
    .as('apiAuthors');

  cy.intercept('/api/investment/authors/*/posts/recent**', req => {
      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get('page'), 10);
      req.reply({fixture: `investment-authors-posts-recent-${page}`});
    })
    .as('apiAuthorsPostsRecent');

  cy.intercept('/api/domestic/common', {fixture: 'domestic-common'})
    .as('apiDomesticCommon');
  cy.intercept('/api/domestic/home', {fixture: 'domestic-home'})
    .as('apiDomesticHome');
  cy.intercept('/api/domestic/home/meko-chart', {fixture: 'domestic-meko-chart'})
    .as('apiMekoChart');

  cy.intercept('/api/*/home/real-time-news*', req => {
      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get('page'), 10);
      req.reply({fixture: `real-time-news-${page}`});
    })
    .as('apiRealTimeNews');


  cy.intercept('/api/suggest*', {fixture: 'search-suggest-zum'})
    .as('apiSuggest');
  cy.intercept('/api/home/category-news*', req => {
      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get('page'), 10);
      req.reply({fixture: `category-news-${page}`});
    })
    .as('apiCategoryNews');

  // 정적 컨텐츠를 fixture값으로 대체하기 위해 의도적으로 다른 페이지에서 라우팅하여 이동
  cy.fixture('home')
    .then(home => {
      const [firstItem,] = home.realtimeComments.items;
      firstItem.content = '세상을 읽고 담는 줌인터넷';
      firstItem.stockCode = '239340';
      firstItem.stockName = '줌인터넷';

      cy.intercept('/api/home', home)
        .as('apiHome');
    });

  cy.intercept('/article/info/**', {statusCode: 200});
  cy.intercept('/api/news/detail/*', {fixture: 'news-detail'});

  cy.intercept('/api/discussion/debate-home/**', {statusCode: 200});
  cy.intercept('/api/overseas/home', {fixture: 'overseas-home'})
    .as('apiOverseasHome');
  cy.intercept('/api/overseas/home/meko-chart', {fixture: 'overseas-meko-chart'})
    .as('apiOverseasMekoChart');
  cy.intercept('/api/overseas/home/representative-stock*', {statusCode: 200});
  cy.intercept('/api/overseas/common', {fixture: 'overseas-common'})
    .as('apiOverseasCommon');
});

Cypress.Commands.add('stubThirdParty', () => {
  // 테스트 속도 개선을 위해 외부에서 불러오는 자원을 stub 처리
  const register = (pattern, code=200) => cy.intercept(pattern, {statusCode: code});

  register('https://zvod.zumst.com/zumvrix/zvod/**', 206);

  cy.on('uncaught:exception', err => {
    if (err.message.includes('kakaoPixel is not defined')) {
      return false;
    }
  });
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
          return cy.wait(alias);
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
    cy.on('uncaught:exception', err => {
      if (message instanceof RegExp && message.test(err.message)) {
        return false;
      } else if (err.message.includes(message)) {
        return false;
      }
    });
  }
);

Cypress.Commands.add('login', () => cy.setCookie('_ZIL', '1').reload());
Cypress.Commands.add('logout', () => cy.clearCookie('_ZIL').reload());