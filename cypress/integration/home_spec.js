describe('zum 투자 홈', () => {
  const baseUrl = Cypress.config('baseUrl');
  beforeEach(() => {
    cy.stubThirdParty();
    cy.intercept('https://pip-player.zum.com/**', {statusCode: 200})
      .as('pipPlayer');
    cy.intercept('/api/global', {statusCode: 200});
    cy.intercept('/api/domestic**', {statusCode: 200});
    cy.intercept('/api/suggest*', {fixture: 'search-suggest-zum'})
      .as('apiSuggest');
    cy.intercept('/api/home/category-news*', req => {
        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get('page'), 10);
        req.reply({fixture: `category-news-${page}`});
      })
      .as('categoryNews');

    cy.visit('/');
  });

  it('오늘의 주요 뉴스가 보여진다.', () => {
    const fixture = 'foobar';
    const origMap = new Map();
    cy.get('.title, .word, .etc, .txt')
      .as('replacedTargets')
      .each($el => {
        origMap.set($el[0], $el.html());
        $el.text(fixture);
      });

    cy.get('.today_news')
      .first()
      .scrollIntoView();

    cy.createHidingContext('#header', () => {
      cy.get('.today_news [class^="thumb"] img, .today_news img[class^="thumb"]')
        .each($img => $img.remove());

      cy.get('.today_news')
        .first()
        .toMatchImageSnapshot();
      
      cy.get('@replacedTargets')
        .each($el => {
          $el.html(origMap.get($el[0]));
        });
    });
  });

  it('검색창을 클릭한 뒤 종목을 입력하고 엔터를 눌러 검색할 수 있다.', () => {
    // TODO: 어플리케이션 오류 준일님 수정사항 반영되면 재확인
    cy.on('uncaught:exception', e => {
      // e.message는 Cypress 메시지도 포함하고있어 startsWith 대신 includes를 사용
      if (e.message.includes('Navigation cancelled from')) {
        return false;
      }
    });

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

          cy.wait('@categoryNews')
            .its('request.url')
            .should('contain', `category=${categoryTable[menuText]}`);
        });
    });

    it('스크롤을 내리면 다음 페이지를 불러온다.', () => {
      cy.shouldRequestOnScroll('@categoryNews');
    });

    it('달력을 클릭하여 해당하는 날짜의 뉴스를 볼 수 있다.', () => {
      const getFormattedDate = date => [
          date.getFullYear(),
          date.getMonth() + 1,
          date.getDate()
        ].map(t => String(t).padStart(2, '0')).join('-');

      // 미니 달력을 연다
      cy.get('.date_select .btn_calendar')
        .click();
      cy.get('.mini-calendar').should('be.visible');

      const date = new Date();
      date.setDate(1);
      const firstDateOfThisMonth = getFormattedDate(date);
      // 현재달의 1일을 누른다.
      cy.get('.dates > .date-item:not(.empty)')
        .first()  // 1일
        .click({force: true})
        .wait('@categoryNews')
        .its('request.url')
        .should('contain', `date=${firstDateOfThisMonth}`);

      // dayValue에 0이 제공되면 날짜는 이전 달의 마지막 날로 설정됩니다.
      // https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Date/setDate#description
      const lastDateOfPrevMonth = getFormattedDate(new Date(date.setDate(0)));
      // 이전 버튼을 눌러 이전달의 마지막 날의 실시간 뉴스를 확인한다.
      cy.get('.date_nav .btn.pre')
        .click({force: true})
        .wait('@categoryNews')
        .its('request.url')
        .should('contain', `date=${lastDateOfPrevMonth}`)

      // 다시 다음 버튼을 눌러 이번달의 1일로 이동
      cy.get('.date_nav .btn.next')
        .click()
        .wait('@categoryNews')
        .its('request.url')
        .should('contain', `date=${firstDateOfThisMonth}`);

      // 오늘 버튼을 눌러 오늘 날짜로 복귀
      cy.get('.btn_today')
        .click()
        .wait('@categoryNews')
        .its('request.url')
        .should('contain', `date=${getFormattedDate(new Date())}`);
    });

  });  // END: 분야별 실시간 뉴스

});  // END: zum 투자 홈