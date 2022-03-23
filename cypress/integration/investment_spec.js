const expectMenuToActivate = $menu =>
  cy.wrap($menu).closest('.active');

describe('투자노트', () => {
  beforeEach(() => {
    cy.stubThirdParty();
    cy.intercept('/api/investment', {fixture: 'investment'})
      .as('apiInvestment');

    cy.visit('/');
    cy.ignoreKnownError("Cannot read properties of null (reading 'postMessage')");
    cy.get('.gnb_finance')
      .find('a:contains("투자노트")')
      .click();

    cy.wait('@apiInvestment');
  });

  describe('투자노트 TOP6', () => {
    it('카드형태로 보여준다.', () => {
      cy.withHidden('#header', () => {
        cy.get('.invest_note_list')
          .toMatchImageSnapshot();
      });
    });

    it('필진 이름을 클릭하면 필진 상세페이지로 이동한다.', () => {
      cy.intercept('/api/investment/authors/*', {fixture: 'investment-author'});
      cy.contains('@@줌투자@@')
        .click()
        .url()
        .should('contain', '/investment/author/34');
    });
  });  // END: 투자노트 TOP6

  describe('최신글', () => {
    beforeEach(() => {
      cy.intercept('/api/investment/posts*', req => {
          const url = new URL(req.url);
          const page = parseInt(url.searchParams.get('page'), 10);
          req.reply({fixture: `investment-home-authors-${page}`});
        })
        .as('posts');
      cy.visit('/investment/recently');
    });

    it('최신글에서 카테고리 선택을 할 수 있다.', () => {
      const categoryTable = {
        '국내증시': 'domesticStock',
        '해외증시': 'overseasStock',
        '가상화폐': 'coin',
        '대체투자': 'alternativeInvestment',
        '투자트렌드': 'investmentTrend',
      };
      cy.get('.lasted_write_wrap')
        .within(() => {
          cy.get('ul.menu_tab > li:not(:first-child) > a')
            .each($category => {
              const categoryText = $category.text();
              cy.contains(categoryText)
                .click({force: true})
                .wait('@posts')
                .its('request.url')
                .should('contain', `category=${categoryTable[categoryText]}`);

              // 클릭한 카테고리는 활성화가 되어야 한다.
              expectMenuToActivate($category);
            });
        });
    });
  });  // END: 최신글

  // FIXME: 다음버튼이 요청을 두번 보내는 문제 존재
  // TODO: 테스트 정렬 (가독성)
  it.skip('줌 투자 필진에서 이전/다음 버튼을 클릭하여 정보를 볼 수 있다', () => {
    cy.get('.writers_wrap').within(() => {
      cy.intercept('/api/investment/home/authors*', req => {
          const url = new URL(req.url);
          const page = parseInt(url.searchParams.get('page'), 10);
          req.reply({fixture: `investment-home-authors-${page}`});
        })
        .as('apiAuthors');

      const [, _count, total] = Cypress
        .$('.writers_wrap .count')
        .text()
        .match(/(\d+)[^\d](\d+)/)
        .map(d => parseInt(d, 10));

      cy.get('.next')
        .click()
        .wait('@apiAuthors')
        .its('request.url')
        .should('contain', 'page=2');

      cy.get('.prev')
        .click()
        .wait('@apiAuthors')
        .its('request.url')
        .should('contain', 'page=1');

      cy.get('.prev')
        .click()
        .wait('@apiAuthors')
        .its('request.url')
        .should('contain', `page=${total}`);
    });
  });

});  // END: 투자노트

