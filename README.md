# 줌 투자 E2E 테스트

[![E2E Test](https://github.com/Xvezda/zum-invest-cypress/actions/workflows/e2e.yml/badge.svg)](https://github.com/Xvezda/zum-invest-cypress/actions/workflows/e2e.yml)

[Cypress](https://cypress.io) 기반 [줌 투자](https://invest.zum.com/) E2E 테스트입니다.

## 요구환경
* Node.js (16버전 이상 권장)
* Yarn (권장)
* Docker
  * 스냅샷 이미지의 표준화를 위해서 도커를 사용합니다. 컨테이너 외부 환경에서 오동작 할 수 있습니다.
* XQuartz (옵션)
  * Cypress의 open 모드를 컨테이너 외부에서 모니터링 할 수 있도록 사용합니다.
    * 참고: https://sourabhbajaj.com/blog/2017/02/07/gui-applications-docker-mac/

## 구조
```
zum-invest-cypress
├── downloads
├── fixtures
│   ├── api
│   ├── cmnt.zum.com
│   └── userapi.zum.com
├── integration
├── plugins
└── support
    ├── __image_snapshots__
    └── __snapshots__
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
