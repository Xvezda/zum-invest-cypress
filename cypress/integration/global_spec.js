describe('해외증시', () => {
  beforeEach(() => {
    cy.ignoreKnownError(/Cannot read properties of undefined \(reading '(dow|children)'\)/);
    cy.stubThirdParty();
    cy.stubInvestApi();

    cy.visit('/investment', {
      onBeforeLoad(win) {
        cy.spy(win, 'postMessage').as('postMessage');
      }
    });

    cy.get('.gnb_finance a:contains("해외증시")')
      .click();

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
    it('주요국 지수 현황과 주요 지표 현황을 눌러 활성화 할 수 있고 해당 내용을 보여준다.', () => {
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
    });
  });  // END: 해외 주요지수

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
    cy.shouldRequestOnScroll('@apiRealTimeNews');
  });
});  // END: 해외증시
