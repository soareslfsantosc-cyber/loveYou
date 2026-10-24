# LoveYou Web — Coração Tipográfico

Versão para navegador da arte generativa original `love.py`. Um coração paramétrico é composto por frases equivalentes a “I love you” em 20 idiomas, que surgem com movimento suave em tons de vermelho e continuam com um brilho ambiente discreto.

## Executar

Não há bibliotecas, fontes remotas, backend ou processo de build. Extraia os arquivos e abra `index.html` em um navegador moderno. Se preferir servir a pasta localmente:

```bash
python3 -m http.server 8000
```

Depois acesse `http://localhost:8000`.

## Arquivos

- `index.html` — estrutura e metadados da página.
- `styles.css` — fundo escuro, composição responsiva e acessibilidade visual.
- `script.js` — curva do coração, distribuição tipográfica, entrada animada, brilho e cintilação.
- `manus-routes.json` — manifesto da rota da página.

A experiência é desenhada em Canvas 2D usando apenas APIs do navegador e fontes locais do sistema. Não requer instalação de dependências. A preferência do sistema por movimento reduzido é respeitada.
