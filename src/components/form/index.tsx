import React, { useState } from 'react'
import Styles from './styles.module.css'
import { Command } from '@tauri-apps/api/shell'
declare global {
    interface Window {
        __TAURI__: any
    }
}
const Form: React.FC = () => {
    const [URL, setURL] = useState('')

    const DownloadMusic = async (event: React.FormEvent<HTMLButtonElement>) => {
        const command = new Command('yt-download', [
            'arg0',
            'arg1',
            'D:\\Test\\%(title)s.%(ext)s',
            URL,
        ])
        console.log((await command.execute()).stdout)
        console.log(await command.execute())
    }

    const UpdateURL = (event: React.ChangeEvent<HTMLInputElement>) => {
        setURL(event.currentTarget.value)
    }

    return (
        <form className={Styles['form']}>
            <h2 className={Styles['title']}>Download music by YT URL</h2>
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
