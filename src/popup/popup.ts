import { validKey, listModels, iso6391Codes, getDataFromStorage } from '../utils'

document.addEventListener('DOMContentLoaded', async () => {

    const openai = document.getElementById('openai-key') as HTMLInputElement
    const model = document.getElementById('model') as HTMLSelectElement
    const lang = document.getElementById('lang') as HTMLSelectElement
    const setting = document.getElementById('setting') as HTMLSelectElement
    const typeSelect = document.getElementById('type') as HTMLSelectElement
    const btnToggle = document.getElementById('btn-toggle') as HTMLSpanElement
    const eye = document.getElementById('eye') as HTMLImageElement

    const btnContinue = document.getElementById('btn-continue') as HTMLButtonElement
    const btnSave = document.getElementById('btn-save') as HTMLButtonElement
    const errorDiv = document.getElementById('error') as HTMLDivElement

    const data = await getDataFromStorage()
    if (data.openaiKey) {
        // edit
        btnContinue.style.display = 'none';
        btnSave.style.display = 'block';
        btnSave.innerText = 'Update'

        openai.value = data.openaiKey
        setting.value = data.settingPopup
        typeSelect.value = data.type

        const models = await listModels(data.openaiKey)
        // add model
        for (const [, value] of Object.entries(models.data)) {
            const option = document.createElement('option')
            option.value = value.id
            option.text = value.id
            model.appendChild(option)
        }
        model.value = data.model || 'gpt-3.5-turbo'

        // set language
        for (const [, value] of Object.entries(iso6391Codes)) {
            const option = document.createElement('option')
            option.value = value.code
            option.text = value.name
            lang.appendChild(option)
        }
        lang.value = data.nativeLang

        const elements = document.getElementsByClassName('form-control');
        for (let i = 0; i < elements.length; i++) {
            elements[i].classList.remove('hide');
        }

    }

    btnContinue.onclick = async () => {
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

        btnContinue.disabled = true

        const isValid = await validKey(openai.value)
        if (!isValid) {
            errorDiv.innerText = 'Incorrect API key provided'
            errorDiv.style.display = 'block'
            btnContinue.disabled = false
        } else {
            btnContinue.disabled = true
            errorDiv.style.display = 'none'
            errorDiv.innerText = ''

            openai.readOnly = true;
            const models = await listModels(openai.value)
            // add model
            for (const [, value] of Object.entries(models.data)) {
                const option = document.createElement('option')
                option.value = value.id
                option.text = value.id
                model.appendChild(option)
            }
            // set default value
            model.value = 'gpt-3.5-turbo'

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

            btnContinue.style.display = 'none';
            btnSave.style.display = 'block';
            const elements = document.getElementsByClassName('form-control');
            for (let i = 0; i < elements.length; i++) {
                elements[i].classList.remove('hide');
            }
        }
    }

    btnSave.onclick = async () => {
        btnSave.disabled = true
        const nativeLang = lang.value
        const settingPopup = setting.value
        const type = typeSelect.value

        // check case edit
        const isValid = await validKey(openai.value)
        if (!isValid) {
            errorDiv.innerText = 'Incorrect API key provided'
            errorDiv.style.display = 'block'
            btnSave.disabled = false
            return
        } else {
            errorDiv.style.display = 'none'
       
            chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' });
            chrome.storage.session.set({
                nativeLang,
                settingPopup,
                openaiKey: openai.value,
                model: model.value,
                type
            })
            window.close()
        }
    }
    setting.onchange = (event) => {
        const target = event.target as HTMLSelectElement;
        if (target.value === 'immediately') {
            document.getElementById('setting-desc').innerText = 'Display popup immediately'
        } else if ((target.value === 'hide')) {
            document.getElementById('setting-desc').innerText = 'Don\'t display icon or popup'
        } else {
            document.getElementById('setting-desc').innerText = 'Display icon that I can click to show popup'
        }
    }

    btnToggle.onclick = () => {
        if (openai.type === 'text') {
            openai.type = 'password'
            eye.src="../icons/eye-off.svg"
        } else {
            openai.type = 'text'
            eye.src="../icons/eye-on.svg"
        }
    }
})
