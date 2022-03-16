require('cypress-iframe');

/**
 * 메코차트의 컨테이너가 로드되었는지 확인하는 함수
 */
const expectContainerLoaded = (...args) => {
  cy.frameLoaded(...args);

  const option = args[1];
  if (option && typeof option === 'object') {
    if (typeof option.onAfterLoad === 'function') {
      option.onAfterLoad();
    }
  }
};
const getContainer = selector => cy.iframe(selector);

const hideHeaderWhile = callback =>
  cy.createHidingContext('#header', callback);

const bypassClockOverride = () => {
  // clock을 기본값으로 돌립니다.
  // https://docs.cypress.io/api/commands/clock#Behavior
  cy.clock().invoke('restore');
  cy.visit('https://invest.zum.com/domestic');
};

/**
 * `/api/domestic/home` API 호출이 일어나도록 강제
 */
const triggerDomesticHomeApi = () => {
  cy.tick(20000);
};

describe('국내증시', () => {
  const now = new Date(2022, 3, 15, 10, 50, 0);
  beforeEach(() => {
    cy.clock(now);
  });

  afterEach(() => {
    cy.clock().invoke('restore');
  });

  beforeEach(() => {
    cy.stubThirdParty();

    cy.intercept('/api/global', {fixture: 'global'});
    cy.intercept('/api/domestic/common', {fixture: 'domestic-common'});
    cy.intercept('/api/domestic/home', {fixture: 'domestic-home'});
    cy.intercept('/api/domestic/home/meko-chart', {fixture: 'meko-chart'});

    cy.intercept('/api/domestic/home/real-time-news*', req => {
      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get('page'), 10);
      req.reply({fixture: `real-time-news-${page-1}`});
    }).as('apiRealTimeNews');

    cy.visit('https://invest.zum.com/domestic');
  });

  describe('국내증시 MAP', () => {
    const containerSelector = '.map_cont iframe';
    beforeEach(() => {
      // `cy.viewport`를 사용해서 screenshot 저장시 차트가 초기화되는 버그를 해결 가능
      // https://docs.cypress.io/api/commands/viewport#Arguments
      cy.viewport('macbook-13');

      expectContainerLoaded(
        containerSelector,
        {
          onAfterLoad: () => {
            // 툴팁 애니메이션을 기다리지 않고 제거
            cy.get(containerSelector)
              .its('0.contentWindow')
              .then(win => {
                win.eval(`
                  const style = document.createElement('style');
                  style.textContent = '[id^="chart-info-tooltip"] { display: none }';
                  document.head.appendChild(style);
                `);
              });
          }
        }
      );
      getContainer(containerSelector)
        .as('mekoChartContainer');
    });

    it('MAP을 상하로 스크롤하여 확대, 축소 할 수 있다.', () => {
      const ScrollDirection = {
        UP: 0,
        DOWN: 1,
      };
      const zoomAndMatchImageSnapshot =
        (direction=ScrollDirection.DOWN, delta=4) => {
          const option = {
            deltaX: 0, deltaZ: 0, deltaMode: 0,
            deltaY: direction === ScrollDirection.UP ? delta : -delta,
          };
          cy.get('@mekoChartContainer')
            .trigger('wheel', 'center', option);

          return cy.get(containerSelector)
            .toMatchImageSnapshot();
        };

      hideHeaderWhile(() => {
        cy.get(containerSelector)
          .toMatchImageSnapshot()
          .then(() => {
            return Promise.all([
              zoomAndMatchImageSnapshot(ScrollDirection.DOWN),
              zoomAndMatchImageSnapshot(ScrollDirection.UP),
            ])
          });
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
              .click()
              .parent('.active');
            
            cy.get(containerSelector)
              .toMatchImageSnapshot();
          });
      });
    });

  });  // END: 국내증시 MAP

  it('HOT 업종을 화살표를 눌러 좌우로 살펴볼 수 있다.', () => {
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
              callback(
                cy.wrap($tab)
                  .trigger('mouseenter', {force: true}),
                $wrap
              );
            });
        });

    it('각 지표 탭에 마우스를 올리면 활성화 된다.', () => {
      forEachTab(subject => subject.parent('.active'));
    });

    it('각 지표를 올바르게 표시한다.', () => {
      forEachTab(
        (_, $wrap) => {
          triggerDomesticHomeApi();

          hideHeaderWhile(() => {
            cy.wrap($wrap).toMatchImageSnapshot();
          });
        });
    });
  });  // END: 실시간 국내 증시

  describe('이번주 투자 캘린더', () => {
    beforeEach(() => {
      bypassClockOverride();
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
      triggerDomesticHomeApi();

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

  // FIXME: 페이지를 +2 오프셋으로 받아오는 문제
  it.skip('스크롤을 하여 실시간 테마 뉴스를 불러온다.', () => {
    cy.shouldRequestOnScroll('@apiRealTimeNews');
  });
});  // END: 국내증시
