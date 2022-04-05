const { recurse } = require("cypress-recurse");

describe('zum 투자 홈', () => {
  const now = new Date('2022-03-15T10:00:00');
  const stock = {
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
  };

  beforeEach(() => {
    // TODO: 원인조사
    cy.ignoreKnownError(/Cannot read properties of undefined \(reading '(length|title)'\)/);
    cy.stubHomeApi();
  });

  const visit = () => {
    cy.clock(now);

    cy.stubInvestmentApi();
    cy.visit('/investment', {
      onBeforeLoad(win) {
        cy.spy(win, 'postMessage').as('postMessage');
      }
    });

    cy.tick(1000);
    cy.get('.gnb_finance a')
      .filter(':contains("홈")')
      .click();

    cy.wait('@apiHome').as('apiHomeHttp');
    cy.wait('@apiCategoryNews').as('apiCategoryNewsHttp');
    cy.tick(1000);
  };

  it('검색창을 클릭한 뒤 종목을 입력하고 엔터를 눌러 검색할 수 있다.', () => {
    visit();
    // TODO: 어플리케이션 오류 준일님 수정사항 반영되면 재확인
    cy.ignoreKnownError('Navigation cancelled from');

    cy.get('#header')
      .within(() => {
        cy.log('증권 검색창을 클릭해서 검색레이어를 열고 닫을 수 있다');
        cy.contains('증권 검색').as('searchBox');

        cy.get('@searchBox').click({force: true});
        cy.get('[placeholder="지수명, 종목명(종목코드) 입력"]')
          .as('searchInput');

        cy.get('@searchInput').should('be.visible');
        cy.get('button:contains("닫기")').click();
        cy.get('@searchInput').should('not.be.exist');

        cy.log('검색 키워드를 입력한다');
        cy.contains('증권 검색').click({force: true});
        cy.get('@searchInput')
          .type(stock.name);
      });

    cy.tick(1000);
    cy.wait('@apiSuggest')
      .then(() => {
        cy.log('추천 검색어가 표시되면 엔터를 눌러 검색할 수 있다');
        cy.get('.stock_list_wrap .list > *')
          .first()
          .should('contain', stock.name);

        cy.get('@searchInput')
          .click({force: true})
          .type('{enter}', {force: true});

        cy.contains('종목 데이터를 가져오는 중입니다')
          .should('be.visible');
        
        cy.url()
          .should('contain', stock.code);
      });

    cy.log('뒤로가기해서 최근 검색내역이 올바르게 입력되었는지 확인한다');
    cy.go('back');
    cy.get('@searchBox').click({force: true});
    cy.get('#header')
      .within(() => {
        cy.get('.latest_word')
          .as('latestWord');
        
        cy.get('@latestWord')
          .find(`.word:contains("${stock.name}") button`)
          .click()
          .should('not.be.exist');

        cy.get('@latestWord')
          .should('contain', '최근 검색내역이 존재하지 않습니다');
      });
  });

  describe('사이드바', () => {
    it('메뉴가 보여진다.', () => {
      cy.stubImages();
      visit();
      cy.tick(600000)
        .withHidden('#header, .right_cont .interested_items, .right_cont .gdn_wrap', () => {
        cy.get('.right_cont_inner')
          .then($el => {
            $el.css('position', 'relative !important');
            return cy
              .waitForImage('.right_cont_inner .thumb img')
              .end()
              .wrap($el);
          })
          .toMatchImageSnapshot();
      });
    });

    it('아래로 스크롤하면 따라온다.', () => {
      visit();
      cy.scrollTo('bottom')
        .get('.right_cont')
        .should('have.descendants', '.sticky');
    });

    describe('주요지표', () => {
      beforeEach(() => {
        visit();
        cy.get('.main_indicator')
          .as('mainIndicator');

        cy.get('@mainIndicator')
          .find('iframe')
          .first()
          .as('mainIndicatorChart');
      });

      it('기간과 지표를 선택하여 해당하는 차트를 볼 수 있다.', () => {
        cy.log('클릭하는 내용에 따라 위젯 주소가 변경되는지 확인');
        cy.get('@mainIndicator')
          .find('ul')
          .filter(`:contains("1주일")`)
          .find('li > a')
          .clickEachWithTable({
              '1주일': 'WEEKLY',
              '1개월': 'MONTHLY',
              '6개월': 'MONTHLY6',
              '1년': 'YEARLY'
            },
            period => cy
              .get('@mainIndicatorChart')
              .should('have.attr', 'src')
              .and('contain', period),
          );

        cy.get('@mainIndicator')
          .find('ul')
          .filter(`:contains("나스닥 선물")`)
          .find('li > a')
          .clickEachWithTable(
            {
              '나스닥 선물': subject =>
                subject
                  .should('have.attr', 'src')
                  .and('contain', 'id=16')
                  .and('contain', 'overseas-index'),
              '국내 USD/KRW': subject =>
                subject
                  .should('have.attr', 'src')
                  .and('contain', 'id=USD')
                  .and('contain', 'exchange'),
              'WTI': subject =>
                subject
                  .should('have.attr', 'src')
                  .and('contain', 'id=6')
                  .and('contain', 'market'),
              '미국 10년물 국채': subject =>
                subject
                  .should('have.attr', 'src')
                  .and('contain', 'id=17')
                  .and('contain', 'overseas-index'),
              '공포지수': subject =>
                subject
                  .should('have.attr', 'src')
                  .and('contain', 'id=18')
                  .and('contain', 'overseas-index'),
              '국내 투자예탁금': subject =>
                subject
                  .should('have.attr', 'src')
                  .and('contain', 'id=5')
                  .and('contain', 'domestic-index'),
            },
            match => match(cy.get('@mainIndicatorChart')),
            $link => $link.find('.name').text(),
          )
      });
    });  // END: 주요지표

    it('로그인하면 관심종목이 보여지고 관심 선택, 해제 및 종목 이동이 가능하다.', () => {
      cy.fixture('api/interest.json')
        .then(interest => {
          interest.items.unshift(stock);
          cy.intercept('/api/interest', req => {
              req.reply({
                ...interest,
                itemCount: interest.itemCount + 1,
              });
            })
            .as('apiInterest');

          cy.intercept('/api/interest/delete', req => {
              interest.items.shift();
              req.reply(interest);
            })
            .as('apiInterestDelete');
        });

      cy.log('로그인 후 사이드바에 관심종목이 표시되는지 확인');
      cy.login()
        .then(visit);

      cy.get('.right_cont')
        .as('sideBar');

      cy.log('관심종목의 종목이름을 클릭하면 해당 종목페이지로 이동한다');
      cy.get('@sideBar')
        .should('have.descendants', '.stock_list')
        .contains(stock.name)
        .click()

      cy.url()
        .should('contain', stock.code)
        .go('back');

      cy.log('활성화 별 모양 아이콘을 클릭하여 관심종목을 해제할 수 있다');
      cy.get('@sideBar')
        .find('.stock_list .like')
        .first()
        .click({force: true});

      cy.wait('@apiInterestDelete')
        .its('request.body')
        .should('be.deep.equal', {id: stock.id});
    });

  });  // END: 사이드바

  describe('오늘의 주요뉴스', () => {
    it('화살표 버튼을 눌러 투자노트와 공시를 살펴볼 수 있다.', () => {
      visit();

      cy.get('.breaking_news')
        .as('breakingNews');

      cy.get('@breakingNews')
        .find('.next')
        .as('nextButton');

      cy.get('@breakingNews')
        .find('.prev')
        .as('prevButton');

      // Carrage Return 문자는 HTML에서 제외
      const removeCarrageReturn = title => title.replace(/\r/g, '');
      cy.fixture('api/home.json')
        .then(home => {
          cy.log('API로 받아온 값이 올바르게 주요뉴스 타이틀 옆에 표시되는지 확인');
          const notices = [
            ...home.notices.performanceSummaryNotices,
            ...home.notices.investmentContentsNotices,
          ];
          notices.forEach(({ title }) => {
            cy.get('@breakingNews')
              .should('contain', removeCarrageReturn(title));

            cy.get('@nextButton')
              .click();
          });

          notices.reverse().forEach(({ title }) => {
            cy.get('@prevButton')
              .click();

            cy.get('@breakingNews')
              .should('contain', removeCarrageReturn(title));
          });
        });
    });

    it('오늘의 주요 뉴스가 보여진다.', () => {
      cy.stubImages();
      visit();

      cy.get('.today_news')
        .first()
        .as('todayNews');

      cy.get('@todayNews')
        .scrollIntoView();

      cy.withHidden('#header', () => {
        cy.get('@todayNews')
          .within(() => {
            cy.waitForImage('[class^="thumb"] img, .today_news img[class^="thumb"]');

            cy.root()
              .first()
              .toMatchImageSnapshot();
          });
      });
    });

    it('주요뉴스 카드를 클릭하여 투자뉴스 읽기 페이지로 이동할 수 있고 하트를 눌러 좋아요 표시 할 수 있다.', () => {
      const articleIdx = '12345678';
      const articleTitle = '@@주요뉴스_제목@@';

      cy.request('/api/home').toMatchApiSnapshot();
      cy.fixture('api/home.json')
        .then(home => {
          const [firstTemplatedNews,] = home.mainNews.templatedNews.items;
          firstTemplatedNews.id = articleIdx;
          firstTemplatedNews.title = articleTitle;
          firstTemplatedNews.landingUrl = `https://news.zum.com/articles/${articleIdx}`;

          cy.intercept('/api/home', home)
            .as('apiHome');
        });
      visit();

      const newsStocks = [
        {
            "type": "industry",
            "code": "5",
            "name": "@@산업@@",
            "rateOfChange": -0.24,
            "currentPrice": null
        },
        {
            "type": "item",
            "code": "239340",
            "name": "@@종목@@",
            "rateOfChange": 0.33,
            "currentPrice": 153500
        }
      ];
      cy.fixture('api/news/detail.json')
        .then(news => {
          news.detail.stocks = newsStocks;
          cy.intercept('/api/news/detail/*', news)
            .as('apiNewsDetail');
        });

      cy.intercept('POST', 'https://cmnt.zum.com/vote/article/like', req => {
          expect(req.body).to.deep.contain({articleIdx});
          req.reply({
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: '"LIKE"',
          });
        })
        .as('apiCmntVoteArticleLike');

      cy.contains(articleTitle)
        .click()
        .url()
        .should('contain', articleIdx);

      // TODO: 원인 파악
      cy.ignoreKnownError("Cannot read properties of undefined (reading 'items')");

      cy.log('표시된 뉴스 관련종목, 업종을 클릭해 해당 페이지로 이동 가능');
      cy.wrap(newsStocks)
        .each(stock => {
          cy.get('.article_index_info')
            .find(`a:contains("${stock.name}")`)
            .as('articleStockInfo')
            .should('be.visible')
            .and('have.attr', 'href')
            .and('contain', `/domestic/${stock.type}/${stock.code}`);
        });

      const tickWhileWait = alias => {
        return recurse(
          () => cy
            .tick(1000)
            .get(alias),
          http => expect(http).to.be.not.null,
          { delay: 1000 },
        )
      };

      // setTimeout으로 호출되는 API들을 기다림
      tickWhileWait('@apiCmntArticleInfo');
      tickWhileWait('@apiCmntArticleList');

      // API stub 응답값 덮어쓰기
      cy.fixture('cmnt.zum.com/article/info.json')
        .then(info => {
          info.likeCount += 1;
          cy.intercept('https://cmnt.zum.com/article/info/**', info)
            .as('apiCmntArticleInfo');
        });

      cy.log('하트 아이콘을 눌러 좋아요 할 수 있고 좋아요 수가 증가한다');
      cy.get('.like button')
        .first()
        .click();

      cy.wait('@apiCmntVoteArticleLike');
      cy.wait('@apiCmntArticleInfo');

      cy.get('.like .count')
        .should('contain', 1);
    });
  });  // END: 오늘의 주요뉴스

  describe('증시전망', () => {
    beforeEach(() => {
      visit();
      cy.get('.stock_view')
        .scrollIntoView()
        .as('stockView');

      recurse(
        () => cy
          .tick(10000)
          .get('@stockView'),
        $el => expect($el).to.have.descendants('#zum-player iframe'),
        {
          delay: 100,
          timeout: 20000,
          limit: 30,
          log: false,
        }
      );
    });

    it('목록에서 클릭하면 해당 영상이 재생된다.', () => {
      const shouldPostMessageMatch = pattern => {
        recurse(
          () => cy.get('@postMessage'),
          message =>
            expect(message).to.be.calledWithMatch(pattern),
          {
            delay: 100,
            timeout: 20000,
            limit: 30,
            log: false,
          }
        );
      };

      cy.log('동영상 플레이어는 우선 resize 메시지를 받고 settedIdAndPlay 메시지를 받아 재생한다');
      shouldPostMessageMatch(/resize/);
      cy.get('.thumbnail_list_wrap ul > li:not(.active) > a')
        .each($link => {
          cy.wrap($link).click();
          shouldPostMessageMatch(/settedIdAndPlay/);
        });
    });
  });  // END: 증시전망

  describe('투자노트', () => {
    beforeEach(() => {
      cy.fixture('api/home.json')
        .then(home => {
          const {
            all,
            alternativeInvestment,
            coin,
            domesticStock,
            investmentTrend,
            overseasStock,
          } = home.recentInvestmentContents;

          const contentsMap = {
            '전체': all,
            '국내증시': domesticStock,
            '해외증시': overseasStock,
            '가상화폐': coin,
            '대체투자': alternativeInvestment,
            '투자트렌드': investmentTrend,
          };
          cy.wrap(contentsMap).as('contentsMap');

          Object
            .entries(contentsMap)
            .forEach(([name, contents], i) => {
              contents.forEach((content, j) => {
                content.title = `@@${name}_${i}_${j}@@`;
                content.leadText = `@@${name}_요약_${i}_${j}@@`;
                content.authorName = `@@${name}_작성자_${i}_${j}@@`;
                content.subCategory = `@@${name}_카테고리_${i}_${j}@@`;
              });
            });

          cy.intercept('/api/home', home)
            .as('apiHome');
        });

      cy.stubImages();
      visit();

      cy.get('.expert_insight').as('expertInsight');
    });

    it('메뉴를 클릭하여 해당하는 투자노트 목록을 볼 수 있다.', () => {
      cy.get('@contentsMap')
        .then(contentsMap => {
          cy.get('@expertInsight')
            .find('ul.menu_tab > li > a')
            .each($tab => {
              cy.wrap($tab).click().should('be.activated');

              const tabText = $tab.text();
              cy.wrap(contentsMap[tabText])
                .each(content => {
                  cy.get('@expertInsight')
                    .should('contain', content.title)
                    .and('contain', content.authorName)
                    .and('contain', content.leadText)
                    .and('contain', content.subCategory);
                });
            });
        });
    });

    it('투자노트가 카드형태로 4개씩 보여진다.', () => {
      cy.get('@expertInsight').scrollIntoView();
      cy.withHidden('#header', () => {
        cy.waitForImage('.expert_insight img');

        cy.get('@expertInsight')
          .toMatchImageSnapshot();
      });
    });
  });  // END: 투자노트

  describe('실시간 종목 TALK', () => {
    it('스크롤하여 대화를 볼 수 있다.', () => {
      visit();
      cy.get('.real_time_contents_wrap')
        .within(() => {
          cy.get('ul > li').as('listItems');

          cy.log('스크롤해서 첫 번째 부터 마지막 대화까지 볼 수 있다');

          cy.get('@listItems').first().should('be.visible');
          cy.get('.content_inner')
            .scrollTo('bottom');
          cy.get('@listItems').last().should('be.visible');
        });
    });

    it('대화를 클릭하여 종목 상세페이지로 이동할 수 있다. ', () => {
      const content = '세상을 읽고 담는 줌인터넷';
      cy.fixture('api/home.json')
        .then(home => {
          const [firstItem,] = home.realtimeComments.items;
          firstItem.content = content;
          firstItem.stockCode = stock.code;
          firstItem.stockName = stock.name;

          cy.intercept('/api/home', home)
            .as('apiHome');
        });
      visit();

      cy.get('.real_time_contents_wrap')
        .contains(content)
        .click()
        .url()
        .should('contain', stock.code);
    });
  });  // END: 실시간 종목 TALK

  describe('분야별 실시간 뉴스', () => {
    beforeEach(visit);

    it('카테고리를 변경할 수 있다.', () => {
      cy.contains('분야별 실시간 뉴스').scrollIntoView();
      cy.log('각 카테고리를 클릭하면 API 요청이 발생한다');
      cy.get('.area_real_news ul.menu_tab > li > a')
        // 활성화된 첫 번째 카테고리를 클릭하는것은 의미가 없기때문에 역순으로 클릭
        .reverse()
        .clickEachWithTable(
          {
            '전체': 'all',
            '국내증시': 'domestic',
            '해외증시': 'overseas',
            '시장지표': 'market',
            '가상화폐': 'coin',
            'ESG': 'esg',
          },
          id => cy
            .wait('@apiCategoryNews')
            .its('request.url')
            .should('contain', `category=${id}`),
        );
    });

    it('스크롤을 내리면 다음 페이지를 불러온다.', () => {
      // 스크롤 과정에서 setTimeout 호출이 빈번하게 발생하므로 clock stub을 해제
      cy.clock().invoke('restore');
      const today = new Date().toISOString().match(/\d{4}-\d{2}-\d{2}/)[0];
      cy.request(`/api/home/category-news?category=all&date=${today}&page=2`)
        .toMatchApiSnapshot();
      cy.shouldRequestOnScroll('@apiCategoryNews');
    });

    it('달력을 여닫을 수 있고 일자를 클릭하여 해당하는 날짜의 뉴스를 볼 수 있다.', () => {
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
          .wait('@apiCategoryNews')
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

  });  // END: 분야별 실시간 뉴스

});  // END: zum 투자 홈
