// Tela inicial: lista de projetos e de modelos (como o painel do Overleaf).

import { api } from "./api.js";
import { icone, esc, el, dataRelativa, aviso, perguntar, confirmar, menuAbaixo, menuContexto, escolherArquivos, dialogo } from "./ui.js";
import { abrirConfiguracoes } from "./configuracoes.js";

/** Aba atual da tela inicial: "projetos" ou "modelos". */
let aba = "projetos";

/** Monta a tela inicial dentro de `raiz`. */
export async function telaProjetos(raiz) {
  document.title = "Eng LaTeX";
  raiz.innerHTML = `
    <div class="tela-inicial">
      <header class="barra-topo">
        <div class="marca"><img src="/icone.svg" alt=""> Eng LaTeX</div>
        <div class="espaco"></div>
        <button class="botao-topo" id="bt-config">${icone("config")} Configurações</button>
      </header>
      <div class="inicial-corpo">
        <nav class="inicial-lateral">
          <button class="botao primario grande" id="bt-novo">${icone("mais")} Novo projeto</button>
          <button class="botao grande" id="bt-livro">${icone("copiar")} Livro técnico</button>
          <button class="item-lateral" data-aba="projetos">${icone("pasta")} Todos os projetos</button>
          <button class="item-lateral" data-aba="modelos">${icone("copiar")} Meus modelos</button>
          <div class="lateral-rodape">
            <button class="item-lateral" id="bt-importar">${icone("enviar")} Importar .zip</button>
          </div>
        </nav>
        <main class="inicial-conteudo">
          <div class="inicial-cabecalho">
            <h1 id="titulo-aba"></h1>
            <input type="search" id="busca" placeholder="Buscar…" spellcheck="false">
          </div>
          <div id="lista"></div>
        </main>
      </div>
    </div>`;

  raiz.querySelector("#bt-config").onclick = () => abrirConfiguracoes();
  raiz.querySelector("#bt-novo").onclick = (e) => menuNovoProjeto(e.currentTarget);
  raiz.querySelector("#bt-livro").onclick = criarLivroTecnico;
  raiz.querySelector("#bt-importar").onclick = importar;
  raiz.querySelectorAll("[data-aba]").forEach((b) => {
    b.onclick = () => {
      aba = b.dataset.aba;
      atualizar();
    };
  });
  const busca = raiz.querySelector("#busca");
  busca.oninput = () => filtrar(busca.value);

  /** Recarrega a lista da aba atual. */
  async function atualizar() {
    raiz.querySelectorAll("[data-aba]").forEach((b) => b.classList.toggle("ativo", b.dataset.aba === aba));
    raiz.querySelector("#titulo-aba").textContent = aba === "projetos" ? "Todos os projetos" : "Meus modelos";
    const lista = raiz.querySelector("#lista");
    try {
      if (aba === "projetos") desenharProjetos(lista, await api.projetos(), atualizar);
      else desenharModelos(lista, (await api.modelos()).usuario, atualizar);
      filtrar(busca.value);
    } catch (e) {
      lista.innerHTML = `<p class="vazio">${esc(e.message)}</p>`;
    }
  }

  /** Esconde as linhas que não contêm o texto buscado. */
  function filtrar(texto) {
    const t = texto.trim().toLowerCase();
    raiz.querySelectorAll("#lista tbody tr").forEach((tr) => {
      tr.style.display = !t || tr.dataset.nome.toLowerCase().includes(t) ? "" : "none";
    });
  }

  await atualizar();
}

