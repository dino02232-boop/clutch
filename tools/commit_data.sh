#!/usr/bin/env bash
# data.js 가 실제로 바뀐 경우에만 커밋하고 main 으로 푸시합니다.
#   ./tools/commit_data.sh results|daily
# push 직전에 최신 main 으로 rebase 하고, 충돌하면 최신 main 에서 갱신을 다시 만들어 재시도합니다.
set -u

MODE="${1:-results}"

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

msg() {
  if [ "$MODE" = "daily" ]; then
    echo "chore(data): 경기 일정·프리뷰 일일 자동 갱신 $(TZ=Asia/Seoul date '+%Y-%m-%d %H:%M KST')"
  else
    echo "chore(data): 경기 결과 자동 갱신 $(TZ=Asia/Seoul date '+%Y-%m-%d %H:%M KST')"
  fi
}

commit_if_changed() {
  git add data.js
  if git diff --cached --quiet -- data.js; then
    echo "data.js 변경 없음 — 커밋하지 않습니다."
    return 1
  fi
  git commit -q -m "$(msg)"
  return 0
}

if ! commit_if_changed; then
  exit 0
fi

for i in 1 2 3; do
  git fetch -q origin main || true
  if ! git rebase origin/main; then
    echo "rebase 충돌 — 최신 main 기준으로 다시 생성합니다 (시도 $i)"
    git rebase --abort || true
    git reset -q --hard origin/main
    python3 tools/auto_update.py --mode "$MODE" || true
    commit_if_changed || exit 0
    continue
  fi
  if git push -q origin HEAD:main; then
    echo "푸시 완료 (시도 $i)"
    exit 0
  fi
  echo "푸시 재시도 $i"
  sleep 5
done

echo "푸시에 실패했습니다." >&2
exit 1
