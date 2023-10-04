type QA = { question: string, answer: string };

export const validKey = async (key: string): Promise<any> => {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'user', content: 'Hi' },
                ],
            }),
        })
        return response.status === 200 || response.status === 201
    } catch (e) {
        return false
    }
}

export const listModels = async (key: string): Promise<{ success: boolean, data?: Array<any>, error?: string }> => {
    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${key}`,
            },
        })
        if (!response.ok) {
            return {
                success: false,
                error: 'Incorrect API key provided',
            }
        }
        const data = await response.json()
        const filteredModels = data.data.filter((item: { id: string }) => item.id.startsWith('gpt-4') || item.id.startsWith('gpt-3.5'))
        return {
            success: true,
            data: filteredModels,
        }
    } catch (error) {
        return {
            success: false,
            error: error.message,
        }
    }
}

export const iso6391Codes = [
    { code: 'af', name: 'Afrikaans' },
    { code: 'sq', name: 'Albanian' },
    { code: 'am', name: 'Amharic' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hy', name: 'Armenian' },
    { code: 'az', name: 'Azerbaijani' },
    { code: 'eu', name: 'Basque' },
    { code: 'be', name: 'Belarusian' },
    { code: 'bn', name: 'Bengali' },
    { code: 'bs', name: 'Bosnian' },
    { code: 'bg', name: 'Bulgarian' },
    { code: 'ca', name: 'Catalan' },
    { code: 'ceb', name: 'Cebuano' },
    { code: 'ny', name: 'Chichewa' },
    { code: 'zh', name: 'Chinese (Simplified)' },
    { code: 'zh-Hant', name: 'Chinese (Traditional)' },
    { code: 'co', name: 'Corsican' },
    { code: 'hr', name: 'Croatian' },
    { code: 'cs', name: 'Czech' },
    { code: 'da', name: 'Danish' },
    { code: 'nl', name: 'Dutch' },
    { code: 'en', name: 'English' },
    { code: 'eo', name: 'Esperanto' },
    { code: 'et', name: 'Estonian' },
    { code: 'fil', name: 'Filipino' },
    { code: 'fi', name: 'Finnish' },
    { code: 'fr', name: 'French' },
    { code: 'fy', name: 'Frisian' },
    { code: 'gl', name: 'Galician' },
    { code: 'ka', name: 'Georgian' },
    { code: 'de', name: 'German' },
    { code: 'el', name: 'Greek' },
    { code: 'gu', name: 'Gujarati' },
    { code: 'ht', name: 'Haitian Creole' },
    { code: 'ha', name: 'Hausa' },
    { code: 'haw', name: 'Hawaiian' },
    { code: 'iw', name: 'Hebrew' },
    { code: 'hi', name: 'Hindi' },
    { code: 'hmn', name: 'Hmong' },
    { code: 'hu', name: 'Hungarian' },
    { code: 'is', name: 'Icelandic' },
    { code: 'ig', name: 'Igbo' },
    { code: 'id', name: 'Indonesian' },
    { code: 'ga', name: 'Irish' },
    { code: 'it', name: 'Italian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'jw', name: 'Javanese' },
    { code: 'kn', name: 'Kannada' },
    { code: 'kk', name: 'Kazakh' },
    { code: 'km', name: 'Khmer' },
    { code: 'rw', name: 'Kinyarwanda' },
    { code: 'ko', name: 'Korean' },
    { code: 'ku', name: 'Kurdish' },
    { code: 'ky', name: 'Kyrgyz' },
    { code: 'lo', name: 'Lao' },
    { code: 'la', name: 'Latin' },
    { code: 'lv', name: 'Latvian' },
    { code: 'lt', name: 'Lithuanian' },
    { code: 'lb', name: 'Luxembourgish' },
    { code: 'mk', name: 'Macedonian' },
    { code: 'mg', name: 'Malagasy' },
    { code: 'ms', name: 'Malay' },
    { code: 'ml', name: 'Malayalam' },
    { code: 'mt', name: 'Maltese' },
    { code: 'mi', name: 'Maori' },
    { code: 'mr', name: 'Marathi' },
    { code: 'mn', name: 'Mongolian' },
    { code: 'my', name: 'Myanmar (Burmese)' },
    { code: 'ne', name: 'Nepali' },
    { code: 'no', name: 'Norwegian' },
    { code: 'ps', name: 'Pashto' },
    { code: 'fa', name: 'Persian' },
    { code: 'pl', name: 'Polish' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'pa', name: 'Punjabi' },
    { code: 'ro', name: 'Romanian' },
    { code: 'ru', name: 'Russian' },
    { code: 'sm', name: 'Samoan' },
    { code: 'gd', name: 'Scots Gaelic' },
    { code: 'sr', name: 'Serbian' },
    { code: 'st', name: 'Sesotho' },
    { code: 'sn', name: 'Shona' },
    { code: 'sd', name: 'Sindhi' },
    { code: 'si', name: 'Sinhala' },
    { code: 'sk', name: 'Slovak' },
    { code: 'sl', name: 'Slovenian' },
    { code: 'so', name: 'Somali' },
    { code: 'es', name: 'Spanish' },
    { code: 'su', name: 'Sundanese' },
    { code: 'sw', name: 'Swahili' },
    { code: 'sv', name: 'Swedish' },
    { code: 'tg', name: 'Tajik' },
    { code: 'ta', name: 'Tamil' },
    { code: 'te', name: 'Telugu' },
    { code: 'th', name: 'Thai' },
    { code: 'tr', name: 'Turkish' },
    { code: 'uk', name: 'Ukrainian' },
    { code: 'ur', name: 'Urdu' },
    { code: 'ug', name: 'Uyghur' },
    { code: 'uz', name: 'Uzbek' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'cy', name: 'Welsh' },
    { code: 'xh', name: 'Xhosa' },
    { code: 'yi', name: 'Yiddish' },
    { code: 'yo', name: 'Yoruba' },
    { code: 'zu', name: 'Zulu' },
]

export const getDataFromStorage = (): Promise<{ openaiKey: string; nativeLang?: string; settingPopup?: string, type?: string }> => new Promise((resolve, reject) => {
    chrome.storage.session.get(['nativeLang', 'settingPopup', 'openaiKey'], result => {
        if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
        } else {
            resolve({
                openaiKey: result.openaiKey || '',
                nativeLang: result.nativeLang || 'en',
                settingPopup: result.settingPopup || 'display_icon',
                type: result.type || 'translate',
            })
        }
    })
})
export const getChatHistory = (): Promise<{ uuid: Array<{question: string, answer: string}> }> => new Promise((resolve, reject) => {
    chrome.storage.local.get(['uuid', 'settingPopup'], result => {
        if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
        } else {
            resolve({
                uuid: result.uuid || [],
            })
        }
    })
})

export const updateHistory = (question: string, answer: string): Promise<QA> => {
    return new Promise((resolve) => {
        chrome.storage.local.get(['uuid'], (result: { uuid?: QA[] }) => {
            // Get the current uuid array, or use an empty array if it doesn't exist
            const currentUuidArray: QA[] = result.uuid || [];
            
            // Append the new object
            currentUuidArray.push({ question, answer });
            
            // Save the updated uuid array back to storage
            chrome.storage.local.set({uuid: currentUuidArray}, () => {
                console.log('Uuid updated to ', currentUuidArray);
                
                resolve({ question, answer });
            });
        });
    });
};

