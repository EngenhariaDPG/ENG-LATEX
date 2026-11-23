const EXAMPLE="\\documentclass[12pt,a4paper]{article}\n\\usepackage[utf8]{inputenc}\n\\usepackage[T1]{fontenc}\n\\usepackage[brazil]{babel}\n\\title{Estudo de engenharia}\n\\author{Equipe FORGE}\n\\begin{document}\n\\maketitle\n\\section{Introdução}\nEste projeto demonstra a edição local no FORGE.\n\\section{Objetivo}\nOrganizar documentos técnicos em um ambiente modular.\n\\end{document}\n";
const KEY="forge.web.mock.v1";
const seed=[{id:"a",name:"Relatório técnico",updated:"Agora",files:{"main.tex":EXAMPLE}},{id:"b",name:"Memorial de cálculo",updated:"Ontem",files:{"main.tex":"\\documentclass{article}\n\\begin{document}\n\\section{Memorial de cálculo}\nInsira suas premissas e equações.\n\\end{document}"}},{id:"c",name:"Artigo — otimização",updated:"12 nov",files:{"main.tex":"\\documentclass{article}\n\\begin{document}\n\\title{Otimização}\n\\maketitle\n\\end{document}"}}];
let projects;try{projects=JSON.parse(localStorage.getItem(KEY))||seed}catch{projects=seed}
let current=projects[0],saveTimer,toastTimer;
const $=s=>document.querySelector(s);
function notify(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2200)}
function persist(){localStorage.setItem(KEY,JSON.stringify(projects));$("#save-state").textContent="● Salvo localmente"}
function drawProjects(){const host=$("#projects");host.innerHTML="";projects.filter(p=>p.name.toLowerCase().includes($("#search").value.toLowerCase())).forEach(p=>{const b=document.createElement("button");b.className="project"+(p.id===current.id?" active":"");b.innerHTML='<span class="symbol">▤</span><span><strong></strong><small></small></span>';b.querySelector("strong").textContent=p.name;b.querySelector("small").textContent=p.updated;b.onclick=()=>{current=p;drawEditor()};host.append(b)})}
function drawEditor(){const file=Object.keys(current.files)[0];$("#project-name").textContent=current.name;$("#filename").textContent=file;$("#code").value=current.files[file];drawProjects();lineNumbers();persist()}
function lineNumbers(){$("#lines").textContent=Array.from({length:$("#code").value.split("\n").length},(_,i)=>i+1).join("\n")}
function save(){current.files[Object.keys(current.files)[0]]=$("#code").value;current.updated="Agora";persist();drawProjects()}
function exportTex(){const name=Object.keys(current.files)[0],blob=new Blob([$("#code").value],{type:"text/plain;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);notify("Arquivo .tex exportado")}
$("#code").addEventListener("input",()=>{current.files[Object.keys(current.files)[0]]=$("#code").value;$("#save-state").textContent="● Alterações pendentes";lineNumbers();clearTimeout(saveTimer);saveTimer=setTimeout(save,450)});
$("#code").addEventListener("keydown",e=>{if(e.key==="Tab"){e.preventDefault();const p=e.target.selectionStart;e.target.setRangeText("  ",p,e.target.selectionEnd,"end");e.target.dispatchEvent(new Event("input"))}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){e.preventDefault();save();notify("Alterações salvas")}});
$("#code").addEventListener("keyup",()=>{const a=$("#code").value.slice(0,$("#code").selectionStart).split("\n");$("#cursor").textContent="Ln "+a.length+", Col "+(a[a.length-1].length+1)});
$("#new").onclick=()=>{const name=prompt("Nome do novo projeto:","Novo projeto");if(!name||!name.trim())return;current={id:String(Date.now()),name:name.trim(),updated:"Agora",files:{"main.tex":EXAMPLE}};projects.unshift(current);drawEditor();notify("Projeto criado localmente")};
$("#export").onclick=exportTex;$("#download").onclick=exportTex;
$("#import").onclick=()=>$("#file").click();
$("#file").onchange=async e=>{const f=e.target.files[0];if(!f)return;current={id:String(Date.now()),name:f.name.replace(/\.(tex|txt)$/i,""),updated:"Agora",files:{[f.name]:await f.text()}};projects.unshift(current);drawEditor();notify("Arquivo importado no navegador");e.target.value=""};
$("#search").oninput=drawProjects;
$("#drive").onclick=()=>notify("Drive em modo mock: OAuth e sincronização desativados.");
$("#theme").onclick=()=>document.body.classList.toggle("dark");
document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-view]").forEach(x=>x.classList.toggle("selected",x===b));$("#preview").hidden=b.dataset.view!=="preview";$("#diagnostics").hidden=b.dataset.view!=="diagnostics"});
$("#collapse").onclick=()=>{$(".workspace").classList.toggle("hide-inspector")};
document.querySelectorAll("[data-mobile]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-mobile]").forEach(x=>x.classList.toggle("active",x===b));const w=$(".workspace");w.classList.remove("mobile-sidebar","mobile-inspector");if(b.dataset.mobile!=="editor")w.classList.add("mobile-"+b.dataset.mobile)});
window.addEventListener("beforeunload",()=>{if(current)save()});
drawEditor();