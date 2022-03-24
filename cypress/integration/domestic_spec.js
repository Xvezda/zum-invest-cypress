require('cypress-iframe');
const { recurse } = require('cypress-recurse');

describe('국내증시', () => {
  const now = new Date(2022, 3, 15, 10, 50, 0);
  beforeEach(() => {
    cy.clock(now);
  });

  afterEach(() => {
    cy.clock().invoke('restore');
  });

  const interceptApiRequests = () => {
    cy.intercept('/api/global', {fixture: 'global'})
      .as('apiGlobal');
    cy.intercept('/api/domestic/common', {fixture: 'domestic-common'})
      .as('apiDomesticCommon');
    cy.intercept('/api/domestic/home', {fixture: 'domestic-home'})
      .as('apiDomesticHome');
    cy.intercept('/api/domestic/home/meko-chart', {fixture: 'domestic-meko-chart'})
      .as('apiMekoChart');
  };

  /**
   * `/api/domestic/home` API 호출이 일어나도록 강제
   */
  const triggerDomesticHomeApi = () =>
    cy.tick(20001);
  
  const triggerMekoChartApi = () =>
    cy.tick(5000);

  beforeEach(() => {
    cy.stubThirdParty();

    interceptApiRequests();
    cy.intercept('/api/domestic/home/real-time-news*', req => {
        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get('page'), 10);
        req.reply({fixture: `real-time-news-${page-1}`});
      })
      .as('apiRealTimeNews');

    cy.visit('/domestic', {
      onBeforeLoad(win) {
        cy.spy(win, 'postMessage').as('postMessage');
      }
    });
  });

  const hideHeaderWhile = callback =>
    cy.withHidden('#header', callback);

  describe('국내증시 MAP', () => {
    it('MAP의 종류를 선택할 수 있다.', () => {
      const mapTable = {
        '코스피': 'KOSPI',
        '코스닥': 'KOSDAQ'
      };
      cy.get('.map_title_wrap').within(() => {
        cy.get('ul > li:not(:first-child) > a')
          .each($menu => {
            const menuText = $menu.text();
            cy.get(`a:contains("${menuText}")`)
              .click()
              .url()
              .should('contain', `category=${mapTable[menuText]}`);
          });
        });
    });

    it('활성화된 MAP의 종류에 따라 보이는 차트가 변경된다.', () => {
      cy.get('.map_cont iframe')
        .as('mekoChart');

      const expectMekoChartLoaded = () =>
        cy.get('@mekoChart')
          .its('0.contentWindow')
          .then(function injectTooltipHidingStyle(win) {
            win.eval(`
              const style = document.createElement('style');
              style.textContent = '[id*="chart-info-tooltip"] { display: none !important }';
              document.head.appendChild(style);
            `);
          });

      const expectMekoChartSnapshotToMatch = () =>
        cy.get('@mekoChart')
          .toMatchImageSnapshot();

      // NOTE: 불안정한 메코차트의 로드 문제 해결
      // TODO: 근본적인 원인 파악
      recurse(
        () => {
          triggerMekoChartApi();
          cy.wait('@apiMekoChart');
          return cy
            .get('@mekoChart')
            .its('0.contentDocument.body');
        },
        $body => expect($body).to.have.descendants('[id^="treemap-node-stock"]')
      );

      expectMekoChartLoaded()
        .then(() => {
          hideHeaderWhile(() => {
            expectMekoChartSnapshotToMatch();
            cy.get('.map_menu_tab li:not(:first-child) > a')
              .each($menu => {
                cy.wrap($menu)
                  .click({force: true})
                  .should('be.activated')
                  .then(expectMekoChartSnapshotToMatch);
              });
          });
        });

    });
  });  // END: 국내증시 MAP

  it('HOT 업종을 화살표를 눌러 좌우로 살펴볼 수 있다.', () => {
    cy.wait('@apiDomesticCommon');

    cy.get('.main_news_list')
      .scrollIntoView();

    cy.get('.main_news_list + .navi > .next')
      .click({force: true});

    cy.get('.main_news_list ul > li')
      .as('newsItems')
      .last()
      .should('be.visible');

    cy.get('.main_news_list + .navi > .prev')
      .click({force: true});

    cy.get('@newsItems')
      .first()
      .should('be.visible');
  });

  describe('실시간 국내 증시', () => {
    it('코스피 지수를 보여준다.', () => {
      triggerDomesticHomeApi();
      hideHeaderWhile(() => {
        cy.get('.stock_index_wrap')
          .toMatchImageSnapshot();
      });
    });

    it('각 지표 탭에 마우스를 올리면 활성화 된다.', () => {
      const forEachTab = callback =>
        cy.get('.stock_index_wrap')
          .as('stockIndexWrap')
          .scrollIntoView()
          .find('ul > li > a')
          .each($tab => {
            cy.get('@stockIndexWrap')
              .then($wrap => {
                callback($tab, $wrap);
              });
          });

      const withMouseOver = ($el, callback) => {
        const subject = cy.wrap($el);
        subject.trigger('mouseenter', {force: true});
        callback(subject);
        subject.trigger('mouseleave', {force: true});
      };

      forEachTab($tab => {
        withMouseOver($tab, subject => subject.should('activated'));
      });
    });

  });  // END: 실시간 국내 증시

  describe('이번주 투자 캘린더', () => {
    beforeEach(() => {
      cy.clock()
        .invoke('restore')
        .visit('/domestic');
    });

    it('날짜를 클릭하면 캘린더가 해당 위치로 자동 스크롤 된다.', () => {
      cy.get('.investment_calendar')
        .scrollIntoView()
        .within(() => {
          cy.get('ul.investment_calendar_tab > li > a')
            .as('investCalendarMenus');

          // 마지막 날짜를 클릭
          cy.get('@investCalendarMenus')
            .last()
            .click();

          cy.get('.investment_calendar_scroll ul > li')
            .last()
            .should('be.visible');

          // 다시 첫번째 날짜를 클릭
          cy.get('@investCalendarMenus')
            .first()
            .click();

          cy.get('.investment_calendar_scroll ul > li')
            .first()
            .should('be.visible');
        });
    });
  });  // END: 이번주 투자 캘린더

  describe('오늘의 HOT PICK', () => {
    it('메뉴를 눌러 선정된 종목들을 볼 수 있다.', () => {
      triggerDomesticHomeApi();
      cy.wait('@apiDomesticHome');

      const menuTable = {
        '급등주 PICK': 'soaring',
        '리포트 PICK': 'report',
        '거래급증': 'transaction-rise',
        '신규상장주': 'new',
        '낙폭과대': 'fall',
        '골든크로스': 'golden-cross',
      };
      cy.get('.today_hot_pick')
        .as('todayHotPick')
        .find('ul > li > a')
        .each($menu => {
          const menuText = $menu.text();
          cy.wrap($menu)
            .click()
            .should('be.activated');
          
          cy.get('@apiDomesticHome')
            .its('response.body')
            .then(home => {
              const key = menuTable[menuText];
              const items = home.todayHotPick[key];

              items
                .map(item => item.name)
                .forEach(name =>
                  cy.get('@todayHotPick')
                    .contains(name)
                    .should('be.visible'));
            });
        });
    });
  }); // END: 오늘의 HOT PICK

  describe('ZUM 인기종목', () => {
    it('로드가 되면 첫 번째 탭이 활성화 되어 관련 내용이 보여진다.', () => {
      triggerDomesticHomeApi();
      hideHeaderWhile(() => {
        cy.get('.popularity_event_wrap')
          .toMatchImageSnapshot();
      });
    });

    it('각 탭에 마우스를 올려 인기종목과 연관기사를 볼 수 있다.', () => {
      const emulateMouseOverAndMatch = $tab =>
        cy.wrap($tab)
          .trigger('mouseenter', {force: true})
          .should('activated');
        
      cy.get('.popularity_event_wrap')
        .find('ul > li > a')
        .each(emulateMouseOverAndMatch);
    });
  });  // END: ZUM 인기종목

  // FIXME: 페이지를 +2 오프셋으로 받아오는 문제
  it.skip('스크롤을 하여 실시간 테마 뉴스를 불러온다.', () => {
    cy.shouldRequestOnScroll('@apiRealTimeNews');
  });
});  // END: 국내증시
