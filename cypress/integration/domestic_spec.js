require('cypress-iframe');
const { recurse } = require('cypress-recurse');

const now = new Date('2022-03-15T10:00:00');

const executeScript = script => 
  cy.window()
    .then(win => win.eval(script));

const formatNumber = number =>
  Math.abs(number).toLocaleString('en-US');

describe('국내증시', () => {
  beforeEach(() => {
    cy.stubDomesticApi();
  });

  const visit = () => {
    cy.triggerRouteAndVisit('/domestic');
    return cy.wait('@apiDomesticHome');
  };

  const triggerDomesticHomeApi = () =>
    cy.tick(20000);
  
  const triggerMekoChartApi = () =>
    cy.tick(5000);

  const withHiddenHeader = callback =>
    cy.withHidden('#header', callback);

  describe('국내증시 MAP', () => {
    it('LIVE 뉴스가 일정시간마다 변경되고, 클릭하면 뉴스페이지로 이동한다.', () => {
      cy.clock(now);
      cy.request('/api/domestic/home')
        .toMatchApiSnapshot({
          merge: {
            CalendarItem: {
              estimatedNetProfitPerShare: 'number | null',
              estimatedSales: 'number | null',
              listingDateTime: 'null | string',
              personalSubscriptionCompetitionRate: 'null | string',
            },
            Report: {
              articleId: 'null | string',
              articleTitle: 'null | string'
            },
            InvestmentCalendarNew: {
              thumbnail: 'null | string',
            },
            MainStockNewsItem: {
              subCategory: 'null | string',
            }
          }
        });
      cy.fixture('api/domestic/home.json').as('fixtureDomesticHome');

      visit();
      cy.get('.live_news_list').as('liveNewsList');
      cy.get('@fixtureDomesticHome')
        .then(({ liveNews }) => {
          cy.wrap(liveNews)
            .each(news => {
              cy.log('LIVE 뉴스가 표시되는지 확인하고 애니메이션을 실행하여 다음 확인');
              cy.get('@liveNewsList')
                .contains(news.title)
                .should('be.visible');

              cy.tick(700)
                .tick(3000);
            });

          cy.log('LIVE 뉴스를 클릭했을때 해당 뉴스페이지로 이동이 가능한지 주소 확인');

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
        cy.get('ul > li:not(.active) > a')
          .concat('ul > li.active > a')
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

    // TODO: https://glebbahmutov.com/blog/canvas-testing/
    it('활성화된 MAP의 종류에 따라 보이는 차트가 변경된다.', () => {
      cy.clock(now);
      cy.useImageSnapshot();
      visit();

      cy.get('.map_cont iframe')
        .as('mekoChart');

      const expectMekoChartLoaded = () =>
        cy.frameLoaded(
          '.map_cont iframe',
          {
            url: 'chart-finance.zum.com/api/chart/treemap/domestic'
          }
        );

      expectMekoChartLoaded();
      cy.get('@mekoChart')
        .its('0.contentWindow')
        .then(win => {
          cy.spy(win, 'postMessage').as('mekoChartPostMessage');
        });

      recurse(
        () => {
          triggerMekoChartApi();
          return cy.get('@mekoChartPostMessage');
        },
        message => expect(message).to.be.called,
        {
          log: false,
          delay: 10,
        }
      );

      const expectMekoChartSnapshotToMatch = () =>
        cy.get('@mekoChart')
          .toMatchImageSnapshot({
            imageConfig: {
              threshold: 0.05,
            }
          });

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
    it('코스피 지수를 보여준다.', () => {
      cy.useImageSnapshot();
      visit();

      cy.withHidden('#header, .stock_state_chart', () => {
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
      cy.clock(now, ['Date']);
      visit();

      withHiddenHeader(() => {
        cy.get('.investment_calendar')
          .scrollIntoView()
          .within(() => {
            cy.get('.investment_calendar_tab :not(.active) > a')
              .concat('.investment_calendar_tab .active > a')
              .each($day => {
                const date = $day.find('.date').text();

                cy.wrap($day).click();
                cy.get(`[data-offset$="${date}"]`).should('be.visible');
              });

            cy.get('.investment_calendar_tab a')
              .first()
              .click();
            
            cy.get('.investment_calendar_list .first a')
              .first()
              .click({force: true})
              .should('have.class', 'open');
          });
    });

      });
  });  // END: 이번주 투자 캘린더

  describe('오늘의 HOT PICK', () => {
    it('메뉴를 눌러 선정된 종목들을 볼 수 있다.', () => {
      cy.clock(now);
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
    it('로드가 되면 첫 번째 탭이 활성화 되어 관련 내용이 보여진다.', () => {
      cy.useImageSnapshot();
      visit();

      cy.withHidden('#header, .il_noti', () => {
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

  const visitTab = text => {
    visit();
    cy.get('.stock_menu_info')
      .contains(text)
      .click();
  };

  beforeEach(() => {
    cy.stubDomesticApi();
    cy.intercept('/api/domestic/stock/*/price*', {fixture: 'api/domestic/stock/price.json'})
      .as('apiDomesticStockPrice');
    cy.intercept('/api/domestic/stock/*/investor*', {fixture: 'api/domestic/stock/investor.json'})
      .as('apiDomesticStockInvestor');
  });

  it('별모양 아이콘을 눌러 관심종목으로 등록하고 제거할 수 있다.', () => {
    const stubInterestApi = () => {
      cy.fixture('api/interest.json')
        .then(interest => {
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
    };

    cy.log('로그인 후 로그인, 관심종목 API로부터 응답을 받을 때 까지 대기');
    visit();
    cy.login({postStub: stubInterestApi});
    cy.wait('@apiInterest');

    cy.get('.stock_board')
      .within(() => {
        cy.get('.like')
          .as('likeButton');

        cy.log('아이콘을 클릭하면 관심종목 API로 종목코드를 전송');
        cy.get('@likeButton')
          .should('not.have.class', 'activation')
          .click({force: true});

        cy.wait('@apiInterest')
          .its('request')
          .should(request => {
            expect(request.method).to.equal('POST');
            expect(request.body).to.deep.equal({id: '239340'});
          });

        cy.log('관심종목에 등록이 되면 클릭한 아이콘이 활성화');
        cy.get('@likeButton')
          .should('have.class', 'activation');

        cy.log('관심종목인 상태에서 다시 클릭을 하면 제거요청 전송');
        cy.get('@likeButton')
          .click({force: true});
        
        cy.wait('@apiInterest')
          .its('request.url')
          .should('contain', 'delete');  // NOTE: RESTful?
        
        cy.log('관심종목 제거 이후 아이콘은 비활성화 상태');
        cy.get('@likeButton')
          .should('not.have.class', 'activation');
      });
  });

  it('종목관련 정보가 현황판 형태로 보여진다.', () => {
    cy.useImageSnapshot();
    cy.ignoreKnownError('Navigation cancelled from');

    cy.intercept('/api/suggest*', {fixture: 'api/suggest.json'})
      .as('apiSuggest');

    cy.clock(now);
    cy.visit('/domestic');

    cy.get('.search_box')
      .click();
    
    cy.get('.search_bar input')
      .as('searchBar')
      .click()
      .type(stockCode);

    cy.tick(1000);
    cy.get('.stock_list_wrap')
      .should($el => {
        expect($el).to.be.exist;
      });

    cy.get('@searchBar')
      .type('{enter}');

    cy.wait([
      '@apiDomesticStock',
      '@apiDomesticStockPrice',
      '@apiDomesticStockInvestor',
    ]);

    cy.withHidden('#header, .chart', () => {
      cy.tick(100000);
      cy.get('.stock_board')
        .toMatchImageSnapshot();
    });
  });

  it('최저/최고가에 마우스를 올려 현재가와 비교할 수 있고, 차트의 기간을 변경할 수 있다.', () => {
    visit();
    // NOTE: 헤더로 인해 일부 요소가 가려져 오작동 하는 문제 방지
    cy.withHidden('#header', () => {
      cy.get('.stock_board')
        .within(() => {
          cy.get('.price_summary .bar_wrap')
            .each($el => {
              cy.wrap($el)
                .realHover()
                .find('.layer')
                .should('be.visible');
            });

          cy.get('.chart_tab ul > li > a')
            .clickEachWithTable(
              {
                '1일': 'DAILY',
                '1개월': 'MONTHLY',
                '3개월': 'MONTHLY3',
                '1년': 'YEARLY',
                '3년': 'YEARLY3',
              },
              id => {
                cy.get('.chart iframe')
                  .should('have.attr', 'src')
                  .and('contain', `period=${id}`);
              }
            );
        });
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

    cy.fixture('api/domestic/stock/price.json')
      .then(price => {
        const lastPage = Math.ceil(price.totalCount / rowsPerPage);

        cy.log(`일별 시세의 마지막 페이지: ${lastPage}`);
        cy.intercept('/api/domestic/stock/*/price*', req => {
          if (req.query.page == lastPage) {
            req.alias = 'apiDomesticStockPriceLastPage';
          } else {
            req.alias = 'apiDomesticStockPrice';
          }
          req.reply(price);
        });
      });

    cy.fixture('api/domestic/stock/investor.json')
      .then(investor => {
        const lastPage = Math.ceil(investor.totalCount / rowsPerPage);

        cy.log(`투자자별 매매동향의 마지막 페이지: ${lastPage}`);
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

    cy.log('기업정보탭을 클릭하면 NICE 위젯의 URL이 종목코드를 포함');
    visitTab('기업정보');

    cy.wait('@niceWidget')
      .its('request.url')
      .should('contain', stockCode);
  });

  it('실시간반응을 누르면 종목과 관련된 실시간반응 리스트를 보여주고, 스크롤하면 추가 반응을 불러올 수 있다.', () => {
    cy.intercept('/api/domestic/stock/*/realtime-comments*', {
        fixture: 'api/domestic/stock/realtime-comments.json'
      })
      .as('apiDomesticStockRealtimeComments');

    visitTab('실시간반응');

    cy.wait('@apiDomesticStockRealtimeComments')
      .its('request.url')
      .should('contain', 'page=1');

    cy.shouldRequestOnScroll('@apiDomesticStockRealtimeComments');
  });

  it('종토방을 누르면 종목토론방 탭이 보여지고, 최신/과거순 정렬과 더보기, 로그인 후 댓글 작성 삭제가 가능하다.', () => {
    const stubDiscussionApi = callback => {
      cy.fixture('api/discussion/stock.json')
        .then(discussion => {
          cy.intercept('/api/discussion/stock/**', callback(discussion))
            .as('apiDiscussionStock');
        });
    };

    stubDiscussionApi(discussion => ({
      ...discussion,
      comments: discussion.comments.map((comment, i) => ({
        ...comment,
        content: `@@종토방_${i}@@`,
      }))
    }));

    cy.log('종토방 탭을 클릭하면 토론 목록이 보인다');
    visitTab('종토방');

    cy.wait('@apiDiscussionStock')
      .its('request.url')
      .should('contain', stockCode)
      .and('contain', '1,CREATED_AT_DESC,10')
      .end()
      .url()
      .should('contain', 'category=DISCUSSION');

    cy.log('몇 개의 의견이 존재하는지 볼 수 있다');
    cy.get('@apiDiscussionStock')
      .its('response.body')
      .then(discussion => {
        cy.get('.stock_discussion_wrap')
          .invoke('text')
          .should('contain', `${discussion.totalCount}개의 의견`);
      });


    cy.log('최신순 또는 과거순으로 정렬 가능하다');

    const activeClassName = 'filter_selected';
    cy.get(`.list_filter ul > li:not(.${activeClassName}) > a`)
      .concat(`.list_filter ul > li.${activeClassName} > a`)
      .clickEachWithTable(
        {
          '최신순': 'DESC',
          '과거순': 'ASC',
        },
        id => {
          cy.wait('@apiDiscussionStock')
            .its('request.url')
            .should('contain', `CREATED_AT_${id}`)
        },
        {
          activeClassName,
        }
      );

    cy.log('더보기 버튼을 누르면 추가 의견을 불러온다');
    cy.get('.btn_more')
      .click();

    cy.wait('@apiDiscussionStock')
      .its('request.url')
      .should('contain', '2,CREATED_AT');

    cy.log('비로그인 상태에서 댓글창을 누르면 로그인 모달이 나타난다');
    cy.contains('줌 또는 소셜로그인 후 댓글을 작성해 주세요')
      .click();

    cy.get('.layer_login').should('be.visible');

    cy.login();
    cy.wait('@apiDiscussionStock');

    cy.log('댓글을 작성하면 글자수가 보인다');

    const commentId = '99999';
    cy.get('.comment_write')
      .within(() => {
        const alertStub = cy.stub();
        cy.on('window:alert', alertStub);

        cy.contains('등록').as('submitButton');

        cy.get('@submitButton')
          .click()
          .then(() => {
            expect(alertStub).to.be.calledWithMatch('내용을 입력해 주세요');
          });

        const comment = '한눈에 보는 국내 해외 금융 정보와 전문가의 투자 인사이트를 줌 투자에서 확인하세요';
        cy.get('[placeholder*="의견을 알려주세요"]')
          .type(comment);

        cy.get('.text_count')
          .invoke('text')
          .should(text => {
            const [_, count] = /(\d+)\s*[^\s]\s*\d+/.exec(text);
            expect(parseInt(count)).to.be.equal(comment.length);
          });

        cy.log('등록 버튼을 눌러 의견을 등록');
        stubDiscussionApi(discussion => ({
          ...discussion,
          comments: [{
            ...discussion.comments[0],
            deletedBy: null,
            content: comment,
            id: commentId,
          }].concat(discussion.comments.map((comment, i) => ({
            ...comment,
            content: `@@종토방_${i}@@`,
          })))
        }));

        cy.get('@submitButton')
          .click();

        cy.wait('@apiDiscussionStock')
          .should(({ request }) => {
            expect(request.method).to.equal('POST');
            expect(request.body).to.deep.contain({content: comment});
          });
      });

    cy.log('등록한 의견을 삭제할 수 있다');
    cy.intercept('POST', '/api/discussion/stock/*/delete', {
        statusCode: 201,
        fixture: 'api/discussion/stock.json',
      })
      .as('apiDiscussionStockDelete');

    const confirmStub = cy.stub();
    confirmStub.onFirstCall().returns(true);

    cy.on('window:confirm', confirmStub);

    cy.get('.stock_social_comment')
      .contains('삭제')
      .click()
      .then(() => {
        expect(confirmStub).to.be.calledWithMatch('삭제하시겠습니까?');
      });

    cy.wait('@apiDiscussionStockDelete')
      .its('request.body')
      .should('deep.contain', {commentId,});
  });

  it('뉴스탭을 눌러 뉴스목록을 보고 클릭하여 이동, 페이지 넘기기가 가능하다.', () => {
    const placeholder = '@@종목상세_뉴스제목@@';
    const newsId = '12345678';

    cy.fixture('api/domestic/stock/news.json')
      .as('domesticStockNews');

    const stubNewsApi = callback => {
      cy.get('@domesticStockNews')
        .then(news => {
          cy.intercept('/api/domestic/stock/*/news*', callback(news))
            .as('apiDomesticStockNews');
        });
    };

    const replaceNewsId = (url, id) => url.replace(/\d+$/, id);
    stubNewsApi(news => ({
      ...news,
      newses: news.newses
        .map((n, i) => i === 0 ?
          {
            ...n,
            title: placeholder,
            // NOTE: id, landingUrl이 동일한 값을 반환하고 있음 (어째서?)
            id: replaceNewsId(n.id, newsId),
            landingUrl: replaceNewsId(n.landingUrl, newsId),
          } :
          n
        )
    }));

    cy.log('뉴스 탭을 클릭하면 뉴스 목록이 보인다');
    visitTab('뉴스');

    cy.wait('@apiDomesticStockNews')
      .its('request.url')
      .should('contain', stockCode);

    cy.log('뉴스 제목을 클릭하여 뉴스페이지로 이동');
    cy.contains(placeholder)
      .click();

    cy.url()
      .should('contain', newsId)
      .go('back');

    cy.wait('@apiDomesticStockNews');

    cy.get('.paging_wrap')
      .shouldRequestOnPagination('@apiDomesticStockNews');
  });

  it('공시탭을 눌러 요약공시와 일반공시를 살펴볼 수 있다.', () => {
    cy.intercept('/api/domestic/stock/*/performance*', {
        fixture: 'api/domestic/stock/performance.json'
      })
      .as('apiDomesticStockPerformance');

    visitTab('공시');

    cy.log('API로 받아온 요약공시 정보가 표시된다');
    cy.wait('@apiDomesticStockPerformance')
      .its('response.body.items')
      .each(item => {
        cy.get('.result_list')
          .as('resultList');

        cy.get('@resultList')
          .should('contain', item.title)
          .and('contain', item.type)
          .find(`a[href="${item.originalTextUrl}"]`)
          .should('be.visible');

        if (item.data !== null) {
          const percentage = `${Math.abs(parseFloat(item.data))}%`;
          cy.get('@resultList')
            .should('contain', percentage);
        }
      });
    
    cy.log('페이지네이션 메뉴를 사용해 페이지 이동');
    cy.get('.paging_wrap')
      .as('pagingWrap');

    cy.get('@pagingWrap')
      .shouldRequestOnPagination('@apiDomesticStockPerformance');

    cy.log('일반공시 버튼을 눌러 일반공시 목록을 표시');
    cy.intercept('/api/domestic/stock/*/normal-disclosure*', {
        fixture: 'api/domestic/stock/normal-disclosure.json'
      })
      .as('apiDomesticStockNormalDisclosure');

    cy.get('.stock_menu_info')
      .contains('일반공시')
      .click();

    cy.wait('@apiDomesticStockNormalDisclosure');

    cy.log('페이지네이션 메뉴를 사용해 페이지 이동');
    cy.get('@pagingWrap')
      .shouldRequestOnPagination('@apiDomesticStockNormalDisclosure');

    cy.get('@apiDomesticStockNormalDisclosure')
      .its('response.body')
      .then(disclosure => {
        cy.log('일반공시 제목을 눌러 내용을 확인');
        cy.fixture('api/domestic/stock/performance/disclosure.json')
          .then(detail => {
            cy.intercept('/api/domestic/stock/*/performance/*', detail)
              .as('apiDomesticStockPerformanceDisclosure');
          });
        
        const [firstDisclosure,] = disclosure.items;
        cy.get('.stock_menu_info')
          .contains(firstDisclosure.title)
          .click();

        cy.wait('@apiDomesticStockPerformanceDisclosure')
          .its('request.url')
          .should('contain', firstDisclosure.id);
      });
  });

  // NOTE: https://github.com/cypress-io/cypress/issues/21086
  it.skip('서버사이드 렌더링으로 클라이언트 라우팅 결과와 동일한 화면을 보여준다.', () => {
    cy.intercept(/\.js$/, {statusCode: 503});
    cy.useImageSnapshot();

    cy.wrap([
        `/domestic/item/${stockCode}`,
        '/domestic/index/1',
      ])
      .each(url => {
        cy.request(url)
          .its('body')
          .then(html => {
            return cy
              .document()
              .invoke({log: false}, 'write', html);
          })
          .then(() => {
            // 동적인 요소를 전부 숨김 처리
            return executeScript(`
              const style = document.createElement('style');
              style.innerHTML = [
                '#header',
                '.price',
                '.point',
                '.per',
                '.txt',
                '.min_max_bar',
                '.data',
                '.bar',
                '.chart',
                '.creat_at'
              ].join(',') + ' { visibility: hidden !important }';
              document.head.appendChild(style);
            `);
          })
          .then(() => {
            cy.get('.stock_board').toMatchImageSnapshot();
            cy.reload();
          });
      });
  });
});  // END: 국내증시 종목

describe('국내증시 지수', () => {
  const visit = () =>
    cy.triggerRouteAndVisit('/domestic/index/1', {method: 'bounce'});

  it('일별시세 목록이 보여진다.', () => {
    cy.intercept('/api/domestic/index/*/history*', {
        fixture: 'api/domestic/index/history.json',
      })
      .as('apiDomesticIndexHistory');

    visit();
    cy.get('.stock_daily')
      .within(() => {
        cy.wait('@apiDomesticIndexHistory')
          .its('response.body.items')
          .each(item => {
            cy.root()
              .should('contain', item.date.replace(/-/g, '.'))
              .and('contain', formatNumber(item.closePrice))
              .and('contain', formatNumber(item.priceChange))
              .and('contain', `${Math.abs(item.rateOfChange).toFixed(2)}%`)
              .and('contain', formatNumber(item.openPrice))
              .and('contain', formatNumber(item.highPrice))
              .and('contain', formatNumber(item.closePrice))
              .and('contain', formatNumber(item.tradeVolume));
          });

        cy.get('.paging_wrap')
          .shouldRequestOnPagination('@apiDomesticIndexHistory');
      });
  });
});  // END: 국내증시 지수

const optionTable = {
  tradeVolume: {
    optionName: "거래량(천주)",
  },
  tradeValue: {
    optionName: "거래대금(백만)",
  },
  preTradeVolume: {
    optionName: "전일거래량(천주)",
  },
  marketCap: {
    optionName: "시가총액(억)",
  },
  per: {
    optionName: "주가순이익비율(PER)",
    tableHeaderName: "PER (배)"
  },
  operatingProfit: {
    optionName: "영업이익(억)",
  },
  eps: {
    optionName: "주당순이익(EPS)",
    tableHeaderName: 'EPS',
  },
  openPrice: {
    optionName: "시가",
  },
  highPrice: {
    optionName: "고가",
  },
  lowPrice: {
    optionName: "저가",
  },
  take: {
    optionName: "매출액(억)",
  },
  netIncome: {
    optionName: "당기순이익(억)",
  },
  totalAssets: {
    optionName: "자산총계(억)",
  },
  totalDebt: {
    optionName: "부채총계(억)",
  },
  newListedCount: {
    optionName: "상장주식수(천주)",
  },
  foreignerShareRatio: {
    optionName: "외국인 비율(%)",
    tableHeaderName: '외국인 비율',
  },
  monthlyRateOfChange: {
    optionName: "1개월 대비",
  },
  threeMonthlyRateOfChange: {
    optionName: "3개월 대비",
  },
  yearlyRateOfChange: {
    optionName: "1년 대비",
  },
  threeYearlyRateOfChange: {
    optionName: "3년 대비",
  },
  bps: {
    optionName: "주당순자산(BPS)",
  },
};

function checkStockOptions() {
  cy.get('.stock_option_wrap input[type="checkbox"]')
    .as('stockOptionCheckBoxes');

  const uncheckAllCheckBoxes = () => {
    /*
    아래 코드와 동일한 역할을 수행하지만 더 나은 성능을 보여줌
    ```
    cy.get('@stockOptionCheckBoxes')
      .uncheck({force: true})
    ```
    */
    executeScript(`
      document
        .querySelectorAll('.stock_option_wrap input[type="checkbox"]:checked')
        .forEach(checkbox => checkbox.click());
    `);
  };

  const checkAllCheckBoxes = () => {
    executeScript(`
      document
        .querySelectorAll('.stock_option_wrap input[type="checkbox"]:not(:checked)')
        .forEach(checkbox => checkbox.click());
    `);
  };

  uncheckAllCheckBoxes();
  cy.get('button:contains("적용하기")')
    .as('stockOptionApplyButton')
    .click();

  cy.get('.tbl_scroll')
    .as('scrollableTable');

  cy.log('모든 항목이 해제 되어도 남아있는 정보를 확인');
  cy.get('@scrollableTable')
    .should('contain', '현재가')
    .and('contain', '전일비')
    .and('contain', '등락률')
    .and('contain', '종토방');

  checkAllCheckBoxes();
  cy.get('@stockOptionApplyButton')
    .click();

  cy.log('테이블에 옵션에 해당하는 정보가 표시 됨');
  cy.wrap(
      Object
        .values(optionTable)
        .map(({ tableHeaderName, optionName }) => tableHeaderName || optionName)
    )
    .each(name => {
      cy.get('@scrollableTable')
        .contains(name);
    });

cy.log('스크롤하면 좌우로 스크롤되고 오른쪽 끝에 종토방이 위치한다');
cy.get('@scrollableTable')
  .scrollTo('right')
  .contains('종토방')
  .should('be.visible');
}

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

    cy.log('기본 페이지는 시가총액');
    cy.get('@domesticRankingMenu')
      .find('.active')
      .should('contain', '시가총액');

    cy.log('기본 페이지를 제외한 나머지 메뉴를 클릭해서 이동');
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
          cy.log('카테고리를 클릭하면 API요청과 라우팅 발생');
          cy.wait('@apiDomesticRanking')
            .its('request.url')
            .should('contain', `category=${id}`);

          cy.url()
            .should('contain', `category=${id}`);

          cy.log('각 카테고리마다 기본으로 체크되어있는 항목이 다름');
          cy.wrap(defaultOptions[id])
            .each(option => {
              cy.get(`input[value="${option}"]`)
                .should('be.checked');

              cy.url()
                .should('contain', id);
            });
        },
      );

    checkStockOptions();
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

describe('전체 업종별 시세', () => {
  it.only('업종 순위 목록이 보여진다.', () => {
    cy.fixture('api/domestic/industry.json')
      .then(industry => {
        cy.intercept('/api/domestic/industry', industry)
          .as('apiDomesticIndustry')
      });

    cy.triggerRouteAndVisit('/domestic/industry', {method: 'bounce'});

    cy.wait('@apiDomesticIndustry')
      .its('response.body')
      .spread((kospi, kosdaq) => {
        const checkTable = datas => {
          cy.wrap(datas)
            .its('industryPriceItems')
            .each((item, i) => {
              cy.get('.tbl_stock_data')
                .find(`tbody > tr:nth-child(${i+1})`)
                .should('contain', item.name)
                .and('contain', `${item.rateOfChange.toFixed(2)}%`)
                .and('contain', item.positiveCount)
                .and('contain', item.negativeCount);
            });
        };

        checkTable(kospi);

        cy.get('.stock_price .menu_tab')
          .contains('코스닥')
          .click();

        checkTable(kosdaq);
      });
  });
});  // END: 전체 업종별 시세

describe('업종 상세페이지', () => {
  beforeEach(() => {
    cy.fixture('api/domestic/industry/detail.json')
      .then(industry => {
        cy.intercept('/api/domestic/industry/*', industry)
          .as('apiDomesticIndustryDetail');
      });

    cy.triggerRouteAndVisit('/domestic/industry/107', {method: 'bounce'});
  });

  it('상단 테이블에 업종 정보를 표시한다.', () => {
    cy.wait('@apiDomesticIndustryDetail')
      .its('response.body')
      .then(({ industry }) => {
        cy.get('.tbl_stock_data')
          .as('stockDataTable')
          .should('contain', industry.name)
          .and('contain', industry.rateOfChange)
          .and('contain', industry.positiveCount)
          .and('contain', industry.negativeCount);

        cy.wrap([
            ...industry.negativeStocks,
            ...industry.positiveStocks,
          ])
          .each(({ code, name }) => {
            cy.get('@stockDataTable')
              .find(`a:contains("${name}")`)
              .should('have.attr', 'href')
              .and('contain', code);
          });
      });
  });

  it('옵션을 선택하여 내용을 필터링할 수 있다.', () => {
    checkStockOptions();
  });
})