# docs 폴더 가이드

## 목적
이 폴더는 프로젝트의 핵심 문서를 중앙 관리하여, 팀원 및 AI 도구와의 효율적인 협업을 지원합니다.

## 폴더 구조
```
docs/
├── README.md               # 이 파일
├── ARCHITECTURE.md         # 시스템 아키텍처 문서
├── CICD_GUIDE.md           # CI/CD 파이프라인 가이드
├── GCP_INFRASTRUCTURE_DETAIL.md  # GCP 인프라 상세
├── ROADMAP.md              # 개발 로드맵
├── MEMBERSHIP_TIER_STRATEGY.md   # 멤버십 등급 전략
└── services/               # 서비스별 상세 문서
    ├── auth-service.md     # 인증 서비스
    ├── booking-service.md  # 예약 서비스 (Saga 패턴)
    ├── course-service.md   # 코스/게임 서비스
    ├── user-api.md         # User API (BFF)
    └── admin-api.md        # Admin API (BFF)
```

## 문서 안내

| 문서 | 설명 | 언제 참조? |
|------|------|-----------|
| **ARCHITECTURE.md** | 시스템 구조, 기술 스택, 서비스 관계, Saga 패턴 | 시스템 이해, 설계 |
| **CICD_GUIDE.md** | GitHub Actions 워크플로우, 배포 방법 | 배포 작업 |
| **GCP_INFRASTRUCTURE_DETAIL.md** | GCP 리소스 상세 구성 | 인프라 관리 |
| **ROADMAP.md** | 개발 진행 상황, 다음 작업 | 진행 상황 확인 |
| **MEMBERSHIP_TIER_STRATEGY.md** | 멤버십 등급 비즈니스 전략 | 기획 참조 |
| **services/*.md** | 각 서비스별 상세 아키텍처, API 스펙 | 서비스 개발 |

## 관련 폴더
- `infra/`: Terraform 인프라 코드
- `services/`: 백엔드 서비스
- `apps/`: 프론트엔드 앱
- `.github/workflows/`: CI/CD 워크플로우
- `.claude/skills/`: Claude Code Skills

## 업데이트 관리

### 중요 변경사항 발생 시 업데이트:
- 아키텍처 변경 → ARCHITECTURE.md
- 마일스톤 달성 → ROADMAP.md

### 업데이트 명령:
```bash
# Git에 커밋
git add docs/
git commit -m "Update project documentation"
```

## 팁

1. **간결하게 유지**: 핵심 정보만 포함
2. **최신 상태 유지**: 주요 변경 시 업데이트
3. **구조화**: 마크다운으로 읽기 쉽게 작성
4. **실용적**: 실제로 필요한 정보만 포함

---

*이 문서는 효율적인 프로젝트 관리와 협업을 위해 작성되었습니다.*