/** Tabela de projetos. */
function desenharProjetos(lista, projetos, atualizar) {
  if (!projetos.length) {
    lista.innerHTML = `<p class="vazio">Nenhum projeto ainda. Clique em <b>Novo projeto</b> para começar.</p>`;
    return;
  }
  lista.innerHTML = `
    <table class="tabela-projetos">
      <thead><tr><th>Nome</th><th>Última modificação</th><th class="acoes">Ações</th></tr></thead>
      <tbody>${projetos
        .map(
          (p) => `
        <tr data-id="${esc(p.id)}" data-nome="${esc(p.nome)}">
          <td><a href="#/p/${encodeURIComponent(p.id)}" class="link-projeto">${esc(p.nome)}</a></td>
          <td class="data">${dataRelativa(p.modificado)}</td>
          <td class="acoes">
            <button class="botao-icone" data-acao="duplicar" title="Duplicar">${icone("copiar")}</button>
            <button class="botao-icone" data-acao="zip" title="Baixar .zip">${icone("baixar")}</button>
            <button class="botao-icone" data-acao="pdf" title="Salvar PDF" ${p.tem_pdf ? "" : "disabled"}>${icone("log")}</button>
            <button class="botao-icone" data-acao="renomear" title="Renomear">${icone("lapis")}</button>
            <button class="botao-icone perigo" data-acao="excluir" title="Excluir">${icone("lixeira")}</button>
          </td>
        </tr>`,
        )
        .join("")}</tbody>
    </table>`;

  lista.querySelectorAll("tbody tr").forEach((tr) => {
    const id = tr.dataset.id;
    tr.querySelectorAll("[data-acao]").forEach((b) => {
      b.onclick = () => acaoProjeto(b.dataset.acao, id, atualizar);
    });
    tr.oncontextmenu = (e) => {
      e.preventDefault();
      menuContexto(e.clientX, e.clientY, [
        { texto: "Abrir", icone: "pasta", acao: () => (location.hash = `#/p/${encodeURIComponent(id)}`) },
        { texto: "Duplicar", icone: "copiar", acao: () => acaoProjeto("duplicar", id, atualizar) },
        { texto: "Salvar como modelo", icone: "estrela", acao: () => acaoProjeto("modelo", id, atualizar) },
        { texto: "Renomear", icone: "lapis", acao: () => acaoProjeto("renomear", id, atualizar) },
        { texto: "Salvar .zip", icone: "baixar", acao: () => acaoProjeto("zip", id, atualizar) },
        "-",
        { texto: "Excluir", icone: "lixeira", perigo: true, acao: () => acaoProjeto("excluir", id, atualizar) },
      ]);
    };
  });
}

/** Ações dos botões de cada projeto. */
async function acaoProjeto(acao, id, atualizar) {
  try {
    if (acao === "duplicar") {
      const r = await api.duplicarProjeto(id);
      aviso(`Projeto duplicado: ${r.id}`, "sucesso");
    } else if (acao === "renomear") {
      const nome = await perguntar("Renomear projeto", "Novo nome", id, "Renomear");
      if (!nome) return;
      await api.renomearProjeto(id, nome);
    } else if (acao === "excluir") {
      const ok = await confirmar(
        "Excluir projeto",
        `Excluir <b>${esc(id)}</b>? O projeto vai para a pasta <i>Lixeira</i> dentro de Documentos\\EngLaTeX (dá para recuperar de lá).`,
        "Excluir",
        true,
      );
      if (!ok) return;
      await api.excluirProjeto(id);
    } else if (acao === "zip") {
      const r = await api.salvarZip(id);
      if (r.salvo) aviso(`Salvo em ${r.salvo}`, "sucesso");
      return;
    } else if (acao === "pdf") {
      const r = await api.salvarPdf(id);
      if (r.salvo) aviso(`Salvo em ${r.salvo}`, "sucesso");
      return;
    } else if (acao === "modelo") {
      const nome = await perguntar("Salvar como modelo", "Nome do modelo", id, "Salvar modelo");
      if (!nome) return;
      await api.salvarComoModelo(id, nome);
      aviso(`Modelo "${nome}" salvo. Ele aparece em Novo projeto → Meus modelos.`, "sucesso", 5000);
      return;
    }
    await atualizar();
  } catch (e) {
    aviso(e.message, "erro", 6000);
  }
}

