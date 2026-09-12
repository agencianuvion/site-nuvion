# Handoff: Home — Hero + Statement + Performance Card + Pilares (carrossel)

## Overview
Home institucional da Nuvion (agência de SEO técnico, GEO e sites de alta performance). Este pacote cobre as quatro primeiras seções da home: Hero com vídeo em loop, seção "Statement" com onda de ícones animada, um card flutuante de indicadores de performance, e um carrossel horizontal ("Os três pilares") com scroll snap. Destino de implementação: **Astro**, componentes que consumam o Nuvion Design System já existente no repositório (`_ds_bundle.js`, tokens CSS).

## About the Design Files
O arquivo `Hero Nuvion.dc.html` é uma **referência de design em HTML** — um protótipo de alta fidelidade mostrando aparência, copy, espaçamento e comportamento pretendidos. **Não é para ser copiado literalmente para produção.** A tarefa é recriar este design como componentes `.astro` (e islands React onde houver interatividade — vídeo, parallax, carrossel), usando os componentes do Nuvion Design System (`Button`, `Eyebrow`) já disponíveis via `_ds_bundle.js`, e os tokens CSS (`tokens/colors.css`, `tokens/typography.css`, etc.) em vez de valores soltos.

Abra o arquivo em um navegador para ver o resultado renderizado — ele contém apenas uma seção com id `#1d` ativa (as demais são iterações antigas descartadas; ignore qualquer `id="dv-*"` que sobrar como wrapper de apresentação, não faz parte do design final).

## Fidelity
**Alta fidelidade (hifi).** Cores, tipografia, espaçamento e interações já estão no valor final aprovado pelo usuário. Recrie pixel a pixel. Onde o HTML usa `style` inline, traduza para os tokens equivalentes do design system sempre que existir um token correspondente; onde não existir (ex.: o card grafite de performance, o carrossel), use os valores exatos listados abaixo.

## Screens / Views

### 1. Hero
**Propósito:** primeira tela do site (100vh), vídeo de fundo em loop, headline + CTA.

**Layout:**
- `<section>` full-bleed, `height: 100vh; min-height: 620px`, `position: relative; overflow: hidden`, fundo `#FFFFFF`.
- Vídeo `<video>` absoluto, `top: 50%; left: 0; transform: translateY(-50%); width: 100%; height: 660px; object-fit: cover; z-index: 0`. A altura do vídeo é **fixa em 660px** mesmo com a seção em 100vh — ele fica centralizado verticalmente na seção, não estica.
  - Atributos: `autoplay muted loop playsinline preload="metadata" poster="assets/hero-poster.webp"`.
  - Comportamento de carregamento (ver Interactions): o play só é disparado programaticamente após o `load` da página, para não competir com o LCP. Em conexões lentas (`navigator.connection.saveData`, `effectiveType` 2G) ou `prefers-reduced-motion: reduce`, o vídeo não é nem carregado — fica só o poster.
- Scrim sobre o vídeo: `linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,.7) 14%, rgba(255,255,255,.2-.22) 42%, rgba(255,255,255,.8-.82) 74%, #FFFFFF 92%)` — simétrico, dissolve o vídeo nas duas pontas.
- Header sticky-like (não sticky de fato no protótipo, mas deve ser NavBar do design system): logo horizontal + 3 links de navegação + botão. Vidro: `background: rgba(255,255,255,.42); border-bottom: 1px solid rgba(42,42,42,.06); backdrop-filter: blur(14px)`.
- Conteúdo central: `Eyebrow` do design system ("Ecossistema de Crescimento"), `H1`, lead, dois CTAs, linha de 3 itens separados por bullet laranja.

**Typography:**
- H1: `font-family: "Inter Tight"; font-weight: 500; letter-spacing: -0.035em; line-height: 1.02; font-size: 68px` (desktop) `/ 38px` (mobile). Payoff em `<strong>` peso 800.
- Copy do H1: "Arquitetura digital para a **nova era das buscas.**"
- Lead: 19px desktop / 16px mobile, `color: #666` (levemente mais claro que o `--nv-graphite-600` padrão do DS — confirmar se usa o token ou este valor específico), `max-width: 52ch`.
- Textos abaixo dos CTAs: "Domine as Buscas" · "Sites Otimizados para IA" · "SEO Técnico e GEO", separados por bullets `#E8825A` (laranja suavizado), `color: #8A8A8A`, `font-size: 13px`.

