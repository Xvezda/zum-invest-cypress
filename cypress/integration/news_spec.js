describe('줌 투자 뉴스', () => {
  it.skip('SSR로 스크립트 실행없이 데이터를 가져올 수 있다.', () => {
    cy.request('/news/article/3333333')
      .its('body')
      .then(html => {
        // 이후의 스크립트 실행을 방지하기 위해 번들링 된 파일의 경로를 차단
        cy.intercept('/static/js/**', {statusCode: 503});
        // 빈 페이지에 HTML 값을 추가
        cy.document()
          .invoke({log: false}, 'write', html)
      });

    cy.document()
      .its('body')
      .should('contain', '대한민국이 승리한다');
  });
});  // END: 줌 투자 뉴스
