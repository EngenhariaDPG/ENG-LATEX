(function(root){
  "use strict";
  function validProjectPath(value){
    if(typeof value!=="string")return false;
    const path=value,parts=path.split("/");
    if(!path||path.length>240||path.startsWith("/")||path.includes("\\")||path.includes(":")||/[<>:"|?*\u0000-\u001f\u007f]/.test(path)||parts.length>20)return false;
    return parts.every(part=>part&&part===part.trim()&&part!=="."&&part!==".."&&part!=="__proto__"&&part!=="constructor"&&part!=="prototype"&&!/[. ]$/.test(part)&&! /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(part)&&part.length<=120);
  }
  function validProjectRecord(project){
    if(!project||typeof project!=="object"||typeof project.id!=="string"||!project.id.trim()||typeof project.name!=="string"||!project.name.trim())return false;
    const files=project.files;
    if(!files||typeof files!=="object"||Array.isArray(files)||(Object.getPrototypeOf(files)!==Object.prototype&&Object.getPrototypeOf(files)!==null))return false;
    const paths=Object.keys(files);
    return paths.length>0&&paths.every(path=>validProjectPath(path)&&typeof files[path]==="string");
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
  root.ForgeCore=Object.freeze({validProjectPath,validProjectRecord,validateBackupPayload});
})(typeof globalThis!=="undefined"?globalThis:this);
