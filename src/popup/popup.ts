import { validKey, iso6391Codes } from '../utils'

document.addEventListener('DOMContentLoaded', async () => {

    const openai = document.getElementById('openai-key') as HTMLInputElement
    const lang = document.getElementById('lang') as HTMLSelectElement
    const setting = document.getElementById('setting') as HTMLSelectElement
    const typeSelect = document.getElementById('type') as HTMLSelectElement


    // set language
    for (const [, value] of Object.entries(iso6391Codes)) {
        const option = document.createElement('option')
        option.value = value.code
        option.text = value.name
        lang.appendChild(option)
    }
    // set current language
    const [navigatorLanguageCode] = navigator.language.split('-')
    lang.value = navigatorLanguageCode

    const btnSave = document.getElementById('btn-save') as HTMLButtonElement
    const errorDiv = document.getElementById('error') as HTMLDivElement

    btnSave.onclick = async () => {
        // validate
        if (openai.value.trim() === '') {
            errorDiv.innerText = 'Please enter API key'
            errorDiv.style.display = 'block'
            return
        }
        if (openai.value.length !== 51 || !openai.value.startsWith('sk-')) {
            errorDiv.innerText = 'Invalid API key'
            errorDiv.style.display = 'block'
            return
        }

        const isValid = await validKey(openai.value)
        if (!isValid) {
            errorDiv.innerText = 'Incorrect API key provided'
            errorDiv.style.display = 'block'
        } else {
            errorDiv.style.display = 'none'
            errorDiv.innerText = ''

            const nativeLang = lang.value
            const settingPopup = setting.value
            const type = typeSelect.value

            chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' });
            chrome.storage.session.set({
                nativeLang,
                settingPopup,
                openaiKey: openai.value,
                type
            })
            window.close()
        }
    }
})
