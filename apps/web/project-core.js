(function(root){
  "use strict";
  function isUuidV4(value){return typeof value==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)}
  function validProjectPath(value){
    if(typeof value!=="string")return false;
    const path=value,parts=path.split("/");
    if(!path||path.length>240||path.startsWith("/")||path.includes("\\")||path.includes(":")||/[<>:"|?*\u0000-\u001f\u007f]/.test(path)||parts.length>20)return false;
    return parts.every(part=>part&&part===part.trim()&&part!=="."&&part!==".."&&part!=="__proto__"&&part!=="constructor"&&part!=="prototype"&&!/[. ]$/.test(part)&&! /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(part)&&part.length<=120);
  }
  function projectPathKey(value){return value.normalize("NFC").toLowerCase()}
  function hasPathCollision(files,candidate,exceptPath){const key=projectPathKey(candidate);return Object.keys(files).some(path=>path!==exceptPath&&projectPathKey(path)===key)}
  function validProjectRecord(project){
    if(!project||typeof project!=="object"||typeof project.id!=="string"||!project.id.trim()||typeof project.name!=="string"||!project.name.trim())return false;
    const files=project.files;
    if(!files||typeof files!=="object"||Array.isArray(files)||(Object.getPrototypeOf(files)!==Object.prototype&&Object.getPrototypeOf(files)!==null))return false;
    const paths=Object.keys(files);
    if(!paths.length)return false;const seen=new Set();for(const path of paths){if(!validProjectPath(path)||typeof files[path]!=="string")return false;const key=projectPathKey(path);if(seen.has(key))return false;seen.add(key)}return true;
  }
  function utf8Size(value){
    let bytes=0;
    for(const character of value){const code=character.codePointAt(0);bytes+=code<=0x7f?1:code<=0x7ff?2:code<=0xffff?3:4}
    return bytes;
  }
  function validateBackupPayload(payload,existingCount,fileSize){
    if(typeof fileSize==="number"&&fileSize>25*1024*1024)return "O backup excede o limite de 25 MB";
    if(!payload||payload.format!=="forge-local-backup"||payload.formatVersion!==1||!Array.isArray(payload.projects)||!payload.projects.length||payload.projects.length>100)return "Formato de backup inválido ou não suportado";
    if(existingCount+payload.projects.length>100)return "O limite local de 100 projetos seria excedido";
    let totalBytes=0;
    for(const project of payload.projects){
      if(!validProjectRecord(project))return "O backup contém um projeto inválido";
      const entries=Object.entries(project.files);
      if(entries.length>500)return "Um projeto excede o limite de 500 arquivos";
      for(const [,content] of entries){
        const size=utf8Size(content);
        if(size>5*1024*1024)return "Um arquivo excede o limite de 5 MB";
        totalBytes+=size;
        if(totalBytes>20*1024*1024)return "O conteúdo total excede o limite de 20 MB";
      }
    }
    return null;
  }
  function createRestoredProjectCopies(payload,existingProjects,makeId){
    const usedNames=new Set(existingProjects.map(project=>project.name));
    return payload.projects.map((project,index)=>{
      const entries=Object.entries(project.files),baseName=String(project.name)+" (restaurado)";
      let name=index?baseName+" "+(index+1):baseName,suffix=2;
      while(usedNames.has(name))name=baseName+" "+suffix++;
      usedNames.add(name);
      const id=typeof makeId==="function"?makeId(index):"restore-"+Date.now()+"-"+index;
      return{id,name,updated:"Restaurado agora",activeFile:project.activeFile&&project.files[project.activeFile]!==undefined?project.activeFile:entries[0][0],files:{...project.files}};
    });
  }
  root.ForgeCore=Object.freeze({validProjectPath,validProjectRecord,isUuidV4,projectPathKey,hasPathCollision,validateBackupPayload,createRestoredProjectCopies});
})(typeof globalThis!=="undefined"?globalThis:this);
