# Pet Store Backoffice - Guia de Projeto e Memória Universal

## Visão Geral

Este projeto é um backoffice administrativo com foco em experiência moderna, responsiva e amigável, utilizando React, MUI, TailwindCSS e lógicas de permissão detalhadas. O objetivo deste README é servir como memória universal para desenvolvedores e IAs futuras, garantindo consistência visual, funcional e de UX.

---

## 1. Temas (Dark/Light)

- **Todo o sistema** deve ser responsivo ao tema global (dark/light), usando `useTheme` do MUI e tokens do arquivo `theme.js`.
- **Tailwind**: Sempre usar classes condicionais `dark:` para garantir contraste e harmonia.
- **Inputs, cards, menus, botões**: Devem alternar corretamente entre claro e escuro, nunca deixando textos ou fundos ilegíveis.

---

## 2. Sidebar e Headerbar (Menu Lateral e Topo)

- **Sidebar (desktop)** e **Headerbar (mobile)** devem ter a MESMA lógica de permissões e opções.
- Itens do menu são exibidos conforme permissões do usuário (`canShowTab`).
- Itens protegidos (planilhas, tokens, invoices, boletos) exigem validação por senha/modal.
- O item "Meu Perfil" só aparece para `user.role === "OPERATOR"`.
- O nome do usuário (primeiro e último nome, ou inicial do segundo) aparece no topo do Sidebar se não for MASTER.
- O cargo "OPERADOR" aparece para `role === "OPERATOR"` (ou "USER" se for o padrão do backend).

---

## 3. Perfil do Operador

- Tela exclusiva para operadores (`role: "OPERATOR"`), acessível em `/meu-perfil`.
- Permite editar nome, email, senha e senha de acesso (mockada).
- Placeholders dinâmicos: "Deixe em branco para manter atual" na edição.
- Visual mobile first, moderno, com Tailwind e suporte total a dark/light.
- Só renderiza se o usuário for operador.

---

## 4. Dashboard

- No mobile, o header mostra o nome do usuário (primeiro e último nome, ou inicial do segundo nome se houver).
- No desktop, mostra "BACKOFFICE".
- Sempre usar o hook `useAuthBackoffice` para obter o usuário logado.

---

## 5. Contatos (ContactsMobile e Desktop)

- Botão "Limpar Dispositivos" com modal para remoção individual de dispositivos mockados.
- Campo de busca com ícone de lupa, placeholder correto e filtragem em tempo real.
- Visual mobile first, com cards, tema sincronizado e responsividade.

---

## 6. Operadores

- Campo "Senha de Acesso" mockado, com ícone de cadeado, botão mostrar/ocultar, placeholder dinâmico.
- Sempre presente no formulário, integrado ao estado.
- Na edição, placeholder orienta a deixar em branco para manter.

---

## 7. Padrões Gerais

- **Nunca** misturar lógicas reais e mockadas sem deixar claro no código/comentários.
- **Sempre** garantir contraste, harmonia e responsividade.
- **Evitar** hardcodes de role: sempre conferir se o backend usa "OPERATOR" ou "USER" para operadores.
- **Se adicionar novos menus ou permissões**, seguir o padrão do Sidebar/Headerbar e atualizar o canShowTab.
- **Se criar novos formulários**, sempre usar placeholders dinâmicos e feedback visual imediato.

---

## 8. Dicas para futuras IAs/desenvolvedores

- Antes de alterar lógicas de permissão, confira o padrão do backend e o que está mockado.
- Sempre sincronize o tema global em novos componentes.
- Se for criar telas mobile, use o Headerbar como referência de lógica e visual.
- Se for criar telas desktop, use o Sidebar como referência.
- Para novos campos sensíveis (senhas, tokens), sempre use placeholders dinâmicos e botões de mostrar/ocultar.
- Documente qualquer exceção ou ajuste temporário neste README.

---

## 9. Exemplo de Prompt para Mascote Pet Store

> Um coelho bonito, branco, com pelagem macia, um dos olhos com uma bolinha preta ao redor (malhado), sorrindo de forma dócil e amigável. Fundo claro e limpo. Embaixo, escrito em letras grandes e arredondadas: PET STORE. Visual fofo, acolhedor, amigável, oposto a mascotes agressivos.

---

## 10. Contato e dúvidas

Se for IA, siga este README como referência principal. Se for humano, consulte o time de design/PO para dúvidas sobre padrões visuais e UX.

---

**Mantenha este arquivo sempre atualizado!**
