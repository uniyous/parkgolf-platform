# Claude Workspace

## 🎯 Purpose

**Claude Workspace**는 Claude AI가 Park Golf Platform을 빠르게 이해하고 효율적으로 작업할 수 있도록 최적화된 통합 작업 공간입니다.

## 📁 Structure

```
claude-workspace/
├── 📁 quick-start/           # 🚀 Claude 빠른 시작
│   ├── 📄 PROJECT_CONTEXT.md    # 5분 프로젝트 개요
│   ├── 📄 COMMON_TASKS.md       # 자주 하는 작업들
│   └── 📄 QUICK_REFERENCE.md    # 빠른 참조 가이드
├── 📁 development/           # 🛠️ 개발 도구
│   ├── 📁 scripts/              # 자동화 스크립트
│   ├── 📁 templates/            # 코드 템플릿
│   ├── 📁 environments/         # 환경 설정
│   └── 📁 docker/               # Docker 구성
├── 📁 shared/               # 🔗 공유 리소스
│   ├── 📁 configs/              # 설정 파일들
│   ├── 📁 schemas/              # 스키마 정의
│   ├── 📁 types/                # TypeScript 타입
│   └── 📁 utils/                # 유틸리티 함수
├── 📁 testing/              # 🧪 테스트 도구
│   └── 📁 testing/              # Jest 설정 및 유틸리티
├── 📁 operations/           # 📊 운영 도구
│   └── 📁 monitoring/           # 모니터링 설정
└── 📁 docs/                 # 📚 통합 문서
    ├── 📄 API_DOCUMENTATION.md     # API 참조
    ├── 📄 DATABASE_SCHEMA.md       # DB 스키마
    ├── 📄 SERVICES_OVERVIEW.md     # 서비스 아키텍처
    └── 📄 SERVICE_COMMUNICATION.md # NATS 통신
```

## 🚀 Claude 시작 가이드

### 1. 첫 번째로 읽어야 할 파일
```bash
claude-workspace/quick-start/PROJECT_CONTEXT.md
```
→ 5분만에 전체 프로젝트 파악 가능

### 2. 작업 시작 전 확인
```bash
claude-workspace/quick-start/COMMON_TASKS.md
```
→ 자주 하는 개발 작업들 참조

### 3. 빠른 참조가 필요할 때
```bash
claude-workspace/quick-start/QUICK_REFERENCE.md
```
→ 포트, 명령어, 파일 위치 등 빠른 참조

## 🎯 Claude 워크플로우

### Phase 1: 프로젝트 이해 (5분)
1. `quick-start/PROJECT_CONTEXT.md` 읽기
2. `quick-start/QUICK_REFERENCE.md` 스캔
3. 현재 작업 상황 파악

### Phase 2: 상세 참조 (필요시)
1. `docs/` 폴더에서 기술 문서 참조
2. API, DB, 서비스 통신 등 상세 정보 확인
3. 작업 계획 수립

### Phase 3: 실행 (효율적)
1. `development/` 폴더에서 도구 활용
2. `shared/` 폴더에서 공통 리소스 사용
3. `testing/` 폴더에서 테스트 실행

## 🔧 폴더별 상세 설명

### 📁 quick-start/
**Purpose**: Claude가 즉시 프로젝트를 이해할 수 있는 핵심 정보
- 프로젝트 개요, 아키텍처, 현재 상태
- 자주 하는 작업들의 명령어 모음
- 포트, 파일 위치 등 빠른 참조

### 📁 development/
**Purpose**: 개발 과정에서 사용하는 모든 도구
- **scripts/**: 자동화 스크립트 (빌드, 배포, 설정)
- **templates/**: 새 서비스/컴포넌트 생성 템플릿
- **environments/**: 환경별 설정 파일
- **docker/**: 개발 인프라 Docker 구성

### 📁 shared/
**Purpose**: 모든 서비스에서 공통으로 사용하는 리소스
- **configs/**: ESLint, Prettier, TypeScript 등 설정
- **schemas/**: API, 데이터베이스, 이벤트 스키마
- **types/**: 공통 TypeScript 타입 정의
- **utils/**: 공통 유틸리티 함수

### 📁 testing/
**Purpose**: 테스트 관련 도구와 설정
- Jest 공통 설정
- 테스트 유틸리티
- 픽스처 데이터

### 📁 operations/
**Purpose**: 운영 및 모니터링 도구
- **monitoring/**: 헬스체크, 메트릭 설정
- 배포 관련 도구 (향후 추가)

### 📁 docs/
**Purpose**: 통합 기술 문서 및 참조 자료
- **API_DOCUMENTATION.md**: API 스펙 및 엔드포인트
- **DATABASE_SCHEMA.md**: DB 스키마 및 관계
- **SERVICES_OVERVIEW.md**: 서비스 아키텍처
- **SERVICE_COMMUNICATION.md**: NATS 통신 및 이벤트
- **ADMIN_MANAGEMENT_SYSTEM.md**: 관리자 시스템 가이드
- **MIGRATION_HISTORY.md**: 마이그레이션 히스토리
- **DEVELOPMENT_GUIDE.md**: 개발 가이드

## 🧠 Claude 최적화 특징

### 1. 단일 진입점
- 모든 개발 리소스가 한 곳에 집중
- 여러 폴더를 찾아다닐 필요 없음

### 2. 계층적 정보 구조
- 중요한 정보부터 상세한 정보까지 계층적 배치
- 필요한 깊이만큼만 파고들기 가능

### 3. 작업 중심 구성
- 실제 개발 작업 흐름을 고려한 구조
- 자주 하는 작업들을 쉽게 찾을 수 있음

### 4. 명확한 네이밍
- 폴더명만으로도 내용 파악 가능
- 일관된 명명 규칙 적용

## 💡 사용 팁

### Claude 작업 시작 시
1. 항상 `quick-start/PROJECT_CONTEXT.md` 먼저 확인
2. 해당 작업이 `COMMON_TASKS.md`에 있는지 확인
3. 필요한 파일 위치를 `QUICK_REFERENCE.md`에서 확인

### 새로운 기능 개발 시
1. `development/templates/` 에서 적절한 템플릿 확인
2. `docs/API_DOCUMENTATION.md` 에서 API 스펙 확인
3. `shared/configs/` 에서 설정 파일 확인
4. `shared/schemas/` 에서 기존 스키마 확인

### 문제 해결 시
1. `quick-start/COMMON_TASKS.md` 의 문제 해결 섹션 확인
2. `operations/monitoring/` 에서 모니터링 도구 활용
3. 관련 로그 파일 위치 확인

## 🔄 지속적 개선

이 workspace는 Claude의 사용 패턴과 프로젝트 진행에 따라 지속적으로 개선됩니다:

- 자주 사용하는 작업들을 `COMMON_TASKS.md`에 추가
- 새로운 템플릿을 `development/templates/`에 추가
- 운영 도구를 `operations/`에 추가

---

**Claude Workspace를 통해 더 빠르고 효율적인 개발이 가능합니다! 🚀**