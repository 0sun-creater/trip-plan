# Travel Planner — 아이디 로그인 버전

Supabase Auth는 이메일/비밀번호를 사용하지만 웹 화면에서는 간단한 아이디만 입력합니다.

## 관리자 계정
Supabase Dashboard → Authentication → Users에서 **본인이 실제로 소유한 이메일 주소**와 비밀번호로 관리자 계정 1개를 만드세요.

## config.js
```js
window.TRAVEL_CONFIG = {
  SUPABASE_URL: "https://xxxx.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_xxxx",
  ADMIN_USERNAME: "admin",
  ADMIN_AUTH_EMAIL: "내실제이메일@example.com"
};
```

웹 로그인 화면에서는 `admin` + Supabase 비밀번호만 입력합니다.

`ADMIN_AUTH_EMAIL`은 프론트엔드 코드에 있으므로 완전한 비밀값은 아닙니다. 보안은 비밀번호와 RLS 정책이 담당합니다. `service_role` 또는 secret key는 절대 넣지 마세요.
