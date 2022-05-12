import React, { useEffect, useState } from 'react'
import Styles from './styles.module.css'
import { Command } from '@tauri-apps/api/shell'
import { listen } from '@tauri-apps/api/event'

const Form: React.FC = () => {
    const [URL, setURL] = useState('https://www.youtube.com/watch?v=tH94YuQtg-8')
    const [title, setTitle] = useState('None')
    const [progress, setProgress] = useState(0)

    const DownloadMusic = async () => {
        const command = Command.sidecar('lib/test', [URL])
        command.stdout.on('data', async (line) => {
            const json = await JSON.parse(line)
            setTitle(json.title)
            setProgress(json.progress)
        })
    }

    const UpdateURL = (event: React.ChangeEvent<HTMLInputElement>) => {
        setURL(event.currentTarget.value)
    }

    useEffect(() => {
        listen('download', (event: { payload: string }) => {
            setURL(event.payload)
            const command = Command.sidecar('lib/test', [event.payload])
            command.stdout.on('data', async (line) => {
                const json = await JSON.parse(line)
                setTitle(json.title)
                setProgress(json.progress)
            })
            command.spawn()
        })
    }, [])

    return (
        <form className={Styles['form']}>
            <h2 className={Styles['title']}>Download music by YT URL</h2>
            <h3 className={Styles['title']}>{title}</h3>
            <div>{progress}</div>
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
