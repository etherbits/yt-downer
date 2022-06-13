import React, { MutableRefObject, useEffect, useRef, useState } from 'react'
import { createDir, writeFile } from '@tauri-apps/api/fs'
import { appDir } from '@tauri-apps/api/path'
import DownloadSVG from './svgs/download'
import SaveSVG from './svgs/save'
import Styles from './app.module.css'
import './global.css'

type Downloads = {
    [uuid: string]: {
        title: string
        progress: number
        status: string
        thumbnail_url: string
    }
}

const App: React.FC = () => {
    const [URL, setURL] = useState('')
    const [path, setPath] = useState('')
    const [downloads, setDownloads] = useState<Downloads>({})

    const socketRef: MutableRefObject<WebSocket | null> = useRef(null)
    const isMountRef = useRef(false)

    const DownloadMusic = async () => {
        if (!socketRef.current) return
        const request_json = {
            path: 'default',
            url: URL,
        }
        socketRef.current.send(JSON.stringify(request_json))
    }

    const UpdateURL = (event: React.ChangeEvent<HTMLInputElement>) => {
        setURL(event.currentTarget.value)
    }

    const UpdatePath = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPath(event.currentTarget.value)
    }

    const SetPath = async () => {
        createDir(`${await appDir()}configs\\settings`, { recursive: true })
        await writeFile({
            path: `${await appDir()}configs\\settings\\default_path.txt`,
            contents: path,
        })
            .then((val) => {
                console.log(val)
            })
            .catch((err) => {
                console.log(err)
            })
        console.log('path')
    }

    useEffect(() => {
        if (isMountRef.current) return
        isMountRef.current = true

        socketRef.current = new WebSocket('ws://127.0.0.1:8080')

        socketRef.current.onmessage = async ({ data }) => {
            const download_data = await JSON.parse(data)

            const { uuid, output } = download_data
            const json = await JSON.parse(output)
            const temp = downloads
            temp[uuid] = json

            setDownloads({ ...temp })

            if (json.status !== 'starting') return
        }
    }, [path, downloads])

    return (
        <div className={Styles['app']}>
            <h1 className={Styles['list-title']}>DOWNLOADS</h1>
            <ul className={Styles['download-list']}>
                {Object.entries(downloads)
                    .reverse()
                    .map(([uuid, download]) => {
                        if (!download) return <React.Fragment></React.Fragment>
                        return (
                            <li key={uuid} className={Styles['download-card']}>
                                <div className={Styles['container']}>
                                    {download.thumbnail_url !== 'none' && (
                                        <img
                                            className={Styles['image']}
                                            src={download.thumbnail_url}
                                            alt={download.title}
                                        />
                                    )}
                                    {download.thumbnail_url === 'none' && (
                                        <div className={Styles['image-placeholder']} />
                                    )}
                                    <div className={Styles['right-side']}>
                                        <div className={Styles['details']}>
                                            <h6 className={Styles['title']}>{download.title}</h6>
                                        </div>
                                    </div>
                                </div>

                                <div className={Styles['progress-bar-empty']}>
                                    <div
                                        className={Styles['progress-bar-filled']}
                                        style={{ width: `${download.progress * 100}%` }}
                                    ></div>
                                    <span className={Styles['status']}>{download.status}</span>
                                </div>
                            </li>
                        )
                    })}
            </ul>
      
            <div className={Styles['controls']}>
                <div className={Styles['input-group']}>
                    <input
                        className={Styles['input']}
                        type={'text'}
                        placeholder='Youtube URL'
                        value={URL}
                        onChange={UpdateURL}
                    />
                    <button className={Styles['button']} type='button' onClick={DownloadMusic}>
                        <DownloadSVG/>
                    </button>
                </div>
                <div className={Styles['input-group']}>
                    <input
                        className={Styles['input']}
                        type={'text'}
                        placeholder='path'
                        value={path}
                        onChange={UpdatePath}
                    />
                    <button className={`${Styles['button']} ${Styles['secondary-button']}`} type='button' onClick={SetPath}>
                        <SaveSVG/>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default App
