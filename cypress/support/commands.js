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

require('@cypress/skip-test/support')
require('cypress-real-events/support');
require('cypress-plugin-snapshots/commands');
const { recurse } = require('cypress-recurse');
const {
  quicktype,
  InputData,
  jsonInputForTargetLanguage,
} = require('quicktype-core');

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

/**
 * quicktype으로 생성한 타입에서 interface를 정규식으로 추출하여
 * [key: value] 쌍의 오브젝트로 변환하여 사용한다
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
    inferDateTimes: false,
    leadingComments: []
  });

  const output = lines.join('\n');
  const interfaces = output.match(/interface \w+ \{[^}]*\}/g);

  return interfaces.reduce((acc, i) => {
    const name = /^interface (\w+)/.exec(i)[1];

    const props = Object.fromEntries(
      i
        .split('\n')
        .map(s => s.match(/(\w+):\s+([^;]+);/))
        .filter(x => x)
        .map(([_, k, v]) => [k, v])
    );

    return {
      ...acc,
      [name]: props,
    };
  }, {});
}

Cypress.Commands.add(
  'toMatchApiSnapshot',
  {
    prevSubject: true,
  },
  (subject, options = {}) => {
    const merge = typeof options === 'object' &&
      typeof options.merge === 'object' &&
      options.merge;
    delete options.merge;

    return cy
      .wrap(subject)
      .its('body')
      .then(toTypeObject)
      .then(typeObject => {
        cy.wrap(
          Cypress._.merge(typeObject, merge || {})
        ).toMatchSnapshot(options);
      });
  }
);

Cypress.Commands.add(
  'stubCommonApi',
  () => {
    cy.intercept('/api/global', {fixture: 'api/global.json'})
      .as('apiGlobal');

    cy.intercept('/api/*/home/real-time-news*', req => {
        req.reply({fixture: `real-time-news-${req.query.page}.json`});
      })
      .as('apiRealTimeNews');

    cy.intercept('/article/info/**', {statusCode: 200})
      .as('apiArticleInfo');

    cy.intercept('/api/news/detail/*', {fixture: 'api/news/detail.json'})
      .as('apiNewsDetail');

    cy.intercept('/api/discussion/debate-home/**', {statusCode: 200})
      .as('apiDebateHome');

    cy.intercept('https://cmnt.zum.com/article/info/**', {fixture: 'cmnt.zum.com/article/info.json'})
      .as('apiCmntArticleInfo');

    cy.intercept('https://cmnt.zum.com/cmnt/article-list/**', {fixture: 'cmnt.zum.com/cmnt/article-list.json'})
      .as('apiCmntArticleList');
  }
);

