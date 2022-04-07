# 줌 투자 E2E 테스트

[![E2E Test](https://github.com/Xvezda/zum-invest-cypress/actions/workflows/e2e.yml/badge.svg)](https://github.com/Xvezda/zum-invest-cypress/actions/workflows/e2e.yml)

[Cypress](https://cypress.io) 기반 [줌 투자](https://invest.zum.com/) E2E 테스트입니다.

## 요구환경
* Node.js (16버전 이상 권장)
* Yarn (권장)
* Docker
  * 스냅샷 이미지의 표준화를 위해서 도커를 사용합니다.
  * 컨테이너(리눅스)환경이 아닌경우 이미지 스냅샷 테스트를 건너뜁니다.
* XQuartz (옵션)
  * Cypress의 open 모드를 [X11](https://ko.wikipedia.org/wiki/X_%EC%9C%88%EB%8F%84_%EC%8B%9C%EC%8A%A4%ED%85%9C)을 통해 컨테이너 외부에서 모니터링 할 수 있도록 사용합니다.
    * 참고: https://sourabhbajaj.com/blog/2017/02/07/gui-applications-docker-mac/

## 구조
```
zum-invest-cypress
├── README.md
├── cy-open.yml  # X11 컨테이너 설정
├── cypress
│   ├── fixtures # 이미지, API fixture
│   │   ├── api
│   │   │   ├── domestic
│   │   │   ├── home
│   │   │   ├── investment
│   │   │   ├── news
│   │   │   └── overseas
│   │   ├── cmnt.zum.com
│   │   └── userapi.zum.com
│   ├── integration
│   │   ├── domestic_spec.js    # 국내증시
│   │   ├── global_spec.js      # 해외증시
│   │   ├── home_spec.js        # 메인페이지
│   │   ├── investment_spec.js  # 투자노트
│   │   └── news_spec.js        # 투자뉴스
│   ├── plugins
│   │   └── index.js
│   └── support
│       ├── __image_snapshots__  # 시각적 테스트 스냅샷
│       ├── __snapshots__        # 일반 스냅샷
│       ├── assertions.js  # chai 플러그인 선언
│       ├── commands.js    # 커스텀 명령 선언
│       └── index.js
├── cypress.json
├── docker-compose.yml
├── open.sh   # X11 컨테이너 실행
├── reset.sh  # 컨테이너 내부 파일수정 이벤트를 강제
└── run.sh    # 컨테이너 cypress run 실행
```
* fixture
  * API fixture는 API의 URL path와 일치하도록 관리
    * e.g. `/api/home`: `cy.fixture('api/home.json')`
  * `baseUrl`인 `invest.zum.com`이 아닌 다른 도메인은 도메인 이름으로 디렉토리 생성하여 관리

## 목표
* [Cypress best practices](https://docs.cypress.io/guides/references/best-practices)에 부합하도록
* 지나치지 않은 수준의 테스트 시간
* 변화, 리팩토링에 유연한 테스트
* 목적, 의도가 명확하고 간결한 테스트 (불필요한 요소 배제)
