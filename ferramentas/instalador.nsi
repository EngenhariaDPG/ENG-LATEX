; =============================================================================
; instalador.nsi - instalador do Eng LaTeX para Windows (NSIS 3)
; -----------------------------------------------------------------------------
; Gera release/EngLaTeX-<versão>-Instalador.exe a partir da pasta pacote/EngLaTeX
; (montada pelo ferramentas/empacotar.sh, que chama este script no final).
;
; Decisões:
; - Instala só para o usuário atual, em %LOCALAPPDATA%\Programs\EngLaTeX
;   (como o VS Code): não pede senha de administrador e o tectonic-cache
;   fica gravável ao lado do .exe.
; - Cria atalho no Menu Iniciar (sempre) e na Área de Trabalho (opcional).
; - Registra em "Aplicativos instalados" do Windows, com desinstalador.
; - Desinstalar NÃO apaga os projetos (Documentos\EngLaTeX).
; - Avisa se faltar o Microsoft Edge WebView2 Runtime.
;
; Compilar à mão (Linux: apt install nsis):
;   makensis -DVERSAO=1.3.1 -DPACOTE=pacote/EngLaTeX -DSAIDA=release/x.exe ferramentas/instalador.nsi
; =============================================================================

Unicode true
SetCompressor /SOLID lzma
SetCompressorDictSize 64

!ifndef VERSAO
  !error "Informe -DVERSAO=x.y.z"
!endif
!ifndef PACOTE
  !define PACOTE "..\pacote\EngLaTeX"
!endif
!ifndef SAIDA
  !define SAIDA "..\release\EngLaTeX-Instalador.exe"
!endif

!define NOME "Eng LaTeX"
!define EMPRESA "DPG Engenharia"
!define EXE "EngLaTeX.exe"
; Chave em "Aplicativos instalados" (HKCU: instalação por usuário)
!define CHAVE_DESINSTALAR "Software\Microsoft\Windows\CurrentVersion\Uninstall\EngLaTeX"

Name "${NOME} ${VERSAO}"
OutFile "${SAIDA}"
InstallDir "$LOCALAPPDATA\Programs\EngLaTeX"
InstallDirRegKey HKCU "Software\EngLaTeX" "Pasta"
RequestExecutionLevel user
BrandingText "${NOME} ${VERSAO} - ${EMPRESA}"

; Dados que aparecem em Propriedades > Detalhes do instalador
VIProductVersion "${VERSAO}.0"
VIAddVersionKey "ProductName" "${NOME}"
VIAddVersionKey "CompanyName" "${EMPRESA}"
VIAddVersionKey "FileDescription" "Instalador do ${NOME}"
VIAddVersionKey "FileVersion" "${VERSAO}"
VIAddVersionKey "ProductVersion" "${VERSAO}"
VIAddVersionKey "LegalCopyright" "${EMPRESA}"

; -----------------------------------------------------------------------------
; Interface (Modern UI 2)
; -----------------------------------------------------------------------------
!include "MUI2.nsh"
!include "FileFunc.nsh"

!define MUI_ICON "..\recursos\icone.ico"
!define MUI_UNICON "..\recursos\icone.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TEXT "Este assistente vai instalar o ${NOME} ${VERSAO}, editor e compilador LaTeX offline.$\r$\n$\r$\nNão é preciso ser administrador: o programa é instalado só para o seu usuário.$\r$\n$\r$\nSe o ${NOME} estiver aberto, ele será fechado. Seus projetos não são alterados."
!define MUI_FINISHPAGE_RUN "$INSTDIR\${EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "Abrir o ${NOME} agora"
!define MUI_FINISHPAGE_SHOWREADME "$INSTDIR\LEIA-ME.txt"
!define MUI_FINISHPAGE_SHOWREADME_TEXT "Ver o manual (LEIA-ME)"
!define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "PortugueseBR"

; -----------------------------------------------------------------------------
; Instalação
; -----------------------------------------------------------------------------

; Fecha o programa se estiver aberto (senão o .exe não pode ser substituído).
!macro FecharEngLaTeX
  nsExec::Exec 'taskkill /F /IM ${EXE}'
  Pop $0
  Sleep 500
