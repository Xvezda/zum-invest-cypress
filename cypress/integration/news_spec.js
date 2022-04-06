describe('줌 투자 뉴스', () => {
  it('SSR로 스크립트 실행없이 데이터를 가져올 수 있다.', () => {
    cy.request('/news/article/3333333')
      .its('body')
      .then(html => {
        cy.intercept('/static/js/**', {statusCode: 503});
        cy.document()
          .invoke({log: false}, 'write', html)
      });

    cy.document()
      .its('body')
      .should('contain', '대한민국이 승리한다');
  });
});