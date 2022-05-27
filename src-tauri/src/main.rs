#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{ 
    api::process::{Command, CommandEvent}
  }; 
use std::sync::Mutex;
use std::{
    collections::HashMap,
    env,
    net::SocketAddr,
    sync::{Arc},
};
use uuid::Uuid;
use futures_channel::mpsc::{unbounded, UnboundedSender};
use futures_util::{future, pin_mut, stream::TryStreamExt, StreamExt};
use tokio::net::{TcpListener, TcpStream};
use tungstenite::protocol::Message;

type Tx = UnboundedSender<Message>;
type PeerMap = Arc<Mutex<HashMap<SocketAddr, Tx>>>;

struct MyState(Mutex<i32>);

#[derive(Clone, serde::Serialize, serde::Deserialize)]
struct DownloadArgs {
    path: String,
    url: String,
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
struct DownloadOutput {
    uuid: String,
    output: String,
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
struct OutputData {
    status: String,
    progress: f32,
    title: String,
    thumbnail_url: String
}

async fn handle_connection(peer_map: PeerMap, raw_stream: TcpStream, addr: SocketAddr) {
    println!("Incoming TCP connection from: {}", addr);

    let ws_stream = tokio_tungstenite::accept_async(raw_stream)
        .await
        .expect("Error during the websocket handshake occurred");
    println!("WebSocket connection established: {}", addr);

    // Insert the write part of this peer to the peer map.
    let (tx, rx) = unbounded();
    peer_map.lock().unwrap().insert(addr, tx);

    let (outgoing, incoming) = ws_stream.split();

    println!("{:?}, {:?}", incoming, peer_map);
    let broadcast_incoming = incoming.try_for_each(|msg| {
        {
            println!("Received a message from {}: {}", addr, msg.to_text().unwrap());
            let download_args_opt: Option<DownloadArgs> = match serde_json::from_str(&msg.to_string()) {
                Ok(json) => json,
                Err(_) => None
            };
            if let Some(mut download_args) =  download_args_opt {
                
                if download_args.path == "default" {
                    let path = std::path::PathBuf::from("C:/Users/nikaq/AppData/Roaming/yt-downer/configs/settings/default_path.txt");
                    let default_path: String = String::from_utf8_lossy(&std::fs::read(path).unwrap()).to_string();
                    download_args.path = default_path.clone();
                } 
                
                let peers = peer_map.lock().unwrap();
                let peers_copy = peers.clone();
                
                std::thread::spawn(move || {
                    let peers = peers_copy;
                    let uuid = Uuid::new_v4();

                    let initial_data = OutputData {
                        status: "fetching".to_string(),
                        progress: 0.0,
                        title: "none".to_string(),
                        thumbnail_url: "none".to_string()
                    };
                    
                    let initial_output = DownloadOutput {
                        uuid: uuid.to_string(),
                        output: serde_json::to_string(&initial_data).unwrap(),
                    }; 

                    for peer in &peers {
                        let (_addr, recp) = peer;
                        recp.unbounded_send(tungstenite::Message::Text(serde_json::to_string(&initial_output).unwrap())).unwrap();
                    }
                    
                    let (mut rx, mut _child) = Command::new_sidecar("yt-download")
                    .unwrap()
                    .args([download_args.path, download_args.url])
                    .spawn()
                    .unwrap();

                    while let Some(event) = rx.blocking_recv() {
                        if let CommandEvent::Stdout(ref line) = event {
                            let download_output = DownloadOutput {
                                uuid: uuid.to_string(),
                                output: line.clone(),
                            }; 
                            let json_string = serde_json::to_string(&download_output).unwrap();

                            for peer in &peers {
                                let (_addr, recp) = peer;
                                recp.unbounded_send(tungstenite::Message::Text(json_string.clone())).unwrap();
                            }
                        }
                    }
                });
            }
            else{
                println!("Invalid Request");
            }
               
            future::ok(())
        }
    });

    let receive_from_others = rx.map(Ok).forward(outgoing);

    pin_mut!(broadcast_incoming, receive_from_others);
    future::select(broadcast_incoming, receive_from_others).await;

    println!("{} disconnected", &addr);
    peer_map.lock().unwrap().remove(&addr);
}

async fn listener(){
    let addr = env::args().nth(1).unwrap_or_else(|| "127.0.0.1:8080".to_string());

    let state = PeerMap::new(Mutex::new(HashMap::new()));

    // Create the event loop and TCP listener we'll accept connections on.
    let try_socket = TcpListener::bind(&addr).await;
    let listener = try_socket.expect("Failed to bind");
    println!("Listening on: {}", addr);

    // Let's spawn the handling of each connection in a separate task.
    while let Ok((stream, addr)) = listener.accept().await {
        tokio::spawn(handle_connection(state.clone(), stream, addr));
    }

}

fn main() {
    tauri::Builder::default()
    .setup(|_app| {
        
        tauri::async_runtime::spawn(
            listener()
        );
        
        Ok(())
      })
    .manage( MyState(Default::default()) )
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}