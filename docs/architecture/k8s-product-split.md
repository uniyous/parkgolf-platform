# k8s 차트 제품별 분할 설계 (UNI-112 chunk4)

> 단일 umbrella 차트(`k8s/charts/parkgolf`)를 제품별 3 차트로 분할 + 전역 infra 분리.
> 제약: **dev는 GKE 클러스터 1개·네임스페이스 1개에 전부 배포** (제품 차트만 3개 = 3 release). prod 물리 분리는 별건(UNI-94/100).

## 기능변경 0이 보장되는 이유

`templates/_helpers.tpl`이 리소스를 **`.name`(서비스명) 기반**으로만 명명·라벨하고 `.Release.Name`을 일절 쓰지 않는다.

```
app.kubernetes.io/name: {{ .name }}
app.kubernetes.io/managed-by: argocd
image: {{ registry }}/{{ .name }}:{{ tag }}
```

→ release를 `parkgolf` 1개에서 제품별 3개로 쪼개도 **렌더된 Deployment/Service/리소스 이름·라벨이 바뀌지 않는다**. 따라서 각 서비스의 values 블록만 그대로 옮기면 `helm template` 출력이 분할 전후 동일 → ArgoCD가 리소스를 재생성하지 않음(GitOps 안전).

## 목표 레이아웃

```
shared/charts/parkgolf-lib/        Helm 라이브러리 차트 — 템플릿 단일 소스 (_helpers·deployment·service·…)
                                   3 제품 차트가 file:// 의존으로 공유 (file: 패키지와 동일 철학, 복제 금지)
marketplace/infra/k8s/             🟧 marketplace 차트
manager/infra/k8s/                 🟦 manager 차트
platform/infra/k8s/                🟨 platform 차트 (공유 인프라 소유)
infra/argocd/                      app-of-apps 루트 + 제품별 child app (전역)
infra/terraform/  (= 기존 infra/)   전역 (이동 없음)
```

## 서비스 → 제품 차트 매핑 (서비스 폴더 이동과 1:1)

| 차트 | 서비스 | 소유 인프라 |
|---|---|---|
| 🟧 **marketplace** | booking · billing · marketplace-saga · consumer-bff · concierge · chat-service · chat-gateway · partner | **Redis**(concierge 전용 working memory) · BackendConfig(websocket·consumer-bff) |
| 🟦 **manager** | club · manager-bff | — |
| 🟨 **platform** | iam · notify · weather · location · job | **NATS** · **PostgreSQL**(전 DB 단일 StatefulSet) · parkgolf-config(ConfigMap) · ExternalSecrets(parkgolf-secrets·ClusterSecretStore) · **Ingress**(공유 edge) |

### 공유 인프라 귀속 결정

| 리소스 | 귀속 | 근거 |
|---|---|---|
| NATS | platform | 전 제품 공유 메시지 버스 |
| PostgreSQL (전 DB) | platform | dev는 단일 PG StatefulSet 유지(기능변경 0). 제품별 PG 분리는 prod-split(UNI-94/100) |
| Redis | **marketplace** | concierge만 사용 → 제품 전용. 미래 마켓 클러스터에 동행 |
| parkgolf-config·secrets·ClusterSecretStore | platform | 전 서비스 공유. 단일 네임스페이스라 이름 참조로 해결 |
| Ingress | platform | 공유 edge. /api/admin→manager-bff·/api/user→consumer-bff·/socket.io→chat-gateway·/webhook→billing (단일 ns라 서비스명 참조 가능) |

> ⚠️ **단일 네임스페이스 전제**: dev는 3 release 모두 `parkgolf-dev` 네임스페이스에 배포 → platform의 Ingress·NATS·PG·config/secrets를 marketplace/manager 서비스가 in-cluster DNS(서비스명)로 그대로 참조. prod 클러스터 분리 시 이 cross-chart 참조가 분리선이 됨(별건).

