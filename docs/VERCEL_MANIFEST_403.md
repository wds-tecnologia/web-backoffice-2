# manifest.json 403 (Forbidden) na Vercel

## O que acontece

- `GET https://web-backoffice-2.vercel.app/manifest.json` retorna **403 (Forbidden)**.
- O console mostra: "Manifest fetch from ... manifest.json failed, code 403".
- Às vezes aparece a tela **"Estamos verificando seu navegador"** (Ponto de verificação de segurança da Vercel).

## Causa

O **Vercel Firewall / Attack Challenge Mode** (ponto de verificação de segurança) pode bloquear ou atrasar requisições a arquivos estáticos como `manifest.json` até que o navegador seja “verificado”. Durante esse checkpoint ou em certas condições (ex.: crawlers, requisições sem referrer/cookies), a Vercel pode responder **403** para esses recursos.

## O que foi feito no projeto

1. **`vercel.json`** na raiz do projeto:
   - Headers explícitos para `/manifest.json`: `Cache-Control`, `Access-Control-Allow-Origin: *`, `Content-Type: application/manifest+json`.
   - Isso garante que o manifesto seja tratado como recurso público e com tipo correto.

2. **React Router** em `src/index.js`:
   - Flags de futuro `v7_startTransition` e `v7_relativeSplatPath` para eliminar os avisos de depreciação do React Router no console.

## Se o 403 continuar

O bloqueio pode vir da **configuração do projeto na Vercel**, não só do código:

1. **Vercel Dashboard** → seu projeto → **Settings** → **Firewall** (ou **Security** / **Attack Challenge Mode**):
   - Verifique se há regras que bloqueiam requisições a arquivos estáticos.
   - Se existir “Attack Challenge” ou “Browser Challenge”, avalie criar exceção para rotas como `/manifest.json`, `/favicon.ico` e demais assets em `/static` (ou equivalente).

2. **Deployment Protection**:
   - Se “Vercel Authentication” ou “Password Protection” estiver ativo, confirme se `/manifest.json` (e em geral os arquivos em `public/`) **não** exigem login. O manifesto deve ser público.

3. **Rede / navegador**:
   - Testar em outra rede (ex.: 4G) e em aba anônima para ver se o 403 some após o “verificando seu navegador” concluir.

## Impacto no app

- O **403 no manifest** não impede o carregamento da aplicação: o Service Worker e o resto do app seguem funcionando.
- O aviso no console é principalmente informativo; a PWA pode perder apenas metadados de instalação (nome, ícones) até o manifesto passar a ser servido com 200.
