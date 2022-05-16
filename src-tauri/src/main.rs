#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{ 
    api::process::{Command, CommandEvent}, 
    Manager,  Window
  }; 
use std::sync::Mutex;

struct MyState(Mutex<i32>);

#[derive(Clone, serde::Serialize)]
struct Payload {
    index: i32,
    body: String
}

#[tauri::command]
async fn download(window: Window, path: String, url: String, state: tauri::State<'_, MyState>) -> Result<bool, bool>  {
    let (mut rx, mut _child) = Command::new_sidecar("yt-download")
    .unwrap()
    .args([path.clone(), url.clone()])
    .spawn()
    .unwrap();

    let current_index = state.0.lock().unwrap().clone(); 
    *state.0.lock().unwrap() += 1;
    
    while let Some(event) = rx.recv().await {
        if let CommandEvent::Stdout(ref line) = event {
            window.emit("download-event", Payload { index: current_index, body: line.clone()}).unwrap();
        }
    }

    
    Ok(true)
}

async fn listener(window: Window){
    let (mut rx, mut _child) = Command::new_sidecar("listener")
    .unwrap()
    .spawn()
    .unwrap();
    
    while let Some(event) = rx.recv().await {
        if let CommandEvent::Stdout(ref line) = event {
                window.emit("request-event", line).unwrap();
            }
        }   
}

fn main() {
    tauri::Builder::default()
    .setup(|app| {
        let main_window = app.get_window("main").unwrap();
        
        tauri::async_runtime::spawn(
            listener(main_window)
        );
        
        Ok(())
      })
    .manage( MyState(Default::default()) )
    .invoke_handler(tauri::generate_handler![download])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}