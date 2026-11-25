// Tradução da interface (português, inglês e espanhol).
//
// COMO FUNCIONA
// O programa é escrito em português. Este módulo observa a tela (MutationObserver)
// e troca cada texto em português pela tradução do idioma escolhido, inclusive
// dicas (title) e textos de exemplo (placeholder). Assim o resto do código não
// precisa ser alterado para traduzir.
//
// Áreas com conteúdo do usuário NÃO são traduzidas: o código no editor, nomes
// de arquivos e projetos, o PDF, o log do LaTeX, campos de texto etc.
// (veja NAO_TRADUZIR).
//
// PARA ACRESCENTAR UMA TRADUÇÃO
//  - Texto fixo: acrescente uma linha em TEXTOS: ["português", "english", "español"].
//    O texto em português deve ser idêntico ao que aparece na tela (sem os
//    espaços das pontas). Textos com partes em negrito são traduzidos por pedaço.
//  - Texto com números/nomes variáveis: acrescente em PADROES (expressão regular).
//  - Novo idioma: acrescente uma coluna em TEXTOS/PADROES e o código em IDIOMAS.

/** Idiomas da interface: código -> nome (no próprio idioma). */
export const IDIOMAS = { "pt-BR": "Português (Brasil)", en: "English", es: "Español" };

/** Coluna de cada idioma nas tabelas abaixo. */
const COLUNA = { en: 1, es: 2 };

