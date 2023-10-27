type QA = { question: string, answer: string }

export interface StorageLocal {
    openaiKey: string; 
    nativeLang?: string; 
    settingPopup?: string, 
    type?: string, 
    model?: string, 
    id?: string
}

// Create a random salt
const generateSalt = (): Uint8Array => crypto.getRandomValues(new Uint8Array(16));
// Derive a cryptographic key from a password using PBKDF2
const getKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
    const encoder = new TextEncoder();
    const importedKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );
  
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      importedKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
};

const arrayBufferToBase64 = (buffer: Uint8Array): string => {
    return btoa(String.fromCharCode(...buffer));
}
  
// Convert Base64 string to Uint8Array
const base64ToArrayBuffer = (base64: string): Uint8Array => {
let binaryString = atob(base64);
let length = binaryString.length;
let bytes = new Uint8Array(length);
for (let i = 0; i < length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
}
return bytes;
}

// Encrypt a piece of data
export const encrypt = async (data: string, password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const salt = generateSalt();
    const key = await getKey(password, salt);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await crypto.subtle.encrypt(
        {
        name: "AES-GCM",
        iv: iv,
        },
        key,
        encoder.encode(data)
    );

    const combined = new Uint8Array(salt.byteLength + iv.byteLength + encryptedData.byteLength);
    combined.set(new Uint8Array(salt), 0);
    combined.set(new Uint8Array(iv), salt.byteLength);
    combined.set(new Uint8Array(encryptedData), salt.byteLength + iv.byteLength);
    
    return arrayBufferToBase64(combined);
};
// Decrypt a piece of data
export const decrypt = async (data: string, password: string): Promise<string> => {
    if (!data) return '';
    const dataArray = base64ToArrayBuffer(data);

    const decoder = new TextDecoder();
    const salt = dataArray.slice(0, 16);
    const iv = dataArray.slice(16, 28);
    const encryptedData = dataArray.slice(28);
    const key = await getKey(password, salt);
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      encryptedData
    );
  
    return decoder.decode(decryptedData);
};

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

export const generateID = (length: number): string => {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
};

export const getDataFromStorage = (): Promise<StorageLocal> => new Promise((resolve, reject) => {
    chrome.storage.local.get(['nativeLang', 'settingPopup', 'openaiKey', 'type', 'model', 'id'], async result => {
        if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
        } else {

            const openaiKey = await decrypt(result.openaiKey, result.id)
            resolve({
                openaiKey: openaiKey || '',
                model: result.model || 'gpt-3.5-turbo',
                nativeLang: result.nativeLang || 'en',
                settingPopup: result.settingPopup || 'display_icon',
                type: result.type || 'chatgpt-translate',
                id: result.id,
            })
        }
    })
})

export const updateHistory = (uuidKey: string, chat: QA): Promise<void> => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([`${uuidKey}`], (result) => {
            const chatHistory: QA[] = result[uuidKey] || [];
            chatHistory.push(chat);      
            
            // Ensure only the last 8 chats are kept
            const MAX_CHATS = 8;
            while (chatHistory.length > MAX_CHATS) {
                chatHistory.shift();  // Remove the oldest chat
            }
            // Save the updated chatHistory back to storage
            chrome.storage.local.set({ [uuidKey]: chatHistory }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    });
};
export const getChatHistory = (uuidKey: string): Promise<QA[] | []> => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([`${uuidKey}`], (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                const chatHistory: QA[] = result[uuidKey] || [];
                resolve(chatHistory);
            }
        });
    });
};
export const removeChatHistory = (uuidKey: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        // First, retrieve the current chatHistory from storage
        chrome.storage.local.remove([`${uuidKey}`], () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            }
            resolve();
        });
    });
};
