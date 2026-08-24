// Coquille Tauri, sans aucune commande native : l'index, la vue habitat et le Pokédex
// tournent entièrement dans la page, et les données comme les 1 081 vignettes sont
// embarquées dans le bundle. Rien n'a donc à traverser l'IPC — d'où l'absence
// d'`invoke_handler` — et l'application fonctionne sans réseau.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("échec du lancement de l'Assistant Pokopia");
}