**Componentes:**
- `Button` do DS, variant primário, size `md` — CTA "Agendar Meu Diagnóstico".
- Botão secundário **customizado** (classe `.nv-soft`, não é o `secondary` padrão do DS): pill, `border: 1px solid rgba(42,42,42,.13)`, fundo transparente, texto `#3A3A3A`; hover: fundo `rgba(42,42,42,.04)`, borda `rgba(42,42,42,.2)` — nunca escurece para preto. Motivo: o `secondary` padrão do DS ficou muito forte sobre o vídeo; foi pedido explicitamente uma borda mais suave. Avaliar com o time de design se isso deve virar uma nova variante oficial do DS (`variant="soft"`) em vez de uma classe solta.
- Botão primário laranja: **importante** — o componente `Button` do bundle atual define `border` (shorthand) no estado normal e só `borderColor` no `:hover`; o React não reconcilia as duas propriedades corretamente e ao sair do hover a borda pode "vazar" para grafite. Workaround aplicado no protótipo: `border-color: transparent !important` forçado em todos os estados dentro do escopo da hero. **Recomenda-se corrigir isso na fonte do componente Button** (usar `borderColor` em ambos os estados, nunca a shorthand) em vez de replicar o workaround.

## 2. Statement (onda de ícones + texto monumental)
**Propósito:** transição de página, resume a entrega em uma frase, com uma animação de "onda" de ícones flutuantes.

**Layout:**
- `<section>` fundo `#FDFDFD` (não usar `#FFFFFF` nem `#F2F2F2` puro — foi ajustado propositalmente para este tom), `padding: 100px 24px` (desktop e mobile, valor pedido explicitamente pelo usuário para igualar o respiro acima/abaixo).
- Onda: `display:flex; justify-content:center; align-items:center; gap:20px` (8px no mobile), 9 esferas circulares de 64px (40px mobile).
- Esfera: `border-radius:50%; background:#FFFFFF; border:1px solid rgba(42,42,42,.1); box-shadow:0 8px 16px rgba(0,0,0,.04)`. Ícone dentro em `stroke="currentColor" stroke-width="1"` (ícones de linha fina, ajuste pedido explicitamente — todo o site usa traço 1px, exceto o gráfico do performance card em 1.2px).
- 9 ícones, na ordem: IA/GEO (moldura + "AI" + faísca), link/conexão, code (`<>`), info, box 3D **(esfera destacada em laranja, `color:#CC4E14`)**, estrela, gear, bars, design/pen-tool.
- Animação `floatWave`: `@keyframes floatWave{0%,100%{transform:translateY(0)}50%{transform:translateY(-24px)}}`, `animation: floatWave 4s ease-in-out infinite`, delay escalonado em `0.2s` por esfera (0 a 1.6s). Desliga totalmente sob `prefers-reduced-motion: reduce`.
- H2 abaixo, `max-width:900px`, `font-size: 2.125rem` (34px, fixo — não usa `clamp`, foi pedido explicitamente), `font-weight:500` (400 na versão mobile, editada manualmente pelo usuário), `letter-spacing:-0.04em`, `line-height:1.15`, `text-align:center`, `color:#2A2A2A`.
- Copy desktop: "A arquitetura digital para a era das inteligências. Desenvolvemos sites de alta performance estruturados em **SEO Técnico** e **GEO (Generative Engine Optimization)**."
- Copy mobile (editada pelo usuário, texto diferente do desktop — manter as duas versões distintas): "A Nuvion prepara a sua marca para os algoritmos do futuro. Desenvolvemos ecossistemas de alta conversão guiados por **SEO Técnico** e **GEO**." Termos em `color:#CC4E14`.

## 3. Performance Card (dentro da seção Statement, dividor visual)
**Propósito:** prova social abstrata — indicadores de Core Web Vitals — funciona como um "divisor" visual entre a onda de ícones e o H2 do Statement.

