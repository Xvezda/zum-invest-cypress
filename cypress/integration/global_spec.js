describe('해외증시', () => {
  const now = new Date('2022-03-15T10:00:00');
  beforeEach(() => {
    cy.ignoreKnownError(/Cannot read properties of undefined \(reading '(dow|children)'\)/);
    cy.stubInvestApi();
    cy.clock(now);

    cy.visit('/investment', {
      onBeforeLoad(win) {
        cy.spy(win, 'postMessage').as('postMessage');
      }
    });

    cy.get('.gnb_finance a:contains("해외증시")')
      .click();

    cy.tick(1000);
    cy.wait(['@apiOverseasHome', '@apiOverseasCommon']);
  });

  describe('해외증시 MAP', () => {
    it('MAP의 종류를 선택할 수 있다.', () => {
      const mapTable = {
        '다우산업 30': 'dow',
        '나스닥 100': 'nasdaq'
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

    it('다우산업 화살표를 클릭해 주요뉴스를 살펴볼 수 있다.', () => {
      cy.get('.main_news_list')
        .scrollIntoView();

      cy.get('.main_news_list + .navi > .next')
        .click();

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
  });  // END: 해외증시 MAP

  describe('해외 주요지수', () => {
    it('현황을 눌러 활성화 할 수 있고 해당 내용을 보여주며, 클릭하면 종목 상세페이지로 이동한다.', () => {
      cy.fixture('overseas-home')
        .then(home => {
          cy.get('.major_index')
            .as('majorIndex')
            .contains('주요 지표 현황')
            .click();

          const mainIndexNames = home.indicatorOfMainIndex
            .map(({ name }) => name);

          cy.wrap(mainIndexNames)
            .each(name => cy.get('@majorIndex').should('contain', name));

          cy.get('@majorIndex')
            .contains('주요국 지수 현황')
            .click();

          const mainCountryNames = home.countryIndexOfMainIndex
            .map(({ name }) => name);

          cy.wrap(mainCountryNames)
            .each(name => cy.get('@majorIndex').should('contain', name));
        });

      cy.get('@majorIndex')
        .contains('나스닥 종합')
        .click()
        .url()
        .should('contain', '/global/index/2')
        .go('back');

      cy.get('@majorIndex')
        .contains('주요 지표 현황')
        .click();

      cy.get('@majorIndex')
        .contains('나스닥 선물')
        .click()
        .url()
        .should('contain', '/global/index/16');
    });
  });  // END: 해외 주요지수

  describe('해외 대표 종목', () => {
    it('차트와 뉴스, 종목 리스트를 보여준다.', () => {
      // DOW와 NASDAQ 요청 대기
      cy.wait('@apiOverseasRepresentativeStock');
      cy.wait('@apiOverseasRepresentativeStock');

      cy.withHidden('#header', () => {
        cy.get('.representative_index').toMatchImageSnapshot();
      });
    });

    it('기간 버튼을 눌러 차트를 바꾸고 리스트를 클릭하여 뉴스를 바꿀 수 있다.', () => {
      const periodTable = {
        '1주': 'WEEKLY',
        '3개월': 'MONTHLY3',
        '6개월': 'MONTHLY6',
        '1년': 'YEARLY',
      };
      cy.get('.representative_index')
        .within(() => {
          cy.get('.chart_tab a')
            .each($button => {
              const buttonText = $button.text();
              const period = periodTable[buttonText];

              cy.wrap($button).click().should('be.activated');
              cy.get('.chart iframe')
                .as('chartIframe')
                .should('have.attr', 'src')
                .and('contain', `period=${period}`);
            });
          
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
  });  // END: 해외 대표 종목

  it('로그인하고 투표를 눌러 투표할 수 있다.', () => {
    // TODO: 원인파악
    cy.ignoreKnownError("Cannot read properties of undefined (reading 'reduce')");

    cy.intercept('/api/overseas/debates/*/vote', {fixture: 'overseas-debates-vote'})
      .as('debatesVote');

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
      cy.get('.expert_insight')
        .contains('해외 투자노트')
        .click()
        .url()
        .should('contain', '/investment/recently')
        .and('contain', 'category=overseasStock');
    });

    it('클릭할 경우, 이름 또는 프로필은 필진페이지, 카테고리는 카테고리 상세, 제목은 게시글 보기로 이동한다.', () => {
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
      cy.contains('해외 실시간 뉴스').scrollIntoView();
      const categoryTable = {
        '해외 증시': 'MARKET',
        '해외 종목': 'STOCK',
      };
      cy.get('.area_real_news ul.menu_tab > li:not(:first-child) > a')
        .each($menu => {
          const menuText = $menu.text();
          cy.wrap($menu)
            .click({force: true});

          cy.wait('@apiRealTimeNews')
            .its('request.url')
            .should('contain', `category=${categoryTable[menuText]}`);
        });
    });

    it('스크롤을 하여 다음 해외 실시간 뉴스를 불러온다.', () => {
      cy.clock().invoke('restore');
      cy.shouldRequestOnScroll('@apiRealTimeNews');
    });

    it('달력을 클릭하여 열고 닫을 수 있다.', () => {
      cy.get('.mini-calendar')
        .as('miniCalendar');

      cy.get('.date_select .btn_calendar')
        .as('miniCalendarButton');

      cy.get('@miniCalendarButton')
        .click()

      cy.get('@miniCalendar')
        .should('be.visible');

      cy.get('@miniCalendarButton')
        .click();

      cy.get('@miniCalendar')
        .should('not.be.visible');
    });

    it('달력을 클릭하여 해당하는 날짜의 뉴스를 볼 수 있다.', () => {
      const getFormattedDate = date => [
          date.getFullYear(),
          date.getMonth() + 1,
          date.getDate()
        ]
        .map(t => String(t).padStart(2, '0'))
        .join('-');

      const date = new Date(now);
      const firstDateOfThisMonth = getFormattedDate(new Date(date.setDate(1)));
      // 달력을 열고 현재달의 1일을 누른다.
      cy.get('.date_select .btn_calendar').click();

      const clickAndMatchUrlToDate = (subject, date) => {
        return subject
          .click({force: true})
          .wait('@apiRealTimeNews')
          .its('request.url')
          .should('contain', `date=${date}`);
      };

      clickAndMatchUrlToDate(
        cy.get('.dates > .date-item:not(.empty)')
          .first(),  // 1일
        firstDateOfThisMonth,
      );

      // dayValue에 0이 제공되면 날짜는 이전 달의 마지막 날로 설정됩니다.
      // https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Date/setDate#description
      const lastDateOfPrevMonth = getFormattedDate(new Date(date.setDate(0)));
      // 이전 버튼을 눌러 이전달의 마지막 날의 실시간 뉴스를 확인한다.
      clickAndMatchUrlToDate(
        cy.get('.date_nav .btn.pre'),
        lastDateOfPrevMonth,
      );

      // 다시 다음 버튼을 눌러 이번달의 1일로 이동
      clickAndMatchUrlToDate(
        cy.get('.date_nav .btn.next'),
        firstDateOfThisMonth,
      );

      // 오늘 버튼을 눌러 오늘 날짜로 복귀
      clickAndMatchUrlToDate(
        cy.get('.btn_today'),
        getFormattedDate(new Date(now)),
      );
    });

  });  // END: 해외 실시간 뉴스

});  // END: 해외증시
