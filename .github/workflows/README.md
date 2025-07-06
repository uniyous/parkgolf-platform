# GitHub Actions Workflows

## 📋 개요

이 디렉토리는 Park Golf Platform의 CI/CD 파이프라인을 정의하는 GitHub Actions 워크플로우를 포함합니다.

## 🔄 워크플로우 구조

각 마이크로서비스는 독립적인 워크플로우를 가지며, 다음과 같은 공통 구조를 따릅니다:

1. **Test**: 린팅, 유닛 테스트, 빌드 검증
2. **Build & Push**: Docker 이미지 빌드 및 Container Registry 푸시
3. **Deploy**: 프로덕션 환경 배포 (master 브랜치만)

## 📝 워크플로우 목록

| 워크플로우 | 서비스 | 트리거 경로 | 배포 환경 |
|-----------|--------|------------|----------|
| admin-api.yml | Admin API | services/admin-api/** | GKE |
| admin-dashboard.yml | Admin Dashboard | services/admin-dashboard/** | Cloud Storage + CDN |
| auth-service.yml | Auth Service | services/auth-service/** | GKE |
| course-service.yml | Course Service | services/course-service/** | GKE |
| booking-service.yml | Booking Service | services/booking-service/** | GKE |
| notify-service.yml | Notify Service | services/notify-service/** | GKE |
| search-service.yml | Search Service | services/search-service/** | GKE |
| ml-service.yml | ML Service | services/ml-service/** | GKE |
| user-api.yml | User API | services/user-api/** | GKE |
| user-webapp.yml | User WebApp | services/user-webapp/** | Cloud Storage + CDN |

## 🔧 공통 환경 변수

### 필수 시크릿
```yaml
GCP_PROJECT_ID          # Google Cloud 프로젝트 ID
GCP_SA_KEY             # 서비스 계정 키 (JSON)
GKE_CLUSTER_NAME       # GKE 클러스터 이름
GKE_CLUSTER_ZONE       # GKE 클러스터 존
GCS_BUCKET_NAME        # Cloud Storage 버킷 (프론트엔드용)
CDN_URL_MAP_NAME       # Cloud CDN URL 맵 이름
PRODUCTION_API_URL     # 프로덕션 API URL
```

### 워크플로우별 환경 변수
```yaml
SERVICE_NAME           # 서비스 이름
SERVICE_PATH           # 서비스 경로 (services/서비스명)
DOCKER_REGISTRY        # Docker 레지스트리 URL
```

## 🚀 배포 전략

### Backend Services (NestJS)
1. **개발 환경** (develop 브랜치)
   - 자동 테스트 실행
   - Docker 이미지 빌드 (develop 태그)
   - 스테이징 환경 자동 배포

2. **프로덕션 환경** (master 브랜치)
   - 전체 테스트 스위트 실행
   - Docker 이미지 빌드 (latest + SHA 태그)
   - GKE 프로덕션 클러스터 배포
   - Rolling update with health checks

### Frontend Services (React)
1. **빌드 최적화**
   - Production 빌드 with 환경별 설정
   - Asset 압축 및 최적화
   - Source map 생성 (디버깅용)

2. **CDN 배포**
   - Cloud Storage 정적 호스팅
   - Cloud CDN 캐시 설정
   - 캐시 무효화

## 📊 모니터링

### 빌드 상태 뱃지
```markdown
![Admin API](https://github.com/uniyous/parkgolf-platform/workflows/Admin%20API%20CI%2FCD/badge.svg)
![Auth Service](https://github.com/uniyous/parkgolf-platform/workflows/Auth%20Service%20CI%2FCD/badge.svg)
```

### 알림 설정
- 빌드 실패 시 Slack 알림
- 배포 완료 시 이메일 알림
- PR 상태 체크

## 🛠️ 로컬 테스트

워크플로우를 로컬에서 테스트하려면:

```bash
# act 설치 (https://github.com/nektos/act)
brew install act

# 워크플로우 실행
act -W .github/workflows/admin-api.yml

# 특정 job만 실행
act -j test -W .github/workflows/admin-api.yml

# 시크릿 파일 사용
act -W .github/workflows/admin-api.yml --secret-file .secrets
```

## 🐛 문제 해결

### 일반적인 문제

1. **권한 오류**
   - 서비스 계정 권한 확인
   - GKE 클러스터 접근 권한 확인

2. **Docker 빌드 실패**
   - Dockerfile 경로 확인
   - 빌드 컨텍스트 확인
   - 의존성 캐시 정리

3. **배포 실패**
   - 쿠버네티스 매니페스트 검증
   - 리소스 할당량 확인
   - 헬스체크 설정 확인

## 📚 참고 자료

- [GitHub Actions 문서](https://docs.github.com/en/actions)
- [Google Cloud Build 문서](https://cloud.google.com/build/docs)
- [Kubernetes 배포 전략](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)

---

Last updated: 2024-07-06