const { recurse } = require('cypress-recurse');

describe('투자노트', () => {
  beforeEach(() => {
    // TODO: 원인조사
    cy.ignoreKnownError("Cannot read properties of null (reading 'postMessage')");
    cy.ignoreKnownError('Network Error');

    cy.stubInvestApi();

    cy.intercept('https://pip-player.zum.com/**', {statusCode: 200});
  });

  const visit = () => {
    cy.visit('/');
    cy.get('.gnb_finance')
      .find('a')
      .filter(':contains("투자노트")')
      .click();

    cy.wait('@apiInvestment');
  };

  describe('투자노트 TOP6', () => {
    const post = {
      "postId": 480,
      "title": "@@제목@@",
      "subCategory": "해외종목분석",
      "writeDateTime": "2022-03-17T00:00:00",
      "authorId": 34,
      "authorName": "@@줌투자@@",
      "leadText": "@@내용@@",
      "authorThumbnailUrl": "https://finance.zumst.com/writing/85c1c64e_1.jpg",
      "isOriginal": false
    };

    beforeEach(() => {
      cy.fixture('investment')
        .then(investment => {
          investment.top.items[0] = post;
          cy.intercept('/api/investment', investment)
            .as('apiInvestment');
        });
      visit();
    });

    it('카드형태로 보여준다.', () => {
      cy.withHidden('#header', () => {
        cy.get('.invest_note_list')
          .toMatchImageSnapshot();
      });
    });

    it('필진 이름을 클릭하면 필진 상세페이지로 이동하고 스크롤을 내려 최신글을 확인 가능하다.', () => {
      cy.contains(post.authorName)
        .click();

      cy.url()
        .should('contain', '/investment/author/34');
      
      cy.wait('@apiInvestmentAuthor');
      cy.shouldRequestOnScroll('@apiAuthorsPostsRecent');
    });

    it('제목 혹은 내용요약을 클릭하면 읽기페이지로 이동한다.', () => {
      const expectUrlToMatch = () => 
        cy.url()
          .should('contain', '/investment/view/480');

      cy.contains(post.title)
        .click()
        .then(expectUrlToMatch);

      cy.go('back');

      cy.contains(post.leadText)
        .click()
        .then(expectUrlToMatch);
    });
  });  // END: 투자노트 TOP6

  describe('최신글', () => {
    beforeEach(() => {
      visit();

      cy.contains('최신글').click();
      cy.wait('@posts');
    });

    it('최신글에서 카테고리 선택을 할 수 있다.', () => {
      cy.get('.lasted_write_wrap')
        .within(() => {
          cy.get('ul.menu_tab > li > a')
            .reverse()
            .clickEachWithTable(
              {
                '전체': 'all',
                '국내증시': 'domesticStock',
                '해외증시': 'overseasStock',
                '가상화폐': 'coin',
                '대체투자': 'alternativeInvestment',
                '투자트렌드': 'investmentTrend',
              },
              id => cy
                .wait('@posts')
                .its('request.url')
                .should('contain', `category=${id}`),
            );
        });
    });
  });  // END: 최신글

  describe('줌 투자 필진', () => {
    const author = {
      "authorId": 34,
      "authorName": "@@줌투자필진@@",
      "authorThumbnailUrl": "https://finance.zumst.com/writing/a41a3074_계정이미지 black_zum_428.png",
      "introduction": "ZUM투자에서 알려주는 개장/마감 시황 콘텐츠를 소개합니다.\r\n증시MAP을 통해 주요 종목 이슈를 확인해보세요.!",
      "recentTitles": [
        {
          "postId": 480,
          "title": "[🔑개장] 철강주의 상승률 상위 점령"
        },
        {
          "postId": 478,
          "title": "[🔒 마감] 빵빵 터지는 신고가🎉"
        },
        {
          "postId": 476,
          "title": "[🔑개장] 물가 대란"
        }
      ]
    };

    beforeEach(() => {
      cy.fixture('investment-authors')
        .then(authors => {
          authors.items[0] = author;
          cy.intercept('/api/investment/authors*', authors)
            .as('apiInvestmentAuthors');
        });

      visit();

      cy.get('.writers_wrap')
        .scrollIntoView()
        .as('writersWrap');

      cy.waitForImage('.writers_wrap img');
    });

    it('필진이 카드형태로 보여지고, 필진을 클릭하여 필진 상세페이지로 이동한다.', () => {
      cy.withHidden('#header', () => {
        cy.get('@writersWrap').toMatchImageSnapshot();
      });

      cy.get('@writersWrap')
        .contains('줌투자')
        .click();

      cy.url()
        .should('contain', '/investment/author/34');
    });

    it('줌 투자 필진 타이틀을 눌러 필진 목록으로 이동하고 정렬할 수 있다.', () => {
      cy.contains('줌 투자 필진')
        .click();

      cy.url().should('contain', '/investment/author');
      cy.wait('@apiInvestmentAuthors');
      cy.contains(author.authorName).should('be.visible');

      const clickAndMatchApiRequest = name =>
        cy.contains(name)
          .click()
          .wait('@apiInvestmentAuthors')
          .its('request.url')
          .then(url => {
            const sortParam = url.match(/sort=[^&]+/)[0];
            cy.location().its('search').should('include', sortParam);
          });

      cy.wrap(['콘텐츠 많은 순', '필진명순', '최근 등록 순'])
        .each(name =>
          // 오름차순, 내림차순 각각 테스트
          clickAndMatchApiRequest(name)
            .then(() => clickAndMatchApiRequest(name))
        );
    });

    // TODO: 테스트 정렬 (가독성)
    // FIXME: 다음버튼이 요청을 두번 보내는 문제 존재
    it('이전/다음 버튼을 클릭하여 정보를 볼 수 있다', () => {
      const waitForAuthorsApiUntil = predicate =>
        cy.waitUntil('@apiAuthors', predicate);

      cy.get('@writersWrap')
        .within(() => {
          cy.get('.next')
            .click();

          waitForAuthorsApiUntil(
            ({ request }) => expect(request.url).to.contain('page=2'),
          );

          cy.get('.prev')
            .click();

          waitForAuthorsApiUntil(
            ({ request }) => expect(request.url).to.contain('page=1'),
          );

          cy.get('.count')
            .invoke('text')
            .then(text => {
              const [, _count, total] = text
                .match(/(\d+)[^\d](\d+)/)
                .map(d => parseInt(d, 10));

              cy.get('.prev')
                .click();

              waitForAuthorsApiUntil(
                ({ request }) => expect(request.url).to.contain(`page=${total}`),
              );
            })

          cy.get('.next')
            .click();

          waitForAuthorsApiUntil(
            ({ request }) => expect(request.url).to.contain('page=1'),
          );
        });
    });
  });  // END: 줌 투자 필진

});  // END: 투자노트

