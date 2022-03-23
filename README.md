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
├── cypress
│   ├── downloads
│   ├── fixtures
│   │   ├── ...
│   ├── integration
│   │   ├── domestic_spec.js    # 국내증시
│   │   ├── global_spec.js      # 해외증시
│   │   ├── home_spec.js        # 메인페이지
│   │   └── investment_spec.js  # 투자노트
│   ├── plugins
│   │   └── index.js
│   └── support
│       ├── __image_snapshots__  # 시각적 테스트 스냅샷
│       │   ├── ...
│       ├── commands.js
│       └── index.js
├── cy-open.yml # open 모드 컨테이너 설정
├── docker-compose.yml # run 모드 컨테이너 설정
├── cypress.json
├── open.sh   # open 모드로 실행
├── reset.sh  # 파일이벤트를 감지하지 못하는 환경에서의 cypress 수동 리셋
└── test.sh   # run 모드로 실행
```

## 목표
* [Cypress best practices](https://docs.cypress.io/guides/references/best-practices)에 부합하도록
* 지나치지 않은 수준의 테스트 시간
* 변화, 리팩토링에 유연한 테스트
* 목적, 의도가 명확하고 간결한 테스트 (불필요한 요소 배제)