/** Lista de modelos criados pelo usuário. */
function desenharModelos(lista, modelos, atualizar) {
  if (!modelos.length) {
    lista.innerHTML = `<div class="vazio">
      <p>Você ainda não tem modelos próprios.</p>
      <p>Para criar um: abra um projeto, crie a tabela de <b>Variáveis</b> (cliente, obra, ART…),
      use <code>\\var{nome}</code> no texto e escolha <b>Menu → Salvar como modelo</b>.
      Depois é só criar novos documentos a partir dele e preencher a tabela.</p></div>`;
    return;
  }
  lista.innerHTML = `
    <table class="tabela-projetos">
      <thead><tr><th>Modelo</th><th>Variáveis</th><th class="acoes">Ações</th></tr></thead>
      <tbody>${modelos
        .map(
          (m) => `
        <tr data-id="${esc(m.id)}" data-nome="${esc(m.nome)}">
          <td><a href="#" class="link-projeto" data-acao="usar">${esc(m.nome)}</a></td>
          <td class="data">${m.variaveis}</td>
          <td class="acoes">
            <button class="botao pequeno" data-acao="usar">${icone("mais")} Novo documento</button>
            <button class="botao-icone perigo" data-acao="excluir" title="Excluir modelo">${icone("lixeira")}</button>
          </td>
        </tr>`,
        )
        .join("")}</tbody>
    </table>`;
  lista.querySelectorAll("tbody tr").forEach((tr) => {
    tr.querySelectorAll("[data-acao]").forEach((b) => {
      b.onclick = async (e) => {
        e.preventDefault();
        if (b.dataset.acao === "usar") return criarDoModelo(tr.dataset.id, tr.dataset.nome, true);
        if (await confirmar("Excluir modelo", `Excluir o modelo <b>${esc(tr.dataset.nome)}</b>? Os projetos já criados com ele não são afetados.`, "Excluir", true)) {
          await api.excluirModelo(tr.dataset.nome).catch((err) => aviso(err.message, "erro"));
          atualizar();
        }
      };
    });
  });
}

/** Menu do botão "Novo projeto": modelos prontos, modelos do usuário e importação. */
async function menuNovoProjeto(botao) {
  let modelos;
  try {
    modelos = await api.modelos();
  } catch (e) {
    return aviso(e.message, "erro");
  }
  const itens = modelos.prontos.map((m) => ({
    texto: m.nome,
    dica: m.descricao,
    icone: "tex",
    acao: () => criarDoModelo(m.id, m.nome, m.id === "memorial" || m.id === "laudo"),
  }));
  if (modelos.usuario.length) {
    itens.push("-");
    for (const m of modelos.usuario) {
      itens.push({ texto: m.nome, dica: "meu modelo", icone: "estrela", acao: () => criarDoModelo(m.id, m.nome, true) });
    }
  }
  itens.push("-", { texto: "Importar .zip (ex.: baixado do Overleaf)", icone: "enviar", acao: importar });
  menuAbaixo(botao, itens);
}

