describe('해외증시', () => {
  beforeEach(() => {
    cy.ignoreKnownError(/Cannot read properties of undefined \(reading '(dow|children)'\)/);
    cy.stubThirdParty();
    cy.stubInvestApi();
    cy.clock();

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
      cy.withHidden('#header', () => {
        cy.get('.representative_index').toMatchImageSnapshot();
      });
    });
  });  // END: 해외 대표 종목

  it('로그인하고 투표를 눌러 투표할 수 있다.', () => {
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
      .each(({ selector, expectTo }) => {
        cy.login()
          .get('.debate_wrap')
          .find(selector)
          .click()
          .end()
          .wait('@debatesVote')
          .its('request.body.status')
          .should(expectTo)
          .end()
          .logout()
          .clearCookies();
      });
  });

  it('스크롤을 하여 해외 실시간 뉴스를 불러온다.', () => {
    cy.clock().invoke('restore');
    cy.shouldRequestOnScroll('@apiRealTimeNews');
  });
});  // END: 해외증시
