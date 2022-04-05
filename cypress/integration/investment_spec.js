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

    const author = {
      "authorId": post.authorId,
      "authorName": post.authorName,
      "authorThumbnailUrl": "https://finance.zumst.com/writing/a41a3074_계정이미지 black_zum_428.png",
      "introduction": "@@소개@@",
      "profile": "@@프로필@@",
      "personalChannelLink": "https://zum-invest.tistory.com/"
    };

    beforeEach(() => {
      cy.fixture('api/investment.json')
        .then(investment => {
          investment.top.items[0] = post;
          cy.intercept('/api/investment', investment)
            .as('apiInvestment');
        });
    });

    it('카드형태로 보여준다.', () => {
      cy.stubImages();
      visit();
      cy.withHidden('#header', () => {
        cy.get('.invest_note_list')
          .toMatchImageSnapshot();
      });
    });

    it('필진 이름을 클릭하면 필진 상세페이지로 이동하고 스크롤을 내려 최신글을 확인 가능하다.', () => {
      cy.fixture('api/investment/author.json')
        .then(api => {
          api.author = author;
          cy.intercept('/api/investment/authors/*', api)
            .as('apiInvestmentAuthor');
        });
      visit();

      cy.contains(author.authorName)
        .click();

      cy.url()
        .should('contain', `/investment/author/${author.authorId}`);

      cy.log('필진 정보가 표시되는지 확인');
      cy.get('.writer_info_wrap')
        .should('contain', author.authorName)
        .and('contain', author.introduction)
        .and('contain', author.profile);

      cy.get('.btn_home')
        .should('have.attr', 'href')
        .and('equal', author.personalChannelLink);
      
      cy.log('스크롤을 내려서 필진의 최신글을 불러 올 수 있다');
      cy.wait('@apiInvestmentAuthor');
      cy.shouldRequestOnScroll('@apiAuthorsPostsRecent');
    });

    it('제목 혹은 내용요약을 클릭하면 읽기페이지로 이동한다.', () => {
      const expectUrlToMatch = () => 
        cy.url()
          .should('contain', `/investment/view/${post.postId}`);

      visit();
      cy.log('제목을 클릭해서 읽기페이지로 이동하고 다시 뒤로가기');
      cy.contains(post.title)
        .click()
        .then(expectUrlToMatch);

      cy.go('back');

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
      cy.fixture('api/investment/posts.json')
        .then(posts => {
          posts.detail.recentTitles = recentTitles;
          posts.detail.author = {
            ...posts.detail.author,
            ...author,
          };
          cy.intercept('/api/investment/posts/*', posts);
        });

      cy.log('내용을 클릭해서 읽기페이지로 이동');
      cy.contains(post.leadText)
        .click()
        .then(expectUrlToMatch);

      cy.get('.writer_profile')
        .as('writerProfile');

      cy.log('게시글 페이지에서 필진의 최신 쓴 글 목록을 클릭하고 각 게시글로 이동 확인');
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

      cy.log('게시글 페이지에서 필진의 개인채널 링크와 이름이 표시됨');
      cy.get('@writerProfile')
        .find('.btn_home')
        .should('have.attr', 'href')
        .and('equal', author.personalChannelLink);

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
    it('필진이 카드형태로 보여지고, 필진을 클릭하여 필진 상세페이지로 이동한다.', () => {
      const author = {
        "authorId": 34,
        "authorName": "줌투자",
        "introduction": "ZUM투자에서 알려주는 개장/마감 시황 콘텐츠를 소개합니다.\r\n증시MAP을 통해 주요 종목 이슈를 확인해보세요.!",
        "authorThumbnailUrl": "https://finance.zumst.com/writing/a41a3074_계정이미지 black_zum_428.png",
        "isNewbie": false
      };

      cy.fixture('api/investment.json')
        .then(investment => {
          investment.authors.items[0] = author;
          cy.intercept('/api/investment', investment)
            .as('apiInvestment');
        });

      cy.stubImages();
      visit();

      cy.log('lazy load 이미지를 불러오도록 해당 위치까지 스크롤하고 기다린 이후 스냅샷');
      cy.get('.writers_wrap')
        .scrollIntoView()
        .as('writersWrap');

      cy.waitForImage('.writers_wrap img');

      cy.withHidden('#header', () => {
        cy.get('@writersWrap').toMatchImageSnapshot();
      });

      cy.log('필진 이름을 클릭해 필진 상세페이지 이동');
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

      // NOTE: API가 2회 이상 호출되어도 사용자에게는 정상적으로 표시된다
      // TODO: 다만, 렌더링 최적화에 영향을 주어 사용자경험에 악영향을 끼칠 수 있으므로
      // 2회 이상 호출의 경우 경고를 표시하도록 수정 필요
      // 당장의 크리티컬한 이슈는 아니기 때문에 waitUntil 명령을 사용했으나, 이후 수정이 필요
      const waitForAuthorsApiUntil = predicate =>
        cy.waitUntil('@apiAuthors', predicate);

      cy.get('@writersWrap')
        .within(() => {
          cy.log('다음 버튼을 누르면 2페이지를 가져온다');
          cy.get('.next')
            .click();

          waitForAuthorsApiUntil(
            ({ request }) => expect(request.url).to.contain('page=2'),
          );

          cy.log('이전 버튼을 누르면 다시 1페이지를 가져온다');
          cy.get('.prev')
            .click();

          waitForAuthorsApiUntil(
            ({ request }) => expect(request.url).to.contain('page=1'),
          );

          cy.log('1페이지에서 이전버튼을 누르면 `1/n`의 마지막 페이지인 n페이지로 이동');
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

          cy.log('마지막 페이지에서 다음 버튼을 누르면 1페이지로 순환');
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

      cy.fixture('api/investment/authors.json')
        .then(authors => {
          authors.items[0] = author;
          cy.intercept('/api/investment/authors*', authors)
            .as('apiInvestmentAuthors');
        });
      visit();

      cy.log('타이틀을 클릭해 필진 목록 페이지로 이동');
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

      cy.log('각 정렬 옵션을 클릭해 오름차순, 내림차순을 토글한다');
      cy.wrap(['콘텐츠 많은 순', '필진명순', '최근 등록 순'])
        .each(name =>
          // 오름차순, 내림차순 각각 테스트
          clickAndMatchApiRequest(name)
            .then(() => clickAndMatchApiRequest(name))
        );

      cy.log('더보기 버튼을 누르면 다음 페이지를 불러온다');
      cy.get('.writer_list_wrap')
        .contains('더보기')
        .click();

      cy.wait('@apiInvestmentAuthors')
        .its('request.url')
        .should('contain', 'page=2');

      cy.log('필진 이름을 눌러 필진 상세페이지로 이동');
      cy.contains(author.authorName)
        .click()
        .url()
        .should('contain', `/investment/author/${author.authorId}`)
        .go('back');

      cy.log('제목을 눌러 게시글 페이지로 이동');
      cy.contains(post.title)
        .click()
        .url()
        .should('contain', `/investment/view/${post.postId}`)
        .go('back');
    });

  });  // END: 줌 투자 필진

});  // END: 투자노트

