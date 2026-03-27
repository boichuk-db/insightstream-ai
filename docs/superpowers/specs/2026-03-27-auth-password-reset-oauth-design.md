# Auth: Password Reset + OAuth (Google & GitHub)

**Дата:** 2026-03-27
**Статус:** Approved
**Область:** Authentication — InsightStream AI

---

## Контекст

Поточна auth система підтримує лише email/password. Дві критичні прогалини:
1. **Password reset відсутній** — юзер не може відновити доступ якщо забув пароль (launch blocker)
2. **OAuth відсутній** — реєстрація/вхід через Google і GitHub підвищують конверсію і довіру

Обидві фічі торкаються `User` entity і `AuthModule`, тому реалізуються разом в одному spec-циклі.

---

## 1. Зміни в User Entity

**Файл:** `packages/database/src/entities/user.entity.ts`

### Нові поля

```typescript
@Column({ type: 'varchar', nullable: true })   // було NOT NULL
passwordHash: string | null;

@Column({ type: 'varchar', unique: true, nullable: true, default: null })
googleId: string | null;

@Column({ type: 'varchar', unique: true, nullable: true, default: null })
githubId: string | null;

@Column({ type: 'varchar', nullable: true, default: null })
resetPwdToken: string | null;

@Column({ type: 'timestamp', nullable: true, default: null })
resetPwdExpires: Date | null;
```

### Бізнес-правила
- Email/password юзер: `passwordHash` заповнений, `googleId/githubId = null`
- OAuth-only юзер: `passwordHash = null`, відповідний `googleId` або `githubId` заповнений
- Після auto-link: один запис з заповненим `passwordHash` і `googleId/githubId`
- `resetPwdToken` + `resetPwdExpires` — завжди `null` у нормальному стані, заповнюються лише під час активного reset flow

### Migration
Потребує TypeORM міграції:
- `ALTER TABLE users ALTER COLUMN "passwordHash" DROP NOT NULL`
- `ALTER TABLE users ADD COLUMN "googleId" VARCHAR UNIQUE`
- `ALTER TABLE users ADD COLUMN "githubId" VARCHAR UNIQUE`
- `ALTER TABLE users ADD COLUMN "resetPwdToken" VARCHAR`
- `ALTER TABLE users ADD COLUMN "resetPwdExpires" TIMESTAMP`

---

## 2. Password Reset

### Backend

**Нові endpoints у `AuthController`:**

#### `POST /auth/forgot-password`
```
Body:    { email: string }
Auth:    Public
Returns: { message: string }  // завжди 200, не розкриває чи існує email
```

Логіка в `AuthService.forgotPassword(email)`:
1. Знайти юзера по email (якщо не знайдено — тихо повернути 200)
2. Перевірити що юзер має `passwordHash` (OAuth-only юзери не можуть reset пароль через email)
3. Згенерувати `token = crypto.randomUUID()`
4. Зберегти `resetPwdToken = token`, `resetPwdExpires = new Date(Date.now() + 3600_000)` (1 година)
5. Відправити email через `MailService.sendPasswordReset(email, token)`
6. Посилання в листі: `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`

#### `POST /auth/reset-password`
```
Body:    { token: string, newPassword: string }
Auth:    Public
Returns: { message: string }
Errors:  400 якщо токен невалідний або прострочений
```

Логіка в `AuthService.resetPassword(token, newPassword)`:
1. Знайти юзера по `resetPwdToken`
2. Перевірити `resetPwdExpires > new Date()` — якщо ні, кинути `BadRequestException`
3. `passwordHash = await bcrypt.hash(newPassword, 10)`
4. Очистити `resetPwdToken = null`, `resetPwdExpires = null`
5. Зберегти юзера

**Новий метод у `MailService`:**
```typescript
sendPasswordReset(to: string, token: string): Promise<void>
// HTML email з кнопкою "Змінити пароль"
// Subject: "Відновлення пароля — InsightStream"
```

### Frontend

**Нова сторінка: `/auth/forgot-password/page.tsx`**
- Форма: одне поле email + кнопка "Надіслати посилання"
- Після успіху: повідомлення "Перевірте пошту" (не робити redirect)
- Посилання "Назад до входу" → `/auth`

**Нова сторінка: `/auth/reset-password/page.tsx`**
- Читає `?token=` з URL (`useSearchParams`)
- Форма: два поля — newPassword + confirmPassword (client-side валідація що співпадають)
- Після успіху: redirect → `/auth` з toast "Пароль змінено"
- Якщо токен прострочений/невалідний: показати повідомлення з посиланням "Надіслати новий лист"

**Зміна в існуючій auth сторінці (`apps/web/src/app/page.tsx` — root `/`):**
- Додати посилання "Забули пароль?" під полем password (тільки у Login режимі)

---

## 3. OAuth — Google та GitHub

### Dependencies

```bash
# API
pnpm add passport-google-oauth20 passport-github2 --filter api
pnpm add -D @types/passport-google-oauth20 @types/passport-github2 --filter api
```

### Environment Variables

```bash
# API (.env)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
API_URL=http://localhost:3001          # в prod: https://api-production-05c4.up.railway.app
# FRONTEND_URL вже існує
```

### Backend

#### Нові стратегії