/** Cria o primeiro modelo técnico do desktop com dados preenchidos pelo usuário. */
async function criarLivroTecnico() {
  const dados = await dialogo({
    titulo: "Novo livro técnico — balancim / andaime suspenso",
    largura: 620,
    conteudo: `<div class="grade-formulario tecnico-formulario">
      <label class="campo"><span>Tipo de equipamento</span><input name="equipamento" value="Balancim / Andaime suspenso" required></label>
      <label class="campo"><span>Fabricante</span><input name="fabricante" placeholder="Ex.: Menegotti" required></label>
      <label class="campo"><span>Modelo</span><input name="modelo" placeholder="Modelo do equipamento" required></label>
      <label class="campo"><span>Identificação / nº de série</span><input name="identificacao" placeholder="Patrimônio ou série" required></label>
      <label class="campo"><span>Capacidade nominal</span><input name="capacidade" placeholder="Conforme fabricante" required></label>
      <label class="campo"><span>Data do documento</span><input name="data" type="date" required></label>
      <label class="campo"><span>Empresa emitente</span><input name="empresa" placeholder="Razão social" required></label>
      <label class="campo"><span>ART <small>(opcional)</small></span><input name="art" placeholder="Número da ART"></label>
      <label class="campo"><span>Cliente</span><input name="cliente" placeholder="Contratante" required></label>
      <label class="campo"><span>Obra</span><input name="obra" placeholder="Nome da obra" required></label>
      <label class="campo largo"><span>Responsável técnico</span><input name="responsavel" placeholder="Nome do responsável" required></label>
      <label class="campo largo"><span>Registro profissional</span><input name="registro" placeholder="CREA / registro profissional" required></label>
      <p class="dica largo">O modelo gera arquivos LaTeX editáveis. Ele não declara conformidade nem substitui análise ou assinatura de profissional habilitado.</p>
    </div>`,
    botoes: [{ texto: "Cancelar", valor: null }, { texto: "Criar livro técnico", valor: "ok", classe: "primario" }],
    aoAbrir: (janela) => { janela.querySelector('[name="data"]').value = new Date().toISOString().slice(0, 10); },
    coletar: (janela) => {
      const form = Object.fromEntries([...janela.querySelectorAll("input")].map((input) => [input.name, input.value.trim()]));
      const obrigatorios = ["equipamento", "fabricante", "modelo", "identificacao", "capacidade", "data", "empresa", "cliente", "obra", "responsavel", "registro"];
      if (obrigatorios.some((campo) => !form[campo])) { aviso("Preencha todos os campos obrigatórios.", "erro"); return undefined; }
      return form;
    },
  });
  if (!dados) return;
  const nome = `Livro de inspeção — ${dados.equipamento} — ${dados.obra}`;
  const valores = { titulo: nome, equipamento: dados.equipamento, fabricante: dados.fabricante, modelo: dados.modelo, identificacao: dados.identificacao, capacidade: dados.capacidade, empresa: dados.empresa, cliente: dados.cliente, obra: dados.obra, art: dados.art || "ART não informada", responsavel: dados.responsavel, registro: dados.registro, data: dados.data };
  const variaveis = Object.entries(valores).map(([nomeVariavel, valor]) => ({ nome: nomeVariavel, valor, descricao: "Dado do livro técnico", tipo: "texto" }));
  try {
    const { id } = await api.criarProjeto(nome, "livro_balancim");
    await api.gravarVariaveis(id, variaveis);
    await Promise.all([
      api.gravarArquivo(id, "dados/empresa.json", `${JSON.stringify({ name: dados.empresa, art: dados.art || "ART não informada" }, null, 2)}\n`),
      api.gravarArquivo(id, "dados/obra.json", `${JSON.stringify({ client: dados.cliente, name: dados.obra, address: "" }, null, 2)}\n`),
      api.gravarArquivo(id, "dados/equipamento.json", `${JSON.stringify({
      equipmentType: dados.equipamento,
      manufacturer: dados.fabricante,
      model: dados.modelo,
      identification: dados.identificacao,
      capacity: dados.capacidade,
      company: dados.empresa,
      client: dados.cliente,
      work: dados.obra,
      art: dados.art || "ART não informada",
      technicalResponsible: dados.responsavel,
      professionalRegistration: dados.registro,
      documentDate: dados.data,
      status: "draft",
      }, null, 2)}\n`),
      api.gravarArquivo(id, "registros/inspecoes.json", `${JSON.stringify([
        { item: "Estrutura e plataforma", status: "a_verificar", observation: "" },
        { item: "Cabos, guincho e trava-quedas", status: "a_verificar", observation: "" },
        { item: "Guarda-corpo, piso e rodapés", status: "a_verificar", observation: "" },
        { item: "Dispositivos de segurança", status: "a_verificar", observation: "" },
      ], null, 2)}\n`),
    ]);
    location.hash = `#/p/${encodeURIComponent(id)}?variaveis=1`;
  } catch (e) { aviso(e.message, "erro", 6000); }
}

/** Pede o nome e cria o projeto. Se o modelo tem variáveis, já abre a tabela para preencher. */
async function criarDoModelo(modelo, nomeModelo, abrirVariaveis) {
  const sugestao = modelo === "vazio" ? "Novo projeto" : nomeModelo;
  const nome = await perguntar("Novo projeto", "Nome do projeto", sugestao, "Criar");
  if (!nome) return;
  try {
    const { id } = await api.criarProjeto(nome, modelo);
    location.hash = `#/p/${encodeURIComponent(id)}${abrirVariaveis ? "?variaveis=1" : ""}`;
  } catch (e) {
    aviso(e.message, "erro");
  }
}

/** Importa um .zip escolhido na janela "Abrir" do Windows. */
async function importar() {
  try {
    let r = await api.importarDialogo().catch(() => null);
    // Fora do Windows (testes) não há janela nativa: usa o seletor do navegador.
    if (!r) {
      const [arquivo] = await escolherArquivos({ multiplos: false, aceitar: ".zip" });
      if (!arquivo) return;
      r = await api.importarZip(arquivo.name.replace(/\.zip$/i, ""), arquivo);
    }
    if (r.id) location.hash = `#/p/${encodeURIComponent(r.id)}`;
  } catch (e) {
    aviso(e.message, "erro", 6000);
  }
}