**Layout:**
- `<aside>` centralizado, `width: 640px` desktop / `354px` mobile, `max-width: calc(100% - 44px)`.
- Entra logo depois da onda de ícones, antes do H2 (não é mais um elemento sobreposto entre hero e seção — foi reposicionado para dentro da própria seção Statement).
- Card interno: fundo `#2A2A2A`, `border-radius:22px`, `border:1px solid rgba(242,242,242,.12)`, `box-shadow:0 20px 56px rgba(20,20,20,.28)`, padding `30px 34px`.
- Header: label "Core Web Vitals · Auditoria real" (uppercase, `letter-spacing:.14em`, `color:rgba(242,242,242,.5)`) + selo "Aprovado" em `#22C55E` com dot.
- Linha de 3 anéis: Performance 99 / SEO 100 / Acessível 98 — círculos `border:2.5px solid #22C55E`, número em mono, `color:#22C55E`.
- Gráfico SVG de tráfego orgânico (curva ascendente `stroke:#CC4E14`, `stroke-width:2.5`, com um nó/círculo no topo).
- Footer com 4 métricas em mono: LCP 0,9s · CLS 0,00 · INP 112ms · Cliques +184%. **Estes números são placeholders — substituir por dados reais de uma auditoria Nuvion antes de publicar** (o brand exige candura sobre resultados, nunca números inventados no ar).
- Hover: `translateY(-4px)`, borda vira `rgba(204,78,20,.42)`, sombra adensa. Transição `.32s cubic-bezier(.22,.61,.36,1)`.
- Entrada com zoom: escala de `0.86 → 1` + fade, disparada quando o elemento entra ~90% da viewport. Implementado no protótipo via polling em `requestAnimationFrame` (ver Interactions) porque o evento de `scroll` não disparava no ambiente de preview — **em produção, prefira `IntersectionObserver` puro**, é a solução correta e mais performática; o polling foi um workaround de ambiente, não um padrão a repetir.
- Parallax sutil: desloca o card verticalmente conforme a posição na viewport, fator `0.03` (bem discreto, foi reduzido de um valor maior a pedido do usuário porque estava colidindo com a seção seguinte).

## 4. Carrossel "Os três pilares"
**Propósito:** apresentar os 3 serviços centrais (Sites de Alta Performance, SEO Técnico, GEO) em cards roláveis com scroll snap horizontal, estilo inspirado no site Google Antigravity.

**Layout:**
- `<section>` fundo `#FDFDFD` (igual à seção anterior — pedido explícito de manter a mesma cor), `border-top: 1px solid rgba(42,42,42,.08)` (linha sutil separando das seções acima), `padding: 96px 0` desktop / `72px 0` mobile.
- Header da seção com padding lateral `0 64px` (desktop) / `0 22px` (mobile) — mesmo valor usado como `scroll-padding-left` do trilho, para o primeiro card alinhar com o título.
- Eyebrow "Os três pilares" + H2 "O que sustenta um **ecossistema previsível.**" (`clamp(30px,3.2vw,44px)` desktop / 26px mobile, peso 500, payoff peso 800).
- Trilho: `display:flex; gap:28px (18px mobile); overflow-x:auto; scroll-snap-type:x mandatory; scroll-behavior:smooth; scroll-padding-left: <mesmo valor do padding lateral>; scrollbar-width:none` + `::-webkit-scrollbar{display:none}`. Um spacer `flex:none;width:8px` no final para dar respiro depois do último card.
- Cards: `flex:none; width:520px` desktop / `296px` mobile, `scroll-snap-align:start`. Miolo branco `background:#FFFFFF; border:1px solid #E4E4E4; border-radius:32px` desktop / `24px` mobile, `box-shadow:0 2px 8px rgba(30,30,30,.06)`, `align-items:stretch` no trilho para equalizar altura entre cards.
- Conteúdo do card: grid 2 colunas desktop (`92px 1fr`) / 1 coluna mobile. Coluna esquerda: numeral mono laranja (`01`/`02`/`03`, `color:#CC4E14`) + ícone SVG (traço 1px, `#CC4E14`) — wireframe / camadas / rede neural, nessa ordem. Coluna direita: H3 (peso 600, `-0.028em`, `#2A2A2A`) + parágrafo (`color:#5A5A5A`, `line-height:1.62`). No cartão 3 (GEO), CTA pill laranja "Estruturar meu projeto" dentro do card.
- Abaixo de cada card, fora do miolo branco: link "Entender o método" com texto específico por card — "Ver como construímos sites" / "Entender o SEO técnico" / "Descobrir o GEO" — `color:#CC4E14`, hover expande o `gap` do `›` (de 7px para 12px) e escurece para `#B54212`.
- Copy dos 3 cards:
  1. "Sites de Alta Performance" — "Desenvolvimento focado em Core Web Vitals, usabilidade (UI/UX) e conversão. Plataformas estruturadas para reter a atenção e facilitar o rastreamento."
  2. "SEO Técnico e Estrutural" — "Otimização profunda do código e da arquitetura da informação. O alicerce necessário para dominar o topo dos buscadores com tráfego previsível."
  3. "Generative Engine Optimization (GEO)" — "Posicionamento para a nova era das Inteligências Artificiais. Transformamos a sua marca na resposta oficial e confiável."
