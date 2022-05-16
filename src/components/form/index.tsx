import React, { useEffect, useState, useRef } from 'react'
import Styles from './styles.module.css'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/tauri'

type Download = {
    title: string
    progress: number
    status: string
}

const Form: React.FC = () => {
    const [URL, setURL] = useState('https://www.youtube.com/watch?v=tH94YuQtg-8')
    const [path] = useState('D:/Test/')
    const [downloads, setDownloads] = useState<Download[]>([])

    const isMount = useRef(false)

    const DownloadMusic = async () => {
        invoke('download', { path: path, url: URL })
    }

    const UpdateURL = (event: React.ChangeEvent<HTMLInputElement>) => {
        setURL(event.currentTarget.value)
    }

    useEffect(() => {
        if (isMount.current) return
        isMount.current = true

        listen('request-event', async (event: { payload: string }) => {
            invoke('download', { path: path, url: event.payload })
        })

        listen('download-event', async (event: { payload: { index: number; body: string } }) => {
            const line = event.payload.body
            const json = await JSON.parse(line)

            const download: Download = {
                title: json.title,
                progress: json.progress,
                status: json.status,
            }

            const temp = downloads
            temp[event.payload.index] = download

            setDownloads([...downloads])
        })
    }, [path, downloads])

    return (
        <form className={Styles['form']}>
            <h2 className={Styles['title']}>Download music by YT URL</h2>
            {downloads.map((download) => {
                if (!download) return <React.Fragment></React.Fragment>
                return (
                    <div>
                        <h3 className={Styles['title']}>
                            {download.title} status: {download.status}
                        </h3>
                        <div className={Styles['progress-bar-empty']}>
                            <div
                                className={Styles['progress-bar-fill']}
                                style={{ width: `${download.progress * 100}%` }}
                            ></div>
                        </div>
                    </div>
                )
            })}

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
