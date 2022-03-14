require('cypress-iframe');

describe('국내증시', () => {
  beforeEach(() => {
    cy.intercept('/api/domestic/common', {fixture: 'domestic-common'})
      .as('common');
    cy.intercept('/api/domestic/home/meko-chart', {fixture: 'meko-chart'})
      .as('mekoChart');

    cy.intercept('/api/domestic/home/real-time-news*', req => {
      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get('page'), 10);
      req.reply({fixture: `real-time-news-${page-1}`});
    }).as('realTimeNews');

    cy.visit('https://invest.zum.com/domestic', {
      onBeforeLoad(win) {
        // 주기적으로 불러오는 API 요청을 차단
        cy.stub(win, 'setTimeout')
          .returns(function () {})
          .log(false);
      }
    });
  });

  it.only('MAP을 상하로 스크롤하여 확대, 축소 할 수 있다.', () => {
    // `cy.viewport`를 사용해서 screenshot 차트 초기화 버그를 해결 가능
    // https://docs.cypress.io/api/commands/viewport#Arguments
    cy.viewport('macbook-13');

    cy.frameLoaded('.map_cont iframe', {
      url: 'https://chart-finance.zum.com/api/chart/treemap/domestic/'
    });

    // 툴팁 애니메이션을 기다리지 않고 제거
    cy.get('.map_cont iframe')
      .its('0.contentWindow')
      .then($win => {
        $win.eval(`
          document.querySelectorAll('[id^="chart-info-tooltip"]')
            .forEach(node => node.parentNode.removeChild(node));
        `);
      });
    
    cy.iframe('.map_cont iframe')
      .as('mekoChartIframe')
      .toMatchImageSnapshot();

    const zoomAndMatchImageSnapshot = delta => {
      cy.get('@mekoChartIframe')
        .trigger('wheel', 'center', {
          deltaX: 0, deltaY: -delta, deltaZ: 0, deltaMode: 0
        })
        .toMatchImageSnapshot();
    };

    zoomAndMatchImageSnapshot(4);
    zoomAndMatchImageSnapshot(4);
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
    it('각 지표 탭에 마우스를 올리면 활성화 된다.', () => {
      cy.get('.stock_index_tab > *')
        .each(tab => {
          cy.wrap(tab)
            .trigger('mouseenter')
            .should('have.class', 'active');
        });
    });
  });  // END: 실시간 국내 증시

  describe('이번주 투자 캘린더', () => {
    it('날짜를 클릭하면 캘린더가 해당 위치로 자동 스크롤 된다.', () => {
      // 마지막 날짜를 클릭
      cy.get('.investment_calendar ul.investment_calendar_tab > li > a')
        .last()
        .click();

      cy.get('.investment_calendar_scroll ul > li')
        .last()
        .should('be.visible');

      // 다시 첫번째 날짜를 클릭
      cy.get('.investment_calendar ul.investment_calendar_tab > li > a')
        .first()
        .click();

      cy.get('.investment_calendar_scroll ul > li')
        .first()
        .should('be.visible');
    });
  });  // END: 이번주 투자 캘린더

  // FIXME: 페이지를 +2 오프셋으로 받아오는 문제
  it.skip('스크롤을 하여 실시간 테마 뉴스를 불러온다.', () => {
    cy.shouldRequestOnScroll('@realTimeNews');
  });
});  // END: 국내증시
