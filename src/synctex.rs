//! Leitura do arquivo SyncTeX (`.synctex.gz`) gerado na compilação.
//!
//! Permite:
//! - **Busca inversa**: duplo clique no PDF -> abre o arquivo e a linha do código.
//! - **Busca direta**: a partir da linha do cursor -> destaca o trecho no PDF.
//!
//! Formato (resumido) do arquivo, depois de descompactado:
//! ```text
//! Input:1:/caminho/main.tex        (tag 1 = arquivo main.tex)
//! Unit:1   X Offset:0   Y Offset:0 Magnification:1000
//! {1                               (início da página 1)
//! (1,12:4736286,46220574:26673152,41484288,0   caixa horizontal: tag,linha:x,y:L,A,P
//! x1,12:10474329,8865054           ponto: tag,linha:x,y
//! }1                               (fim da página 1)
//! ```
//! As coordenadas estão em "scaled points" (sp) a partir do canto superior
//! esquerdo da página, com o y crescendo para baixo. 1 pt PDF = 65781,76 sp.

use flate2::read::GzDecoder;
use serde::Serialize;
use std::collections::HashMap;
use std::io::Read;
use std::path::Path;

/// Fator de conversão de scaled points para pontos do PDF (big points).
const SP_POR_BP: f64 = 65781.76;

/// Um registro com posição no PDF (já convertido para pontos do PDF).
#[derive(Clone)]
struct Registro {
    tag: u32,
    linha: u32,
    pagina: u32,
    x: f64,
    /// Linha de base (y crescendo para baixo).
    y: f64,
    /// Largura, altura e profundidade (só caixas têm; pontos ficam com 0).
    larg: f64,
    alt: f64,
    prof: f64,
    /// true para caixas `(` e `[`.
    caixa: bool,
    /// true só para caixas horizontais `(` (linhas de texto).
    horizontal: bool,
}

/// Retângulo destacado no PDF (busca direta).
#[derive(Serialize)]
pub struct Retangulo {
    pub pagina: u32,
    pub x: f64,
    pub y: f64,
    pub larg: f64,
    pub alt: f64,
}

/// Resultado da busca inversa.
#[derive(Serialize)]
pub struct Posicao {
    pub arquivo: String,
    pub linha: u32,
}

/// Dados SyncTeX carregados.
pub struct Synctex {
    /// tag -> caminho do arquivo de entrada (como aparece no SyncTeX).
    entradas: HashMap<u32, String>,
    registros: Vec<Registro>,
}

impl Synctex {
    /// Carrega `.saida/<base>.synctex.gz` (ou a versão não compactada).
    pub fn carregar(pasta_saida: &Path, base: &str) -> Option<Self> {
        let gz = pasta_saida.join(format!("{base}.synctex.gz"));
        let texto = if gz.is_file() {
            let mut s = String::new();
            let bytes = std::fs::read(gz).ok()?;
            let mut dec = GzDecoder::new(&bytes[..]);
            let mut buf = Vec::new();
            dec.read_to_end(&mut buf).ok()?;
            s.push_str(&String::from_utf8_lossy(&buf));
            s
        } else {
            let p = pasta_saida.join(format!("{base}.synctex"));
            String::from_utf8_lossy(&std::fs::read(p).ok()?).to_string()
        };
        Some(Self::interpretar(&texto))
    }

    fn interpretar(texto: &str) -> Self {
        let mut entradas = HashMap::new();
        let mut registros = Vec::new();
        let mut unidade = 1.0_f64;
        let mut mag = 1.0_f64;
        let mut desl_x = 0.0_f64;
        let mut desl_y = 0.0_f64;
        let mut pagina = 0u32;

        for linha in texto.lines() {
            if let Some(resto) = linha.strip_prefix("Input:") {
                // Input:tag:caminho
                if let Some((tag, caminho)) = resto.split_once(':') {
                    if let Ok(t) = tag.parse() {
                        entradas.insert(t, caminho.to_string());
                    }
                }
                continue;
            }
            if let Some(v) = linha.strip_prefix("Unit:") {
                unidade = v.trim().parse().unwrap_or(1.0);
                continue;
            }
            if let Some(v) = linha.strip_prefix("Magnification:") {
                mag = v.trim().parse::<f64>().unwrap_or(1000.0) / 1000.0;
                continue;
            }
            if let Some(v) = linha.strip_prefix("X Offset:") {
                desl_x = v.trim().parse().unwrap_or(0.0);
                continue;
            }
            if let Some(v) = linha.strip_prefix("Y Offset:") {
                desl_y = v.trim().parse().unwrap_or(0.0);
                continue;
            }
            let mut chars = linha.chars();
            let Some(tipo) = chars.next() else { continue };
            let corpo = chars.as_str();
            match tipo {
                '{' => {
                    pagina = corpo.trim().parse().unwrap_or(pagina + 1);
                }
                '(' | '[' | 'x' | 'k' | 'g' | '$' | 'h' | 'v' => {
                    // Formato: tag,linha:x,y[:L,A,P]
                    let partes: Vec<&str> = corpo.split(':').collect();
                    if partes.len() < 2 {
                        continue;
                    }
                    let Some((tag, lin)) = partes[0].split_once(',') else { continue };
                    let Some((xs, ys)) = partes[1].split_once(',') else { continue };
                    let (Ok(tag), Ok(lin), Ok(x), Ok(y)) =
                        (tag.parse::<u32>(), lin.parse::<u32>(), xs.parse::<f64>(), ys.parse::<f64>())
                    else {
                        continue;
                    };
                    let conv = |v: f64| v * unidade * mag / SP_POR_BP;
                    let (mut larg, mut alt, mut prof) = (0.0, 0.0, 0.0);
                    if partes.len() >= 3 && (tipo == '(' || tipo == '[' || tipo == 'h' || tipo == 'v') {
                        let d: Vec<f64> = partes[2].split(',').filter_map(|s| s.parse().ok()).collect();
                        if d.len() >= 3 {
                            larg = conv(d[0]);
                            alt = conv(d[1]);
                            prof = conv(d[2]);
                        }
                    }
                    registros.push(Registro {
                        tag,
                        linha: lin,
                        pagina,
                        x: conv(x) + desl_x / SP_POR_BP,
                        y: conv(y) + desl_y / SP_POR_BP,
                        larg,
                        alt,
                        prof,
                        caixa: tipo == '(' || tipo == '[',
                        horizontal: tipo == '(',
                    });
                }
                _ => {}
            }
        }
        Self { entradas, registros }
    }

