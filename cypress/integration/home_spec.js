describe('zum 투자 홈', () => {
  const baseUrl = 'https://invest.zum.com';
  beforeEach(() => {
    cy.stubThirdParty();
    cy.visit(baseUrl);
  });

  it('티커에 마우스를 올리면 멈추고, 올라가있지 않으면 다시 움직인다.', () => {
    const toWait = 500;
    const getTickerRect = $el => $el.get()[0].getBoundingClientRect();
    cy.get('.ticker_bar .inner')
      .trigger('mouseenter')
      .then($el => {
        const prevRect = getTickerRect($el);

        cy.wrap(prevRect).as('prevTickerRect');
        return cy.wrap($el);
      })
      .wait(toWait)
      .then($el => {
        const rect = getTickerRect($el);
        cy.get('@prevTickerRect').its('x').should('equal', rect.x);
        return cy.wrap($el);
      })
      .trigger('mouseleave')
      .wait(toWait)
      .then($el => {
        const rect = getTickerRect($el);
        cy.get('@prevTickerRect').its('x').should('not.equal', rect.x);
      });
  });

  it('네비게이션 바의 메뉴를 클릭하면 해당 주소로 라우팅된다.', () => {
    const clickAndAssertUrl = (target, url) => {
      if (!url.startsWith(baseUrl)) {
        // https://docs.cypress.io/guides/references/trade-offs#Multiple-tabs
        target
          .should('have.attr', 'target', '_blank')
          .should('have.attr', 'href').and('contain', url);
      } else {
        target
          .click()
          .url()
          .should('contain', url);
      }
    };

    const urlTable = {
      '홈': `${baseUrl}`,
      '투자노트': `${baseUrl}/investment`,
      '국내증시': `${baseUrl}/domestic`,
      '해외증시': `${baseUrl}/global`,
      '가상화폐': 'https://coin.zum.com',
      '대선 테마주': 'https://daeseon.zum.com/election'
    };
    cy.get('.gnb_finance ul > li > a')
      .each(menu => {
        const menuText = menu.text();
        clickAndAssertUrl(cy.wrap(menu), urlTable[menuText]);
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

    cy.contains('증권 검색').click();
    cy.intercept('/api/suggest*').as('getSuggest');

    cy.get('[placeholder="지수명, 종목명(종목코드) 입력"]')
      .as('searchInput')
      .type('줌인터넷');

    cy.wait('@getSuggest').then(() => {
      cy.get('@searchInput').click().type('{enter}');
      cy.url().should('contain', '239340');
    });
  });

  describe('분야별 실시간 뉴스', () => {
    beforeEach(() => {
      cy.intercept('/api/home/category-news*', req => {
        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get('page'), 10);
        req.reply({fixture: `category-news-${page}`});
      }).as('categoryNews');
    });

    it('카테고리를 변경할 수 있다.', () => {
      const categoryTable = {
        '전체': 'all',
        '국내증시': 'domestic',
        '해외증시': 'overseas',
        '시장지표': 'market',
        '가상화폐': 'coin',
        'ESG': 'esg',
      };
      cy.get('.area_real_news ul.menu_tab > li > a')
        .each(menu => {
          const menuText = menu.text();
          cy.wrap(menu)
            .click({force: true})
            .wait('@categoryNews')
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