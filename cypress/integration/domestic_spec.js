require('cypress-iframe');

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
const hideStickyHeader = () => Cypress.$('#header').hide();
const showStickyHeader = () => Cypress.$('#header').show();

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
                  document.querySelectorAll('[id^="chart-info-tooltip"]')
                    .forEach(node => node.parentNode.removeChild(node));
                `);
              });
          }
        }
      );
      getContainer(containerSelector)
        .as('mekoChartContainer');

      hideStickyHeader();
    });

    afterEach(() => {
      showStickyHeader();
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

      cy.get(containerSelector)
        .toMatchImageSnapshot()
        .then(() => {
          return Promise.all([
            zoomAndMatchImageSnapshot(ScrollDirection.DOWN),
            zoomAndMatchImageSnapshot(ScrollDirection.UP),
          ])
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
      cy.get('.map_menu_tab li:not(:first-child) > a')
        .each(menu => {
          cy.wrap(menu)
            .click()
            .parent('.active');
          
          cy.get(containerSelector)
            .toMatchImageSnapshot();
        });
    });

    it('전체화면 버튼을 누르면 차트를 페이지 전체 크기로 보여준다.', () => {
      const matchFullScreenImageSnapshot = () => {
        return cy.get('.fullScreen')
          .should('be.visible')
          .toMatchImageSnapshot();
      };

      cy.get('.map_cont_wrap button:contains("전체화면")')
        .click()
        .then(() => {
          return matchFullScreenImageSnapshot();
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
      .click();

    cy.get('@newsItems')
      .first()
      .should('be.visible');
  });

  describe('실시간 국내 증시', () => {
    beforeEach(hideStickyHeader);
    afterEach(showStickyHeader);

    const forEachTab = callback =>
      cy.get('.stock_index_tab > *')
        .each(tab => {
          callback(
            cy.wrap(tab)
              .trigger('mouseenter')
          );
        });

    it('각 지표 탭에 마우스를 올리면 활성화 된다.', () => {
      forEachTab(subject => subject.should('have.class', 'active'));
    });

    it('각 지표를 올바르게 표시한다.', () => {
      const selector = '.stock_index_wrap';
      cy.get(selector).scrollIntoView();

      forEachTab(() => {
        cy.tick(20000);

        cy.get(selector)
          .toMatchImageSnapshot()
      });
    });
  });  // END: 실시간 국내 증시

  describe('이번주 투자 캘린더', () => {
    beforeEach(() => {
      // 현재 테스트에서는 clock을 기본값으로 돌립니다.
      // https://docs.cypress.io/api/commands/clock#Behavior
      cy.clock().invoke('restore');
      cy.visit('https://invest.zum.com/domestic');
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

  // FIXME: 페이지를 +2 오프셋으로 받아오는 문제
  it.skip('스크롤을 하여 실시간 테마 뉴스를 불러온다.', () => {
    cy.shouldRequestOnScroll('@apiRealTimeNews');
  });
});  // END: 국내증시
