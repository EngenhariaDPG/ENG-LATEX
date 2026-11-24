//! Modelos de projeto oferecidos no botão "Novo projeto".
//!
//! Todos os modelos compilam tanto com pdfLaTeX (MiKTeX/TeX Live) quanto com
//! XeLaTeX (Tectonic): o pacote `iftex` escolhe a configuração de fontes certa.
//!
//! Para criar um modelo novo: acrescente uma entrada em [`LISTA`] e um ramo
//! em [`arquivos`] devolvendo os arquivos (caminho relativo, conteúdo).

use crate::projetos::Variavel;
use serde::Serialize;

/// Descrição de um modelo para a interface.
#[derive(Serialize)]
pub struct InfoModelo {
    pub id: &'static str,
    pub nome: &'static str,
    pub descricao: &'static str,
}

/// Modelos disponíveis, na ordem em que aparecem no menu.
pub const LISTA: &[InfoModelo] = &[
    InfoModelo { id: "vazio", nome: "Projeto em branco", descricao: "Documento mínimo, só com o essencial." },
    InfoModelo { id: "artigo", nome: "Artigo", descricao: "Artigo com resumo, seções, equações e bibliografia." },
    InfoModelo { id: "memorial", nome: "Memorial de cálculo", descricao: "Memorial de engenharia com capa, premissas, cálculos e tabelas." },
    InfoModelo { id: "laudo", nome: "Laudo técnico", descricao: "Laudo de inspeção com checklist, conclusão e campo de assinatura." },
    InfoModelo { id: "livro_balancim", nome: "Livro de inspeção — Balancim", descricao: "Livro técnico com abertura, identificação, checklist, manutenção e liberação." },
    InfoModelo { id: "apresentacao", nome: "Apresentação (Beamer)", descricao: "Slides em LaTeX com o pacote Beamer." },
];

/// Cabeçalho comum: fontes e idioma, compatível com pdfLaTeX e XeLaTeX.
const PREAMBULO_FONTES: &str = r##"\usepackage{iftex}
\ifPDFTeX
  \usepackage[T1]{fontenc}
  \usepackage[utf8]{inputenc}
  \usepackage{lmodern}
\else
  \usepackage{fontspec}
\fi
\usepackage[brazil]{babel}
"##;

/// Cria uma variável (atalho para deixar os modelos mais legíveis).
fn var(nome: &str, valor: &str, descricao: &str) -> Variavel {
    Variavel { nome: nome.into(), valor: valor.into(), descricao: descricao.into(), tipo: "texto".into() }
}

/// Devolve os arquivos do modelo escolhido e a tabela de variáveis inicial.
/// `titulo` é o nome do projeto.
pub fn arquivos(modelo: &str, titulo: &str) -> (Vec<(String, String)>, Vec<Variavel>) {
    let variaveis = match modelo {
        "memorial" => vec![
            var("titulo", titulo, "Título do memorial"),
            var("cliente", "Nome do Cliente Ltda.", "Razão social do cliente"),
            var("obra", "Endereço / local da obra", "Local do serviço"),
            var("responsavel", "Eng. Nome do Responsável", "Responsável técnico"),
            var("registro", "CREA-XX nº 000000000", "Registro profissional"),
            var("art", "ART nº 0000000000000", "Número da ART"),
            var("revisao", "00", "Revisão do documento"),
            var("carga", "25", "Carga a içar (kN)"),
        ],
        "laudo" => vec![
            var("titulo", titulo, "Título do laudo"),
            var("equipamento", "Descrição do equipamento (marca, modelo, nº de série)", "Equipamento inspecionado"),
            var("cliente", "Nome do Cliente Ltda.", "Razão social do cliente"),
            var("local", "Cidade -- UF", "Local da inspeção"),
            var("responsavel", "Eng. Nome do Responsável", "Responsável técnico"),
            var("registro", "CREA-XX nº 000000000", "Registro profissional"),
            var("data", "", "Data da inspeção (vazio = hoje)"),
        ],
        "livro_balancim" => vec![
            var("titulo", titulo, "Título do livro"),
            var("equipamento", "Balancim / Andaime suspenso", "Tipo de equipamento"),
            var("fabricante", "Fabricante não informado", "Fabricante"),
            var("modelo", "Modelo não informado", "Modelo"),
            var("empresa", "Empresa emitente", "Empresa emitente"),
            var("cliente", "Nome do cliente", "Contratante"),
            var("obra", "Nome e endereço da obra", "Obra"),
            var("art", "ART não informada", "Número da ART"),
            var("responsavel", "Eng. Nome do Responsável", "Responsável técnico"),
            var("registro", "CREA/registro profissional", "Registro profissional"),
            var("data", "", "Data do documento (vazio = hoje)"),
        ],
        _ => Vec::new(),
    };
    (arquivos_texto(modelo, titulo), variaveis)
}

