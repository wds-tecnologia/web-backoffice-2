# Sistema de Inatividade - Backoffice

## Visão geral

Sistema de detecção de inatividade do painel administrativo (backoffice): após 5 minutos sem atividade, um modal é exibido com countdown de 60 segundos. O usuário pode "Continuar" (reseta o timer) ou "Sair" (logout e redirecionamento para sessão expirada).

## Componentes

### IdleTimeoutModal (`handleSignoutInactivy.tsx`)

- **Caminho:** `src/hooks/handleSignoutInactivy.tsx`
- **Função:** Modal com countdown de 60 segundos e botões "Continuar" e "Sair".
- **Props:** `isOpen`, `onClose`, `onSignOut`.

### AuthBackoffice (`authBackoffice.tsx`)

- **Caminho:** `src/hooks/authBackoffice.tsx`
- **Escopo:** Rotas `/backoffice/*`.
- **Tempo de inatividade:** 5 minutos (300000 ms).
- **Redirecionamento:** Modal → "Sair" ou tempo esgotado → `/session-expired/backoffice`.

### SessionExpiredBackoffice

- **Caminho:** `src/pages/backoffice/SessionExpiredBackoffice/index.tsx`
- **Rota:** `/session-expired/backoffice`
- **Ação do botão:** Limpa storage e redireciona para `/signin/backoffice`.

## Fluxo

1. Usuário autenticado em rota `/backoffice/*`.
2. Após 5 minutos sem atividade (mouse, click, tecla, scroll), o modal abre.
3. Countdown de 60s: ao chegar em 0 ou ao clicar em "Sair" → `onLogout(true)` → redirecionamento para `/session-expired/backoffice`.
4. "Continuar" → fecha o modal e reseta o timer de inatividade.

## Quando o sistema NÃO ativa

- **Rotas públicas:** `/signin`, `/session-expired`, `/forgot`, `/new-password`, `/privacy`, `/recoveryPassword`, `/create-account`, `/home`.
- **Fora do backoffice:** qualquer path que não comece com `/backoffice`.

A inatividade vale em **desenvolvimento e produção** (não há restrição por hostname).

## Token expirado / 401 / SESSION_EXPIRED

### Contrato do backend

O backend padronizou todos os 401 de token (ausente, formato inválido, expirado ou inválido) no mesmo formato:

```json
{
  "statusCode": 401,
  "code": "SESSION_EXPIRED",
  "message": "Token expirado ou inválido."
}
```

Assim o front trata em um só lugar: `status === 401` ou `code === "SESSION_EXPIRED"` → limpar storage e redirecionar para `/session-expired/backoffice`.

### Onde o front trata

- **API (api.ts):** interceptor de resposta em 401 ou `code === "SESSION_EXPIRED"` → limpa storage e redireciona para `/session-expired/backoffice`.
- **initialize() (authBackoffice.tsx):** se não houver token/usuário ou se `/auth/me/backoffice` retornar 401 com `code === "SESSION_EXPIRED"` → `onLogout(true)`.

## Constantes

```ts
// authBackoffice.tsx
const INACTIVITY_LIMIT = 300000; // 5 minutos (ms)

// handleSignoutInactivy.tsx
const MODAL_TIME = 60; // segundos (countdown)
```

## Chaves localStorage limpas no logout

- `@backoffice:token`, `@backoffice:user`, `@backoffice:account`
- `@stricv2:token`, `@stricv2:account`, `@stricv2:user`
- `sessionStorage.clear()`

## Como testar

1. Acesse `http://localhost:3000/signin/backoffice`, faça login.
2. Vá para qualquer rota `/backoffice/*`.
3. Fique 5 minutos sem interagir (mouse, teclado, scroll).
4. O modal deve abrir; espere 60s ou clique em "Sair".
5. Deve redirecionar para `/session-expired/backoffice`; ao clicar no botão, ir para `/signin/backoffice`.