    /// Busca inversa: ponto (pagina, x, y em pontos do PDF, origem no topo) -> arquivo e linha.
    ///
    /// Estratégia (parecida com a da biblioteca oficial do SyncTeX):
    /// 1. considera só registros de arquivos do projeto (ignora pacotes, .aux etc.);
    /// 2. procura a caixa horizontal (linha de texto) mais interna que contém o ponto;
    /// 3. dentro dessa linha, pega o registro mais próximo na horizontal;
    /// 4. se o ponto não estiver dentro de nenhuma linha, pega o registro mais próximo.
    pub fn inversa(&self, pasta_projeto: &Path, pagina: u32, x: f64, y: f64) -> Option<Posicao> {
        // Tags (arquivos) que pertencem ao projeto.
        let validas: HashMap<u32, String> = self
            .entradas
            .keys()
            .filter_map(|t| self.relativo(pasta_projeto, *t).map(|r| (*t, r)))
            .collect();
        let na_pagina: Vec<&Registro> = self
            .registros
            .iter()
            .filter(|r| r.pagina == pagina && r.linha > 0 && validas.contains_key(&r.tag))
            .collect();
        if na_pagina.is_empty() {
            return None;
        }

        // Retângulo ocupado por um registro (pontos ganham uma altura típica de texto).
        let limites = |r: &Registro| -> (f64, f64, f64, f64) {
            if r.caixa {
                (r.x, r.x + r.larg, r.y - r.alt, r.y + r.prof)
            } else {
                (r.x, r.x, r.y - 8.0, r.y + 2.0)
            }
        };
        // Distância do ponto ao retângulo (0 se estiver dentro). Peso maior na vertical,
        // para o clique escolher a linha de texto certa antes da posição na linha.
        let distancia = |r: &Registro| -> f64 {
            let (x0, x1, y0, y1) = limites(r);
            let dx = if x < x0 { x0 - x } else if x > x1 { x - x1 } else { 0.0 };
            let dy = if y < y0 { y0 - y } else if y > y1 { y - y1 } else { 0.0 };
            dx + dy * 4.0
        };
        // Registro mais próximo do ponto numa lista.
        fn menor<'a>(v: Vec<&&'a Registro>, d: &dyn Fn(&Registro) -> f64) -> Option<&'a Registro> {
            v.into_iter().map(|r| *r).min_by(|a, b| d(a).partial_cmp(&d(b)).unwrap())
        }

        // Passo 2: linha de texto mais interna (menor área) que contém o ponto.
        let linha_texto = na_pagina
            .iter()
            .filter(|r| r.horizontal && distancia(r) == 0.0)
            .min_by(|a, b| (a.larg * (a.alt + a.prof)).partial_cmp(&(b.larg * (b.alt + b.prof))).unwrap());

        let escolhido: &Registro = if let Some(caixa) = linha_texto {
            // Passo 3: registros na mesma linha de base da caixa (mesma linha impressa).
            let mesma_linha: Vec<&&Registro> = na_pagina
                .iter()
                .filter(|r| !r.caixa && (r.y - caixa.y).abs() < 1.0 && r.x >= caixa.x - 1.0 && r.x <= caixa.x + caixa.larg + 1.0)
                .collect();
            if mesma_linha.is_empty() {
                caixa
            } else {
                // O registro imediatamente à esquerda do clique é o que "contém" o caractere clicado.
                let a_esquerda: Vec<&&Registro> = mesma_linha.iter().filter(|r| r.x <= x).copied().collect();
                if a_esquerda.is_empty() {
                    menor(mesma_linha, &distancia)?
                } else {
                    a_esquerda.into_iter().map(|r| *r).max_by(|a, b| a.x.partial_cmp(&b.x).unwrap())?
                }
            }
        } else {
            // Passo 4: nada contém o ponto; usa o registro mais próximo (pontos antes de caixas).
            let pontos: Vec<&&Registro> = na_pagina.iter().filter(|r| !r.caixa).collect();
            if pontos.is_empty() {
                menor(na_pagina.iter().collect(), &distancia)?
            } else {
                menor(pontos, &distancia)?
            }
        };

        Some(Posicao {
            arquivo: validas.get(&escolhido.tag)?.clone(),
            linha: escolhido.linha,
        })
    }

    /// Busca direta: arquivo e linha -> retângulos a destacar no PDF.
    /// Se a linha exata não tiver registro, usa a linha mais próxima que tiver.
    pub fn direta(&self, pasta_projeto: &Path, arquivo: &str, linha: u32) -> Vec<Retangulo> {
        let tags: Vec<u32> = self
            .entradas
            .keys()
            .copied()
            .filter(|t| self.relativo(pasta_projeto, *t).as_deref() == Some(arquivo))
            .collect();
        if tags.is_empty() {
            return Vec::new();
        }
        let do_arquivo: Vec<&Registro> = self.registros.iter().filter(|r| tags.contains(&r.tag) && r.linha > 0).collect();
        // Linha mais próxima com registros (preferindo a própria linha ou a seguinte).
        let Some(alvo) = do_arquivo
            .iter()
            .map(|r| r.linha)
            .min_by_key(|l| if *l >= linha { (l - linha) * 2 } else { (linha - l) * 2 + 1 })
        else {
            return Vec::new();
        };

        // Preferência: linhas de texto (caixas horizontais) -> pontos -> caixas verticais.
        let mut rets: Vec<Retangulo> = do_arquivo
            .iter()
            .filter(|r| r.linha == alvo && r.horizontal && r.larg > 0.0)
            .map(|r| Retangulo { pagina: r.pagina, x: r.x, y: r.y - r.alt.max(6.0), larg: r.larg, alt: r.alt.max(6.0) + r.prof.max(2.0) })
            .collect();
        if rets.is_empty() {
            // Pontos da mesma linha impressa viram um único retângulo.
            let pontos: Vec<&&Registro> = do_arquivo.iter().filter(|r| r.linha == alvo && !r.caixa).collect();
            if let Some(p0) = pontos.first() {
                let mesmos: Vec<&&&Registro> = pontos.iter().filter(|r| r.pagina == p0.pagina && (r.y - p0.y).abs() < 1.0).collect();
                let x0 = mesmos.iter().map(|r| r.x).fold(f64::MAX, f64::min);
                let x1 = mesmos.iter().map(|r| r.x).fold(f64::MIN, f64::max);
                rets.push(Retangulo { pagina: p0.pagina, x: x0 - 2.0, y: p0.y - 9.0, larg: (x1 - x0).max(40.0) + 4.0, alt: 12.0 });
            }
        }
        if rets.is_empty() {
            rets = do_arquivo
                .iter()
                .filter(|r| r.linha == alvo && r.caixa && r.larg > 0.0)
                .map(|r| Retangulo { pagina: r.pagina, x: r.x, y: r.y - r.alt, larg: r.larg, alt: r.alt + r.prof })
                .collect();
        }
        // Remove caixas muito grandes (ex.: a página inteira) quando houver menores.
        if rets.len() > 1 {
            let menor = rets.iter().map(|r| r.alt).fold(f64::MAX, f64::min);
            rets.retain(|r| r.alt < menor * 6.0 + 30.0);
        }
        rets.truncate(30);
        rets
    }

    /// Converte o caminho de uma entrada para caminho relativo do projeto.
    fn relativo(&self, pasta_projeto: &Path, tag: u32) -> Option<String> {
        let bruto = self.entradas.get(&tag)?;
        let normal = bruto.replace('\\', "/");
        let raiz = pasta_projeto.display().to_string().replace('\\', "/");
        // Caminho absoluto dentro do projeto.
        let rel = if let Some(r) = normal.strip_prefix(&raiz) {
            r.trim_start_matches('/').to_string()
        } else if normal.to_lowercase().starts_with(&raiz.to_lowercase()) {
            // Windows: diferença só de maiúsculas/minúsculas na letra do drive.
            normal[raiz.len()..].trim_start_matches('/').to_string()
        } else {
            normal.clone()
        };
        // Remove "./" e "dir/./" que o pdflatex insere.
        let rel = rel.replace("/./", "/");
        let rel = rel.trim_start_matches("./").to_string();
        // Só aceita arquivos que realmente existem no projeto.
        if pasta_projeto.join(&rel).is_file() {
            Some(rel)
        } else {
            None
        }
    }
}
