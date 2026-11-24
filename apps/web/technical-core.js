(function(root){
  "use strict";
  const EQUIPMENT_FAMILY="suspended-platform";
  function clean(value){return typeof value==="string"?value.trim():""}
  function validateTechnicalInput(input){
    const required={equipmentType:"tipo de equipamento",manufacturer:"fabricante",model:"modelo",company:"empresa emitente",client:"cliente",work:"obra",responsible:"responsável técnico",date:"data"};
    for(const [key,label] of Object.entries(required))if(!clean(input&&input[key]))return `Preencha ${label}.`;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date))return "Informe uma data válida.";
    return null;
  }
  function tex(value){return clean(value).replace(/([\\{}%&#_$])/g,"\\$1")}
  function jsonData(input){return {
    equipmentFamily:EQUIPMENT_FAMILY,
    equipmentType:clean(input.equipmentType),manufacturer:clean(input.manufacturer),model:clean(input.model),
    company:clean(input.company),client:clean(input.client),work:clean(input.work),art:clean(input.art),
    responsible:clean(input.responsible),date:clean(input.date),status:"draft",templateId:"forge.suspended-platform.inspection-book",templateVersion:"0.1.0"
  }}
  function generateFiles(input){
    const d=jsonData(input);
    const title=`Livro de Inspeção — ${d.equipmentType}`;
    const main=`\\documentclass[12pt,a4paper]{article}\n\\usepackage[utf8]{inputenc}\n\\usepackage[T1]{fontenc}\n\\usepackage[brazil]{babel}\n\\usepackage{geometry}\n\\geometry{margin=2.2cm}\n\\title{${tex(title)}}\n\\author{${tex(d.company)}}\n\\date{${tex(d.date)}}\n\\begin{document}\n\\maketitle\n\\input{capitulos/abertura.tex}\n\\input{capitulos/identificacao.tex}\n\\input{capitulos/entrega-tecnica.tex}\n\\input{capitulos/checklist.tex}\n\\input{capitulos/manutencao.tex}\n\\input{capitulos/liberacao.tex}\n\\end{document}\n`;
    const files={"main.tex":main,"dados/equipamento.json":JSON.stringify(d,null,2),"capitulos/abertura.tex":`\\section{Termo de abertura}\nEmpresa emitente: ${tex(d.company)}\\\\\nCliente: ${tex(d.client)}\\\\\nObra: ${tex(d.work)}\\\\\nData: ${tex(d.date)}\\\\\nART: ${tex(d.art||"A informar")}\\\\\n`,"capitulos/identificacao.tex":`\\section{Identificação do equipamento}\nTipo: ${tex(d.equipmentType)}\\\\\nFabricante: ${tex(d.manufacturer)}\\\\\nModelo: ${tex(d.model)}\\\\\n`,"capitulos/entrega-tecnica.tex":`\\section{Entrega técnica}\nRegistrar neste capítulo a apresentação do equipamento, os riscos, os procedimentos de montagem e desmontagem e os documentos entregues.\\\\\n`,"capitulos/checklist.tex":`\\section{Checklist inicial}\n\\begin{tabular}{|p{0.62\\textwidth}|c|p{0.2\\textwidth}|}\\hline\nItem de inspeção & Status & Observação \\\\\\ \\hline\nEstrutura e plataforma & A verificar & \\\\\\ \\hline\nCabos, guincho e trava-quedas & A verificar & \\\\\\ \\hline\nProteções, guarda-corpo e rodapés & A verificar & \\\\\\ \\hline\nDispositivos de segurança & A verificar & \\\\\\ \\hline\n\\end{tabular}\n`,"capitulos/manutencao.tex":`\\section{Manutenção e ocorrências}\nData, tipo de manutenção, descrição, responsável, peças utilizadas e próxima ação devem ser registrados neste capítulo.\\\\\n`,"capitulos/liberacao.tex":`\\section{Liberação e responsabilidade técnica}\nResponsável técnico: ${tex(d.responsible)}\\\\\nEste modelo é um rascunho editorial. A liberação e a conformidade devem ser avaliadas e assinadas por profissional habilitado.\\\\\n`};
    return {title,files,technicalDocument:d,manifest:{schemaVersion:"technical-project-1.0.0",documentKind:"technical-book",technicalDocument:{type:"inspection-book",equipmentFamily:EQUIPMENT_FAMILY,templateId:d.templateId,templateVersion:d.templateVersion,status:d.status},entryFile:"main.tex"}};
  }
  root.ForgeTechnical=Object.freeze({validateTechnicalInput,jsonData,generateFiles,equipmentFamily:EQUIPMENT_FAMILY});
})(typeof globalThis!=="undefined"?globalThis:this);
