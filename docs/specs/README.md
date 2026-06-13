# Spec 문서

개발 플로우 `plan(Linear) → spec → implement → draft PR → review`에서 **spec(계약) 단계** 산출물.
Linear 이슈는 "왜/무엇", spec은 "어떤 인터페이스로"를 고정한다.

## 폴더

```
docs/specs/
├── active/    # 진행 중 spec (현재 작업 보드)
└── archive/   # merge·폐기된 spec (의사결정 아카이브)
```

- 파일명: `{이슈ID}-{kebab-요약}.md` (예: `UNI-123-policy-resolve-cache.md`)
- 한 이슈 = 한 spec. 서브이슈는 부모 spec 안 섹션으로.

## 라이프사이클

```
spec 작성   active/UNI-123-*.md 생성, Linear 이슈 본문에 경로 링크 1줄
implement   active/ 에 둔 채 코드와 함께 같은 브랜치에서 커밋
draft PR    spec.md 가 디프에 포함 → review가 spec+구현을 한 화면에서 검토
merge 후    git mv active/UNI-123-*.md archive/  (같은 PR 또는 후속)
폐기        archive/ 로 이동 + 상단에 superseded 사유·대체 spec 링크 1줄
```

## 규칙

- **spec과 코드는 같은 PR.** spec만 따로 머지하지 않는다 (계약·구현 분리 방지).
- **구현 중 계약이 바뀌면 spec을 먼저 수정한다.** 코드가 spec을 앞서면 spec은 죽은 문서가 된다.
- **archive는 삭제하지 않는다.** "이 계약이 왜 이렇게 됐는가"의 답으로 보존.

## frontmatter

폴더 위치가 상태를 말해주므로 링크만 남긴다.

```markdown
---
issue: UNI-123
pr: <머지 후 채움>
---
```

## 본문 4섹션 (계층 변경 시 필수)

```markdown
## 수용 기준 (검증 가능하게)
- [ ] ...

## 계약 (변경되는 인터페이스)
- NATS: 패턴명 + 요청/응답 shape
- BFF: 엔드포인트 + 정규화 여부
- 타입: 추가/변경 필드

## 범위 / 변경 파일
- services/..., apps/...

## 배포 의존성
- saga 응답 변경 여부 → 선배포 순서
```

작성 기준: 단일 파일 버그픽스·UI 조정은 불필요(이슈로 충분), 다계층·다서비스·새 NATS 계약·saga/결제는 필수.