- Navegação: fora do trilho, `display:flex; align-items:center; justify-content:space-between` contendo o CTA "Estruturar meu projeto" (pill laranja, tamanho médio — 13px/26px de padding, `border-radius:999px`) alinhado à esquerda, e duas setas circulares (`44px`, `border:1px solid rgba(42,42,42,.1)`, `background:#F0F0F0`) alinhadas à direita.

## Interactions & Behavior

**Vídeo (Hero):**
- `preload="metadata"`; play disparado via JS após `window.load`, com `requestAnimationFrame` antes de chamar `.load()` + `.play()`.
- Listener em `loadeddata` também chama `.play()` como fallback.
- Detecção de conexão lenta/`saveData`/`prefers-reduced-motion`: remove `autoplay` e usa `preload="none"` — fica só no poster.

**Parallax + Reveal (Performance Card):**
- Loop `requestAnimationFrame` único, throttlado com uma flag `ticking`, aplica `translate3d` a todo elemento com `data-parallax="<fator>"`.
- Reveal do card: no protótipo foi implementado como um segundo loop `rAF` que verifica `getBoundingClientRect()` até o elemento cruzar 90% da viewport, então aplica `transform:scale(1); opacity:1` (estado inicial: `scale(.86); opacity:0`). **Em produção, troque por `IntersectionObserver`** (threshold ~0.2, rootMargin `-6%` na base) — é semanticamente a ferramenta certa; o polling foi necessário só porque o host de preview não disparava `scroll`.
- Failsafe: um `setTimeout` de 4s força a revelação mesmo se a detecção de viewport falhar.
- Tudo desliga sob `prefers-reduced-motion: reduce`.

**Carrossel:**
- Setas usam `rail.scrollBy({ left: <largura do card + gap> * direção, behavior:'smooth' })`.
- Estado `disabled` nas setas calculado por `rail.scrollLeft` vs `0` / `scrollWidth - clientWidth`, atualizado no evento `scroll` do trilho (`passive:true`).

**Botões (comportamento geral):**
- Hover = `translateY(-3px)` (padrão do design system, mantido).
- O botão laranja da hero tem workaround de borda — ver nota na seção Hero. Reforce a correção na fonte do componente `Button`, não no CSS de consumo.

## State Management
Nenhum estado de aplicação — página estática. Único estado local relevante:
- Posição de scroll do carrossel (para habilitar/desabilitar setas).
- Flag "já revelado" por elemento com reveal-on-scroll (evita re-disparar a animação de zoom).
- Estado do player de vídeo (play automático condicionado à rede/movimento reduzido).

## Design Tokens
Usar os tokens do Nuvion Design System sempre que possível (`_ds/.../tokens/*.css`). Valores confirmados usados no protótipo:

