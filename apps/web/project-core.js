(function(root){
  "use strict";
  function validProjectPath(value){
    if(typeof value!=="string")return false;
    const path=value.trim(),parts=path.split("/");
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
  root.ForgeCore=Object.freeze({validProjectPath,validProjectRecord});
})(typeof globalThis!=="undefined"?globalThis:this);