!macroend

Section "${NOME} (obrigatório)" SecPrograma
  SectionIn RO
  !insertmacro FecharEngLaTeX

  SetOutPath "$INSTDIR"
  ; Tudo da pasta do pacote: .exe, tectonic, dicionários, cache LaTeX offline, licenças.
  File /r "${PACOTE}\*.*"
  WriteUninstaller "$INSTDIR\Desinstalar.exe"

  ; Atalho no Menu Iniciar
  CreateShortcut "$SMPROGRAMS\${NOME}.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\${EXE}" 0

  ; Registro em "Aplicativos instalados"
  WriteRegStr HKCU "Software\EngLaTeX" "Pasta" "$INSTDIR"
  WriteRegStr HKCU "${CHAVE_DESINSTALAR}" "DisplayName" "${NOME}"
  WriteRegStr HKCU "${CHAVE_DESINSTALAR}" "DisplayVersion" "${VERSAO}"
  WriteRegStr HKCU "${CHAVE_DESINSTALAR}" "Publisher" "${EMPRESA}"
  WriteRegStr HKCU "${CHAVE_DESINSTALAR}" "DisplayIcon" "$INSTDIR\${EXE}"
  WriteRegStr HKCU "${CHAVE_DESINSTALAR}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${CHAVE_DESINSTALAR}" "UninstallString" '"$INSTDIR\Desinstalar.exe"'
  WriteRegStr HKCU "${CHAVE_DESINSTALAR}" "QuietUninstallString" '"$INSTDIR\Desinstalar.exe" /S'
  WriteRegStr HKCU "${CHAVE_DESINSTALAR}" "URLInfoAbout" "https://github.com/EngenhariaDPG/ENG-LATEX"
  WriteRegDWORD HKCU "${CHAVE_DESINSTALAR}" "NoModify" 1
  WriteRegDWORD HKCU "${CHAVE_DESINSTALAR}" "NoRepair" 1
  ; Tamanho em KB (aparece na lista de aplicativos)
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKCU "${CHAVE_DESINSTALAR}" "EstimatedSize" "$0"
SectionEnd

Section "Atalho na Área de Trabalho" SecAtalho
  CreateShortcut "$DESKTOP\${NOME}.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\${EXE}" 0
SectionEnd

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SecPrograma} "O programa, o motor LaTeX (Tectonic), os pacotes LaTeX offline e os dicionários."
  !insertmacro MUI_DESCRIPTION_TEXT ${SecAtalho} "Cria um atalho do ${NOME} na Área de Trabalho."
!insertmacro MUI_FUNCTION_DESCRIPTION_END

; O Eng LaTeX usa o Microsoft Edge WebView2 (já vem no Windows 11 e no 10
; atualizado). Se faltar, oferece abrir a página de download.
Function .onInstSuccess
  ReadRegStr $0 HKLM "SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
  StrCmp $0 "" 0 fim
  ReadRegStr $0 HKCU "Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
  StrCmp $0 "" 0 fim
  MessageBox MB_YESNO|MB_ICONEXCLAMATION "O ${NOME} precisa do Microsoft Edge WebView2 Runtime, que não foi encontrado neste computador.$\r$\n$\r$\nAbrir a página de download da Microsoft agora?" IDNO fim
  ExecShell "open" "https://developer.microsoft.com/microsoft-edge/webview2/#download-section"
  fim:
FunctionEnd

; -----------------------------------------------------------------------------
; Desinstalação (mantém os projetos em Documentos\EngLaTeX)
; -----------------------------------------------------------------------------
Section "Uninstall"
  !insertmacro FecharEngLaTeX
  Delete "$SMPROGRAMS\${NOME}.lnk"
  Delete "$DESKTOP\${NOME}.lnk"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "${CHAVE_DESINSTALAR}"
  DeleteRegKey HKCU "Software\EngLaTeX"
  IfSilent +2
    MessageBox MB_ICONINFORMATION "O ${NOME} foi removido.$\r$\n$\r$\nSeus projetos, modelos e documentos continuam em Documentos\EngLaTeX."
SectionEnd
