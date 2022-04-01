require('cypress-iframe');
const { recurse } = require('cypress-recurse');

describe('국내증시', () => {
  const now = new Date('2022-03-15T10:00:00');
  beforeEach(() => {
    cy.clock(now);
  });

  const triggerDomesticHomeApi = () =>
    cy.tick(20001);
  
  const triggerMekoChartApi = () =>
    cy.tick(5000);

  beforeEach(() => {
    cy.stubInvestApi();

    cy.visit('/investment', {
      onBeforeLoad(win) {
        cy.spy(win, 'postMessage').as('postMessage');
      }
    });

    cy.get('.gnb_finance a:contains("국내증시")')
      .click();

    cy.wait('@apiDomesticHome');
  });

  const hideHeaderWhile = callback =>
    cy.withHidden('#header', callback);

  describe('국내증시 MAP', () => {
    it('MAP의 종류를 선택할 수 있다.', () => {
      cy.get('.map_title_wrap').within(() => {
        cy.get('ul > li > a')
          .reverse()
          .clickEachWithTable(
            {
              'TOP1000': 'ALL',
              '코스피': 'KOSPI',
              '코스닥': 'KOSDAQ'
            },
            id => cy
              .url()
              .should('contain', `category=${id}`)
          );
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
        $body => expect($body).to.have.descendants('[id^="treemap-node-stock"]'),
        {
          delay: 1000,
          log: false,
        }
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
      .as('mainNewsList')
      .scrollIntoView();

    cy.get('@mainNewsList')
      .nextAll('.navi')
      .first()
      .as('navigation');

    cy.get('@navigation')
      .find('.next')
      .click({force: true});

    cy.get('@mainNewsList')
      .find('ul > li')
      .as('newsItems')
      .last()
      .should('be.visible');

    cy.get('@navigation')
      .find('.prev')
      .click({force: true});

    cy.get('@newsItems')
      .first()
      .should('be.visible');
  });

  describe('실시간 국내 증시', () => {
    it('코스피 지수를 보여준다.', () => {
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
    it('날짜를 클릭하면 캘린더가 해당 위치로 자동 스크롤 되고, 항목을 클릭하면 자세한 내용을 여닫을 수 있다.', () => {
      cy.clock().invoke('restore').reload();
      cy.get('.investment_calendar')
        .scrollIntoView()
        .within(() => {
          cy.get('.investment_calendar_tab a')
            .as('dayTabs');

          cy.get('@dayTabs')
            .each($day => {
              const date = $day.find('.date').text();

              cy.wrap($day).click();
              cy.get(`[data-offset$="${date}"]`).should('be.visible');
            });

          cy.get('@dayTabs')
            .first()
            .click();
          
          cy.get('.investment_calendar_list .first a')
            .first()
            .click({force: true})
            .should('have.class', 'open');
        });
    });
  });  // END: 이번주 투자 캘린더

  describe('오늘의 HOT PICK', () => {
    it('메뉴를 눌러 선정된 종목들을 볼 수 있다.', () => {
      recurse(
          () =>
            triggerDomesticHomeApi()
              .wait('@apiDomesticHome'),
          ({ response }) => expect(response).to.have.property('body'),
        )
        .its('response.body')
        .as('domesticHomeResponse');

      cy.get('.today_hot_pick')
        .as('todayHotPick')
        .find('ul > li > a')
        .clickEachWithTable(
          {
            '급등주 PICK': 'soaring',
            '리포트 PICK': 'report',
            '거래급증': 'transaction-rise',
            '신규상장주': 'new',
            '낙폭과대': 'fall',
            '골든크로스': 'golden-cross',
          },
          id => cy
            .get('@domesticHomeResponse')
            .then(home => {
              return home.todayHotPick[id].map(({ name }) => name);
            })
            .each(name =>
              cy.get('@todayHotPick')
                .contains(name)
                .should('be.visible')
            )
        );
    });
  }); // END: 오늘의 HOT PICK

  describe('ZUM 인기종목', () => {
    it('로드가 되면 첫 번째 탭이 활성화 되어 관련 내용이 보여진다.', () => {
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

describe('국내증시 종목', () => {
  it('별모양 아이콘을 눌러 관심종목으로 등록하고 제거할 수 있다.', () => {
    cy.visit('/domestic/item/239340');
    cy.fixture('interest').then(interest => {
      cy.intercept(/\/api\/interest(\/delete)?/, req => {
          req.reply(201, {
            ...interest,
            items: ([
                {
                  "financeCategory": "DOMESTIC_STOCK",
                  "id": "239340",
                  "name": "줌인터넷",
                  "updateDateTime": "2022-03-28T14:20:59",
                  "code": "239340",
                  "symbol": "KOSDAQ",
                  "registerDateTime": "2022-03-28T14:41:44",
                  "order": 0,
                  "rateOfChange": -4.27,
                  "benefitRate": 0,
                  "priceOnRegistration": 6730,
                  "currentPrice": 6730,
                  "priceChange": -300
                }
              ])
              .concat(interest.items)
              .filter((_, i) => {
                if (req.method !== 'POST' && i === 0 || req.url.endsWith('delete')) {
                  return false;
                }
                return true;
              }),
          });
        })
        .as('apiInterest');
    });

    cy.login();
    cy.wait('@apiMemberLogin')
      .wait('@apiInterest');

    cy.get('.stock_board')
      .within(() => {
        cy.get('.like')
          .as('likeButton');

        cy.get('@likeButton')
          .should('not.have.class', 'activation')
          .click({force: true});

        cy.wait('@apiInterest')
          .its('request')
          .should(request => {
            expect(request.method).to.equal('POST');
            expect(request.body).to.deep.equal({id: '239340'});
          });

        cy.get('@likeButton')
          .should('have.class', 'activation');

        cy.get('@likeButton')
          .click({force: true});
        
        cy.wait('@apiInterest')
          .its('request.url')
          .should('contain', 'delete');  // NOTE: RESTful?
        
        cy.get('@likeButton')
          .should('not.have.class', 'activation');
      });
  });

  it('종목개요에서 일별 시세와 투자자별 매매동향을 페이지단위로 볼 수 있다.', () => {
    const rowsPerPage = 10;

    const expectRequestToMatchPage = pageNumber => alias =>
      cy.wait(alias)
        .its('request.url')
        .should('contain', `page=${pageNumber}`)
        .and('contain', `size=${rowsPerPage}`);

    const expectRequestToMatchFirstPage = expectRequestToMatchPage(1);

    const clickButtonOf = containerSelector => buttonSelector =>
      cy.get(containerSelector)
        .find(buttonSelector)
        .click();

    const clickButtonOfStockDaily = clickButtonOf('.stock_daily');
    const clickButtonOfTradingTrend = clickButtonOf('.trading_trend');

    cy.fixture('domestic-stock-price')
      .then(price => {
        const lastPage = Math.ceil(price.totalCount / rowsPerPage);

        cy.log('last page of stock price is', lastPage);
        cy.intercept('/api/domestic/stock/*/price*', req => {
          if (req.query.page == lastPage) {
            req.alias = 'apiDomesticStockPriceLastPage';
          } else {
            req.alias = 'apiDomesticStockPrice';
          }
          req.reply(price);
        });
      });

    cy.fixture('domestic-stock-investor')
      .then(investor => {
        const lastPage = Math.ceil(investor.totalCount / rowsPerPage);

        cy.log('last page of investor is', lastPage);
        cy.intercept('/api/domestic/stock/*/investor*', req => {
          if (req.query.page == lastPage) {
            req.alias = 'apiDomesticStockInvestorLastPage';
          } else {
            req.alias = 'apiDomesticStockInvestor';
          }
          req.reply(investor);
        });
      });

    cy.visit('/domestic/item/239340');
    expectRequestToMatchFirstPage('@apiDomesticStockPrice');
    expectRequestToMatchFirstPage('@apiDomesticStockInvestor')

    clickButtonOfStockDaily('.last');
    cy.wait('@apiDomesticStockPriceLastPage');

    clickButtonOfStockDaily('.first');
    expectRequestToMatchFirstPage('@apiDomesticStockPrice');

    clickButtonOfStockDaily('.next');
    expectRequestToMatchPage(2)('@apiDomesticStockPrice');

    clickButtonOfStockDaily('.prev');
    expectRequestToMatchFirstPage('@apiDomesticStockPrice');

    clickButtonOfTradingTrend('.last');
    cy.wait('@apiDomesticStockInvestorLastPage');

    clickButtonOfTradingTrend('.first');
    expectRequestToMatchFirstPage('@apiDomesticStockInvestor');

    clickButtonOfTradingTrend('.next');
    expectRequestToMatchPage(2)('@apiDomesticStockInvestor');

    clickButtonOfTradingTrend('.prev');
    expectRequestToMatchFirstPage('@apiDomesticStockInvestor');
  });
});  // END: 국내증시 종목