**`apps/api/src/modules/auth/strategies/google.strategy.ts`**
```typescript
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get('GOOGLE_CLIENT_ID'),
      clientSecret: config.get('GOOGLE_CLIENT_SECRET'),
      callbackURL: `${config.get('API_URL')}/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken, refreshToken, profile, done) {
    const email = profile.emails[0].value;
    const googleId = profile.id;
    done(null, { email, googleId });
  }
}
```

**`apps/api/src/modules/auth/strategies/github.strategy.ts`**
- Аналогічна структура з `passport-github2`
- scope: `['user:email']`
- Callback URL: `/auth/github/callback`

#### Нові endpoints у `AuthController`

```typescript
// Redirect на Google consent
@Get('google')
@UseGuards(AuthGuard('google'))
googleAuth() {}

// Google callback
@Get('google/callback')
@UseGuards(AuthGuard('google'))
async googleCallback(@Req() req, @Res() res) {
  const token = await this.authService.oauthLogin(req.user);
  res.redirect(`${frontendUrl}/auth/oauth/callback?token=${token}`);
}

// Аналогічно для github
@Get('github')
@Get('github/callback')
```

#### `AuthService.oauthLogin({ email, googleId?, githubId? })`

```
1. Шукаємо по providerId (googleId або githubId)
   → знайшли → повернути JWT

2. Шукаємо по email
   → знайшли → auto-link:
     user.googleId = googleId (або githubId)
     зберегти → повернути JWT

3. Не знайшли → createUser:
   user = { email, passwordHash: null, googleId/githubId }
   teamsService.createPersonalTeam(user.id)
   → повернути JWT
```

#### Оновлення `AuthModule`

```typescript
providers: [
  AuthService,
  JwtStrategy,
  GoogleStrategy,   // новий
  GitHubStrategy,   // новий
]
```

Додати `API_URL` до ConfigService або хардкодити `callbackURL` через env.

### Frontend

**Зміна в існуючій auth сторінці (`apps/web/src/app/page.tsx`):**
```
[Continue with Google]   ← кнопка → window.location.href = `${NEXT_PUBLIC_API_URL}/auth/google`
[Continue with GitHub]   ← кнопка → window.location.href = `${NEXT_PUBLIC_API_URL}/auth/github`

─── або ───

[email / password форма]

[Forgot password?]  ← link → /auth/forgot-password
```

**Нова сторінка: `/auth/oauth/callback/page.tsx`**
```typescript
// Не рендерить UI — тільки логіка
'use client'
export default function OAuthCallback() {
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (token) {
      localStorage.setItem('access_token', token);
      router.replace('/dashboard');
    } else {
      router.replace('/auth?error=oauth_failed');
    }
  }, []);
  return <LoadingSpinner />;
}
```

---

## 4. Структура файлів

### Нові файли

```
apps/api/src/modules/auth/strategies/
  google.strategy.ts
  github.strategy.ts

apps/web/src/app/auth/
  forgot-password/
    page.tsx
  reset-password/
    page.tsx
  oauth/
    callback/
      page.tsx
```

### Змінювані файли

| Файл | Що змінюється |
|------|---------------|
| `packages/database/src/entities/user.entity.ts` | 5 нових полів |
| `apps/api/src/modules/auth/auth.service.ts` | `forgotPassword()`, `resetPassword()`, `oauthLogin()` |
| `apps/api/src/modules/auth/auth.controller.ts` | 4 нових endpoint |
| `apps/api/src/modules/auth/auth.module.ts` | реєстрація Google/GitHub стратегій |
| `apps/api/src/modules/mail/mail.service.ts` | `sendPasswordReset()` |
| `apps/web/src/app/page.tsx` (root `/`) | OAuth кнопки + "Forgot password?" link |
| TypeORM migration file | 5 ALTER TABLE statements |

---

## 5. Error Handling

| Сценарій | Поведінка |
|----------|-----------|
| `forgot-password` з невідомим email | 200 OK (не розкривати) |
| `forgot-password` для OAuth-only юзера | 200 OK (тихо ігнорувати) |
| `reset-password` з протермінованим токеном | 400 + повідомлення юзеру |
| `reset-password` з невалідним токеном | 400 |
| OAuth callback без email у профілі | redirect `/auth?error=no_email` |
| OAuth provider error | redirect `/auth?error=oauth_failed` |
| Auth page: отримано `?error=` | показати toast з відповідним текстом |

---

## 6. Верифікація

Після реалізації перевірити:

**Password Reset:**
- [ ] `POST /auth/forgot-password` з валідним email → отримати email з посиланням
- [ ] Посилання в email веде на `/auth/reset-password?token=xxx`
- [ ] Форма reset password: вводимо новий пароль → успіх → login з новим паролем
- [ ] Той самий токен вдруге → 400 error
- [ ] Токен через 1 годину → 400 error

**Google OAuth:**
- [ ] Кнопка "Continue with Google" → Google consent → redirect на dashboard
- [ ] Повторний вхід через Google → той самий акаунт
- [ ] Google email = існуючий email/password юзер → auto-link → один акаунт

**GitHub OAuth:**
- [ ] Аналогічні кроки для GitHub

**Edge cases:**
- [ ] OAuth-only юзер: `forgot-password` → 200 OK без email (правильно — не розкривати)
- [ ] `/auth?error=oauth_failed` → показати toast з помилкою
