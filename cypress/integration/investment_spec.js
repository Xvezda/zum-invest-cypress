describe('투자노트', () => {
  beforeEach(() => {
    // TODO: 원인조사
    cy.ignoreKnownError("Cannot read properties of null (reading 'postMessage')");
    cy.intercept('https://pip-player.zum.com/**', {statusCode: 200});
  });

  beforeEach(() => {
    cy.stubInvestmentApi();
  });

  const visit = () => {
    cy.stubHomeApi();
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

      cy.stubImages();
      visit();
    });

    it.skip('카드형태로 보여준다.', () => {
      cy.withHidden('#header', () => {
        cy.get('.invest_note_list')
          .toMatchImageSnapshot();
      });
    });

    it('필진 이름을 클릭하면 필진 상세페이지로 이동하고 스크롤을 내려 최신글을 확인 가능하다.', () => {
      const author = {
        "authorId": post.authorId,
        "authorName": post.authorName,
        "authorThumbnailUrl": "https://finance.zumst.com/writing/a41a3074_계정이미지 black_zum_428.png",
        "introduction": "@@소개@@",
        "profile": "@@프로필@@",
        "personalChannelLink": "https://zum-invest.tistory.com/"
      };

      cy.fixture('investment-author')
        .then(api => {
          api.author = author;
          cy.intercept('/api/investment/authors/*', api)
            .as('apiInvestmentAuthor');
        });

      cy.contains(author.authorName)
        .click();

      cy.url()
        .should('contain', `/investment/author/${author.authorId}`);

      cy.get('.writer_info_wrap')
        .should('contain', author.authorName)
        .and('contain', author.introduction)
        .and('contain', author.profile);

      cy.get('.btn_home')
        .should('have.attr', 'href')
        .and('equal', author.personalChannelLink);
      
      cy.wait('@apiInvestmentAuthor');
      cy.shouldRequestOnScroll('@apiAuthorsPostsRecent');
    });

    it('제목 혹은 내용요약을 클릭하면 읽기페이지로 이동한다.', () => {
      const expectUrlToMatch = () => 
        cy.url()
          .should('contain', `/investment/view/${post.postId}`);

      cy.contains(post.title)
        .click()
        .then(expectUrlToMatch);

      cy.go('back');

      const author = {
        authorName: '@@글쓴이@@',
        authorId: 42,
      };

      const recentTitles = [
        {
          postId: 123,
          title: '@@최신글_1@@',
        },
        {
          postId: 124,
          title: '@@최신글_2@@',
        },
        {
          postId: 125,
          title: '@@최신글_3@@',
        }
      ];
      cy.fixture('investment-posts')
        .then(posts => {
          posts.detail.recentTitles = recentTitles;
          posts.detail.author = {
            ...posts.detail.author,
            ...author,
          };
          cy.intercept('/api/investment/posts/*', posts);
        });

      cy.contains(post.leadText)
        .click()
        .then(expectUrlToMatch);

      cy.get('.writer_profile')
        .as('writerProfile');

      cy.wrap(recentTitles)
        .each(post => {
          cy.get('@writerProfile')
            .find('.write_list')
            .contains(post.title)
            .click()
            .url()
            .should('contain', post.postId)
            .go('back');
        });

      cy.get('@writerProfile')
        .contains(author.authorName)
        .click()
        .url()
        .should('contain', author.authorId);
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
    it.skip('필진이 카드형태로 보여지고, 필진을 클릭하여 필진 상세페이지로 이동한다.', () => {
      const author = {
        "authorId": 34,
        "authorName": "줌투자",
        "introduction": "ZUM투자에서 알려주는 개장/마감 시황 콘텐츠를 소개합니다.\r\n증시MAP을 통해 주요 종목 이슈를 확인해보세요.!",
        "authorThumbnailUrl": "https://finance.zumst.com/writing/a41a3074_계정이미지 black_zum_428.png",
        "isNewbie": false
      };

      cy.fixture('investment')
        .then(investment => {
          investment.authors.items[0] = author;
          cy.intercept('/api/investment', investment)
            .as('apiInvestment');
        });

      cy.stubImages();
      visit();

      cy.get('.writers_wrap')
        .scrollIntoView()
        .as('writersWrap');

      cy.waitForImage('.writers_wrap img');

      cy.withHidden('#header', () => {
        cy.get('@writersWrap').toMatchImageSnapshot();
      });

      cy.get('@writersWrap')
        .contains(author.authorName)
        .click();

      cy.url()
        .should('contain', `/investment/author/${author.authorId}`);
    });

    // FIXME: 다음버튼이 요청을 두번 보내는 문제 존재
    it('이전/다음 버튼을 클릭하여 정보를 볼 수 있다', () => {
      visit();

      cy.get('.writers_wrap')
        .scrollIntoView()
        .as('writersWrap');

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

    it('타이틀을 눌러 목록으로 이동하고 목록 정렬과 더보기, 이름과 제목 클릭으로 필진 상세페이지 및 게시글 이동이 가능하다.', () => {
      const post = {
        postId: 123,
        title: '@@줌투자필진_게시글제목@@',
      };

      const author = {
        "authorId": 34,
        "authorName": "@@줌투자필진@@",
        "authorThumbnailUrl": "https://finance.zumst.com/writing/a41a3074_계정이미지 black_zum_428.png",
        "introduction": "ZUM투자에서 알려주는 개장/마감 시황 콘텐츠를 소개합니다.\r\n증시MAP을 통해 주요 종목 이슈를 확인해보세요.!",
        "recentTitles": [
          post,
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

      cy.fixture('investment-authors')
        .then(authors => {
          authors.items[0] = author;
          cy.intercept('/api/investment/authors*', authors)
            .as('apiInvestmentAuthors');
        });
      visit();

      cy.contains('줌 투자 필진')
        .click();

      cy.url().should('contain', '/investment/author');
      cy.wait('@apiInvestmentAuthors')
        .its('request.url')
        .should('contain', 'page=1');
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

      cy.get('.writer_list_wrap')
        .contains('더보기')
        .click();

      cy.wait('@apiInvestmentAuthors')
        .its('request.url')
        .should('contain', 'page=2');

      cy.contains(author.authorName)
        .click()
        .url()
        .should('contain', `/investment/author/${author.authorId}`)
        .go('back');

      cy.contains(post.title)
        .click()
        .url()
        .should('contain', `/investment/view/${post.postId}`)
        .go('back');
    });

  });  // END: 줌 투자 필진

});  // END: 투자노트

