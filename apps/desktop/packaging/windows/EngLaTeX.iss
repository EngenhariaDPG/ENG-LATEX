#define MyAppName "Eng LaTeX"
#define MyAppVersion "1.1.0"
#define MyAppPublisher "EngenhariaDPG"
#define MyAppExeName "EngLaTeX.exe"

[Setup]
AppId={{E4C0C42D-0D40-4E7C-9C09-0DBB31A7A7E1}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\Programs\EngLaTeX
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesInstallIn64BitMode=x64
OutputDir=..\..\..\..\dist\desktop
OutputBaseFilename=EngLaTeX-{#MyAppVersion}-setup-x64
SetupIconFile=..\..\recursos\icone.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Criar atalho na Área de Trabalho"; GroupDescription: "Atalhos:"; Flags: unchecked

[Files]
Source: "payload\EngLaTeX.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "payload\WebView2Loader.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "payload\tectonic.exe"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "payload\dicionarios\*"; DestDir: "{app}\dicionarios"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist
Source: "payload\tectonic-cache\*"; DestDir: "{app}\tectonic-cache"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist
Source: "payload\LEIA-ME.txt"; DestDir: "{app}"; Flags: ignoreversion isreadme

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Executar {#MyAppName}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}"
