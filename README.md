# School Work Toolbox

School Work Toolbox는 교사의 반복적인 학교 업무를 소프트웨어로 경감하기 위한 웹 기반 도구 모음 프로젝트입니다.

각 기능은 독립 모듈로 개발한 뒤, 최종적으로 하나의 GitHub Pages 웹사이트로 통합하는 것을 목표로 합니다. 서버 기반 처리보다는 브라우저 내부에서 실행되는 순수 HTML/CSS/JavaScript 구조를 우선하며, 학생 및 교직원 개인정보는 가능한 한 브라우저 내부에서만 처리하고 외부 서버로 전송하지 않는 방향으로 개발합니다.

## 프로젝트 방향

- GitHub 저장소를 학교와 집 PC 간 작업의 기준 원본으로 사용합니다.
- Codex와 Claude를 번갈아 사용할 수 있도록 공통 개발 원칙 문서를 유지합니다.
- 각 기능은 `modules/` 아래 독립 폴더에서 개발합니다.
- 공통 스타일, 스크립트, 이미지 등은 `shared/` 아래에 둡니다.
- 최종 통합 웹사이트는 `website/` 폴더에서 구성합니다.
- GitHub Pages에서 실행 가능한 정적 웹 프로젝트 구조를 유지합니다.

## 폴더 구조

```text
school-work-toolbox/
├─ README.md
├─ PROJECT_STATUS.md
├─ TODO.md
├─ AGENTS.md
├─ CLAUDE.md
├─ .gitignore
├─ modules/
│  ├─ seating/
│  ├─ grouping/
│  ├─ homeroom/
│  ├─ finance/
│  ├─ document/
│  ├─ data/
│  └─ pc/
├─ shared/
│  ├─ css/
│  ├─ js/
│  └─ assets/
└─ website/
```

## 주요 폴더 설명

- `modules/seating/`: 조건부 랜덤 자리배치 등 자리 관련 도구
- `modules/grouping/`: 모둠 편성 관련 도구
- `modules/homeroom/`: 1인1역, 청소구역, 주번 등 학급 운영 도구
- `modules/finance/`: 예산 집행률, 견적 비교 등 행정/예산 도구
- `modules/document/`: 파일명 변경, PDF 처리 등 문서 업무 도구
- `modules/data/`: Excel/CSV 분할, 목록 비교 등 데이터 처리 도구
- `modules/pc/`: PC 관리 및 점검 관련 도구
- `shared/css/`: 여러 모듈에서 함께 사용할 CSS
- `shared/js/`: 여러 모듈에서 함께 사용할 JavaScript
- `shared/assets/`: 공통 이미지, 아이콘, 샘플 파일 등 정적 자산
- `website/`: 여러 모듈을 하나로 연결할 GitHub Pages용 통합 웹사이트

## 실행 및 개발 방법

현재 프로젝트는 npm, 프레임워크, 외부 라이브러리 없이 순수 HTML/CSS/JavaScript 기반 정적 웹 프로젝트를 전제로 합니다.

1. GitHub에서 저장소를 학교 PC와 집 PC에 clone합니다.
2. 작업 전 `git pull`로 최신 상태를 가져옵니다.
3. 새 기능은 `modules/` 아래 독립 폴더에서 개발합니다.
4. 브라우저에서 HTML 파일을 직접 열어 동작을 확인합니다.
5. 작업 후 `PROJECT_STATUS.md`와 `TODO.md`를 갱신합니다.
6. 변경사항을 commit하고 GitHub에 push합니다.

GitHub Pages 통합 단계에서는 `website/` 폴더를 기준으로 각 모듈을 연결하는 구조를 구성할 예정입니다.
