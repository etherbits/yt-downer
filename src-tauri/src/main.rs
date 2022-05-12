#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::process::{Command, Stdio};
use tauri::{Manager, Window};
use std::io::{BufReader, BufRead};

async fn listener(window: Window){
    let mut cmd = Command::new("lib/listener")
        .stdout(Stdio::piped())
        .spawn()
        .unwrap();

    {
        let stdout = cmd.stdout.as_mut().unwrap();
        let stdout_reader = BufReader::new(stdout);
        let stdout_lines = stdout_reader.lines();

        for line in stdout_lines {
            window.emit("download", line.as_ref().unwrap());
            println!("{}", line.unwrap());
        }
    }

    cmd.wait().unwrap();
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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}