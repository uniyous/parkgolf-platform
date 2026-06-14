---
name: pr
description: ParkGolfMate draft PR 생성 — base develop·커밋 문법·spec 포함 점검을 강제하며 feature 브랜치에서 draft PR을 연다. "PR 생성", "/pr", "draft PR", 작업 완료 후 PR 올릴 때 사용.
---

# PR Skill

`plan → spec → implement → draft PR → review` 플로우의 **draft PR 단계**를 수행한다.
ParkGolfMate 브랜치/PR 규칙(CLAUDE.md)을 강제한다.

상세: `.github/workflows/README.md`

---

## 사용법

```
/pr                  # 현재 브랜치로 draft PR
/pr UNI-123          # 이슈 연결 명시
```

---

## 절차

### 1. 사전 점검 (실패 시 중단하고 알림)
- **base = develop** (절대 main 아님). dev 배포가 develop 추적
- **현재 브랜치 ≠ develop / main** — feature 브랜치여야 함. develop 직접 push 금지
- 브랜치명은 `<type>/<요약>` (feat/fix/refactor/docs/chore…)

develop/main 위면: "feature 브랜치를 먼저 만들어야 한다"고 알리고 브랜치명 제안.

### 2. spec 포함 점검
이번 변경이 spec 필수 대상(다계층·다서비스·새 NATS 계약·saga/결제)인데
`docs/specs/active/` 에 해당 spec이 디프에 없으면 **경고**한다.
→ "spec과 코드는 같은 PR" 규칙. spec 먼저 만들지 물어본다(`/spec`).

### 3. 커밋 상태 확인
- 미커밋 변경이 있으면 커밋 문법 `<type>(<scope>): <요약>`으로 커밋 제안
- scope = 도메인 1개(agent/booking/payment/saga/iam/course/chat/notify/web/ios/android/admin/bff/infra/deps), 멀티는 `,`로 최대 2개
- 커밋 메시지 끝: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

### 4. push & PR 생성
```
git push -u origin <branch>
gh pr create --draft --base develop --head <branch> \
  --title "<type>(<scope>): <요약>" \
  --body "<아래 템플릿>"
```

PR 본문 템플릿:
```markdown
## 무엇
{Linear 이슈 한 줄 — 왜/무엇}

Linear: UNI-123
Spec: docs/specs/active/UNI-123-*.md   ← spec 있을 때만

## 변경
- {X → Y 형식}

## 배포 의존성
- saga 응답 변경 여부 → 선배포 순서

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

> 주의: sandbox에서 `api.github.com` TLS가 막히면 `gh pr create`가 실패한다.
> 이때 compare 링크를 안내: `https://github.com/uniyous/parkgolf-platform/compare/develop...<branch>?expand=1`

### 5. 보고
PR URL(또는 compare 링크) + draft 여부 보고. review 단계는 `/code-review`로 이어감을 안내.

---

## 금지

- **base main 금지** · **develop 직접 push 금지** · **develop→main PR 금지**
  (head 자동삭제로 develop이 사라지면 dev GitOps 끊김)
- merge 후에는 별도로 `git mv docs/specs/active/ → archive/` (이 skill 범위 밖, 상기만)
