describe('zum 투자 홈', () => {
  beforeEach(() => {
    cy.stubThirdParty();

    cy.intercept('/api/global', {statusCode: 200});
    cy.intercept('/api/domestic**', {statusCode: 200});

    cy.intercept('/api/suggest*', {fixture: 'search-suggest-zum'})
      .as('apiSuggest');
    cy.intercept('/api/home/category-news*', req => {
        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get('page'), 10);
        req.reply({fixture: `category-news-${page}`});
      })
      .as('apiCategoryNews');

    // 정적 컨텐츠를 fixture값으로 대체하기 위해 의도적으로 다른 페이지에서 라우팅하여 이동
    cy.intercept('/api/home', {fixture: 'home'})
      .as('apiHome');

    cy.visit('/domestic', {
      onBeforeLoad(win) {
        cy.stub(win, 'postMessage').as('postMessage');
      }
    });
    cy.get('.gnb_finance a:contains("홈")')
      .click({force: true});

    cy.wait(['@apiHome', '@apiCategoryNews']);
  });

  it('검색창을 클릭한 뒤 종목을 입력하고 엔터를 눌러 검색할 수 있다.', () => {
    // TODO: 어플리케이션 오류 준일님 수정사항 반영되면 재확인
    cy.ignoreKnownError('Navigation cancelled from');

    cy.contains('증권 검색').click({force: true});

    cy.get('[placeholder="지수명, 종목명(종목코드) 입력"]')
      .as('searchInput')
      .type('줌인터넷');

    cy.wait('@apiSuggest').then(() => {
      cy.get('.stock_list_wrap .list > *')
        .its('length')
        .should('be.greaterThan', 0);

      cy.get('@searchInput')
        .click({force: true})
        .type('{enter}', {force: true});
      
      cy.url()
        .should('contain', '239340');
    });
  });

  describe('사이드바', () => {
    it('메뉴가 보여진다.', () => {
      cy.withHidden('#header, .right_cont .gdn_wrap', () => {
        cy.get('.right_cont_inner')
          .then($el => {
            $el.css('position', 'relative');
            return cy.wrap($el);
          })
          .toMatchImageSnapshot();
      });
    });

    it('아래로 스크롤하면 따라온다.', () => {
      cy.scrollTo('bottom')
        .get('.right_cont')
        .should('have.descendants', '.sticky');
    });

    describe('주요지표', () => {
      beforeEach(() => {
        cy.get('.main_indicator')
          .as('mainIndicator');

        cy.get('@mainIndicator')
          .find('iframe')
          .first()
          .as('mainIndicatorChart');
      });

      it('기간을 선택하여 해당하는 차트를 볼 수 있다.', () => {
        const rangeTable = {
          '1주일': 'WEEKLY',
          '1개월': 'MONTHLY',
          '6개월': 'MONTHLY6',
          '1년': 'YEARLY'
        };

        const expectToMatchChart = name => {
          cy.get('@mainIndicatorChart')
            .should('have.attr', 'src')
            .and('contain', rangeTable[name]);
        };

        cy.get('@mainIndicator')
          .find(`ul:contains("${Object.keys(rangeTable)[0]}") > li > a`)
          .each($link => {
            const linkText = $link.text();

            cy.wrap($link)
              .click()
              .should('be.activated')
              .then(() => expectToMatchChart(linkText));
          });
      });

      it('지표를 선택하여 해당하는 차트를 볼 수 있다.', () => {
        const indicatorTable = {
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
        };

        cy.get('@mainIndicator')
          .find(`ul:contains("${Object.keys(indicatorTable)[0]}") > li > a`)
          .each($link => {
            cy.wrap($link)
              .click()
              .should('be.activated')
              .then(() => {
                const linkText = $link.find('.name').text();

                const match = indicatorTable[linkText];
                expect(match).to.be.exist;

                match(cy.get('@mainIndicatorChart'));
              });
          });
      });
    });  // END: 주요지표

  });  // END: 사이드바

  it('오늘의 주요 뉴스가 보여진다.', () => {
    cy.get('.today_news')
      .first()
      .scrollIntoView();

    cy.withHidden('#header', () => {
      cy.waitForImage('.today_news [class^="thumb"] img, .today_news img[class^="thumb"]');

      cy.get('.today_news')
        .first()
        .toMatchImageSnapshot();
    });
  });

  describe('증시전망', () => {
    beforeEach(() => {
      cy.get('.stock_view')
        .as('stockView');

      cy.get('@stockView')
        .find('iframe')
        .first()
        .as('zumPlayer');
    });

    it('목록에서 클릭하면 해당 영상이 재생된다.', () => {
      cy.get('.thumbnail_list_wrap ul > li:not(.active) > a')
        .each($link => {
          cy.wrap($link).click();
          cy.get('@postMessage')
            .should('be.calledWithMatch', /settedIdAndPlay/);
        });
    });
  });  // END: 증시전망

  describe('투자노트', () => {
    it('투자노트가 보여진다.', () => {
      cy.withHidden('#header', () => {
        cy.waitForImage('.expert_insight img');

        cy.get('.expert_insight')
          .toMatchImageSnapshot();
      });
    });

    it('메뉴를 클릭하여 활성화 할 수 있다.', () => {
      cy.get('.expert_insight ul.menu_tab > li > a')
        .each($tab => cy.wrap($tab).click().should('activated'));
    });
  });  // END: 투자노트

  describe('실시간 종목 TALK', () => {
    it('스크롤하여 대화를 볼 수 있다.', () => {
      cy.get('.real_time_contents_wrap')
        .within(() => {
          cy.get('ul > li').first().should('be.visible');
          cy.get('.content_inner')
            .scrollTo('bottom');
          cy.get('ul > li').last().should('be.visible');
        });
    });

    it('대화를 클릭하여 종목 상세페이지로 이동할 수 있다. ', () => {
      cy.get('.real_time_contents_wrap')
        .contains('세상을 읽고 담는 줌인터넷')
        .click()
        .url()
        .should('contain', '239340');
    });
  });

  describe('분야별 실시간 뉴스', () => {
    beforeEach(() => {
      cy.contains('분야별 실시간 뉴스').scrollIntoView();
    });

    it('카테고리를 변경할 수 있다.', () => {
      const categoryTable = {
        '국내증시': 'domestic',
        '해외증시': 'overseas',
        '시장지표': 'market',
        '가상화폐': 'coin',
        'ESG': 'esg',
      };
      cy.get('.area_real_news ul.menu_tab > li:not(:first-child) > a')
        .each($menu => {
          const menuText = $menu.text();
          cy.wrap($menu)
            .click({force: true});

          cy.wait('@apiCategoryNews')
            .its('request.url')
            .should('contain', `category=${categoryTable[menuText]}`);
        });
    });

    it('스크롤을 내리면 다음 페이지를 불러온다.', () => {
      cy.shouldRequestOnScroll('@apiCategoryNews');
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

      const date = new Date();
      const firstDateOfThisMonth = getFormattedDate(new Date(date.setDate(1)));
      // 달력을 열고 현재달의 1일을 누른다.
      cy.get('.date_select .btn_calendar').click();
      cy.get('.dates > .date-item:not(.empty)')
        .first()  // 1일
        .click({force: true})
        .wait('@apiCategoryNews')
        .its('request.url')
        .should('contain', `date=${firstDateOfThisMonth}`);

      // dayValue에 0이 제공되면 날짜는 이전 달의 마지막 날로 설정됩니다.
      // https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Date/setDate#description
      const lastDateOfPrevMonth = getFormattedDate(new Date(date.setDate(0)));
      // 이전 버튼을 눌러 이전달의 마지막 날의 실시간 뉴스를 확인한다.
      cy.get('.date_nav .btn.pre')
        .click({force: true})
        .wait('@apiCategoryNews')
        .its('request.url')
        .should('contain', `date=${lastDateOfPrevMonth}`)

      // 다시 다음 버튼을 눌러 이번달의 1일로 이동
      cy.get('.date_nav .btn.next')
        .click()
        .wait('@apiCategoryNews')
        .its('request.url')
        .should('contain', `date=${firstDateOfThisMonth}`);

      // 오늘 버튼을 눌러 오늘 날짜로 복귀
      cy.get('.btn_today')
        .click()
        .wait('@apiCategoryNews')
        .its('request.url')
        .should('contain', `date=${getFormattedDate(new Date())}`);
    });

  });  // END: 분야별 실시간 뉴스

});  // END: zum 투자 홈
