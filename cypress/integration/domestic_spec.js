require('cypress-iframe');

const getContainer = selector => cy.iframe(selector);

const injectTooltipHidingStyle = win => {
  win.eval(`
    const style = document.createElement('style');
    style.textContent = '[id*="chart-info-tooltip"] { display: none !important }';
    document.head.appendChild(style);
  `);
};

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

const containerSelector = '.map_cont iframe';
const expectContainerLoaded = (...args) => {
  cy.frameLoaded(...args);

  const option = args[1];
  if (option && typeof option === 'object') {
    if (typeof option.onAfterLoad === 'function') {
      option.onAfterLoad();
    }
  }
};

const ensureMekoChartLoaded = () => {
  expectContainerLoaded(
    containerSelector,
    {
      url: '//chart-finance.zum.com/api/chart/treemap/domestic/',
      onAfterLoad: () => {
        triggerDomesticHomeApi();
        cy.iframe(containerSelector)
          .find('#chart-svg [id^="treemap-node-stock"]')
          .then(() => {
            return cy.wait('@apiMekoChart');
          })
          .then(() => {
            return cy.get(containerSelector)
              .its('0.contentWindow')
              .then(injectTooltipHidingStyle)
          });
      }
    }
  );
};

const hideHeaderWhile = callback =>
  cy.createHidingContext('#header', callback);

const bypassClockOverride = () => {
  // clock을 기본값으로 돌립니다.
  // https://docs.cypress.io/api/commands/clock#Behavior
  return cy.clock()
    .invoke('restore')
    .visit('/domestic');
};

/**
 * `/api/domestic/home` API 호출이 일어나도록 강제
 */
const triggerDomesticHomeApi = () =>
  cy.tick(20000)
    .wait('@apiDomesticHome');


describe('국내증시', () => {
  const now = new Date(2022, 3, 15, 10, 50, 0);
  beforeEach(() => {
    cy.clock(now);
    cy.tick(1000);
  });

  afterEach(() => {
    cy.clock().invoke('restore');
  });

  beforeEach(() => {
    cy.stubThirdParty();

    interceptApiRequests();
    cy.intercept('/api/domestic/home/real-time-news*', req => {
      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get('page'), 10);
      req.reply({fixture: `real-time-news-${page-1}`});
    }).as('apiRealTimeNews');

    cy.visit('/domestic');
    ensureMekoChartLoaded();
  });

  describe('국내증시 MAP', () => {
    beforeEach(() => {
      getContainer(containerSelector)
        .as('mekoChartContainer');
    });

    it('MAP을 상하로 스크롤하여 확대, 축소 할 수 있다.', () => {
      const ScrollDirection = {
        UP: 0,
        DOWN: 1,
      };

      const zoomAndMatchImageSnapshot = (
        direction=ScrollDirection.DOWN,
        delta=4
      ) => {
        const option = {
          force: true,
          deltaX: 0, deltaZ: 0, deltaMode: 0,
          deltaY: direction === ScrollDirection.UP ? delta : -delta,
        };

        const emulateUserScroll = () =>
          cy.get('@mekoChartContainer')
            .find('#chart-svg')
            .trigger('wheel', 'center', option);

        emulateUserScroll()
          .then(() => {
            cy.get(containerSelector)
              .toMatchImageSnapshot();
          });
      };

      const doUserZoomIn = () => zoomAndMatchImageSnapshot(ScrollDirection.DOWN);
      const doUserZoomOut = () => zoomAndMatchImageSnapshot(ScrollDirection.UP);
      hideHeaderWhile(() => {
        cy.get(containerSelector)
          .toMatchImageSnapshot()
          .then(doUserZoomIn)
          .then(doUserZoomOut);
      });
    });

    it('MAP의 종류를 선택할 수 있다.', () => {
      const mapTable = {
        'TOP1000': 'ALL',
        '코스피': 'KOSPI',
        '코스닥': 'KOSDAQ'
      };
      cy.get('.map_menu_tab').within(() => {
        cy.get('li:not(:first-child) > a')
          .each(menu => {
            const menuText = menu.text();
            cy.get(`a:contains("${menuText}")`)
              .click()
              .url()
              .should('contain', `category=${mapTable[menuText]}`);
          });
        });
    });

    it('활성화된 MAP의 종류에 따라 보이는 차트가 변경된다.', () => {
      hideHeaderWhile(() => {
        cy.get('.map_menu_tab li:not(:first-child) > a')
          .each(menu => {
            cy.wrap(menu)
              .click({force: true})
              .parent('.active')
            
            cy.get(containerSelector)
              .toMatchImageSnapshot();
          });
      });
    });

  });  // END: 국내증시 MAP

  it('HOT 업종을 화살표를 눌러 좌우로 살펴볼 수 있다.', () => {
    cy.wait('@apiDomesticCommon');

    cy.get('.main_news_list')
      .scrollIntoView();

    cy.get('.main_news_list + .navi > .next')
      .click({force: true});  // button is being covered by another element: <html lang="ko">...</html>??

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

    it('각 지표 탭에 마우스를 올리면 활성화 된다.', () => {
      forEachTab(subject => subject.parent('.active'));
    });

    it('각 지표를 올바르게 표시한다.', () => {
      forEachTab(
        ($tab, $wrap) => {
          triggerDomesticHomeApi();

          hideHeaderWhile(() => {
            cy.wrap($tab).trigger('mouseenter', {force: true}),
            cy.wrap($wrap).toMatchImageSnapshot();
            cy.wrap($tab).trigger('mouseleave', {force: true});
          });
        });
    });
  });  // END: 실시간 국내 증시

  describe('이번주 투자 캘린더', () => {
    beforeEach(() => {
      bypassClockOverride()
        .then(interceptApiRequests);
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

      hideHeaderWhile(() => {
        cy.get('.today_hot_pick')
          .within(() => {
            cy.get('ul > li:not(:first-children) > a')
              .first()
              .each($menu => {
                  cy.wrap($menu)
                    .click()
                    .parent('.active')
                    .toMatchImageSnapshot();
              });
          });
      });
    });
  }); // END: 오늘의 HOT PICK

  describe('ZUM 인기종목', () => {
    it('각 탭에 마우스를 올려 인기종목과 연관기사를 볼 수 있다.', () => {
      triggerDomesticHomeApi()
        .then(() => {
          hideHeaderWhile(() => {
            cy.get('.popularity_event_wrap')
              .within(() => {
                cy.get('ul > li > a')
                  .each($tab => {
                    return cy.wrap($tab)
                      .trigger('mouseenter', {force: true})
                      .toMatchImageSnapshot();
                  });
              });
          });
        });
    });
  });

  // FIXME: 페이지를 +2 오프셋으로 받아오는 문제
  it.skip('스크롤을 하여 실시간 테마 뉴스를 불러온다.', () => {
    cy.shouldRequestOnScroll('@apiRealTimeNews');
  });
});  // END: 국내증시