## ArgoCD app-of-apps

```
infra/argocd/
├── root-app-{dev,prod}.yaml         app-of-apps 루트 (infra/argocd/apps/ 를 추적)
└── apps/
    ├── platform-{dev,prod}.yaml     → platform/infra/k8s   (sync-wave 0: NATS·PG·Redis·config 먼저)
    ├── marketplace-{dev,prod}.yaml  → marketplace/infra/k8s (sync-wave 1)
    └── manager-{dev,prod}.yaml      → manager/infra/k8s     (sync-wave 1)
```

- 3 child app 모두 `destination.namespace: parkgolf-dev`(dev) / 각 prod ns(추후).
- **sync-wave**: platform(공유 인프라) wave 0 → 제품 차트 wave 1. (서비스가 이미 NATS 재연결 retry를 하므로 순서는 안전망 수준)
- 기존 `k8s/argocd/application-{dev,prod}.yaml`의 `ignoreDifferences`·`syncPolicy`는 3 app에 동일 이식.

## 라이브러리 차트 (템플릿 단일 소스)

현재 `templates/*`는 `.Values.services` 루프 + 공유 인프라 렌더. 복제하면 3벌 분기 위험 → **Helm 라이브러리 차트**(`shared/charts/parkgolf-lib`)로 단일화:

- `parkgolf-lib`: `_helpers.tpl` + `define`(deployment·service·hpa·pdb·externalsecret·configmap·postgres·nats·redis·ingress·backendconfig)
- 각 제품 차트 `Chart.yaml`: `dependencies: [{ name: parkgolf-lib, repository: "file://../../../shared/charts/parkgolf-lib" }]`
- 각 제품 차트 `templates/`: 라이브러리 define을 자기 values 부분집합으로 호출하는 thin wrapper
- ArgoCD: `helm dependency build` 자동(ArgoCD Helm source 지원). `file:` 패키지와 동일하게 미래 레포 분리 시 publish 전환

## 기능변경 0 검증 절차 (구현 게이트)

```bash
# 1) 분할 전 기준 렌더 저장 (dev·prod)
helm template parkgolf k8s/charts/parkgolf -f .../values.yaml -f .../values-dev.yaml  | yq -S 'sort_keys(..)' > /tmp/before-dev.yaml
# 2) 분할 후 3 차트 렌더 합집합
for c in platform marketplace manager; do helm template parkgolf-$c $c/infra/k8s -f .../values-dev.yaml; done | yq -S 'sort_keys(..)' > /tmp/after-dev.yaml
# 3) diff — 0 이어야 머지 (라벨·이름·spec 바이트 동일)
diff /tmp/before-dev.yaml /tmp/after-dev.yaml
```

prod도 동일. **diff 0이 아니면 머지 금지.**

## 구현 단계 (chunk4)

1. `shared/charts/parkgolf-lib` 생성 — 기존 `templates/*`·`_helpers.tpl`을 라이브러리 define으로 이관
2. 3 제품 차트 골격(`<product>/infra/k8s/Chart.yaml`+`values*.yaml`+thin templates) — values는 현 단일 values를 제품별로 분할
3. `infra/argocd/` app-of-apps + 3 child app (기존 application-*.yaml의 정책 이식)
4. **helm template diff 검증**(dev·prod) → 0 확인
5. `k8s/` 제거 · `cd-services.yml` Helm values 갱신 경로(`serviceImageTags` 기록 대상) 재지정
6. 문서(`CLAUDE.md`·`docs/architecture/erp-booking-split.md`) 경로 갱신

## prod 분리 시 변화 (future, 별건)

- 제품별 클러스터 → child app `destination`을 제품 클러스터로 분리, namespace 분리
- platform 공유 인프라(NATS·PG)는 양 클러스터 사본 또는 코어 NS
- cross-chart 참조(Ingress·PG host)가 클러스터 경계 → 계약/JWKS(UNI-111)로 격리
