# 개발 데이터베이스 접속 가이드

GKE 클러스터 내부 PostgreSQL(`postgres-0`)에 접속하는 방법. 클러스터 외부에 노출되지 않으므로 **`kubectl exec`(직접) 또는 `port-forward`(로컬 GUI)** 로 접근한다.

| 환경 | 클러스터 | 네임스페이스 | StatefulSet | Service | port |
|---|---|---|---|---|---|
| dev | `parkgolf-dev-cluster` (zonal `asia-northeast3-a`) | `parkgolf-dev` | `postgres` (`postgres-0`) | `postgres` (headless) | **5432** |

> 단일 PostgreSQL 인스턴스에 **서비스별 독립 DB**가 들어있다(크로스-DB 접근 0, 통신은 NATS). 슈퍼유저 = `parkgolf`.

---

## 1. 사전 요구사항

| 항목 | 확인 |
|---|---|
| `gcloud` CLI 인증 | `gcloud auth list`에 활성 계정 |
| `kubectl` 설치 | `kubectl version --client` |
| `gke-gcloud-auth-plugin` | `gcloud components install gke-gcloud-auth-plugin` |
| GKE 클러스터 권한 | `roles/container.developer` 이상 |

## 2. kubectl 컨텍스트 연결

```bash
gcloud container clusters get-credentials parkgolf-dev-cluster \
  --zone=asia-northeast3-a \
  --project=parkgolf-uniyous

kubectl config current-context   # gke_parkgolf-uniyous_asia-northeast3-a_parkgolf-dev-cluster
```

> 컨텍스트 별칭이 있으면 `kubectl --context parkgolf-dev ...` 로 축약 가능.

## 3. 데이터베이스 목록

서비스 ↔ DB 매핑 (`k8s/charts/parkgolf/values.yaml` 기준):

| 서비스 | DB | 비고 |
|---|---|---|
| iam-service | `iam_db` | |
| club-service | `club_db` | ERP 도메인(클럽·코스·게임·정책) |
| booking-service | `booking_db` | |
| billing-service | `billing_db` | 구 `payment_db` (리네임) |
| marketplace-saga-service | `saga_db` | 구 `saga-service` (리네임, DB명 유지) |
| chat-service | `chat_db` | |
| notify-service | `notify_db` | |
| partner-service | `partner_db` | |
| concierge-service | `concierge_db` | 구 `agent_db` (리네임) |
| — | `parkgolf` | 슈퍼유저 기본 DB(운영 데이터 아님) |

확인:

```bash
kubectl --context parkgolf-dev exec -it postgres-0 -n parkgolf-dev -- \
  psql -U parkgolf -c "\l"
```

> ⚠️ **리네임 진행 중**: 코드·values는 `billing_db`·`concierge_db`로 전환됐으나(UNI-126), 실제 인스턴스에 새 DB가 아직 없으면 해당 서비스가 연결 실패한다. 새 DB 생성은 [6. 운영: 신규 DB 생성](#6-운영-신규-db-생성) 참조.

## 4. 접속 방법 A — kubectl exec (CLI, 빠름)

pod 안에서 `psql`을 바로 실행. 슈퍼유저(`parkgolf`)는 비밀번호 없이 로컬 소켓 접속.

```bash
# 대화형 psql (booking_db 예시)
kubectl --context parkgolf-dev exec -it postgres-0 -n parkgolf-dev -- \
  psql -U parkgolf -d booking_db

# 단발 쿼리
kubectl --context parkgolf-dev exec -it postgres-0 -n parkgolf-dev -- \
  psql -U parkgolf -d club_db -c "SELECT count(*) FROM clubs;"
```

자주 쓰는 psql 메타명령:

| 명령 | 용도 |
|---|---|
| `\l` | DB 목록 |
| `\c <db>` | DB 전환 |
| `\dt` | 테이블 목록 |
| `\d <table>` | 테이블 스키마 |
| `\q` | 종료 |

## 5. 접속 방법 B — port-forward (로컬 GUI: DBeaver·TablePlus 등)

로컬 **15432** 포트를 pod의 5432로 터널링(로컬 기본 PostgreSQL 5432와 충돌 방지).

```bash
kubectl --context parkgolf-dev port-forward -n parkgolf-dev postgres-0 15432:5432
# → 터미널 유지. 종료는 Ctrl+C
```

GUI/로컬 psql 접속 정보:

| 항목 | 값 |
|---|---|
| Host | `localhost` |
| Port | `15432` |
| User | `parkgolf` |
| Password | 아래 6.1에서 조회 |
| Database | `booking_db` 등 (3장 목록) |

비밀번호 조회 (슈퍼유저, `parkgolf-secrets` 시크릿):

```bash
kubectl --context parkgolf-dev get secret parkgolf-secrets -n parkgolf-dev \
  -o jsonpath='{.data.POSTGRES_PASSWORD}' | base64 -d; echo
```

서비스별 `DATABASE_URL`(앱이 쓰는 접속 문자열) 조회:

```bash
kubectl --context parkgolf-dev get secret booking-service-db-secret -n parkgolf-dev \
  -o jsonpath='{.data.DATABASE_URL}' | base64 -d; echo
```

> 로컬 접속 포트는 **15432**로 통일(로컬 기본 PostgreSQL 5432와 충돌 회피). 15432마저 점유됐으면 임의 포트(예: `25432:5432`)로 바꾸고 GUI Port를 맞춘다.

## 6. 운영: 신규 DB 생성

서비스 리네임/추가로 새 DB가 필요할 때. **마이그레이션은 테이블만 만들지 DB 자체는 안 만든다** → 빈 DB를 먼저 생성해야 새 서비스가 기동된다.

```bash
kubectl --context parkgolf-dev exec -it postgres-0 -n parkgolf-dev -- \
  psql -U parkgolf -c "CREATE DATABASE billing_db;"

kubectl --context parkgolf-dev exec -it postgres-0 -n parkgolf-dev -- \
  psql -U parkgolf -c "CREATE DATABASE concierge_db;"
```

- `CREATE`는 기존 DB·pod를 건드리지 않아 안전(활성 커넥션 충돌 없음).
- 데이터 보존이 필요한 리네임이면 `CREATE` 대신 `ALTER DATABASE old RENAME TO new` — 단 **해당 DB에 활성 커넥션이 없어야** 하므로 옛 서비스를 먼저 scale 0.

## 7. 주의

- ⚠️ **dev 전용 가이드.** prod는 별도 클러스터(`parkgolf-prod-cluster`)이며 직접 접근을 제한한다.
- 운영 데이터 변경(`UPDATE`/`DELETE`/`DROP`)은 신중히 — dev라도 다른 작업자의 테스트를 깨뜨릴 수 있다.
- 외부에 5432를 LoadBalancer로 노출하지 않는다. 항상 `kubectl exec`/`port-forward` 경유.
- 활성 GCP 계정이 `roles/container.developer` 이상이어야 `exec`/`port-forward` 가능.

## 8. 참고

| 리소스 | 위치 |
|---|---|
| Helm values (서비스↔DB 매핑) | `k8s/charts/parkgolf/values.yaml` |
| postgres StatefulSet | `k8s/charts/parkgolf/templates/` |
| 슈퍼유저 비밀번호 | `parkgolf-secrets` 시크릿 (`POSTGRES_PASSWORD`) |
| 서비스별 접속 문자열 | `<service>-db-secret` 시크릿 (`DATABASE_URL`) |
| ArgoCD 접속 | `docs/guides/argocd-access-guide.md` |
