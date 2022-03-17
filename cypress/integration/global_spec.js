describe('해외증시', () => {
  beforeEach(() => {
    cy.stubThirdParty();

    cy.intercept('/api/discussion/debate-home/**', {statusCode: 200});
    cy.intercept('/api/overseas/common', {statusCode: 200});
    cy.intercept('/api/overseas/home/meko-chart', {statusCode: 200});
    cy.intercept('/api/overseas/home/representative-stock*', {statusCode: 200});
    cy.intercept('/api/overseas/home/real-time-news*', req => {
      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get('page'), 10);
      req.reply({fixture: `real-time-news-${page}`});
    }).as('apiRealTimeNews');
    cy.visit('https://invest.zum.com/global');
  });

  it('스크롤을 하여 해외 실시간 뉴스를 불러온다.', () => {
    cy.shouldRequestOnScroll('@apiRealTimeNews');
  });
});