Cypress.Commands.add('stubLoginApi', () => {
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

Cypress.Commands.add('stubInvestmentApi', () => {
  cy.intercept('/api/investment', {fixture: 'api/investment.json'}).as('apiInvestment');

  cy.intercept('/api/investment/authors*', req => {
      req.reply({fixture: 'api/investment/authors.json'});
    })
    .as('apiInvestmentAuthors');

  cy.intercept('/api/investment/authors/*', {fixture: 'api/investment/author.json'})
    .as('apiInvestmentAuthor');

  cy.intercept('/api/investment/posts*', req => {
      req.reply({fixture: `api/investment/home/authors-${req.query.page}.json`});
    })
    .as('posts');

  cy.intercept('/api/investment/posts/*', {fixture: 'api/investment/posts.json'})
    .as('apiInvestmentPosts');

  cy.intercept('/api/investment/home/authors*', req => {
      req.reply({fixture: `api/investment/home/authors-${req.query.page}.json`});
    })
    .as('apiAuthors');

  cy.intercept('/api/investment/authors/*/posts/recent**', req => {
      req.reply({fixture: `api/investment/authors/posts/recent-${req.query.page}.json`});
    })
    .as('apiAuthorsPostsRecent');
});

Cypress.Commands.add('stubHomeApi', () => {
  cy.intercept('/api/home/category-news*', req => {
      req.reply({fixture: `api/home/category-news-${req.query.page}.json`});
    })
    .as('apiCategoryNews');

  cy.intercept('/api/home', {fixture: 'api/home.json'})
    .as('apiHome');
});

Cypress.Commands.add('stubDomesticApi', () => {
  cy.intercept('/api/domestic/common', {fixture: 'api/domestic/common.json'})
    .as('apiDomesticCommon');
  cy.intercept('/api/domestic/home', {fixture: 'api/domestic/home.json'})
    .as('apiDomesticHome');
  cy.intercept('/api/domestic/home/meko-chart', {fixture: 'api/domestic/meko-chart.json'})
    .as('apiMekoChart');
  cy.intercept('/api/domestic/ranking*', {fixture: 'api/domestic/ranking.json'})
    .as('apiDomesticRanking');
  cy.intercept('/api/domestic/industry/*', {fixture: 'api/domestic/industry.json'})
    .as('apiDomesticIndustry');
  cy.intercept('/api/domestic/stock/*', {fixture: 'api/domestic/stock.json'})
    .as('apiDomesticStock');
});

Cypress.Commands.add(
  'stubOverseasApi',
  () => {
    cy.intercept('/api/overseas/home', {fixture: 'api/overseas/home.json'})
      .as('apiOverseasHome');

    cy.intercept('/api/overseas/home/meko-chart', {fixture: 'api/overseas/meko-chart.json'})
      .as('apiOverseasMekoChart');

    cy.intercept('/api/overseas/home/representative-stock*', req => {
        switch (req.query.category) {
          case 'DOW':
            req.reply({fixture: 'api/overseas/home/representative-stock-dow.json'});
            break;
          case 'NASDAQ':
            req.reply({fixture: 'api/overseas/home/representative-stock-nasdaq.json'});
            break;
          default:
            req.destroy();
            break;
        }
      })
      .as('apiOverseasRepresentativeStock');

    cy.intercept('/api/overseas/common', {fixture: 'api/overseas/common.json'})
      .as('apiOverseasCommon');
  }
);

Cypress.Commands.add(
  'stubImages',
  () => {
    cy.intercept(/^https?:\/\/thumb\.zumst\.com\/.*/, req => {
      const url = new URL(req.url);
      const dimension = (/\d+x\d+/.exec(url.pathname) || [])[0];
      switch (dimension) {
        case '378x241':
        case '182x77':
        case '166x116':
        case '76x48':
        case '54x34':
          req.reply({fixture: dimension + '.jpg'});
          break;
        default:
          req.reply({fixture: 'fallback.jpg'});
          break;
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
      .then($el => cy.wrap($el.css('visibility', 'hidden')))
      .then($el => {
        callback($el);
        return cy.wrap($el);
      })
      .then($el => cy.wrap($el.css('visibility', 'visible')));
  }
);

/**
 * selector로 이미지 태그를 선택하여 이미지의 넓이가 0이 아닌경우
 * 이미지가 로드되어 화면에 표시 되었다고 판단하고 다음 명령을 실행
 */
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

/**
 * 이미지 스냅샷의 표준화를 위해 컨테이너의 리눅스 환경이 아닌경우
 * 테스트하지 않도록 처리하고, 이외에는 이미지 fixture를 적용
 */
Cypress.Commands.add(
  'useImageSnapshot',
  () => 
    cy.onlyOn('linux')
      .stubImages(),
);

/**
 * SSR로 인한 API 호출 부재를 우회하기 위해 다른 페이지로부터 라우팅하여 API호출을 유도
 */
Cypress.Commands.add(
  'triggerRouteAndVisit',
  (path, options) => {
    const pathTable = {
      '/': '홈',
      '/global': '해외증시',
      '/domestic': '국내증시',
      '/investment': '투자노트',
    };
    expect(pathTable[path], 'pathTable에 페이지가 존재하지 않음')
      .to.be.string;

    // 리소스가 많지 않은 가벼운 페이지라면 아무페이지나 가능하나, 반드시 투자 gnb 메뉴가 있는 페이지여야 한다.
    cy.intercept('/api/domestic/ranking', {statusCode: 503});
    cy.visit('/domestic/ranking', options);

    return cy
      .get('.gnb_finance')
      .find('a')
      .filter(`:contains("${pathTable[path]}")`)
      .click();
  }
)

/**
 * 알려진 클라이언트 사이드 오류(무시가능한, 혹은 수정, 파악중인)로 인해 테스트가 실패하지 않도록 명시적으로 처리
 */
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

/**
 * 클릭한 요소가 활성화 되었는지 확인하고
 * 해당 요소의 텍스트를 key로 사용하는 테이블(오브젝트)을 인자로 받아
 * key에 대응하는 value를 인자로 받는 조건 콜백을 통해 assertion 처리
 */
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

/**
 * 응답이 일정시간동안 오지 않으면 실패하는 `cy.wait`과 달리 조건을 만족할때까지 반복적으로 대기
 */
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
    ...(options || {}),
  };
  return originalFn(url, overwrittenOptions);
});