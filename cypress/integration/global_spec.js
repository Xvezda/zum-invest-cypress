describe('해외증시', () => {
  beforeEach(() => {
    cy.ignoreKnownError(`Cannot read properties of undefined (reading 'dow')`);
    cy.stubThirdParty();
    cy.stubInvestApi();

    cy.visit('/global');
  });

  it('스크롤을 하여 해외 실시간 뉴스를 불러온다.', () => {
    cy.shouldRequestOnScroll('@apiRealTimeNews');
  });

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
        cy.login();

        cy.get('.debate_wrap')
          .find(selector)
          .click();
        
        cy.wait('@debatesVote')
          .its('request.body.status')
          .should(expectTo);

        cy.logout();
        cy.clearCookies();
      });
  });
});
