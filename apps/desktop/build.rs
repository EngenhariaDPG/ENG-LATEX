//! Script de compilação: embute ícone, manifesto e informações de versão no .exe (só Windows).
fn main() {
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        embed_resource::compile("recursos/app.rc", embed_resource::NONE)
            .manifest_optional()
            .unwrap();
    }
    println!("cargo:rerun-if-changed=recursos/app.rc");
    println!("cargo:rerun-if-changed=recursos/icone.ico");
}