// prettier-ignore
const TEXTOS = [
  // --- Tela inicial ---
  ["Configurações", "Settings", "Configuración"],
  ["Novo projeto", "New project", "Nuevo proyecto"],
  ["Todos os projetos", "All projects", "Todos los proyectos"],
  ["Meus modelos", "My templates", "Mis plantillas"],
  ["Importar .zip", "Import .zip", "Importar .zip"],
  ["Buscar…", "Search…", "Buscar…"],
  ["Nome", "Name", "Nombre"],
  ["Última modificação", "Last modified", "Última modificación"],
  ["Ações", "Actions", "Acciones"],
  ["Modelo", "Template", "Plantilla"],
  ["Variáveis", "Variables", "Variables"],
  ["Duplicar", "Duplicate", "Duplicar"],
  ["Baixar .zip", "Download .zip", "Descargar .zip"],
  ["Salvar PDF", "Save PDF", "Guardar PDF"],
  ["Renomear", "Rename", "Renombrar"],
  ["Excluir", "Delete", "Eliminar"],
  ["Abrir", "Open", "Abrir"],
  ["Salvar como modelo", "Save as template", "Guardar como plantilla"],
  ["Salvar .zip", "Save .zip", "Guardar .zip"],
  ["Nenhum projeto ainda. Clique em", "No projects yet. Click", "Aún no hay proyectos. Haga clic en"],
  ["para começar.", "to get started.", "para empezar."],
  ["Você ainda não tem modelos próprios.", "You don't have your own templates yet.", "Aún no tiene plantillas propias."],
  ["Para criar um: abra um projeto, crie a tabela de", "To create one: open a project, create the", "Para crear una: abra un proyecto, cree la tabla de"],
  ["(cliente, obra, ART…), use", "table (client, site, permit…), use", "(cliente, obra, permiso…), use"],
  ["no texto e escolha", "in the text and choose", "en el texto y elija"],
  ["Menu → Salvar como modelo", "Menu → Save as template", "Menú → Guardar como plantilla"],
  [". Depois é só criar novos documentos a partir dele e preencher a tabela.", ". Then create new documents from it and fill in the table.", ". Luego cree nuevos documentos a partir de ella y complete la tabla."],
  ["Novo documento", "New document", "Nuevo documento"],
  ["Excluir modelo", "Delete template", "Eliminar plantilla"],
  ["Importar .zip (ex.: baixado do Overleaf)", "Import .zip (e.g. downloaded from Overleaf)", "Importar .zip (p. ej. descargado de Overleaf)"],
  ["meu modelo", "my template", "mi plantilla"],
  ["Nome do projeto", "Project name", "Nombre del proyecto"],
  ["Criar", "Create", "Crear"],
  ["Renomear projeto", "Rename project", "Renombrar proyecto"],
  ["Novo nome", "New name", "Nuevo nombre"],
  ["Excluir projeto", "Delete project", "Eliminar proyecto"],
  ["Nome do modelo", "Template name", "Nombre de la plantilla"],
  ["Salvar modelo", "Save template", "Guardar plantilla"],
  ["agora mesmo", "just now", "ahora mismo"],
  ["ontem", "yesterday", "ayer"],
  ["Novo projeto", "New project", "Nuevo proyecto"],
  // Modelos prontos (nomes e descrições vêm do programa)
  ["Projeto em branco", "Blank project", "Proyecto en blanco"],
  ["Documento mínimo, só com o essencial.", "Minimal document with just the essentials.", "Documento mínimo, solo lo esencial."],
  ["Artigo", "Article", "Artículo"],
  ["Artigo com resumo, seções, equações e bibliografia.", "Article with abstract, sections, equations and bibliography.", "Artículo con resumen, secciones, ecuaciones y bibliografía."],
  ["Memorial de cálculo", "Calculation report", "Memoria de cálculo"],
  ["Memorial de engenharia com capa, premissas, cálculos e tabelas.", "Engineering report with cover, assumptions, calculations and tables.", "Memoria de ingeniería con portada, premisas, cálculos y tablas."],
  ["Laudo técnico", "Technical report", "Informe técnico"],
  ["Laudo de inspeção com checklist, conclusão e campo de assinatura.", "Inspection report with checklist, conclusion and signature field.", "Informe de inspección con checklist, conclusión y firma."],
  ["Apresentação (Beamer)", "Presentation (Beamer)", "Presentación (Beamer)"],
  ["Slides em LaTeX com o pacote Beamer.", "LaTeX slides with the Beamer package.", "Diapositivas en LaTeX con el paquete Beamer."],

  // --- Diálogos comuns ---
  ["Cancelar", "Cancel", "Cancelar"],
  ["Confirmar", "Confirm", "Confirmar"],
  ["Salvar", "Save", "Guardar"],
  ["Fechar", "Close", "Cerrar"],
  ["Inserir", "Insert", "Insertar"],
  ["Substituir", "Replace", "Reemplazar"],
  ["Substituir arquivo", "Replace file", "Reemplazar archivo"],
  ["Excluir", "Delete", "Eliminar"],

  // --- Barra do editor ---
  ["Menu", "Menu", "Menú"],
  ["Voltar aos projetos", "Back to projects", "Volver a los proyectos"],
  ["Clique para renomear", "Click to rename", "Clic para renombrar"],
  ["Modo de edição", "Editing mode", "Modo de edición"],
  ["Código", "Code", "Código"],
  ["Visual", "Visual", "Visual"],
  ["Histórico", "History", "Historial"],
  ["Histórico de versões", "Version history", "Historial de versiones"],
  ["Tabela de variáveis do documento", "Document variables table", "Tabla de variables del documento"],
  ["Arquivos", "Files", "Archivos"],
  ["Estrutura", "Outline", "Estructura"],
  ["Novo arquivo", "New file", "Nuevo archivo"],
  ["Nova pasta", "New folder", "Nueva carpeta"],
  ["Enviar arquivos (imagens, .bib...)", "Upload files (images, .bib...)", "Subir archivos (imágenes, .bib...)"],
  ["Novo arquivo aqui", "New file here", "Nuevo archivo aquí"],
  ["Nova pasta aqui", "New folder here", "Nueva carpeta aquí"],
  ["Enviar arquivos aqui", "Upload files here", "Subir archivos aquí"],
  ["Definir como arquivo principal", "Set as main file", "Definir como archivo principal"],
  ["Arquivo principal", "Main file", "Archivo principal"],
  ["Projeto vazio.", "Empty project.", "Proyecto vacío."],
  ["Sem seções neste arquivo.", "No sections in this file.", "Sin secciones en este archivo."],
  ["Editando…", "Editing…", "Editando…"],
  ["Salvando…", "Saving…", "Guardando…"],
  ["Salvo", "Saved", "Guardado"],
  ["Erro ao salvar!", "Error saving!", "¡Error al guardar!"],
  ["Este arquivo não é texto e não pode ser editado aqui.", "This file is not text and cannot be edited here.", "Este archivo no es texto y no se puede editar aquí."],

  // Barra de ferramentas
  ["Negrito (Ctrl+B)", "Bold (Ctrl+B)", "Negrita (Ctrl+B)"],
  ["Itálico (Ctrl+I)", "Italic (Ctrl+I)", "Cursiva (Ctrl+I)"],
  ["§ Seção", "§ Section", "§ Sección"],
  ["≡ Lista", "≡ List", "≡ Lista"],
  ["√x Equação", "√x Equation", "√x Ecuación"],
  ["Ω Símbolos", "Ω Symbols", "Ω Símbolos"],
  ["▦ Tabela", "▦ Table", "▦ Tabla"],
  ["🖼 Imagem", "🖼 Image", "🖼 Imagen"],
  ["→ Ref.", "→ Ref.", "→ Ref."],
  ["❝ Citação", "❝ Citation", "❝ Cita"],
  ["¹ Nota", "¹ Footnote", "¹ Nota"],
  ["Inserir seção ou parágrafo", "Insert section or paragraph", "Insertar sección o párrafo"],
  ["Inserir lista", "Insert list", "Insertar lista"],
  ["Inserir equação", "Insert equation", "Insertar ecuación"],
  ["Paleta de símbolos", "Symbol palette", "Paleta de símbolos"],
  ["Inserir ou editar tabela", "Insert or edit table", "Insertar o editar tabla"],
  ["Inserir imagem", "Insert image", "Insertar imagen"],
  ["Referência cruzada (\\ref)", "Cross-reference (\\ref)", "Referencia cruzada (\\ref)"],
  ["Citação (\\cite)", "Citation (\\cite)", "Cita (\\cite)"],
  ["Nota de rodapé", "Footnote", "Nota al pie"],

  // Menu do botão direito
  ["Recortar", "Cut", "Cortar"],
  ["Copiar", "Copy", "Copiar"],
  ["Colar", "Paste", "Pegar"],
  ["Negrito", "Bold", "Negrita"],
  ["Itálico", "Italic", "Cursiva"],
  ["Editar esta tabela…", "Edit this table…", "Editar esta tabla…"],
  ["Inserir seção ou parágrafo…", "Insert section or paragraph…", "Insertar sección o párrafo…"],
  ["Inserir tabela…", "Insert table…", "Insertar tabla…"],
  ["Inserir imagem…", "Insert image…", "Insertar imagen…"],
  ["Inserir lista…", "Insert list…", "Insertar lista…"],
  ["Inserir equação…", "Insert equation…", "Insertar ecuación…"],
  ["Inserir símbolo…", "Insert symbol…", "Insertar símbolo…"],
  ["Inserir nota de rodapé…", "Insert footnote…", "Insertar nota al pie…"],
  ["Inserir referência cruzada…", "Insert cross-reference…", "Insertar referencia cruzada…"],
  ["Inserir citação…", "Insert citation…", "Insertar cita…"],
  ["Inserir variável…", "Insert variable…", "Insertar variable…"],
  ["Mostrar no PDF", "Show in PDF", "Mostrar en el PDF"],
  ["Dica: passe o mouse sobre a fórmula para ver a prévia", "Tip: hover over the formula to see a preview", "Consejo: pase el ratón sobre la fórmula para ver la vista previa"],

  // Painel do PDF
  ["Recompilar", "Recompile", "Recompilar"],
  ["Compilando…", "Compiling…", "Compilando…"],
  ["Recompilar (Ctrl+S ou Ctrl+Enter)", "Recompile (Ctrl+S or Ctrl+Enter)", "Recompilar (Ctrl+S o Ctrl+Enter)"],
  ["Opções de compilação", "Compile options", "Opciones de compilación"],
  ["Erros, avisos e log completo", "Errors, warnings and full log", "Errores, avisos y registro completo"],
  ["Logs", "Logs", "Registros"],
  ["Diminuir zoom", "Zoom out", "Alejar"],
  ["Aumentar zoom", "Zoom in", "Acercar"],
  ["Opções de zoom", "Zoom options", "Opciones de zoom"],
  ["Salvar PDF como…", "Save PDF as…", "Guardar PDF como…"],
  ["Ajustar à largura", "Fit width", "Ajustar al ancho"],
  ["Página inteira", "Whole page", "Página completa"],
  ["Clique em", "Click", "Haga clic en"],
  ["para gerar o PDF.", "to build the PDF.", "para generar el PDF."],
  ["Mostrar no PDF a posição do cursor (Ctrl+Alt+→)", "Show cursor position in the PDF (Ctrl+Alt+→)", "Mostrar en el PDF la posición del cursor (Ctrl+Alt+→)"],
  ["Dica: dê dois cliques no PDF para ir ao código", "Tip: double-click the PDF to jump to the code", "Consejo: doble clic en el PDF para ir al código"],
  ["Dê dois cliques num ponto do PDF para ir à linha correspondente no código.", "Double-click a point in the PDF to jump to the matching line in the code.", "Haga doble clic en un punto del PDF para ir a la línea correspondiente del código."],
  ["Compilação automática", "Auto-compile", "Compilación automática"],
  ["Compilador: padrão das configurações", "Compiler: default from settings", "Compilador: el de la configuración"],
  ["Tectonic (embutido)", "Tectonic (built-in)", "Tectonic (integrado)"],
  ["Motor direto (MiKTeX/TeX Live)", "Engine directly (MiKTeX/TeX Live)", "Motor directo (MiKTeX/TeX Live)"],

  // Painel de logs
  ["Erro", "Error", "Error"],
  ["Aviso", "Warning", "Aviso"],
  ["Caixa", "Box", "Caja"],
  ["Log completo", "Full log", "Registro completo"],
  ["Nenhum item. 🎉", "No items. 🎉", "Ningún elemento. 🎉"],

  // Menu principal do editor
  ["Salvar projeto (.zip)…", "Save project (.zip)…", "Guardar proyecto (.zip)…"],
  ["Abrir pasta do projeto", "Open project folder", "Abrir carpeta del proyecto"],
  ["Variáveis do documento", "Document variables", "Variables del documento"],
  ["Contar palavras", "Word count", "Contar palabras"],
  ["Salvar como modelo…", "Save as template…", "Guardar como plantilla…"],
  ["Configurações gerais…", "General settings…", "Configuración general…"],
  ["Atalhos de teclado", "Keyboard shortcuts", "Atajos de teclado"],

  // Atalhos
  ["Salvar e recompilar", "Save and recompile", "Guardar y recompilar"],
  ["Negrito / itálico (\\textbf, \\textit)", "Bold / italic (\\textbf, \\textit)", "Negrita / cursiva (\\textbf, \\textit)"],
  ["Comentar / descomentar linhas", "Comment / uncomment lines", "Comentar / descomentar líneas"],
  ["Localizar / substituir", "Find / replace", "Buscar / reemplazar"],
  ["Ir para a linha", "Go to line", "Ir a la línea"],
  ["Mostrar sugestões de comandos", "Show command suggestions", "Mostrar sugerencias de comandos"],
  ["Mostrar no PDF a linha do cursor", "Show the cursor line in the PDF", "Mostrar en el PDF la línea del cursor"],
  ["Duplo clique no PDF", "Double-click in the PDF", "Doble clic en el PDF"],
  ["Ir para o código correspondente", "Jump to the matching code", "Ir al código correspondiente"],
  ["Ctrl + roda do mouse (PDF)", "Ctrl + mouse wheel (PDF)", "Ctrl + rueda del ratón (PDF)"],
  ["Zoom", "Zoom", "Zoom"],
  ["Desfazer / refazer", "Undo / redo", "Deshacer / rehacer"],
  ["Alt + clique", "Alt + click", "Alt + clic"],
  ["Vários cursores", "Multiple cursors", "Varios cursores"],
  ["Botão direito em palavra sublinhada", "Right-click an underlined word", "Clic derecho en palabra subrayada"],
  ["Sugestões do corretor", "Spelling suggestions", "Sugerencias del corrector"],
  ["Botão direito no texto", "Right-click in the text", "Clic derecho en el texto"],
  ["Inserir seção, tabela, imagem, lista, equação…", "Insert section, table, image, list, equation…", "Insertar sección, tabla, imagen, lista, ecuación…"],
  ["Mouse sobre uma fórmula", "Hover over a formula", "Ratón sobre una fórmula"],
  ["Prévia da fórmula desenhada", "Rendered formula preview", "Vista previa de la fórmula"],

  // Configurações
  ["Compilação", "Compilation", "Compilación"],
  ["Compilador padrão", "Default compiler", "Compilador predeterminado"],
  ["Automático (MiKTeX/TeX Live se houver, senão Tectonic)", "Automatic (MiKTeX/TeX Live if present, otherwise Tectonic)", "Automático (MiKTeX/TeX Live si existe, si no Tectonic)"],
  ["pdflatex/xelatex/lualatex direto", "pdflatex/xelatex/lualatex directly", "pdflatex/xelatex/lualatex directo"],
  ["Motor padrão (MiKTeX/TeX Live)", "Default engine (MiKTeX/TeX Live)", "Motor predeterminado (MiKTeX/TeX Live)"],
  ["Pasta \"bin\" do MiKTeX/TeX Live (opcional)", "MiKTeX/TeX Live \"bin\" folder (optional)", "Carpeta \"bin\" de MiKTeX/TeX Live (opcional)"],
  ["Detectada automaticamente", "Detected automatically", "Detectada automáticamente"],
  ["Recompilar automaticamente ao parar de digitar", "Recompile automatically when you stop typing", "Recompilar automáticamente al dejar de escribir"],
  ["não encontrado", "not found", "no encontrado"],
  ["Editor", "Editor", "Editor"],
  ["Tema", "Theme", "Tema"],
  ["Claro", "Light", "Claro"],
  ["Escuro", "Dark", "Oscuro"],
  ["Tamanho da fonte", "Font size", "Tamaño de fuente"],
  ["Quebrar linhas longas", "Wrap long lines", "Ajustar líneas largas"],
  ["Idioma da interface", "Interface language", "Idioma de la interfaz"],
  ["Automático (idioma do Windows)", "Automatic (Windows language)", "Automático (idioma de Windows)"],
  ["Corretor ortográfico", "Spell checker", "Corrector ortográfico"],
  ["Sublinhar palavras com erro", "Underline misspelled words", "Subrayar palabras con errores"],
  ["Idioma padrão (cada projeto pode ter o seu)", "Default language (each project can have its own)", "Idioma predeterminado (cada proyecto puede tener el suyo)"],
  ["instalado", "installed", "instalado"],
  ["Baixar", "Download", "Descargar"],
  ["Baixando…", "Downloading…", "Descargando…"],
  ["Tentar de novo", "Try again", "Reintentar"],
  ["Dicionários Hunspell do LibreOffice (download único; depois funcionam offline). Palavras adicionadas ficam em Documentos\\EngLaTeX\\dicionario-pessoal.txt.", "LibreOffice Hunspell dictionaries (one-time download; then they work offline). Added words are stored in Documents\\EngLaTeX\\dicionario-pessoal.txt.", "Diccionarios Hunspell de LibreOffice (descarga única; luego funcionan sin conexión). Las palabras añadidas se guardan en Documentos\\EngLaTeX\\dicionario-pessoal.txt."],
  ["Projetos em:", "Projects in:", "Proyectos en:"],
  ["Configurações salvas.", "Settings saved.", "Configuración guardada."],
  ["Português (Brasil)", "Portuguese (Brazil)", "Portugués (Brasil)"],
  ["Inglês (EUA)", "English (US)", "Inglés (EE. UU.)"],
  ["Português (Portugal)", "Portuguese (Portugal)", "Portugués (Portugal)"],
  ["Inglês (Reino Unido)", "English (UK)", "Inglés (Reino Unido)"],
  ["Espanhol", "Spanish", "Español"],
  ["Francês", "French", "Francés"],
  ["Alemão", "German", "Alemán"],
  ["Italiano", "Italian", "Italiano"],

  // Idiomas do corretor (por projeto)
  ["Idiomas do corretor ortográfico", "Spell checker languages", "Idiomas del corrector ortográfico"],
  ["Idioma principal deste projeto", "Main language of this project", "Idioma principal de este proyecto"],
  ["Aceitar também, em todo o documento:", "Also accept, in the whole document:", "Aceptar también, en todo el documento:"],
  ["Trechos marcados no LaTeX são verificados no idioma do trecho, sem precisar marcar nada aqui:", "Passages marked in LaTeX are checked in their own language, no need to tick anything here:", "Los fragmentos marcados en LaTeX se revisan en su propio idioma, sin marcar nada aquí:"],
  [". Para outros idiomas, baixe o dicionário em Configurações.", ". For other languages, download the dictionary in Settings.", ". Para otros idiomas, descargue el diccionario en Configuración."],
  ["Baixar idiomas…", "Download languages…", "Descargar idiomas…"],
  ["Idiomas do corretor atualizados.", "Spell checker languages updated.", "Idiomas del corrector actualizados."],
  ["Buscando sugestões…", "Looking for suggestions…", "Buscando sugerencias…"],
  ["Sem sugestões", "No suggestions", "Sin sugerencias"],
  ["Ignorar nesta sessão", "Ignore in this session", "Ignorar en esta sesión"],

  // Variáveis
  ["Use no texto como", "Use in the text as", "Use en el texto como"],
  [". Ao compilar, o valor desta tabela vai para o PDF.", ". When compiling, the value in this table goes into the PDF.", ". Al compilar, el valor de esta tabla va al PDF."],
  ["Tipo", "Type", "Tipo"],
  ["Texto", "Text", "Texto"],
  [": caracteres como & % $ _ são tratados sozinhos. Tipo", ": characters such as & % $ _ are handled automatically. Type", ": caracteres como & % $ _ se tratan solos. Tipo"],
  [": o valor é código (ex.:", ": the value is code (e.g.", ": el valor es código (p. ej."],
  ["O arquivo principal ainda não carrega as variáveis.", "The main file does not load the variables yet.", "El archivo principal aún no carga las variables."],
  ["Incluir \\input{variaveis} no preâmbulo", "Add \\input{variaveis} to the preamble", "Incluir \\input{variaveis} en el preámbulo"],
  ["Valor", "Value", "Valor"],
  ["Descrição", "Description", "Descripción"],
  ["Nova variável", "New variable", "Nueva variable"],
  ["nome", "name", "nombre"],
  ["valor", "value", "valor"],
  ["para que serve", "what it is for", "para qué sirve"],
  ["Remover", "Remove", "Quitar"],
  ["Salvar e compilar", "Save and compile", "Guardar y compilar"],
  ["Nenhuma variável. Clique em \"Nova variável\".", "No variables. Click \"New variable\".", "Ninguna variable. Haga clic en \"Nueva variable\"."],
  ["Variáveis salvas.", "Variables saved.", "Variables guardadas."],
  ["Dê um nome válido à variável primeiro.", "Give the variable a valid name first.", "Primero dé un nombre válido a la variable."],
  ["Lembrete: o arquivo principal ainda não tem \\input{variaveis}.", "Reminder: the main file does not have \\input{variaveis} yet.", "Recordatorio: el archivo principal aún no tiene \\input{variaveis}."],

  // Editor de tabelas
  ["Inserir tabela", "Insert table", "Insertar tabla"],
  ["Editar tabela", "Edit table", "Editar tabla"],
  ["Atualizar tabela", "Update table", "Actualizar tabla"],
  ["Bordas", "Borders", "Bordes"],
  ["Profissional (booktabs)", "Professional (booktabs)", "Profesional (booktabs)"],
  ["Grade completa", "Full grid", "Cuadrícula completa"],
  ["Sem bordas", "No borders", "Sin bordes"],
  ["Cabeçalho em negrito", "Bold header", "Encabezado en negrita"],
  ["Largura total da página", "Full page width", "Ancho total de la página"],
  ["Com legenda (ambiente table)", "With caption (table environment)", "Con leyenda (entorno table)"],
  ["Legenda", "Caption", "Leyenda"],
  ["Rótulo (para \\ref)", "Label (for \\ref)", "Etiqueta (para \\ref)"],
  ["Linha", "Row", "Fila"],
  ["Coluna", "Column", "Columna"],
  ["Dica: copie células do Excel e cole (Ctrl+V) numa célula da grade.", "Tip: copy cells from Excel and paste (Ctrl+V) into a grid cell.", "Consejo: copie celdas de Excel y péguelas (Ctrl+V) en una celda."],
  ["Ver código LaTeX", "Show LaTeX code", "Ver código LaTeX"],
  ["Alinhamento da coluna", "Column alignment", "Alineación de la columna"],
  ["⇤ esquerda", "⇤ left", "⇤ izquierda"],
  ["↔ centro", "↔ center", "↔ centro"],
  ["⇥ direita", "⇥ right", "⇥ derecha"],
  ["✎ Editar tabela", "✎ Edit table", "✎ Editar tabla"],

  // Janelas de inserção
  ["Inserir seção ou parágrafo", "Insert section or paragraph", "Insertar sección o párrafo"],
  ["Seção (1)", "Section (1)", "Sección (1)"],
  ["Subseção (1.1)", "Subsection (1.1)", "Subsección (1.1)"],
  ["Subsubseção (1.1.1)", "Subsubsection (1.1.1)", "Subsubsección (1.1.1)"],
  ["Capítulo (classes report/book/abntex2)", "Chapter (report/book/abntex2 classes)", "Capítulo (clases report/book/abntex2)"],
  ["Parágrafo com título em negrito", "Paragraph with bold heading", "Párrafo con título en negrita"],
  ["Parágrafo de texto (sem título)", "Text paragraph (no heading)", "Párrafo de texto (sin título)"],
  ["Título", "Title", "Título"],
  ["Numerada (aparece no sumário)", "Numbered (shows in table of contents)", "Numerada (aparece en el índice)"],
  ["Texto (opcional)", "Text (optional)", "Texto (opcional)"],
  ["Escreva o parágrafo aqui…", "Write the paragraph here…", "Escriba el párrafo aquí…"],
  ["Escreva o título.", "Type the title.", "Escriba el título."],
  ["Imagem do projeto", "Project image", "Imagen del proyecto"],
  ["Enviar imagem do computador…", "Upload image from computer…", "Subir imagen del equipo…"],
  ["Escolha uma imagem", "Choose an image", "Elija una imagen"],
  ["Nenhuma imagem no projeto. Clique em \"Enviar imagem do computador\".", "No images in the project. Click \"Upload image from computer\".", "No hay imágenes en el proyecto. Haga clic en \"Subir imagen del equipo\"."],
  ["Largura:", "Width:", "Ancho:"],
  ["da largura do texto", "of the text width", "del ancho del texto"],
  ["Ex.: Vista geral do equipamento", "E.g.: General view of the equipment", "Ej.: Vista general del equipo"],
  ["Posição", "Position", "Posición"],
  ["Automática (recomendado)", "Automatic (recommended)", "Automática (recomendado)"],
  ["Exatamente aqui", "Exactly here", "Exactamente aquí"],
  ["Topo da página", "Top of page", "Parte superior de la página"],
  ["Rodapé da página", "Bottom of page", "Parte inferior de la página"],
  ["Página separada", "Separate page", "Página aparte"],
  ["Com legenda e número (figura)", "With caption and number (figure)", "Con leyenda y número (figura)"],
  ["Escolha ou envie uma imagem.", "Choose or upload an image.", "Elija o suba una imagen."],
  ["Marcadores (•)", "Bullets (•)", "Viñetas (•)"],
  ["Numerada (1, 2, 3)", "Numbered (1, 2, 3)", "Numerada (1, 2, 3)"],
  ["Alfabética (a, b, c)", "Alphabetic (a, b, c)", "Alfabética (a, b, c)"],
  ["Itens (um por linha)", "Items (one per line)", "Elementos (uno por línea)"],
  ["Fórmula (código LaTeX, sem cifrões)", "Formula (LaTeX code, without dollar signs)", "Fórmula (código LaTeX, sin signos de dólar)"],
  ["A prévia aparece aqui.", "The preview appears here.", "La vista previa aparece aquí."],
  ["Formato", "Format", "Formato"],
  ["Destacada e numerada (1)", "Displayed and numbered (1)", "Destacada y numerada (1)"],
  ["Destacada sem número", "Displayed, no number", "Destacada sin número"],
  ["No meio do texto ($...$)", "Inline in the text ($...$)", "En línea con el texto ($...$)"],
  ["Rótulo (para \\eqref)", "Label (for \\eqref)", "Etiqueta (para \\eqref)"],
  ["Inserir nota de rodapé", "Insert footnote", "Insertar nota al pie"],
  ["Texto da nota", "Footnote text", "Texto de la nota"],
  ["Inserir referência cruzada", "Insert cross-reference", "Insertar referencia cruzada"],
  ["Rótulo (\\label) a referenciar", "Label (\\label) to reference", "Etiqueta (\\label) a referenciar"],
  ["Escrever \"Figura\", \"Tabela\"... antes do número", "Write \"Figure\", \"Table\"... before the number", "Escribir \"Figura\", \"Tabla\"... antes del número"],
  ["Inserir citação", "Insert citation", "Insertar cita"],
  ["Referências dos arquivos .bib (Ctrl+clique para várias)", "References from .bib files (Ctrl+click for several)", "Referencias de los archivos .bib (Ctrl+clic para varias)"],

  // Paleta de símbolos
  ["Gregas", "Greek", "Griegas"],
  ["Operadores", "Operators", "Operadores"],
  ["Relações", "Relations", "Relaciones"],
  ["Setas", "Arrows", "Flechas"],
  ["Acentos e funções", "Accents and functions", "Acentos y funciones"],
  ["Engenharia (siunitx)", "Engineering (siunitx)", "Ingeniería (siunitx)"],
  ["Buscar símbolo…", "Search symbol…", "Buscar símbolo…"],
  ["Nada encontrado.", "Nothing found.", "No se encontró nada."],

  // Histórico
  ["Salvar versão agora", "Save version now", "Guardar versión ahora"],
  ["Salvar versão", "Save version", "Guardar versión"],
  ["Nome da versão (ex.: Rev. 01 enviada ao cliente)", "Version name (e.g. Rev. 01 sent to client)", "Nombre de la versión (ej.: Rev. 01 enviada al cliente)"],
  ["Nome da versão", "Version name", "Nombre de la versión"],
  ["Uma versão automática é guardada ao compilar (no máximo a cada 5 min). Versões com nome nunca são apagadas.", "An automatic version is kept when compiling (at most every 5 min). Named versions are never deleted.", "Se guarda una versión automática al compilar (como máximo cada 5 min). Las versiones con nombre nunca se borran."],
  ["Ainda não há versões. Compile o projeto ou clique em \"Salvar versão agora\".", "No versions yet. Compile the project or click \"Save version now\".", "Aún no hay versiones. Compile el proyecto o haga clic en \"Guardar versión ahora\"."],
  ["Escolha uma versão à esquerda.", "Choose a version on the left.", "Elija una versión a la izquierda."],
  ["Restaurar projeto inteiro", "Restore whole project", "Restaurar todo el proyecto"],
  ["Dar nome", "Name it", "Dar nombre"],
  ["Excluir versão", "Delete version", "Eliminar versión"],
  ["Restaurar este arquivo", "Restore this file", "Restaurar este archivo"],
  ["Fechar histórico", "Close history", "Cerrar historial"],
  ["Versão salva.", "Version saved.", "Versión guardada."],
  ["Projeto restaurado.", "Project restored.", "Proyecto restaurado."],
  ["Variáveis e configurações", "Variables and settings", "Variables y configuración"],
  ["alterado", "changed", "modificado"],
  ["apagado depois", "deleted later", "borrado después"],
  ["criado depois", "created later", "creado después"],
  ["igual", "unchanged", "igual"],
  ["manual", "manual", "manual"],
  ["Restaurar projeto", "Restore project", "Restaurar proyecto"],
  ["Restaurar", "Restore", "Restaurar"],

  // Contagem
  ["Contagem de palavras", "Word count", "Recuento de palabras"],
  ["Palavras", "Words", "Palabras"],
  ["Caracteres (sem espaços)", "Characters (no spaces)", "Caracteres (sin espacios)"],
  ["Seções", "Sections", "Secciones"],
  ["Fórmulas", "Formulas", "Fórmulas"],
  ["Figuras", "Figures", "Figuras"],
  ["Tabelas", "Tables", "Tablas"],
  ["Por arquivo:", "Per file:", "Por archivo:"],
  ["Conta só o texto do documento (sem comandos, fórmulas, comentários e preâmbulo).", "Counts only the document text (no commands, formulas, comments or preamble).", "Cuenta solo el texto del documento (sin comandos, fórmulas, comentarios ni preámbulo)."],

  // Referências bibliográficas
  ["📚 Referências", "📚 References", "📚 Referencias"],
  ["Gerenciar referências bibliográficas", "Manage bibliography", "Gestionar referencias bibliográficas"],
  ["Gerenciar referências bibliográficas…", "Manage bibliography…", "Gestionar referencias bibliográficas…"],
  ["Referências bibliográficas", "Bibliography", "Referencias bibliográficas"],
  ["Arquivo .bib", ".bib file", "Archivo .bib"],
  ["Buscar autor, título, ano…", "Search author, title, year…", "Buscar autor, título, año…"],
  ["Nova referência", "New reference", "Nueva referencia"],
  ["Buscar por DOI…", "Look up by DOI…", "Buscar por DOI…"],
  ["Colar BibTeX…", "Paste BibTeX…", "Pegar BibTeX…"],
  ["Citar no texto", "Cite in text", "Citar en el texto"],
  ["Chave (usada em \\cite)", "Key (used in \\cite)", "Clave (usada en \\cite)"],
  ["automática", "automatic", "automática"],
  ["Adicionar referência", "Add reference", "Añadir referencia"],
  ["Salvar alterações", "Save changes", "Guardar cambios"],
  ["Referência salva.", "Reference saved.", "Referencia guardada."],
  ["Preencha pelo menos o título.", "Fill in at least the title.", "Complete al menos el título."],
  ["DOI do artigo", "Article DOI", "DOI del artículo"],
  ["Buscar", "Search", "Buscar"],
  ["Buscando…", "Searching…", "Buscando…"],
  ["Adicionar", "Add", "Añadir"],
  ["Os dados (autores, título, revista, ano...) são buscados em doi.org. Precisa de internet.", "The data (authors, title, journal, year...) is fetched from doi.org. Requires internet.", "Los datos (autores, título, revista, año...) se buscan en doi.org. Requiere internet."],
  ["Nenhuma referência ainda. Clique em \"Nova referência\".", "No references yet. Click \"New reference\".", "Aún no hay referencias. Haga clic en \"Nueva referencia\"."],
  ["Escolha uma referência na lista para citar.", "Choose a reference in the list to cite.", "Elija una referencia de la lista para citar."],
  ["Bibliografia incluída no final do documento.", "Bibliography added at the end of the document.", "Bibliografía añadida al final del documento."],
  ["Abra um arquivo .tex para inserir a citação.", "Open a .tex file to insert the citation.", "Abra un archivo .tex para insertar la cita."],
  ["Nenhuma entrada BibTeX encontrada no texto.", "No BibTeX entries found in the text.", "No se encontraron entradas BibTeX en el texto."],
  ["Cole aqui uma ou mais entradas BibTeX (@article{...}). No Google Acadêmico: Citar → BibTeX.", "Paste one or more BibTeX entries here (@article{...}). In Google Scholar: Cite → BibTeX.", "Pegue aquí una o más entradas BibTeX (@article{...}). En Google Académico: Citar → BibTeX."],
  ["Autor(es)", "Author(s)", "Autor(es)"],
  ["Ano", "Year", "Año"],
  ["Editora", "Publisher", "Editorial"],
  ["Local", "Place", "Lugar"],
  ["Edição", "Edition", "Edición"],
  ["Revista", "Journal", "Revista"],
  ["Volume", "Volume", "Volumen"],
  ["Número", "Number", "Número"],
  ["Páginas", "Pages", "Páginas"],
  ["Endereço (URL)", "Address (URL)", "Dirección (URL)"],
  ["Acessado em", "Accessed on", "Consultado el"],
  ["Organização", "Organization", "Organización"],
  ["Instituição", "Institution", "Institución"],
  ["Universidade", "University", "Universidad"],
  ["Nome do evento/livro", "Event/book name", "Nombre del evento/libro"],
  ["Observação", "Note", "Observación"],
  ["Publicação", "Published as", "Publicación"],
  ["Livro", "Book", "Libro"],
  ["Artigo de revista", "Journal article", "Artículo de revista"],
  ["Norma técnica (ABNT/NBR, NR...)", "Technical standard (ABNT/NBR, ISO...)", "Norma técnica (ABNT/NBR, UNE, ISO...)"],
  ["Site / página da internet", "Website / web page", "Sitio / página web"],
  ["Trabalho em evento", "Conference paper", "Trabajo en congreso"],
  ["Tese / dissertação", "Thesis / dissertation", "Tesis / disertación"],
  ["TCC / monografia", "Undergraduate thesis / monograph", "Trabajo de fin de grado / monografía"],
  ["Relatório técnico", "Technical report", "Informe técnico"],
  ["Manual / catálogo de fabricante", "Manual / manufacturer catalog", "Manual / catálogo del fabricante"],
  ["Outro", "Other", "Otro"],
  ["Ex.: Organização = ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS; Título = NBR 8800: Projeto de estruturas de aço...; Local = Rio de Janeiro.", "E.g.: Organization = ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS; Title = NBR 8800: Design of steel structures...; Place = Rio de Janeiro.", "Ej.: Organización = ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS; Título = NBR 8800: Proyecto de estructuras de acero...; Lugar = Rio de Janeiro."],

  // Avisos e erros frequentes (inclusive os que vêm do programa)
  ["Abra um arquivo .tex para inserir.", "Open a .tex file to insert.", "Abra un archivo .tex para insertar."],
  ["O projeto não tem arquivo principal.", "The project has no main file.", "El proyecto no tiene archivo principal."],
  ["Essa linha não aparece no PDF (recompile se necessário).", "This line does not appear in the PDF (recompile if needed).", "Esa línea no aparece en el PDF (recompile si es necesario)."],
  ["Já existe um item com esse nome.", "An item with that name already exists.", "Ya existe un elemento con ese nombre."],
  ["Ainda não há PDF. Clique em Recompilar.", "No PDF yet. Click Recompile.", "Aún no hay PDF. Haga clic en Recompilar."],
  ["Este projeto já está compilando.", "This project is already compiling.", "Este proyecto ya se está compilando."],
  ["Sem dados SyncTeX. Recompile o projeto.", "No SyncTeX data. Recompile the project.", "Sin datos SyncTeX. Recompile el proyecto."],
  ["Não foi possível localizar esse ponto no código.", "Could not locate that point in the code.", "No se pudo ubicar ese punto en el código."],
  ["Sem comunicação com o Eng LaTeX. O programa foi fechado?", "No connection to Eng LaTeX. Was the program closed?", "Sin comunicación con Eng LaTeX. ¿Se cerró el programa?"],
  ["A compilação não gerou um PDF novo. Veja o log completo.", "The compilation did not produce a new PDF. See the full log.", "La compilación no generó un PDF nuevo. Vea el registro completo."],
  ["O arquivo enviado não é um .zip válido.", "The uploaded file is not a valid .zip.", "El archivo enviado no es un .zip válido."],
  ["Versão não encontrada.", "Version not found.", "Versión no encontrada."],
  ["Modelo não encontrado.", "Template not found.", "Plantilla no encontrada."],
  // --- Documentação técnica (documentacao.js) ---
  ["Documentação técnica", "Technical documentation", "Documentación técnica"],
  ["Nova revisão", "New revision", "Nueva revisión"],
  ["Dados do documento", "Document details", "Datos del documento"],
  ["Excluir documento", "Delete document", "Eliminar documento"],
  ["Ver revisões", "View revisions", "Ver revisiones"],
  ["Abrir a revisão atual", "Open current revision", "Abrir la revisión actual"],
  ["Abrir a revisão atual no editor", "Open the current revision in the editor", "Abrir la revisión actual en el editor"],
  ["Abrir no editor", "Open in editor", "Abrir en el editor"],
  ["Nova revisão a partir desta", "New revision from this one", "Nueva revisión a partir de esta"],
  ["Dados da revisão", "Revision details", "Datos de la revisión"],
  ["Abrir pasta", "Open folder", "Abrir carpeta"],
  ["Excluir revisão", "Delete revision", "Eliminar revisión"],
  ["Criar documento", "Create document", "Crear documento"],
  ["Criar revisão", "Create revision", "Crear revisión"],
  ["Abrir mesmo assim", "Open anyway", "Abrir de todos modos"],
  ["Criar nova revisão", "Create new revision", "Crear nueva revisión"],
  ["Documento", "Document", "Documento"],
  ["Cliente", "Client", "Cliente"],
  ["Revisão atual", "Current revision", "Revisión actual"],
  ["Revisões", "Revisions", "Revisiones"],
  ["Revisão", "Revision", "Revisión"],
  ["Situação", "Status", "Estado"],
  ["Data", "Date", "Fecha"],
  ["Descrição da revisão", "Revision description", "Descripción de la revisión"],
  ["Elaborado por", "Prepared by", "Elaborado por"],
  ["Em elaboração", "In progress", "En elaboración"],
  ["Em verificação", "Under review", "En verificación"],
  ["Emitida", "Issued", "Emitida"],
  ["Aprovada", "Approved", "Aprobada"],
  ["Cancelada", "Cancelled", "Cancelada"],
  ["atual", "current", "actual"],
  ["copiada da", "copied from", "copiada de la"],
  ["Nenhum documento técnico ainda.", "No technical documents yet.", "Aún no hay documentos técnicos."],
  ["Cada documento (memorial, laudo, procedimento, plano de rigging…) guarda todas as suas", "Each document (calculation report, inspection report, procedure, rigging plan…) keeps all of its", "Cada documento (memoria, informe, procedimiento, plan de izaje…) guarda todas sus"],
  ["revisões", "revisions", "revisiones"],
  [": Rev. 00, Rev. 01, Rev. 02…", ": Rev. 00, Rev. 01, Rev. 02…", ": Rev. 00, Rev. 01, Rev. 02…"],
  ["Cada revisão é um projeto completo, e a revisão já entregue ao cliente continua guardada do jeito que foi emitida.", "Each revision is a complete project, and the revision already delivered to the client stays exactly as it was issued.", "Cada revisión es un proyecto completo, y la revisión ya entregada al cliente queda guardada tal como fue emitida."],
  ["Cada revisão é um projeto completo.", "Each revision is a complete project.", "Cada revisión es un proyecto completo."],
  ["copia a revisão escolhida; a anterior continua guardada como foi emitida.", "copies the chosen revision; the previous one stays as it was issued.", "copia la revisión elegida; la anterior queda guardada tal como fue emitida."],
  ["Variáveis preenchidas automaticamente em cada revisão:", "Variables filled in automatically in each revision:", "Variables completadas automáticamente en cada revisión:"],
  ["Novo documento técnico", "New technical document", "Nuevo documento técnico"],
  ["Nome do documento", "Document name", "Nombre del documento"],
  ["Observações (opcional)", "Notes (optional)", "Observaciones (opcional)"],
  ["Primeira revisão", "First revision", "Primera revisión"],
  ["Revisão (código)", "Revision (code)", "Revisión (código)"],
  ["Descrição da revisão (o que mudou)", "Revision description (what changed)", "Descripción de la revisión (qué cambió)"],
  ["Copiar a partir de", "Copy from", "Copiar a partir de"],
  ["Abrir a nova revisão no editor", "Open the new revision in the editor", "Abrir la nueva revisión en el editor"],
  ["Ex.: MC-001 Memorial de cálculo - Ponte rolante", "E.g.: MC-001 Calculation report - Overhead crane", "Ej.: MC-001 Memoria de cálculo - Puente grúa"],
  ["Eng. Nome", "Eng. Name", "Ing. Nombre"],
  ["Ex.: Atende comentários do cliente", "E.g.: Addresses client comments", "Ej.: Atiende comentarios del cliente"],
  ["Os arquivos da revisão escolhida são copiados para a nova revisão. A revisão de origem não muda.", "The files of the chosen revision are copied into the new revision. The source revision does not change.", "Los archivos de la revisión elegida se copian a la nueva revisión. La revisión de origen no cambia."],
  ["Ao salvar, as variáveis de revisão (", "On save, the revision variables (", "Al guardar, las variables de revisión ("],
  ["…) são atualizadas nesta revisão e nas posteriores ainda em elaboração.", "…) are updated in this revision and in later revisions still in progress.", "…) se actualizan en esta revisión y en las posteriores aún en elaboración."],
  ["Revisão já emitida", "Revision already issued", "Revisión ya emitida"],
  ["Para não alterar o que já foi entregue, o recomendado é criar uma nova revisão a partir desta.", "To avoid changing what was already delivered, it is recommended to create a new revision from this one.", "Para no modificar lo ya entregado, se recomienda crear una nueva revisión a partir de esta."],
  ["Tudo vai para a pasta Lixeira dentro de Documentos\\EngLaTeX (dá para recuperar de lá).", "Everything goes to the Lixeira (trash) folder inside Documents\\EngLaTeX (it can be recovered from there).", "Todo va a la carpeta Lixeira (papelera) dentro de Documentos\\EngLaTeX (se puede recuperar desde allí)."],
  ["A revisão vai para a pasta Lixeira dentro de Documentos\\EngLaTeX (dá para recuperar de lá).", "The revision goes to the Lixeira (trash) folder inside Documents\\EngLaTeX (it can be recovered from there).", "La revisión va a la carpeta Lixeira (papelera) dentro de Documentos\\EngLaTeX (se puede recuperar desde allí)."],
  ["Informe o nome do documento.", "Enter the document name.", "Indique el nombre del documento."],
  ["Informe o código da revisão (ex.: 01).", "Enter the revision code (e.g. 01).", "Indique el código de la revisión (ej.: 01)."],
  ["Esta é a única revisão do documento. Para apagá-la, exclua o documento inteiro.", "This is the document's only revision. To remove it, delete the whole document.", "Es la única revisión del documento. Para borrarla, elimine el documento completo."],
  ["Voltar às revisões do documento", "Back to the document's revisions", "Volver a las revisiones del documento"],
  ["Revisão de documento técnico (dados na aba Documentação técnica)", "Technical document revision (details in the Technical documentation tab)", "Revisión de documento técnico (datos en la pestaña Documentación técnica)"],
  ["Esta é uma revisão de um documento técnico. Para mudar o nome ou o código da revisão, use a aba Documentação técnica.", "This is a technical document revision. To change its name or revision code, use the Technical documentation tab.", "Es una revisión de un documento técnico. Para cambiar el nombre o el código, use la pestaña Documentación técnica."],
];

