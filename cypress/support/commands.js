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
const {
  quicktype,
  InputData,
  jsonInputForTargetLanguage,
} = require('quicktype-core');

/*
 * NOTE: 원안은 `quicktype`의 출력 TypeScript 코드를 string으로
 * 스냅샷 테스트에 사용하려 했으나, `cypress-plugin-snapshots`의 미지원으로
 * interface에서 타입을 추출해 object 형태로 변환하여 임시 해결함
 * 
 * See:
 * - https://github.com/meinaart/cypress-plugin-snapshots/issues/181
 * - https://github.com/meinaart/cypress-plugin-snapshots/issues/122
 */
async function toTypeObject(json) {
  const jsonInput = jsonInputForTargetLanguage('ts');
  await jsonInput.addSource({
    name: 'TopLevel',
    samples: [JSON.stringify(json)],
  });

  const inputData = new InputData();
  inputData.addInput(jsonInput);

  const { lines } = await quicktype({
    inputData,
    lang: 'ts',
    inferEnums: false,
    leadingComments: []
  });

  const output = lines.join('\n');
  const types = output.match(/interface \w+ \{[^}]*\}/g);

  return types.reduce((acc, t) => {
    const name = /^interface (\w+)/.exec(t)[1];

    const props = t
      .split('\n')
      .map(s => s.match(/(\w+):\s+([^;]+);/))
      .filter(x => x)
      .reduce((acc, [_, k, v]) => {
        return {
          ...acc,
          [k]: v,
        };
      }, {});

    return {
      ...acc,
      [name]: props,
    };
  }, {});
}

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
})

Cypress.Commands.add(
  'toMatchApiSnapshot',
  {
    prevSubject: true,
  },
  (subject) => {
    return cy
      .wrap(subject)
      .its('body')
      .then(body => {
        cy.wrap(toTypeObject(body)).toMatchSnapshot();
      });
  }
);

Cypress.Commands.add(
  'stubCommonApi',
  () => {
    cy.intercept('/api/global', {fixture: 'global'})
      .as('apiGlobal');

    cy.intercept('/api/*/home/real-time-news*', req => {
        req.reply({fixture: `real-time-news-${req.query.page}`});
      })
      .as('apiRealTimeNews');

    cy.intercept('/api/suggest*', {fixture: 'search-suggest-zum'})
      .as('apiSuggest');

    cy.intercept('/article/info/**', {statusCode: 200})
      .as('apiArticleInfo');

    cy.intercept('/api/news/detail/*', {fixture: 'news-detail'})
      .as('apiNewsDetail');

    cy.intercept('/api/discussion/debate-home/**', {statusCode: 200})
      .as('apiDebateHome');

    cy.intercept('https://cmnt.zum.com/article/info/**', {fixture: 'cmnt-article-info'})
      .as('apiCmntArticleInfo');

    cy.intercept('https://cmnt.zum.com/cmnt/article-list/**', {fixture: 'cmnt-article-list'})
      .as('apiCmntArticleList');
  }
);

Cypress.Commands.add('stubInvestmentApi', () => {
  cy.intercept('/api/investment', {fixture: 'investment'}).as('apiInvestment');

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
});

Cypress.Commands.add('stubHomeApi', () => {
  cy.intercept('/api/home/category-news*', req => {
      req.reply({fixture: `category-news-${req.query.page}`});
    })
    .as('apiCategoryNews');

  cy.intercept('/api/home', {fixture: 'home'})
    .as('apiHome');
});

Cypress.Commands.add('stubDomesticApi', () => {
  cy.intercept('/api/domestic/common', {fixture: 'domestic-common'})
    .as('apiDomesticCommon');
  cy.intercept('/api/domestic/home', {fixture: 'domestic-home'})
    .as('apiDomesticHome');
  cy.intercept('/api/domestic/home/meko-chart', {fixture: 'domestic-meko-chart'})
    .as('apiMekoChart');
  cy.intercept('/api/domestic/ranking*', {fixture: 'domestic-ranking'})
    .as('apiDomesticRanking');
  cy.intercept('/api/domestic/industry/*', {fixture: 'domestic-industry'})
    .as('apiDomesticIndustry');
  cy.intercept('/api/domestic/stock/*', {fixture: 'domestic-stock'})
    .as('apiDomesticStock');
});

Cypress.Commands.add(
  'stubOverseasApi',
  () => {
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
  }
);

Cypress.Commands.add(
  'stubImages',
  () => {
    cy.intercept(/^https?:\/\/thumb\.zumst\.com\/.*/, req => {
      const url = new URL(req.url);
      if (url.pathname.startsWith('/378x241')) {
        req.reply({fixture: '378x241.jpg'});
      } else if (url.pathname.startsWith('/182x77')) {
        req.reply({fixture: '182x77.jpg'});
      } else if (url.pathname.startsWith('/166x116')) {
        req.reply({fixture: '166x116.jpg'});
      } else if (url.pathname.startsWith('/76x48')) {
        req.reply({fixture: '76x48.jpg'});
      } else if (url.pathname.startsWith('/54x34')) {
        req.reply({fixture: '54x34.jpg'});
      } else {
        req.reply({fixture: 'fallback.jpg'});
      }
    });

    cy.intercept('https://pip-thumb.zumst.com/api/v1/**', req => {
      if (req.query.w === 880 && req.query.h === 495) {
        req.reply({fixture: '880x495.jpg'});
      } else {
        req.reply({fixture: '640x360.jpg'});
      }
    });

    cy.intercept(/^https?:\/\/finance\.zumst\.com\/writing\/.+\.(png|jpe?g|gif)$/, {
      fixture: 'writer.png'
    });
    cy.intercept('https://static.news.zumst.com/images/**', {fixture: '640x360.jpg'});
  }
);

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

Cypress.Commands.add(
  'clickEachWithTable',
  {
    prevSubject: 'element',
  },
  (subject, table, predicate, selectorOrOptions) => {
    const defaultOptions = {
      activeClassName: 'active',
    };

    const options = {
      ...defaultOptions,
      ...(typeof selectorOrOptions === 'object' ? selectorOrOptions : {})
    };

    return cy
      .wrap(subject)
      .each($menu => {
        const selector = typeof selectorOrOptions === 'function' ?
          selectorOrOptions :
          $el => $el.text();

        const menuText = selector($menu);

        return cy
          .wrap($menu)
          .click({force: true})
          .should('have.ancestors', `.${options.activeClassName}`)
          .then(() => predicate(table[menuText]));
      });
  }
);

Cypress.Commands.add(
  'waitUntil',
  (alias, predicate, options) =>
    recurse(
      () => cy.get(alias),
      http => http && predicate(http),
      {
        limit: Infinity,
        timeout: Cypress.config('requestTimeout') || 5000,
        delay: 1,
        log: false,
        ...options,
      },
    ),
);

Cypress.Commands.add(
  'reverse',
  {
    prevSubject: true,
  },
  subject => {
    const log = Cypress.log({
      autoEnd: false,
      displayName: 'reverse',
    });
    try {
      const reversed = Array.from(subject).reverse();
      log.set({$el: reversed})
      return reversed;
    } catch (e) {
      log.error(e);
      return subject;
    } finally {
      log.end();
    }
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
    // 서버측의 응답실패로 인한 테스트 실패의 가능성 최소화
    retryOnStatusCodeFailure: true,
    failOnStatusCode: false,
    ...(options || {}),
  };
  return originalFn(url, overwrittenOptions);
});