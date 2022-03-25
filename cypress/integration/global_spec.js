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
});
