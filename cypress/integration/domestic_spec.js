require('cypress-iframe');
const { recurse } = require('cypress-recurse');

describe('국내증시', () => {
  const now = new Date('2022-03-15T10:00:00');
  beforeEach(() => {
    cy.clock(now);
    cy.stubDomesticApi();
  });

  const visit = () => {
    cy.stubInvestmentApi();
    cy.visit('/investment', {
      onBeforeLoad(win) {
        cy.spy(win, 'postMessage').as('postMessage');
      }
    });

    cy.get('.gnb_finance a:contains("국내증시")')
      .click();

    cy.wait('@apiDomesticHome');
  };

  const triggerDomesticHomeApi = () =>
    cy.tick(20000);
  
  const triggerMekoChartApi = () =>
    cy.tick(5000);

  const withHiddenHeader = callback =>
    cy.withHidden('#header', callback);

  describe('국내증시 MAP', () => {
    it('LIVE 뉴스가 일정시간마다 변경되고, 클릭하면 뉴스페이지로 이동한다.', () => {
      cy.request('/api/domestic/home').toMatchApiSnapshot();
      cy.fixture('domestic-home').as('fixtureDomesticHome');

      visit();
      cy.get('.live_news_list').as('liveNewsList');
      cy.get('@fixtureDomesticHome')
        .then(({ liveNews }) => {
          cy.wrap(liveNews)
            .each(news => {
              cy.get('@liveNewsList')
                .contains(news.title)
                .should('be.visible');

              cy.tick(700)
                .tick(3000);
            });

          const [firstLiveNews,] = liveNews;
          cy.get('@liveNewsList')
            .contains(firstLiveNews.title)
            .should('have.attr', 'href')
            .and('contain', /[0-9]+$/.exec(firstLiveNews.id)[0]);
        });
    });

    it('MAP의 종류를 선택할 수 있다.', () => {
      visit();
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

        cy.get('.map_filter_line > button')
          .reverse()
          .clickEachWithTable(
            {
              '당일 기준': 'day',
              '최근 1개월 기준': 'monthly',
            },
            id => cy
              .url()
              .should('contain', `filter=${id}`),
            {
              activeClassName: 'on',
            }
          );
    });

    it.skip('활성화된 MAP의 종류에 따라 보이는 차트가 변경된다.', () => {
      cy.stubImages();
      visit();

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
          delay: 100,
          log: false,
        }
      );

      expectMekoChartLoaded()
        .then(() => {
          withHiddenHeader(() => {
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
    visit();
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
    it.skip('코스피 지수를 보여준다.', () => {
      cy.stubImages();
      visit();

      withHiddenHeader(() => {
        cy.get('.stock_index_wrap')
          .toMatchImageSnapshot();
      });
    });

    it('각 지표 탭에 마우스를 올리면 활성화 된다.', () => {
      visit();
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
      visit();

      cy.get('.investment_calendar')
        .scrollIntoView()
        .within(() => {
          cy.get('.investment_calendar_tab a')
            .as('dayTabs');

          cy.get('@dayTabs')
            .each($day => {
              const date = $day.find('.date').text();

              cy.wrap($day).click();
              cy.tick(2000);
              cy.get(`[data-offset$="${date}"]`).should('be.visible');
            });

          cy.get('@dayTabs')
            .first()
            .click();

          cy.tick(2000);
          
          cy.get('.investment_calendar_list .first a')
            .first()
            .click({force: true})
            .tick(2000)
            .should('have.class', 'open');
        });
    });
  });  // END: 이번주 투자 캘린더

  describe('오늘의 HOT PICK', () => {
    it('메뉴를 눌러 선정된 종목들을 볼 수 있다.', () => {
      visit();
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
    it.skip('로드가 되면 첫 번째 탭이 활성화 되어 관련 내용이 보여진다.', () => {
      cy.stubImages();
      visit();

      withHiddenHeader(() => {
        cy.get('.popularity_event_wrap')
          .toMatchImageSnapshot();
      });
    });

    it('각 탭에 마우스를 올려 인기종목과 연관기사를 볼 수 있다.', () => {
      visit();
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
  const stockCode = '239340';
  const visit = () => 
    cy.visit(`/domestic/item/${stockCode}`);

  beforeEach(() => {
    cy.stubDomesticApi();
  });

  it('별모양 아이콘을 눌러 관심종목으로 등록하고 제거할 수 있다.', () => {
    visit();
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

    visit();
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

  it('기업정보탭을 누르면 NICE평가정보를 보여준다.', () => {
    cy.intercept('/nice-asp/**', {statusCode: 200})
      .as('niceWidget');

    visit();
    cy.get('.stock_menu_info')
      .contains('기업정보')
      .click();

    cy.wait('@niceWidget')
      .its('request.url')
      .should('contain', stockCode);
  });

  it('실시간반응을 누르면 종목과 관련된 실시간반응 리스트를 보여주고, 스크롤하면 추가 반응을 불러올 수 있다.', () => {
    cy.intercept('/api/domestic/stock/*/realtime-comments*', {
        fixture: 'domestic-stock-realtime-comments'
      })
      .as('apiDomesticStockRealtimeComments');

    visit();
    cy.get('.stock_menu_info')
      .contains('실시간반응')
      .click();

    cy.wait('@apiDomesticStockRealtimeComments')
      .its('request.url')
      .should('contain', 'page=1');

    cy.shouldRequestOnScroll('@apiDomesticStockRealtimeComments');
  });
});  // END: 국내증시 종목

describe('카테고리별 랭킹', () => {
  beforeEach(() => {
    cy.stubDomesticApi();

    cy.visit('/domestic/ranking');
    cy.wait('@apiDomesticRanking');

    cy.get('.cont_wrap .tab_line').as('domesticRankingMenu');
  });

  it('카테고리별 체크된 기본항목이 다르며, 직접 항목을 체크하고 적용하기, 초기화하여 표시되는 정보를 다르게 할 수 있다.', () => {
    cy.request('/api/domestic/ranking?category=MARKET_CAP')
      .toMatchApiSnapshot();

    const optionTable = {
      tradeVolume: {
        name: "거래량(천주)",
      },
      tradeValue: {
        name: "거래대금(백만)",
      },
      preTradeVolume: {
        name: "전일거래량(천주)"
      },
      marketCap: {
        name: "시가총액(억)",
      },
      per: {
        name: "주가순이익비율(PER)",
        alt: "PER (배)"
      },
      operatingProfit: {
        name: "영업이익(억)",
      },
      eps: {
        name: "주당순이익(EPS)",
        alt: 'EPS',
      },
      openPrice: {
        name: "시가",
      },
      highPrice: {
        name: "고가",
      },
      lowPrice: {
        name: "저가",
      },
      take: {
        name: "매출액(억)",
      },
      netIncome: {
        name: "당기순이익(억)",
      },
      totalAssets: {
        name: "자산총계(억)",
      },
      totalDebt: {
        name: "부채총계(억)",
      },
      newListedCount: {
        name: "상장주식수(천주)",
      },
      foreignerShareRatio: {
        name: "외국인 비율(%)",
        alt: '외국인 비율',
      },
      monthlyRateOfChange: {
        name: "1개월 대비",
      },
      threeMonthlyRateOfChange: {
        name: "3개월 대비",
      },
      yearlyRateOfChange: {
        name: "1년 대비",
      },
      threeYearlyRateOfChange: {
        name: "3년 대비",
      },
      bps: {
        name: "주당순자산(BPS)",
      },
    };

    const defaultOptions = {
      MARKET_CAP: ['tradeVolume', 'per', 'newListedCount', 'marketCap', 'foreignerShareRatio'],
      UPPER: ['tradeVolume', 'tradeValue', 'preTradeVolume'],
      LOWER: ['tradeVolume', 'tradeValue', 'preTradeVolume'],
      UPPER_LIMIT: ['tradeVolume', 'monthlyRateOfChange', 'threeMonthlyRateOfChange'],
      LOWER_LIMIT: ['tradeVolume', 'monthlyRateOfChange', 'threeMonthlyRateOfChange'],
      SOARING_TRADE_VOLUME: ['tradeVolume', 'tradeValue', 'preTradeVolume'],
      NEW_STOCK: ['tradeVolume', 'tradeValue'],
      FALL: ['tradeVolume', 'monthlyRateOfChange', 'threeMonthlyRateOfChange'],
      GOLDEN_CROSS: ['tradeVolume', 'tradeValue', 'monthlyRateOfChange'],
    };

    cy.get('@domesticRankingMenu')
      .find('.active')
      .should('contain', '시가총액');

    cy.get('@domesticRankingMenu')
      .find('ul > li:not(.active) > a')
      .clickEachWithTable(
        {
          '상승': 'UPPER',
          '하락': 'LOWER',
          '상한가': 'UPPER_LIMIT',
          '하한가': 'LOWER_LIMIT',
          '거래급증': 'SOARING_TRADE_VOLUME',
          '신규상장주': 'NEW_STOCK',
          '낙폭과대': 'FALL',
          '골든크로스': 'GOLDEN_CROSS',
        },
        id => {
          cy.wait('@apiDomesticRanking')
            .its('request.url')
            .should('contain', `category=${id}`);

          cy.url()
            .should('contain', `category=${id}`);

          cy.wrap(defaultOptions[id])
            .each(option => {
              cy.get(`input[value="${option}"]`)
                .should('be.checked');

              cy.url()
                .should('contain', id);
            });
        },
      );

      cy.get('.stock_option_wrap input[type="checkbox"]')
        .as('stockOptionCheckBoxes');

      cy.get('@stockOptionCheckBoxes')
        .uncheck({force: true})

      cy.get('button:contains("적용하기")')
        .as('stockOptionApplyButton')
        .click();

      cy.log('모든 항목이 해제 되어도 남아있는 정보를 확인');
      cy.get('.tbl_scroll')
        .as('scrollableTable');

      cy.get('@scrollableTable')
        .should('contain', '현재가')
        .and('contain', '전일비')
        .and('contain', '등락률')
        .and('contain', '종토방');

      cy.get('@stockOptionCheckBoxes')
        .check({force: true});

      cy.get('@stockOptionApplyButton')
        .click();

      cy.wrap(Object.values(optionTable).map(({ name, alt }) => alt || name))
        .each(name => {
          cy.get('@scrollableTable')
            .contains(name);
        });

    cy.log('스크롤하면 좌우로 스크롤되고 오른쪽 끝에 종토방이 위치한다');
    cy.get('@scrollableTable')
      .scrollTo('right')
      .contains('종토방')
      .should('be.visible');
  });

  it('사이드바에서 각 카테고리별 상위 5종목을 간략하게 나타내고, 이동, 여닫기가 가능하다.', () => {
    const categoryTable = {
      marketCap: '시가총액',
      upper: '상승',
      lower: '하락',
      upperLimit: '상한가',
      lowerLimit: '하한가',
      soaringTradeVolume: '거래급증',
      newStock: '신규상장주',
      fall: '낙폭과대',
      goldenCross: '골든크로스',
      soaringPick: '급등주 PICK',
      reportPick: '리포트 PICK',
    };

    cy.wait('@apiDomesticCommon')
      .its('response.body')
      .as('domesticCommonResponse');

    cy.get('.right_cont_inner')
      .within(() => {
        const substract = (a, b) => {
          return b.reduce((acc, v) => {
            acc.delete(v);
            return acc;
          }, new Set(a));
        };
        const allCategoryKeySet = new Set(Object.keys(categoryTable));

        cy.log('기본으로 보이는 항목은 업종 시세 TOP5, 시가총액, 상승, 급등주 PICK이다');

        // 업종시세 TOP5는 토글리스트가 아님
        cy.get('@domesticCommonResponse')
          .then(({ industryTop5 }) => {
            cy.wrap(industryTop5)
              .each(({ name }) => cy.get(`a:contains("${name}")`).should('be.visible'));
          });

        const visibleCategories = [
          'marketCap',
          'upper',
          'soaringPick'
        ];
        cy.wrap(visibleCategories)
          .each(category => {
            cy.get(`.toggle_list:contains("${categoryTable[category]}")`)
              .should('have.class', 'activation');
          });

        cy.log('나머지 항목을 더보기 버튼을 눌러서 열어본다');
        cy.wrap([
            ...substract(allCategoryKeySet, visibleCategories)
          ])
          .each(category => {
            const toggleTitle = categoryTable[category];
            cy.get(`.toggle_list:contains("${toggleTitle}")`)
              .as('toggleList')
              .should('not.have.class', 'activation');

            cy.get(`h2:contains("${toggleTitle}")`)
              .find('a:contains("더보기")')
              .click();

            cy.get('@toggleList')
              .should('have.class', 'activation');
      });
    });
  });
});  // END: 카테고리별 랭킹