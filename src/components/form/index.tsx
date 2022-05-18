import React, { useEffect, useState, useRef, MutableRefObject } from 'react'
import Styles from './styles.module.css'
import { writeFile, createDir } from '@tauri-apps/api/fs'
import { appDir } from '@tauri-apps/api/path'

type Downloads = {
    [uuid: string]: {
        title: string
        progress: number
        status: string
    }
}

declare global {
    interface Window {
        dwn: () => void
    }
}

const Form: React.FC = () => {
    const [URL, setURL] = useState('https://www.youtube.com/watch?v=tH94YuQtg-8')
    const [path] = useState('D:/Test/')
    const [downloads, setDownloads] = useState<Downloads>({})

    const socketRef: MutableRefObject<WebSocket | null> = useRef(null)
    const isMountRef = useRef(false)

    const DownloadMusic = async () => {
        if(!socketRef.current) return
        const request_json = {
            path: 'default',
            url: URL,
        }
        socketRef.current.send(JSON.stringify(request_json))
    }

    const UpdateURL = (event: React.ChangeEvent<HTMLInputElement>) => {
        setURL(event.currentTarget.value)
    }

    const SetPath = async () => {
        const settingsJSON = {
            path: path,
        }
        createDir(`${await appDir()}configs\\settings`, { recursive: true })
        await writeFile({
            path: `${await appDir()}configs\\settings\\settings.json`,
            contents: JSON.stringify(settingsJSON),
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

            const {uuid, output} = download_data
            const json = await JSON.parse(output)
            const temp = downloads
            temp[uuid] = json
            
            setDownloads({...temp})
        }

        // listen('download-event', async (event: { payload: { index: number; body: string } }) => {
        //     const line = event.payload.body
        //     const json = await JSON.parse(line)

        //     const download: Download = {
        //         title: json.title,
        //         progress: json.progress,
        //         status: json.status,
        //     }

        //     const temp = downloads
        //     temp[event.payload.index] = download

        //     setDownloads([...downloads]
        // })
    }, [path, downloads])

    return (
        <form className={Styles['form']}>
            <h2 className={Styles['title']}>Download music by YT URL</h2>
            <ul>

            {Object.entries(downloads).map(([uuid, download]) => {
                if (!download) return <React.Fragment></React.Fragment>
                return (
                    <li key={uuid}>
                        <h3 className={Styles['title']}>
                            {download.title} status: {download.status}
                        </h3>
                        <div className={Styles['progress-bar-empty']}>
                            <div
                                className={Styles['progress-bar-fill']}
                                style={{ width: `${download.progress * 100}%` }}
                                ></div>
                        </div>
                    </li>
                )
            })}
            </ul>

            <input
                className={Styles['url-input']}
                type={'text'}
                placeholder='URL'
                onChange={UpdateURL}
            />
            <button className={Styles['submit']} type='button' onClick={DownloadMusic}>
                DOWNLOAD
            </button>
        </form>
    )
}

export default Form