- **Cores:** `#CC4E14` (laranja primário), `#2A2A2A` (grafite), `#F2F2F2` (off-white padrão DS), `#FDFDFD` (off-white mais claro, específico das seções 2 e 4 — não é o `#F2F2F2` padrão), `#FFFFFF`, `#22C55E` (verde de aprovação, **não está no DS** — validar se pode ser adotado como cor semântica de sucesso ou se deve vir de outro lugar), `#E8825A` (laranja suavizado dos bullets da hero), `#E4E4E4` (hairline dos cards do carrossel).
- **Tipografia:** Inter Tight. H1 hero 68px/500 (38px mobile); H2 statement 34px fixo/500 (400 mobile); H2 carrossel `clamp(30px,3.2vw,44px)`/500 (26px mobile); H3 cards 24px/600 (18.4px mobile aprox.). Eyebrows sempre uppercase, `letter-spacing:.32em` (mais largo que o `.14em` padrão do DS — usado propositalmente nas seções 2 e 4).
- **Radius:** 32px (mídia/cards grandes), 24px (cards mobile), 22px (performance card), 16px padrão DS onde aplicável, `999px` pills.
- **Sombras:** `0 2px 8px rgba(30,30,30,.06)` (cards padrão DS), `0 20px 56px rgba(20,20,20,.28)` (performance card), `0 10px 28px rgba(204,78,20,.28)` (`--shadow-accent` do DS, usado nos CTAs laranja).
- **Motion:** easing padrão do DS `cubic-bezier(.22,.61,.36,1)`; durações 160ms (cor/borda), 240–320ms (transform/shadow), 620ms (reveal de zoom).

## Assets
- `assets/hero-loop-nuvion-1080-24fps.mp4` — vídeo de fundo da hero, 1920×1080, 24fps, sem áudio. **Recomenda-se reexportar com `-movflags +faststart`** (ex.: via HandBrake, opção "Web Optimized") antes de subir para produção — reduz o atraso de início de reprodução.
- `assets/hero-poster.webp` — poster/primeiro frame do vídeo, extraído programaticamente, 1920×1080, ~34KB, usado como `poster` do `<video>` e fallback para conexões lentas.
- `assets/logo-horizontal-dark.png`, `assets/logo-horizontal-white.png` — lockups do logo Nuvion, usados no header (dark sobre fundo claro, white sobre fundo escuro/vídeo).
- `assets/mark-nuvion.png` — marca "n" isolada; **não está mais em uso nas seções deste pacote** (foi removida da hero e do card de performance a pedido do usuário) — mantida no bundle apenas para referência/uso futuro em outras seções (CTA bands, etc., conforme o guia do design system).
- Ícones: todos os SVGs inline no HTML, sem arquivos externos, traço 1px `currentColor`.

## Files
- `Hero Nuvion.dc.html` — arquivo único contendo as 4 seções descritas, em duas variantes de tamanho lado a lado (desktop ~1180px de largura de referência e mobile ~390px), dentro de um wrapper de apresentação (`.dv-card`, `.dv-opt`) que **não faz parte do design** — é só o modo de comparação do ambiente de prototipagem. O conteúdo real começa em `<div class="dv-opt" id="1d">`.
- `PROJECT_PREFERENCES.md` (era `CLAUDE.md` no projeto original) — preferências de estilo já aplicadas neste design: regra de uso de Glassmorphism (só em headers/menus sobrepostos, nunca em texto/botões/cards de conteúdo) e notas sobre o comportamento das partículas de versões anteriores da hero (não usadas na versão final em vídeo, mas documentadas caso o projeto volte a usá-las).

## Próximos passos sugeridos para quem for implementar em Astro
1. Estruturar como `src/components/home/Hero.astro`, `Statement.astro`, `PerformanceCard.astro`, `PillarsCarousel.astro`, montados em `src/pages/index.astro`.
2. Interatividade (vídeo, parallax/reveal, carrossel) como islands React com `client:visible` (o design system já é React) ou `client:load` apenas no Hero (o vídeo precisa iniciar o mais rápido possível).
3. Trocar o polling em `rAF` do reveal por `IntersectionObserver` nativo.
4. Substituir os números do Performance Card por dados reais antes de publicar.
5. Avaliar formalizar a variante "soft" do botão e corrigir o bug de borda do `Button` primário na fonte do design system.
