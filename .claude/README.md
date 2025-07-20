# .claude Folder - Claude AI Configuration

## 🎯 Purpose

**`.claude` 폴더**는 Claude AI가 Park Golf Platform을 효율적으로 이해하고 작업할 수 있도록 최적화된 설정과 컨텍스트를 제공합니다.

## 📁 Contents

### 📄 QUICK_CONTEXT.md
- **목적**: 5분 내 프로젝트 전체 파악
- **내용**: 아키텍처, 현재 상태, 서비스 구조, 개발 환경
- **사용법**: 새로운 작업 시작 시 항상 먼저 읽기

### 📄 SERVICE_MAP.md
- **목적**: 서비스 간 의존성 및 통신 구조 시각화
- **내용**: 서비스 계층, 통신 패턴, 데이터베이스 구조
- **사용법**: 서비스 간 통신 구현 시 참조

### 📄 COMMON_TASKS.md
- **목적**: 자주 하는 개발 작업들의 명령어 모음
- **내용**: 환경 설정, 서비스 추가, DB 작업, API 개발
- **사용법**: 개발 작업 시 빠른 참조

### 📄 TROUBLESHOOTING.md
- **목적**: 일반적인 문제 해결 가이드
- **내용**: 서비스 오류, DB 연결, NATS 통신, 성능 문제
- **사용법**: 문제 발생 시 첫 번째 참조

### 📄 ARCHITECTURE.md
- **목적**: 시스템 아키텍처 상세 설명
- **내용**: 아키텍처 패턴, 기술 스택, 서비스 구조
- **사용법**: 아키텍처 이해 및 설계 결정 시 참조

### 📄 PROJECT_STATUS.md
- **목적**: 프로젝트 현재 상태 및 진행률
- **내용**: 서비스별 완료도, 우선순위, 로드맵
- **사용법**: 작업 우선순위 결정 시 참조

### 📄 RBAC_ARCHITECTURE.md
- **목적**: 역할 기반 접근 제어 시스템 설명
- **내용**: 권한 체계, 역할 정의, 구현 방법
- **사용법**: 권한 관련 기능 개발 시 참조

### 📄 RBAC_UPDATE_SUMMARY.md
- **목적**: RBAC 시스템 업데이트 이력
- **내용**: 최근 변경사항, 구현 완료 기능
- **사용법**: RBAC 관련 컨텍스트 파악 시 참조

### 📄 CURRENT_IMPLEMENTATION.md
- **목적**: 현재 구현 상태 상세 정보
- **내용**: 구현 완료 기능, 진행 중 작업
- **사용법**: 현재 상태 빠른 파악 시 참조

### 📄 settings.local.json
- **목적**: Claude AI 도구 권한 설정
- **내용**: 허용된 bash 명령어, 도구 사용 권한
- **사용법**: Claude AI 설정 관리

## 🚀 Claude 워크플로우 가이드

### 1. 새로운 작업 시작 시
```
1. QUICK_CONTEXT.md 읽기 (5분)
2. PROJECT_STATUS.md에서 우선순위 확인 (2분)
3. 관련 작업이 COMMON_TASKS.md에 있는지 확인 (1분)
```

### 2. 서비스 간 통신 구현 시
```
1. SERVICE_MAP.md에서 의존성 확인
2. NATS 이벤트 패턴 참조
3. 기존 구현 예시 확인
```

### 3. 문제 해결 시
```
1. TROUBLESHOOTING.md에서 유사 문제 확인
2. 로그 분석 방법 참조
3. 긴급 복구 절차 확인
```

### 4. 아키텍처 질문 시
```
1. ARCHITECTURE.md에서 전체 구조 확인
2. RBAC_ARCHITECTURE.md에서 권한 체계 확인
3. 설계 원칙 및 패턴 확인
```

## 🔗 claude-workspace 연동

**`.claude` 폴더**는 `claude-workspace`와 긴밀히 연동됩니다:

- **빠른 시작**: `.claude/QUICK_CONTEXT.md` → `claude-workspace/quick-start/`
- **상세 참조**: `.claude/` → `claude-workspace/docs/`
- **실행 도구**: `.claude/COMMON_TASKS.md` → `claude-workspace/development/`

## 🎯 최적화 특징

### 1. 빠른 컨텍스트 로딩
- 5분 내 프로젝트 전체 파악 가능
- 핵심 정보 우선 제공

### 2. 작업 중심 구성
- 실제 개발 작업 흐름 기반
- 자주 하는 작업 빠른 접근

### 3. 문제 해결 최적화
- 일반적인 문제 빠른 해결
- 단계별 해결 방법 제공

### 4. 지속적 업데이트
- 프로젝트 진행에 따라 지속 업데이트
- 최신 상태 반영

## 📝 유지보수 가이드

### 정기 업데이트 (매주)
- **PROJECT_STATUS.md**: 진행률 및 우선순위 업데이트
- **CURRENT_IMPLEMENTATION.md**: 완료 기능 반영
- **QUICK_CONTEXT.md**: 핵심 정보 업데이트

### 주요 변경 시 업데이트
- **ARCHITECTURE.md**: 아키텍처 변경 시
- **SERVICE_MAP.md**: 서비스 추가/변경 시
- **COMMON_TASKS.md**: 새로운 작업 패턴 추가

### 문제 발생 시 업데이트
- **TROUBLESHOOTING.md**: 새로운 문제 해결 방법 추가
- **COMMON_TASKS.md**: 문제 해결 명령어 추가

---

**이 .claude 폴더로 Claude AI가 효율적으로 프로젝트를 이해하고 작업할 수 있습니다! 🤖**