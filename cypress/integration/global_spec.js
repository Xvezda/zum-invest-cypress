describe('해외증시', () => {
  beforeEach(() => {
    // TODO: 원인조사
    cy.ignoreKnownError(/Cannot read properties of undefined \(reading '(dow|children)'\)/);
    cy.ignoreKnownError("Cannot read properties of null (reading 'getAttribute')");
  });

  beforeEach(() => {
    cy.stubCommonApi();
    cy.stubOverseasApi();
  });

  const now = new Date('2022-03-15T10:00:00');
  const visit = () => {
    cy.clock(now);

    cy.stubInvestmentApi();
    cy.visit('/investment', {
      onBeforeLoad(win) {
        cy.spy(win, 'postMessage').as('postMessage');
      }
    });

    cy.get('.gnb_finance a')
      .filter(':contains("해외증시")')
      .click();

    cy.tick(1000);
    cy.wait(['@apiOverseasHome', '@apiOverseasCommon'])
      // FIXME: Bad code!
      .its('0.response.body')
      .as('overseasHomeResponse');
  };

  describe('해외증시 MAP', () => {
    it('MAP의 종류를 선택할 수 있다.', () => {
      visit();
      cy.get('.map_title_wrap').within(() => {
        cy.get('ul > li > a')
          .reverse()
          .clickEachWithTable(
            {
              '다우산업 30': 'dow',
              '나스닥 100': 'nasdaq'
            },
            id => cy
              .url()
              .should('contain', `category=${id}`),
          );
        });
    });

    it('다우산업 화살표를 클릭해 주요뉴스를 살펴볼 수 있다.', () => {
      visit();
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
  });  // END: 해외증시 MAP

  describe('해외 주요지수', () => {
    it('현황을 눌러 활성화 할 수 있고 해당 내용을 보여주며, 클릭하면 종목 상세페이지로 이동한다.', () => {
      visit();
      cy.fixture('api/overseas/home.json')
        .then(home => {
          const checkMajorIndexBy = datas => {
            cy.wrap(datas)
              .each(({
                currentPrice,
                name,
                priceChange,
                rateOfChange
              }) => {
                cy.log('API에서 받아온 정보를 표시');
                // 음양(-, +) 등의 정보는 텍스트가 아닌 이미지로 표현될 수 있기 때문에 절대값을 사용
                const formatNumber = number => Math.abs(number).toLocaleString('en-US');
                cy.get('@majorIndex')
                  .should('contain', name)
                  .and('contain', formatNumber(currentPrice))
                  .and('contain', formatNumber(priceChange))
                  .and('contain', formatNumber(rateOfChange));

                cy.withHidden('#header', () => {
                  cy.get(`li:contains("${name}")`)
                    .find('.graph')
                    .realHover()
                    .find('.graph_tooltip')
                    .should('be.visible');
                });
              });
          };

          cy.get('.major_index')
            .as('majorIndex')
            .contains('주요 지표 현황')
            .click();

          checkMajorIndexBy(home.indicatorOfMainIndex)

          cy.get('@majorIndex')
            .contains('주요국 지수 현황')
            .click();

          checkMajorIndexBy(home.countryIndexOfMainIndex);
        });

      const clickStockNameAndMatchUrl = (stockName, stockUrl) =>
        cy.get('@majorIndex')
          .contains(stockName)
          .click()
          .url()
          .should('contain', stockUrl);

      clickStockNameAndMatchUrl('나스닥 종합', '/global/index/2');
      cy.go('back');

      cy.get('@majorIndex')
        .contains('주요 지표 현황')
        .click();

      clickStockNameAndMatchUrl('나스닥 선물', '/global/index/16');
    });
  });  // END: 해외 주요지수

  describe('해외 대표 종목', () => {
    it('차트와 뉴스, 종목 리스트를 보여준다.', () => {
      cy.stubImages();
      visit();
      // DOW와 NASDAQ 요청 대기
      cy.wait('@apiOverseasRepresentativeStock');
      cy.wait('@apiOverseasRepresentativeStock');

      cy.withHidden('#header', () => {
        cy.get('.representative_index')
          .onlyOn('linux')
          .toMatchImageSnapshot({
            imageConfig: {
              threshold: 0.03,
            }
          });
      });
    });

    it('기간 버튼을 눌러 차트를 바꾸고 리스트를 클릭하여 뉴스를 바꿀 수 있다.', () => {
      cy.request('/api/overseas/home').toMatchApiSnapshot();
      cy.fixture('api/overseas/home.json')
        .then(home => {
          home.representativeStock = [
            {
              "stock": {
                "financeCategory": "OVERSEAS_STOCK",
                "id": "AAPL",
                "name": "애플",
                "updateDateTime": "2022-02-01T06:40:08",
                "symbol": "NASDAQ",
                "currentPrice": 174.07,
                "priceChange": 3.86,
                "rateOfChange": 2.27,
                "preClosingPrice": 170.21,
                "highPrice": 174.14,
                "lowPrice": 170.21
              },
              "article": {
                "id": "https://apple.com/",
                "thumbnail": null,
                "title": "@@대표종목_뉴스a@@",
                "leadText": "@@대표종목_뉴스a_내용@@",
                "registerDateTime": "2022-02-24T09:28:48",
                "mediaName": "@@대표종목_뉴스a_미디어@@",
                "landingUrl": null,
                "category": "해외증시",
                "subCategory": null
              }
            },
            {
              "stock": {
                "financeCategory": "OVERSEAS_STOCK",
                "id": "AMZN",
                "name": "아마존",
                "updateDateTime": "2022-02-09T06:41:10",
                "symbol": "NASDAQ",
                "currentPrice": 3272.99,
                "priceChange": 4.8301,
                "rateOfChange": 0.15,
                "preClosingPrice": 3268.16,
                "highPrice": 3282.37,
                "lowPrice": 3201
              },
              "article": {
                "id": "https://amazon.com/",
                "thumbnail": null,
                "title": "@@대표종목_뉴스b@@",
                "leadText": "@@대표종목_뉴스b_내용@@",
                "registerDateTime": "2022-02-24T09:28:48",
                "mediaName": "@@대표종목_뉴스b_미디어@@",
                "landingUrl": null,
                "category": "해외증시",
                "subCategory": null
              }
            }
          ]
          cy.intercept('/api/overseas/home', home)
            .as('apiOverseasHome');
        });

      visit();

      cy.get('.representative_index')
        .within(() => {
          cy.get('.chart_tab a')
            .clickEachWithTable(
              {
                '1주': 'WEEKLY',
                '3개월': 'MONTHLY3',
                '6개월': 'MONTHLY6',
                '1년': 'YEARLY',
              },
              id => cy
                .get('.chart iframe')
                .as('chartIframe')
                .should('have.attr', 'src')
                .and('contain', `period=${id}`)
            );
          
          cy.contains('애플')
            .click()
            .should('be.activated')
            .end()
            .get('@chartIframe')
            .should('have.attr', 'src')
            .and('contain', 'AAPL')
            .end()
            .get('a:contains("@@대표종목_뉴스a@@")')
            .should('have.attr', 'href')
            .and('equal', 'https://apple.com/');

          cy.contains('아마존')
            .click()
            .should('be.activated')
            .end()
            .get('@chartIframe')
            .should('have.attr', 'src')
            .and('contain', 'AMZN')
            .end()
            .get('a:contains("@@대표종목_뉴스b@@")')
            .should('have.attr', 'href')
            .and('equal', 'https://amazon.com/');
        });
    });

    it('해외증시 주요뉴스를 화살표 버튼을 눌러 살펴볼 수 있다.', () => {
      visit();
      cy.get('.stock_main_news_wrap')
        .as('stockMainNewsWrap');

      cy.get('@stockMainNewsWrap')
        .find('.next')
        .as('nextButton');

      cy.get('@stockMainNewsWrap')
        .find('.prev')
        .as('prevButton');
      
      const newsPerPage = 3;
      function groupBy(n) {
        return function groupByInner(arr, acc) {
          if (typeof acc === 'undefined') acc = [];
          if (arr.length <= 0) return acc;
          return groupByInner(arr.slice(n), acc.concat([arr.slice(0, n)]));
        };
      }
      const groupByThree = groupBy(newsPerPage);

      cy.log('한 페이지에 보이는 개수로 묶어 페이지를 넘겨가며 확인');
      cy.get('@overseasHomeResponse')
        .its('representativeNews')
        .then(groupByThree)
        .each(group => {
          group.forEach(news => {
            cy.get('@stockMainNewsWrap')
              .should('contain', news.title)
              .and('contain', news.mediaName)
              .and('contain', news.leadText);
          });
          cy.get('@nextButton').click();
        });

      cy.log('페이지를 모두 넘기면 현재페이지 표시와 마지막 페이지가 같다');
      cy.get('@stockMainNewsWrap')
        .find('.count')
        .then($el => {
          const [count, total] = $el.text().split('/').map(t => t.trim());
          expect(count).to.equal(total);
        });
    });
  });  // END: 해외 대표 종목

  it('로그인하고 투표를 눌러 투표할 수 있다.', () => {
    // TODO: 원인파악
    cy.ignoreKnownError("Cannot read properties of undefined (reading 'reduce')");

    cy.intercept('/api/overseas/debates/*/vote', {fixture: 'api/overseas/debates-vote.json'})
      .as('debatesVote');

    visit();
    cy.log('로그인 후 투표하여 투표 API요청을 확인한 이후 쿠키를 정리하여 재시도');
    cy.wrap([
        {
          selector: '.rise',
          expectTo: 'be.true',
        },
        {
          selector: '.fall',
          expectTo: 'be.false',
        }
      ])
      .each(({ selector, expectTo }) =>
        cy.login()
          .get('.debate_wrap')
          .find(selector)
          .click()
          .end()
          .wait('@debatesVote')
          .its('request.body.status')
          .should(expectTo)
          .end()
          .clearCookies()
      );
  });

  describe('해외 투자노트', () => {
    it('해외 투자노트 타이틀을 클릭하면 투자노트 목록의 해외증시 탭으로 이동한다.', () => {
      visit();
      cy.get('.expert_insight')
        .contains('해외 투자노트')
        .click()
        .url()
        .should('contain', '/investment/recently')
        .and('contain', 'category=overseasStock');
    });

    it('클릭할 경우, 이름 또는 프로필은 필진페이지, 카테고리는 카테고리 상세, 제목은 게시글 보기로 이동한다.', () => {
      cy.fixture('api/overseas/home.json')
        .then(home => {
          const [firstContent,] = home.recentInvestmentContents;
          firstContent.authorId = 123;
          firstContent.postId = 42;
          firstContent.authorName = '@@투자노트_작성자@@';
          firstContent.title = '@@투자노트_제목@@';
          firstContent.leadText = '@@투자노트_내용@@';
          firstContent.subCategory = '@@투자노트_카테고리@@';

          cy.intercept('/api/overseas/home', home)
            .as('apiOverseasHome');
        });
      visit();

      cy.wrap([
          {
            target: '@@투자노트_작성자@@',
            url: '/investment/author/123',
          },
          {
            target: '@@투자노트_카테고리@@',
            url: `subCategory=${encodeURIComponent(`@@투자노트_카테고리@@`)}`,
          },
          {
            target: '@@투자노트_제목@@',
            url: '/investment/view/42',
          },
        ])
        .each(({ target, url }) => {
          cy.contains(target)
            .click()
            .url()
            .should('contain', url)
            .go('back');
        });
    });
  });  // END: 해외 투자노트

  describe('해외 실시간 뉴스', () => {
    it('카테고리를 변경할 수 있다.', () => {
      visit();
      cy.get('.area_real_news ul.menu_tab > li > a')
        .reverse()
        .clickEachWithTable(
          {
            '전체': 'ALL',
            '해외 증시': 'MARKET',
            '해외 종목': 'STOCK',
          },
          id => cy
            .wait('@apiRealTimeNews')
            .its('request.url')
            .should('contain', `category=${id}`)
        );
    });

    it('스크롤을 하여 다음 해외 실시간 뉴스를 불러온다.', () => {
      visit();
      cy.clock().invoke('restore');
      cy.shouldRequestOnScroll('@apiRealTimeNews');
    });

    it('달력을 클릭하여 여닫기 가능하고 해당하는 날짜의 뉴스를 볼 수 있다.', () => {
      visit();
      cy.log('달력아이콘을 클릭하면 미니 달력이 보여진다');
      cy.get('.mini-calendar')
        .as('miniCalendar');

      cy.get('.date_select .btn_calendar')
        .as('miniCalendarButton');

      cy.get('@miniCalendarButton')
        .click()

      cy.get('@miniCalendar')
        .should('be.visible');

      cy.log('다시 달력아이콘을 클릭하면 미니 달력이 숨겨진다');
      cy.get('@miniCalendarButton')
        .click();

      cy.get('@miniCalendar')
        .should('not.be.visible');

      const getFormattedDate = date => [
          date.getFullYear(),
          date.getMonth() + 1,
          date.getDate()
        ]
        .map(t => String(t).padStart(2, '0'))
        .join('-');

      const date = new Date(now);
      const firstDateOfThisMonth = getFormattedDate(new Date(date.setDate(1)));
      cy.log('달력을 열고 현재달의 1일을 누른다');
      cy.get('.date_select .btn_calendar').click();

      const clickAndMatchDateToUrl = (subject, date) => {
        return subject
          .click({force: true})
          .wait('@apiRealTimeNews')
          .its('request.url')
          .should('contain', `date=${date}`);
      };

      clickAndMatchDateToUrl(
        cy.get('.dates > .date-item')
          .not('.empty')
          .first(),  // 1일
        firstDateOfThisMonth,
      );

      // dayValue에 0이 제공되면 날짜는 이전 달의 마지막 날로 설정됩니다.
      // https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Date/setDate#description
      const lastDateOfPrevMonth = getFormattedDate(new Date(date.setDate(0)));
      cy.log('이전 버튼을 눌러 이전달의 마지막 날의 실시간 뉴스를 확인한다');
      clickAndMatchDateToUrl(
        cy.get('.date_nav .btn.pre'),
        lastDateOfPrevMonth,
      );

      cy.log('다시 다음 버튼을 눌러 이번달의 1일로 이동');
      clickAndMatchDateToUrl(
        cy.get('.date_nav .btn.next'),
        firstDateOfThisMonth,
      );

      cy.log('오늘 버튼을 눌러 오늘 날짜로 복귀');
      clickAndMatchDateToUrl(
        cy.get('.btn_today'),
        getFormattedDate(new Date(now)),
      );
    });

  });  // END: 해외 실시간 뉴스

});  // END: 해외증시