/** Textos com partes variáveis: [expressão, inglês, espanhol]. Use $1, $2 para as partes capturadas. */
// prettier-ignore
const PADROES = [
  [/^há (\d+) min$/, "$1 min ago", "hace $1 min"],
  [/^há (\d+) h$/, "$1 h ago", "hace $1 h"],
  [/^há (\d+) dias$/, "$1 days ago", "hace $1 días"],
  [/^(\d+) erro\(s\)$/, "$1 error(s)", "$1 error(es)"],
  [/^(\d+) aviso\(s\)$/, "$1 warning(s)", "$1 aviso(s)"],
  [/^Compilado em ([\d.,]+) s$/, "Compiled in $1 s", "Compilado en $1 s"],
  [/^Compilado em ([\d.,]+) s · (\d+) erro\(s\)$/, "Compiled in $1 s · $2 error(s)", "Compilado en $1 s · $2 error(es)"],
  [/^\{x\} Variáveis( \(\d+\))?$/, "{x} Variables$1", "{x} Variables$1"],
  [/^Todos \((\d+)\)$/, "All ($1)", "Todos ($1)"],
  [/^Erros \((\d+)\)$/, "Errors ($1)", "Errores ($1)"],
  [/^Avisos \((\d+)\)$/, "Warnings ($1)", "Avisos ($1)"],
  [/^Caixas \((\d+)\)$/, "Boxes ($1)", "Cajas ($1)"],
  [/^, linha (\d+)$/, ", line $1", ", línea $1"],
  [/^(.*), linha (\d+)$/, "$1, line $2", "$1, línea $2"],
  [/^▸ Preâmbulo \((\d+) linhas\) — clique para mostrar$/, "▸ Preamble ($1 lines) — click to show", "▸ Preámbulo ($1 líneas) — clic para mostrar"],
  [/^(\d+) linha\(s\) colada\(s\)\.$/, "$1 row(s) pasted.", "$1 fila(s) pegada(s)."],
  [/^(\d+) arquivo\(s\) enviado\(s\)\.$/, "$1 file(s) uploaded.", "$1 archivo(s) subido(s)."],
  [/^Salvo em (.*)$/, "Saved to $1", "Guardado en $1"],
  [/^PDF salvo em (.*)$/, "PDF saved to $1", "PDF guardado en $1"],
  [/^Projeto salvo em (.*)$/, "Project saved to $1", "Proyecto guardado en $1"],
  [/^Arquivo principal: (.*)$/, "Main file: $1", "Archivo principal: $1"],
  [/^Idiomas do corretor: (.*)$/, "Spell checker languages: $1", "Idiomas del corrector: $1"],
  [/^Pacotes? (.*) adicionados? ao preâmbulo\.$/, "Package(s) $1 added to the preamble.", "Paquete(s) $1 añadido(s) al preámbulo."],
  [/^Dicionário (.*) instalado\.$/, "Dictionary $1 installed.", "Diccionario $1 instalado."],
  [/^Adicionar "(.*)" ao dicionário$/, "Add \"$1\" to dictionary", "Añadir \"$1\" al diccionario"],
  [/^Inserir \\var\{(.*)\} no cursor$/, "Insert \\var{$1} at cursor", "Insertar \\var{$1} en el cursor"],
  [/^\\var\{(.*)\} inserido no editor\.$/, "\\var{$1} inserted in the editor.", "\\var{$1} insertado en el editor."],
  [/^#(\d+) · automática \((.*)\)$/, "#$1 · automatic ($2)", "#$1 · automática ($2)"],
  [/^(.*) · #(\d+) · manual$/, "$1 · #$2 · manual", "$1 · #$2 · manual"],
  [/^(.*) · #(\d+) · automática \((.*)\)$/, "$1 · #$2 · automatic ($3)", "$1 · #$2 · automática ($3)"],
  [/^hoje (\d\d:\d\d)$/, "today $1", "hoy $1"],
  [/^ontem (\d\d:\d\d)$/, "yesterday $1", "ayer $1"],
  [/^ — à esquerda a versão #(\d+), à direita o arquivo atual$/, " — left: version #$1, right: current file", " — izquierda: versión #$1, derecha: archivo actual"],
  [/^Modelo "(.*)" salvo\. Ele aparece em Novo projeto → Meus modelos\.$/, "Template \"$1\" saved. It appears under New project → My templates.", "Plantilla \"$1\" guardada. Aparece en Nuevo proyecto → Mis plantillas."],
  [/^(.*) agora é o arquivo principal\.$/, "$1 is now the main file.", "$1 es ahora el archivo principal."],
  [/^Corretor em (.*)\.$/, "Spell checker in $1.", "Corrector en $1."],
  [/^Compilação automática (ligada|desligada)\.$/, (m) => `Auto-compile ${m[1] === "ligada" ? "on" : "off"}.`, (m) => `Compilación automática ${m[1] === "ligada" ? "activada" : "desactivada"}.`],
  [/^Referência "(.*)" adicionada\.$/, 'Reference "$1" added.', 'Referencia "$1" añadida.'],
  [/^(\d+) referência\(s\) adicionada\(s\)\.$/, "$1 reference(s) added.", "$1 referencia(s) añadida(s)."],
  [/^A chave "(.*)" já existe\.$/, 'The key "$1" already exists.', 'La clave "$1" ya existe.'],
  [/^Sem comunicação.*$/, "No connection to Eng LaTeX. Was the program closed?", "Sin comunicación con Eng LaTeX. ¿Se cerró el programa?"],
  [/^Nova revisão — (.*)$/, "New revision — $1", "Nueva revisión — $1"],
  [/^Dados da revisão — (.*)$/, "Revision details — $1", "Datos de la revisión — $1"],
  [/^Revisão (.*) criada\.$/, "Revision $1 created.", "Revisión $1 creada."],
  [/^(.*) \(meu modelo\)$/, "$1 (my template)", "$1 (mi plantilla)"],
  [/^— (\d+) revisão\(ões\)$/, "— $1 revision(s)", "— $1 revisión(es)"],
];

/** Áreas cujo conteúdo é do usuário e não deve ser traduzido. */
const NAO_TRADUZIR = [
  ".cm-content", ".cm-gutters", ".cm-tooltip-autocomplete", ".pdf-rolagem", ".arvore .nome", ".link-projeto",
  ".nome-projeto", "#caminho-arquivo", ".cartao-msg", ".cartao-contexto", ".log-bruto", ".local", ".hist-diff",
  ".item-estrutura", "#t-codigo", ".previa-formula", ".vis-formula", ".katex", "code", "kbd", "pre",
  ".tabela-comp small", "[data-sem-traducao]", ".simbolo",
].join(",");

let idioma = "pt-BR";
let mapa = null; // português -> tradução

/** Idioma efetivo a partir da configuração ("" = automático pelo Windows). */
export function resolverIdioma(configurado) {
  if (configurado && IDIOMAS[configurado]) return configurado;
  const sistema = (navigator.language || "pt-BR").toLowerCase();
  if (sistema.startsWith("pt")) return "pt-BR";
  if (sistema.startsWith("es")) return "es";
  return "en";
}

export function idiomaAtual() {
  return idioma;
}

/** Traduz um texto (usado também diretamente pelo código, ex.: document.title). */
export function t(texto) {
  if (idioma === "pt-BR" || texto == null) return texto;
  const limpo = String(texto).trim();
  if (!limpo) return texto;
  let traduzido = mapa.get(limpo);
  if (traduzido === undefined) {
    const col = COLUNA[idioma];
    for (const p of PADROES) {
      const m = limpo.match(p[0]);
      if (m) {
        const alvo = p[col];
        traduzido = typeof alvo === "function" ? alvo(m) : limpo.replace(p[0], alvo);
        break;
      }
    }
  }
  if (traduzido === undefined) return texto;
  // Mantém os espaços das pontas (texto entre tags em negrito, por exemplo).
  const inicio = String(texto).match(/^\s*/)[0];
  const fim = String(texto).match(/\s*$/)[0];
  return inicio + traduzido + fim;
}

/** Traduz um nó e seus filhos (texto, title e placeholder). */
function traduzirNo(raiz) {
  if (raiz.nodeType === Node.TEXT_NODE) {
    const pai = raiz.parentElement;
    if (!pai || pai.closest(NAO_TRADUZIR) || pai.tagName === "SCRIPT" || pai.tagName === "STYLE" || pai.tagName === "TEXTAREA") return;
    const novo = t(raiz.nodeValue);
    if (novo !== raiz.nodeValue) raiz.nodeValue = novo;
    return;
  }
  if (raiz.nodeType !== Node.ELEMENT_NODE) return;
  if (raiz.matches(NAO_TRADUZIR)) return;
  for (const atributo of ["title", "placeholder", "aria-label"]) {
    const v = raiz.getAttribute(atributo);
    if (v) {
      const novo = t(v);
      if (novo !== v) raiz.setAttribute(atributo, novo);
    }
  }
  for (const filho of raiz.childNodes) traduzirNo(filho);
}

/**
 * Liga a tradução da interface. Chamado uma vez, no início do programa.
 * Em português não faz nada (o programa já é em português).
 */
export function iniciarTraducao(configurado) {
  idioma = resolverIdioma(configurado);
  document.documentElement.lang = idioma;
  if (idioma === "pt-BR") return;
  const col = COLUNA[idioma];
  mapa = new Map(TEXTOS.map((l) => [l[0], l[col]]));
  traduzirNo(document.body);
  new MutationObserver((mudancas) => {
    for (const m of mudancas) {
      if (m.type === "characterData") traduzirNo(m.target);
      else if (m.type === "attributes") {
        if (!m.target.closest?.(NAO_TRADUZIR)) {
          const v = m.target.getAttribute(m.attributeName);
          const novo = t(v);
          if (v && novo !== v) m.target.setAttribute(m.attributeName, novo);
        }
      } else m.addedNodes.forEach(traduzirNo);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["title", "placeholder"] });
}

/** Frases internas do editor de código (busca, ir para linha...) no idioma atual. */
export function frasesEditor(frasesPortugues) {
  if (idioma === "pt-BR") return frasesPortugues;
  if (idioma === "es") {
    return {
      Find: "Buscar", Replace: "Reemplazar", next: "siguiente", previous: "anterior", all: "todos",
      "match case": "mayús./minús.", regexp: "expresión regular", "by word": "palabra completa",
      replace: "reemplazar", "replace all": "reemplazar todo", close: "cerrar", "Go to line": "Ir a la línea", go: "ir",
      "$ unchanged lines": "$ líneas sin cambios",
    };
  }
  return {}; // inglês: textos originais do CodeMirror
}