/// Conteúdo dos arquivos de cada modelo.
fn arquivos_texto(modelo: &str, titulo: &str) -> Vec<(String, String)> {
    // Escapa caracteres especiais do LaTeX no título.
    let t = titulo
        .replace('\\', "")
        .replace('&', "\\&")
        .replace('%', "\\%")
        .replace('$', "\\$")
        .replace('#', "\\#")
        .replace('_', "\\_");

    match modelo {
        // ------------------------------------------------------------------
        "artigo" => vec![
            ("main.tex".into(), format!(r##"\documentclass[12pt,a4paper]{{article}}
{PREAMBULO_FONTES}\usepackage[margin=2.5cm]{{geometry}}
\usepackage{{amsmath, amssymb}}
\usepackage{{graphicx}}
\usepackage{{booktabs}}
\usepackage[hidelinks]{{hyperref}}

\title{{{t}}}
\author{{Seu Nome}}
\date{{\today}}

\begin{{document}}
\maketitle

\begin{{abstract}}
Escreva aqui o resumo do artigo em um parágrafo.
\end{{abstract}}

\section{{Introdução}}
\label{{sec:intro}}
Texto da introdução. Citação de exemplo \cite{{knuth1984}}.

\section{{Desenvolvimento}}
A equação~\eqref{{eq:energia}} é numerada automaticamente:
\begin{{equation}}
  E = m c^2
  \label{{eq:energia}}
\end{{equation}}

\begin{{table}}[h]
  \centering
  \caption{{Exemplo de tabela.}}
  \label{{tab:exemplo}}
  \begin{{tabular}}{{lcc}}
    \toprule
    Item & Valor & Unidade \\
    \midrule
    Comprimento & 12,5 & m \\
    Massa       & 300  & kg \\
    \bottomrule
  \end{{tabular}}
\end{{table}}

\section{{Conclusão}}
Conforme a Seção~\ref{{sec:intro}} e a Tabela~\ref{{tab:exemplo}}, \dots

\bibliographystyle{{plain}}
\bibliography{{referencias}}

\end{{document}}
"##)),
            ("referencias.bib".into(), r##"@book{knuth1984,
  author    = {Donald E. Knuth},
  title     = {The {\TeX}book},
  publisher = {Addison-Wesley},
  year      = {1984}
}
"##.into()),
        ],

        // ------------------------------------------------------------------
        "memorial" => vec![
            ("main.tex".into(), format!(r##"\documentclass[11pt,a4paper]{{article}}
{PREAMBULO_FONTES}\usepackage[top=2.5cm,bottom=2.5cm,left=3cm,right=2cm]{{geometry}}
\usepackage{{amsmath, amssymb}}
\usepackage{{siunitx}}          % unidades: \SI{{10}}{{\kilo\newton}}
\sisetup{{output-decimal-marker={{,}}, group-separator={{.}}, per-mode=symbol}}
\usepackage{{booktabs, tabularx, multirow}}
\usepackage{{graphicx}}
\usepackage{{xcolor}}
\usepackage{{tikz}}
\usepackage{{fancyhdr}}
\usepackage{{lastpage}}
\usepackage[hidelinks]{{hyperref}}

% ---------------------------------------------------------------
% Dados do documento: ficam na tabela "Variáveis" (botão no topo do editor)
% e são usados no texto com \var{{nome}}.
% ---------------------------------------------------------------
\input{{variaveis}}

% Cabeçalho e rodapé
\setlength{{\headheight}}{{14pt}}
\pagestyle{{fancy}}
\fancyhf{{}}
\lhead{{\small\var{{titulo}}}}
\rhead{{\small Rev. \var{{revisao}}}}
\lfoot{{\small\var{{responsavel}} -- \var{{registro}}}}
\rfoot{{\small Página \thepage{{}} de \pageref{{LastPage}}}}
\renewcommand{{\headrulewidth}}{{0.4pt}}
\renewcommand{{\footrulewidth}}{{0.4pt}}

\begin{{document}}

% ===================== CAPA =====================
\begin{{titlepage}}
  \centering
  \vspace*{{3cm}}
  {{\LARGE\bfseries MEMORIAL DE CÁLCULO\par}}
  \vspace{{1cm}}
  {{\Large \var{{titulo}}\par}}
  \vfill
  \begin{{tabular}}{{ll}}
    \textbf{{Cliente:}}     & \var{{cliente}} \\
    \textbf{{Local:}}       & \var{{obra}} \\
    \textbf{{Responsável:}} & \var{{responsavel}} -- \var{{registro}} \\
    \textbf{{ART:}}         & \var{{art}} \\
    \textbf{{Revisão:}}     & \var{{revisao}} -- \today
  \end{{tabular}}
  \vspace{{2cm}}
\end{{titlepage}}

\tableofcontents
\newpage

% ===================== CONTEÚDO =====================
\section{{Objetivo}}
Este memorial apresenta o dimensionamento e as verificações de \dots

\section{{Normas e referências}}
\begin{{itemize}}
  \item ABNT NBR 8800 -- Projeto de estruturas de aço e de estruturas mistas;
  \item ABNT NBR 6123 -- Forças devidas ao vento em edificações;
  \item NR-12 / NR-18 / NR-35, conforme aplicável.
\end{{itemize}}

\section{{Premissas e dados de entrada}}
\begin{{table}}[h]
  \centering
  \caption{{Dados de entrada.}}
  \label{{tab:dados}}
  \begin{{tabularx}}{{0.8\textwidth}}{{Xcc}}
    \toprule
    Parâmetro & Símbolo & Valor \\
    \midrule
    Carga a içar           & $P$      & \SI{{\var{{carga}}}}{{\kilo\newton}} \\
    Coeficiente dinâmico   & $\psi$   & \num{{1,15}} \\
    Número de pernas       & $n$      & 2 \\
    Ângulo com a vertical  & $\alpha$ & \SI{{30}}{{\degree}} \\
    \bottomrule
  \end{{tabularx}}
\end{{table}}

\section{{Cálculos}}
\subsection{{Força em cada perna da linga}}
A força em cada perna é dada por:
\begin{{equation}}
  F = \frac{{\psi \, P}}{{n \cos\alpha}}
    = \frac{{1{{,}}15 \times 25}}{{2 \times \cos 30^\circ}}
    \approx \SI{{16,6}}{{\kilo\newton}}
  \label{{eq:forca}}
\end{{equation}}

\subsection{{Esquema}}
\begin{{figure}}[h]
  \centering
  \begin{{tikzpicture}}[scale=1.2]
    \draw[thick] (0,3) -- (-1.2,0) node[midway,left] {{$F$}};
    \draw[thick] (0,3) -- ( 1.2,0) node[midway,right] {{$F$}};
    \fill (0,3) circle (2pt) node[above] {{gancho}};
    \draw[fill=gray!30] (-1.6,-0.8) rectangle (1.6,0);
    \node at (0,-0.4) {{$P$}};
    \draw[dashed] (0,3) -- (0,0);
    \draw (0,2.2) arc (270:292:0.8) node[midway,below right] {{$\alpha$}};
  \end{{tikzpicture}}
  \caption{{Esquema da amarração.}}
  \label{{fig:esquema}}
\end{{figure}}

\section{{Verificação}}
Com a força da Equação~\eqref{{eq:forca}}, adota-se acessório com carga de
trabalho (CMT) maior ou igual a \SI{{2}}{{\tonne}} por perna.

\begin{{center}}
  \fcolorbox{{green!50!black}}{{green!8}}{{\parbox{{0.85\textwidth}}{{\centering
    \textbf{{Resultado:}} $F = \SI{{16,6}}{{\kilo\newton}} \le \text{{CMT}} = \SI{{19,6}}{{\kilo\newton}}$ \quad \textbf{{OK}}}}}}
\end{{center}}

\section{{Conclusão}}
As verificações atendem às normas citadas, desde que respeitadas as premissas
da Seção~3.

\vspace{{2.5cm}}
\begin{{center}}
  \rule{{8cm}}{{0.4pt}}\\
  \var{{responsavel}}\\
  \var{{registro}}
\end{{center}}

\end{{document}}
"##)),
        ],

        // ------------------------------------------------------------------
        "laudo" => vec![
            ("main.tex".into(), format!(r##"\documentclass[11pt,a4paper]{{article}}
{PREAMBULO_FONTES}\usepackage[top=2.5cm,bottom=2.5cm,left=2.5cm,right=2cm]{{geometry}}
\usepackage{{booktabs, tabularx, longtable}}
\usepackage{{graphicx}}
\usepackage{{xcolor}}
\usepackage{{amssymb}}
\usepackage{{fancyhdr}}
\usepackage{{lastpage}}
\usepackage{{enumitem}}
\usepackage[hidelinks]{{hyperref}}

% ---------------- Dados do laudo ----------------
% Ficam na tabela "Variáveis" (botão no topo do editor); use \var{{nome}} no texto.
\input{{variaveis}}
% Data: se a variável "data" estiver vazia, usa a data de hoje.
\newcommand{{\dataInspecao}}{{\setbox0\hbox{{\var{{data}}}}\ifdim\wd0=0pt \today\else\var{{data}}\fi}}

% Símbolos do checklist
\newcommand{{\conforme}}{{\textcolor{{green!50!black}}{{Conforme}}}}
\newcommand{{\naoconforme}}{{\textcolor{{red!70!black}}{{\textbf{{Não conforme}}}}}}
\newcommand{{\na}}{{\textcolor{{gray}}{{N/A}}}}

\setlength{{\headheight}}{{14pt}}
\pagestyle{{fancy}}
\fancyhf{{}}
\lhead{{\small LAUDO TÉCNICO}}
\rhead{{\small\var{{titulo}}}}
\cfoot{{\small Página \thepage{{}} de \pageref{{LastPage}}}}

\begin{{document}}

\begin{{center}}
  {{\Large\bfseries LAUDO TÉCNICO DE INSPEÇÃO\par}}
  \vspace{{2mm}}
  {{\large \var{{titulo}}\par}}
\end{{center}}

\vspace{{4mm}}
\noindent
\begin{{tabularx}}{{\textwidth}}{{@{{}}lX@{{}}}}
  \toprule
  \textbf{{Cliente:}}     & \var{{cliente}} \\
  \textbf{{Equipamento:}} & \var{{equipamento}} \\
  \textbf{{Local:}}       & \var{{local}} \\
  \textbf{{Data:}}        & \dataInspecao \\
  \textbf{{Responsável:}} & \var{{responsavel}} -- \var{{registro}} \\
  \bottomrule
\end{{tabularx}}

\section{{Objetivo}}
Avaliar as condições de segurança e funcionamento do equipamento acima, conforme
as normas regulamentadoras aplicáveis.

\section{{Normas aplicáveis}}
\begin{{itemize}}[noitemsep]
  \item NR-12 -- Segurança no trabalho em máquinas e equipamentos;
  \item NR-11 -- Transporte, movimentação, armazenagem e manuseio de materiais;
  \item Normas ABNT específicas do equipamento.
\end{{itemize}}

\section{{Metodologia}}
Inspeção visual, ensaios funcionais e análise documental (manual, registros de manutenção).

\section{{Resultados da inspeção}}
\begin{{longtable}}{{@{{}}p{{0.06\textwidth}}p{{0.56\textwidth}}p{{0.3\textwidth}}@{{}}}}
  \toprule
  \textbf{{Item}} & \textbf{{Verificação}} & \textbf{{Situação}} \\
  \midrule
  \endhead
  1 & Estrutura sem trincas, deformações ou corrosão acentuada & \conforme \\
  2 & Dispositivos de parada de emergência funcionando       & \conforme \\
  3 & Proteções fixas e móveis instaladas                     & \naoconforme \\
  4 & Placa de identificação e capacidade visível             & \conforme \\
  5 & Manual de operação em português disponível              & \na \\
  \bottomrule
\end{{longtable}}

\section{{Não conformidades e recomendações}}
\begin{{enumerate}}
  \item \textbf{{Item 3:}} instalar proteção fixa na transmissão. Prazo: 30 dias.
\end{{enumerate}}

\section{{Conclusão}}
O equipamento encontra-se \textbf{{apto a operar}} após a correção das não
conformidades listadas acima.

\section{{Registro fotográfico}}
% Envie as fotos pelo botão "Enviar arquivo" e use:
% \includegraphics[width=0.45\textwidth]{{foto1.jpg}}
\fbox{{\parbox[c][4cm][c]{{0.45\textwidth}}{{\centering Foto 1}}}}\hfill
\fbox{{\parbox[c][4cm][c]{{0.45\textwidth}}{{\centering Foto 2}}}}

\vspace{{2.5cm}}
\begin{{center}}
  \rule{{8cm}}{{0.4pt}}\\
  \var{{responsavel}}\\
  \var{{registro}}
\end{{center}}

\end{{document}}
"##)),
        ],

        // ------------------------------------------------------------------
        "livro_balancim" => vec![
            ("main.tex".into(), format!(r##"\documentclass[11pt,a4paper]{{article}}
{PREAMBULO_FONTES}\usepackage[top=2.4cm,bottom=2.2cm,left=2.6cm,right=2.1cm]{{geometry}}
\usepackage{{booktabs,longtable,array,graphicx,fancyhdr,lastpage}}
\usepackage[hidelinks]{{hyperref}}
\input{{variaveis}}
\pagestyle{{fancy}}\fancyhf{{}}\lhead{{\small\var{{titulo}}}}\rhead{{\small\var{{data}}}}\lfoot{{\small\var{{responsavel}}}}\rfoot{{\small Página \thepage{{}} de \pageref{{LastPage}}}}
\begin{{document}}
\begin{{titlepage}}\centering\vspace*{{3cm}}{{\LARGE\bfseries LIVRO DE INSPEÇÃO\par}}\vspace{{1cm}}{{\Large\var{{equipamento}}\par}}\vfill
\begin{{tabular}}{{ll}}Empresa: & \var{{empresa}} \
Cliente: & \var{{cliente}} \
Obra: & \var{{obra}} \
Fabricante/modelo: & \var{{fabricante}} / \var{{modelo}} \
ART: & \var{{art}} \end{{tabular}}\end{{titlepage}}
\tableofcontents
\newpage
\input{{capitulos/abertura.tex}}
\input{{capitulos/identificacao.tex}}
\input{{capitulos/entrega-tecnica.tex}}
\input{{capitulos/checklist.tex}}
\input{{capitulos/manutencao.tex}}
\input{{capitulos/liberacao.tex}}
\end{{document}}
"##)),
            ("dados/equipamento.tex".into(), r##"% Dados técnicos do equipamento — editável pelo autor
Tipo: \var{equipamento}\par
Fabricante: \var{fabricante}\par
Modelo: \var{modelo}\par
Empresa emitente: \var{empresa}\par
Cliente: \var{cliente}\par
Obra: \var{obra}\par
ART: \var{art}
"##.into()),
            ("capitulos/abertura.tex".into(), r##"\section{Termo de abertura}
Este livro registra inspeções, manutenções e ocorrências do equipamento identificado neste documento. A emissão, análise e assinatura devem ser realizadas pelos responsáveis habilitados.
"##.into()),
            ("capitulos/identificacao.tex".into(), r##"\section{Identificação do equipamento}
\input{dados/equipamento.tex}
"##.into()),
            ("capitulos/entrega-tecnica.tex".into(), r##"\section{Entrega técnica}
Registrar a apresentação do equipamento, riscos, procedimentos de montagem e desmontagem, EPIs/EPCs, documentos entregues e treinamento realizado.
"##.into()),
            ("capitulos/checklist.tex".into(), r##"\section{Checklist inicial}
\begin{longtable}{p{0.58\textwidth}p{0.16\textwidth}p{0.18\textwidth}}\toprule
Item & Status & Observação \\
\midrule
Estrutura e plataforma & A verificar & \\

Cabos, guincho e trava-quedas & A verificar & \\

Guarda-corpo, piso e rodapés & A verificar & \\

Dispositivos de segurança & A verificar & \\
\bottomrule\end{longtable}
"##.into()),
            ("capitulos/manutencao.tex".into(), r##"\section{Manutenção e ocorrências}
Data, tipo de manutenção, descrição, responsável, peças utilizadas e próxima ação.\par\vspace{4cm}
"##.into()),
            ("capitulos/liberacao.tex".into(), r##"\section{Liberação e responsabilidade técnica}
Responsável técnico: \var{responsavel}\par
Registro: \var{registro}\par
Data: \var{data}\par
\vspace{2cm}\begin{center}\rule{8cm}{0.4pt}\\
\var{responsavel}
\end{center}
"##.into()),
        ],
       ],
        // ------------------------------------------------------------------
        "apresentacao" => vec![
            ("main.tex".into(), format!(r##"\documentclass{{beamer}}
{PREAMBULO_FONTES}\usetheme{{Madrid}}
\usecolortheme{{default}}

\title{{{t}}}
\author{{Seu Nome}}
\institute{{Sua Empresa}}
\date{{\today}}

\begin{{document}}

\frame{{\titlepage}}

\begin{{frame}}{{Sumário}}
  \tableofcontents
\end{{frame}}

\section{{Introdução}}
\begin{{frame}}{{Introdução}}
  \begin{{itemize}}
    \item<1-> Primeiro ponto
    \item<2-> Segundo ponto (aparece no clique seguinte)
    \item<3-> Terceiro ponto
  \end{{itemize}}
\end{{frame}}

\section{{Resultados}}
\begin{{frame}}{{Resultados}}
  \begin{{columns}}
    \column{{0.5\textwidth}}
      Texto da coluna da esquerda.
    \column{{0.5\textwidth}}
      \begin{{block}}{{Equação}}
        $$ \sigma = \frac{{F}}{{A}} $$
      \end{{block}}
  \end{{columns}}
\end{{frame}}

\end{{document}}
"##)),
        ],

        // ------------------------------------------------------------------
        // Projeto em branco (também é o padrão para ids desconhecidos).
        _ => vec![
            ("main.tex".into(), format!(r##"\documentclass[12pt,a4paper]{{article}}
{PREAMBULO_FONTES}\usepackage[margin=2.5cm]{{geometry}}
\usepackage{{amsmath}}
\usepackage{{graphicx}}

\title{{{t}}}
\author{{}}
\date{{\today}}

\begin{{document}}
\maketitle

Comece a escrever aqui.

\end{{document}}
"##)),
        ],
    }
}
