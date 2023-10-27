
declare var Tesseract: any;

import classes from './index.module.css';

type QA = { question: string, answer: string };
type Status = 'stream' | 'done' | 'error'

interface Coordinates {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
}
interface Message {
    status?: Status;
    token?: string;
    uuid?: string;
    chat?: QA;
    id?: string;
    type?: string;
}

let iconDiv: HTMLElement = null
let popupDiv: HTMLElement = null
let port = null as chrome.runtime.Port
let currentPortName = null as string
let selecting = false;
let startX: number, startY: number, endX: number, endY: number;

const iso6391Codes = [
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

const iconID = 'gh-chatgpt-wizard-icon'
const defaultID = 'gh-chatgpt-wizard-default'
const menuID = 'gh-chatgpt-wizard-menu'
const subMenuID = 'gh-chatgpt-wizard-submenu'
const subTranslate = 'gh-chatgpt-wizard-translate'
const subExplain = 'gh-chatgpt-wizard-explain'
const subSummarize = 'gh-chatgpt-wizard-summarize'
const subRewrite = 'gh-chatgpt-wizard-rewrite'
const subGrammar = 'gh-chatgpt-wizard-grammar'
const subAsk = 'gh-chatgpt-wizard-ask'
const textareaID = 'gh-chatgpt-wizard-textarea'
const popupID = 'gh-chatgpt-wizard-popup'
const popupHeadID = 'gh-chatgpt-wizard-popup-head'
const languageID = 'gh-chatgpt-wizard-language'
const footerID = 'gh-chatgpt-wizard-popup-footer'
const boxChatID = 'gh-chatgpt-wizard-boxchat'
const boxAnswerClass = 'gh-chatgpt-wizard-answer'
const typingID = 'gh-chatgpt-wizard-typing'
const iconCloseID = 'gh-chatgpt-wizard-icon-close'
const btnSendID = 'gh-chatgpt-wizard-send'
const askHeadID = 'gh-chatgpt-wizard-ask-head'
const stopStreamID = 'gh-chatgpt-wizard-stop-stream'
const overlayID = 'gh-chatgpt-wizard-overlay'
const selectionID = 'gh-chatgpt-wizard-selection'
const contentWidth = 500
const contentAskWidth = 500

const iconStop = chrome.runtime.getURL('icons/stop.svg')
const icon64URL = chrome.runtime.getURL('icons/icon-64.png')
const iconTranslate = chrome.runtime.getURL('icons/icon-translate.svg')
const iconExplain = chrome.runtime.getURL('icons/icon-explain.svg')
const iconSummarize = chrome.runtime.getURL('icons/icon-summarize.svg')
const iconEdit = chrome.runtime.getURL('icons/icon-edit.svg')
const iconGrammar = chrome.runtime.getURL('icons/icon-grammar.svg')
const iconAsk = chrome.runtime.getURL('icons/icon-ask.svg')
const iconClose = chrome.runtime.getURL('icons/close.svg')
const iconCopy = chrome.runtime.getURL('icons/copy.svg')

const removeChatHistory = (uuidKey: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.remove([`${uuidKey}`], () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            }
            resolve();
        });
    });
};

const getDataFromStorage = (): Promise<{ openaiKey: string; nativeLang?: string; settingPopup?: string, type?: string, model?: string, id?: string }> => new Promise((resolve, reject) => {
    chrome.storage.local.get(['nativeLang', 'settingPopup', 'openaiKey', 'type', 'model', 'id'], result => {
        if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
        } else {
            resolve({
                openaiKey: result.openaiKey || '',
                model: result.model || 'gpt-3.5-turbo',
                nativeLang: result.nativeLang || 'en',
                settingPopup: result.settingPopup || 'display_icon',
                type: result.type || 'chatgpt-translate',
                id: result.id || 'default'
            })
        }
    })
})

const handleAnswer = (message: Message) => {
    const chatID = `${message?.id}`
   
    let answerDiv = document.getElementById(`gh-${chatID}`);
    // remove typing first
    
    const boxChatEl = document.getElementById(boxChatID)

    if (answerDiv) {
        answerDiv.textContent += message.token;
        // scroll to bottom
        boxChatEl.scrollTop = boxChatEl.scrollHeight;

    } else {
        
        // normal popup
        const answerEl = document.querySelector(`#${boxChatID} > .${boxAnswerClass}:last-child`)
        const typingDiv =  document.getElementById(typingID)
        const newAnswer = document.createElement("div");
        newAnswer.setAttribute("id", `box-${chatID}`);
        newAnswer.setAttribute("class", `${classes.answerDetail}`);
        newAnswer.innerHTML = `<span id="gh-${chatID}">${message.token}</span>`;
        answerEl.replaceChild(newAnswer, typingDiv);
    }

}

const addCopy = (chatID: string) => {
    const boxChatEl = document.getElementById(`box-${chatID}`)
    if (boxChatEl) {
        const chatEl = document.getElementById(`gh-${chatID}`)
        if (chatEl) {
            chatEl.style.cursor = 'copy'
            chatEl.setAttribute('title', 'Click to copy')
        }
        boxChatEl.innerHTML += `<div class=${classes.copy}>
                                    <img style="width: 17px; height: 17px;" src=${iconCopy} />
                                    <span id="copied-${chatID}" style="font-size:12px;"></span>
                                </div>`
    }
    
    const stopStreamEl = document.getElementById(`${stopStreamID}`)
    if (stopStreamEl) {
        stopStreamEl?.remove()
    }
}

const setResponseToPopup = async (message: Message) => {
    if (popupDiv) {
        if (message.status === 'stream') {
            handleAnswer(message)
        } else if (message.status === 'done') {
            // add hover
            addCopy(message.id)

        }
    }
}

const findDiv = (el: HTMLElement, startStr: string): HTMLElement | null => {
    while (el && el !== document.body) {
        if (el.id && el.id.startsWith(startStr)) {
            return el;
        }
        el = el.parentNode as HTMLElement;
    }
    return null;
};

const handleCopy = async (clickedElement: HTMLElement) => {
    // click to copy
    const answerEl = findDiv(clickedElement, 'gh-chatcmpl-');
    if (answerEl) {
        try {
            // Extract the chatID from the clicked element's ID
            const chatID = answerEl.id.replace('gh-', '');
            
            // Perform the copy operation
            const text = document.getElementById(`gh-${chatID}`).innerText;
            await navigator.clipboard.writeText(text);
            
            // Show message copied!
            const copied = document.getElementById(`copied-${chatID}`);
            if (copied) {
                copied.style.display = 'block';
                copied.innerText = 'Copied';
                setTimeout(() => {
                    copied.style.display = 'none';
                    copied.innerText = '';
                }, 1500);
            }
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    }
}

const removeIcon = () => {
    if (iconDiv) {
        document.body.removeChild(iconDiv)
        iconDiv = null
    }
}

const removePopup = () => {
    if (popupDiv) {
        if (port !== null) {
            const action = 'abort'
            port.postMessage({action})   
        }
        document.body.removeChild(popupDiv)
        popupDiv = null
        port = null
    }
}

const removeIconAndPopup = () => {
    removeIcon()
    removePopup()
}

const getPosition = (el: Range) => {
    const rect = el.getBoundingClientRect()
    return {
        left: rect.left + window.scrollX,
        right: rect.right + window.scrollX,
        top: rect.top + window.scrollY,
        bottom: rect.bottom + window.scrollY,
        width: rect.width,
        height: rect.height,
    }
}

const iconHtml = () => {

    return `<img id="${defaultID}" class="${classes.icon}" atl="ChatGPT Extension" src="${icon64URL}" />
    <div id="${menuID}" class="${classes.menu}">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 4L6 9L11 4H1Z" fill="#12a37f"></path>
        </svg>
        <div id="${subMenuID}" class="${classes.menuBox}">
            <span class="${classes.menuTitle}">Quick features</span>
            <div id="${subTranslate}" class="${classes.menuItem}">
                <div class="${classes.iconItem}">
                    <img style="width: 15px; height: 15px; margin: 0;" alt="Translate" src="${iconTranslate}"></img>
                    <span style="padding-left: 8px; color: #000;font-size: 14px;">Translate</span>
                </div>
            </div>
            <div id="${subExplain}" class="${classes.menuItem}">
                <div class="${classes.iconItem}">
                    <img style="width: 15px; height: 15px;  margin: 0;" alt="Explain" src="${iconExplain}"></img>
                    <span style="padding-left: 8px; color: #000;font-size: 14px;">Explain</span>
                </div>
            </div>
            <div id="${subSummarize}" class="${classes.menuItem}">
                <div class="${classes.iconItem}">
                    <img style="width: 15px; height: 15px;  margin: 0;" alt="Summarize" src="${iconSummarize}"></img>
                    <span style="padding-left: 8px; color: #000;font-size: 14px;">Summarize</span>
                </div>
            </div>
            <div id="${subRewrite}" class="${classes.menuItem}">
                <div class="${classes.iconItem}">
                    <img style="width: 15px; height: 15px;  margin: 0;" alt="Rewrite" src="${iconEdit}"></img>
                    <span style="padding-left: 8px; color: #000;font-size: 14px;">Rewrite</span>
                </div>
            </div>
            <div id="${subGrammar}" class="${classes.menuItem}">
                <div class="${classes.iconItem}">
                    <img style="width: 15px; height: 15px;  margin: 0;" alt="Grammar correction" src="${iconGrammar}"></img>
                    <span style="padding-left: 8px; color: #000;font-size: 14px;">Grammar</span>
                </div>
            </div>
            <div id="${subAsk}" class="${classes.menuItem}">
                <div class="${classes.iconItem}">
                    <img style="width: 15px; height: 15px;  margin: 0;" alt="Ask ChatGPT" src="${iconAsk}"></img>
                    <span style="padding-left: 8px; color: #000;font-size: 14px;">Ask ChatGPT</span>
                </div>
            </div>
        </div>
    </div>`
}

const htmlAnswerItem = () => {
    return `<div class="${classes.answer} ${boxAnswerClass}">
        <div id="${typingID}">
            <div style="white-space: nowrap" class="${classes.answerDetail}">
                <div class="${classes.typing}">
                    <div class="${classes.typing_dot}"></div>
                    <div class="${classes.typing_dot}"></div>
                    <div class="${classes.typing_dot}"></div>
                </div>
            </div>
        </div>

        <div id="${stopStreamID}" class="${classes.stopStream}">
            <image style="width: 10px; height: 10px; margin: 0; padding: 0;" src="${iconStop}" alt=${`Stop`} />
            <span style="margin-left: 5px; font-size: 14px;">Stop</span>
        </div>
    </div>`
}

const htmlLanguage = (text: string, type: string, nativeLang: string) => {
    if (type !== 'chatgpt-grammar' && type !== 'chatgpt-ask') {
        const options = []
        for (const [, value] of Object.entries(iso6391Codes)) {
            if (value.code === nativeLang) {
                options.push(`<option selected value="${value.code}">${value.name}</option>`)
            } else {
                options.push(`<option value="${value.code}">${value.name}</option>`)
            }
        }

        return `<select id="${languageID}" class="${classes.popupLanguage}" q="${text}">
            ${options.join('')}
        </select>`
    }
    return ``
}

const htmlPopup = (text: string, type: string, nativeLang: string) => {
    
    let title  = 'Translate'
    if (type === 'chatgpt-explain') {
        title = 'Explain'
    } else if (type === 'chatgpt-summarize') {
        title = 'Summarize'
    } else if (type === 'chatgpt-rewrite') {
        title = 'Rewrite'
    } else if (type === 'chatgpt-grammar') {
        title = 'Grammar correction'
    }

    return `<div class="${classes.popup}">
            <div id="${popupHeadID}" class="${classes.popupHead}">
                <div style="display: flex;align-items: center; justify-content: space-between;">
                    <div class="${classes.popupLogo} title="Drag me!">
                        <image style="width: 32px; height: 32px; margin: 0; filter: none;" src="${icon64URL}" alt=${title} />
                        <p class="${classes.popupTitle}">${title}</p>
                    </div>
                    ${htmlLanguage(text, type, nativeLang)}
                </div>
                
            </div>
            <div id="${boxChatID}" class="${classes.boxChat}">
                <div  class="${classes.question}">
                    <div class="${classes.questionDetail}">${text.trim()}</div>
                </div>
                ${htmlAnswerItem()}
            </div>
            <div class="${classes.popupFooter}"> 
                Powered by ChatGPT Wizard
            </div>
        </div>`
}

const htmlAskPopup = (text: string) => {
    return `<div class="${classes.popupAsk}">
                <div id="${askHeadID}" title="Click to hide" isShow="true" class="${classes.popupHeadAsk}">
                    <div style="display: flex;align-items: center;">
                        <image style="width: 32px; height: 32px; margin: 0; filter: none" src="${icon64URL}" alt=${`Ask ChatGPT`} />
                        <p class="${classes.popupTitle}">Ask ChatGPT</p>
                    </div>
                    <img title="Close" id="${iconCloseID}" class="${classes.iconCloseAsk}" alt="Close" src="${iconClose}" />
                </div>
                <div class="${classes.boxChatAsk}">
                    <div id="${boxChatID}" class="${classes.boxChatAskBody}"></div>
                    <div id="${footerID}" class="${classes.popupFooterAsk}">
                        <div class="${classes.popupInput}">
                            <textarea id="${textareaID}" rows="1" class="${classes.questionInput}" placeholder="Ask ChatGPT">${text}</textarea>
                            <div id="${btnSendID}" class="${classes.btnSend}">
                                <svg
                                    style="width: 24px; height: 24px;"
                                    xmlns='http://www.w3.org/2000/svg'
                                    className='h-5 w-5 transform rotate-45'
                                    viewBox='0 0 24 24'
                                    fill='none'
                                    stroke='#01539d' // change color at here
                                    strokeWidth='2'
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    >
                                    <line x1='22' y1='2' x2='11' y2='13' />
                                    <polygon points='22 2 15 22 11 13 2 9 22 2' />
                                </svg>
                            </div>
                        </div>
                        <p style="margin-top: 5px; margin-bottom: 0"> Powered by ChatGPT Wizard</p>   
                    </div>

                </div>
                
            </div>`
}

const htmlQuizSlover = (type: string, nativeLang: string) => {
    return `<div class="${classes.popup}" style="height: 100%;">
            <div id="${popupHeadID}" class="${classes.popupHead}">
                <div style="display: flex;align-items: center; justify-content: space-between;">
                    <div class="${classes.popupLogo}" style="cursor: default;">
                        <image style="width: 32px; height: 32px; margin: 0; filter: none;" src="${icon64URL}" alt="Quiz Slover" />
                        <p class="${classes.popupTitle}">Quiz Slover</p>
                    </div>
                    ${htmlLanguage('', type, nativeLang)}
                </div>
            </div>
            <div id="${boxChatID}" class="${classes.boxChat}" style="flex-grow: 1; overflow-y: auto;">
                <div style="display: flex;justify-content:center; align-item:center; margin-top: 60px;">
                    <div class="${classes.loading}"></div>
                </div>
            </div>
            <div class="${classes.popupFooter}"> 
                Powered by ChatGPT Wizard
            </div>
        </div>`
}

const getPopupPosition = (selectedTextRect: DOMRect) => {
    const viewportWidth = window.innerWidth;
    // Calculate the available space to the left and right of the selected text
    const availableSpaceRight = viewportWidth - (window.scrollX + selectedTextRect.right + contentWidth);
    const availableSpaceLeft = selectedTextRect.left - (window.scrollX + contentWidth);

     // Set position center
    let left = selectedTextRect.left - window.scrollX + (selectedTextRect.width / 2) - (contentWidth / 2);
    
    if (availableSpaceRight > 0 && availableSpaceRight > availableSpaceLeft) {
        left = (selectedTextRect.right - selectedTextRect.width / 2) - window.scrollX;
    } else if (availableSpaceLeft > 0 && availableSpaceRight < availableSpaceLeft) {
        left = selectedTextRect.left - window.scrollX - contentWidth + selectedTextRect.width / 2;
    }

    return {
        top: selectedTextRect.bottom + window.scrollY,
        left: left,
    }
}

const updateHeight = () => {
    const inputEl = document.getElementById(textareaID) as HTMLTextAreaElement;
    const boxChat = document.getElementById(boxChatID) as HTMLElement;
    // 1 line: 45
    // 2 line: 68
    // 3 line: 89
    // 4 line: 110
    // 5 line: 130
    // 6 line: 145
    inputEl.style.height = 'auto';
    const scrollHeight = inputEl.scrollHeight
    if (scrollHeight > 45 &&  scrollHeight < 68) {
        inputEl.style.height = '68px'
        boxChat.style.height = 'calc(100% - 68px)'
    } else if (scrollHeight >= 68 &&  scrollHeight < 89) {
        inputEl.style.height = '89px'
        boxChat.style.height = 'calc(100% - 89px)'
    } else if (scrollHeight >= 89 &&  scrollHeight < 110) {
        inputEl.style.height = '110px'
        boxChat.style.height = 'calc(100% - 110px)'
    } else if (scrollHeight >= 110  &&  scrollHeight < 130) {
        inputEl.style.height = '130px'
        boxChat.style.height = 'calc(100% - 130px)'
    } else if (scrollHeight >= 130) {
        inputEl.style.height = '145px'
        boxChat.style.height = 'calc(100% - 145px)'
    } else {
        inputEl.style.height = '45px'
        boxChat.style.height = 'calc(100% - 45px)'
    }
}

const chatGPT = async (text: string, type = 'chatgpt-translate', language = 'en') => {
    const uuid = document.getElementById(popupID).getAttribute('uuid')
    currentPortName = `content-script-${uuid}`
    
    port = chrome.runtime.connect({
        name: currentPortName,
    })
    const action = 'stream'
    port.postMessage({text, uuid, type, action, language})
    port.onMessage.addListener(async (data: any) => {
        if (data.action === 'stream' && data.portName === currentPortName) {
            setResponseToPopup(data.message)
        }
    })
}

const handleSendChat = () => {
    const inputEl = document.getElementById(textareaID) as HTMLTextAreaElement
    const question = inputEl.value.trim()
    if (question.length === 0) return

    const boxChat = document.getElementById(boxChatID) as HTMLElement
    inputEl.value = ''
    inputEl.style.height = '45px'
    boxChat.style.height = 'calc(100% - 45px)'

    boxChat.innerHTML += `<div  class="${classes.question}">
                            <div class="${classes.questionDetail}">${question}</div>
                        </div>
                        ${htmlAnswerItem()}
                        `
    chatGPT(question, 'chatgpt-ask')
}

const initPopup = async (type: string, data: {
    text?: string,
    selectedTextRect?: DOMRect,
    coords?: Coordinates
}) => {
    const {text, selectedTextRect} = data

    const {nativeLang} = await getDataFromStorage()
    
    let position = getPopupPosition(selectedTextRect)

    // Create the popupDiv and set its styles
    popupDiv = document.createElement('div');
   
    popupDiv.className = classes.chatgptPopup;
    popupDiv.id = popupID;
    if (type === 'chatgpt-ask') {
        popupDiv.style.position = 'fixed'
        popupDiv.style.top = '0'
        popupDiv.style.bottom = 'auto'
        popupDiv.style.right = '0'
        popupDiv.style.height = '100%'
        popupDiv.style.borderTopRightRadius = '0'
        popupDiv.style.borderBottomRightRadius = '0'
        popupDiv.style.width = `${contentAskWidth}px`
        popupDiv.innerHTML = htmlAskPopup(text)

        // event handle Input
        setTimeout(() => {
            const inputEl = document.getElementById(textareaID) as HTMLTextAreaElement
            if (inputEl) {
                // set focus
                inputEl.value += '\n';
                setTimeout(updateHeight, 5);
                const len = inputEl.value.length;
                inputEl.selectionStart = len;
                inputEl.selectionEnd = len;
                inputEl.focus()

                inputEl.oninput = () => {
                    setTimeout(updateHeight, 5);
                }

                // event send message to chatgpt
                inputEl.onkeydown = (e: KeyboardEvent) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault(); // Prevents adding a newline to the textarea
                        setTimeout(handleSendChat, 5);
                    }
                };
                const btnSendEl = document.getElementById(btnSendID) as HTMLElement
                if (btnSendEl) {
                    btnSendEl.onclick = () => {
                        setTimeout(handleSendChat, 5);
                    }
                }
                const popupEl = document.getElementById(popupID) as HTMLElement

                // event close
                const btnCloseEl = document.getElementById(iconCloseID) as HTMLImageElement
                if (btnCloseEl) {
                    btnCloseEl.onclick = (e: Event) => {
                        e.stopPropagation();
                        // remove chat history
                        const uuid = popupEl.getAttribute('uuid')
                        removeChatHistory(uuid)
                        // close popup
                        removeIconAndPopup()
                        
                    }
                }
                // toggle click head ask chatGPT
                const askHeadEl = document.getElementById(askHeadID) as HTMLElement
                if (askHeadEl) {
                    askHeadEl.addEventListener('click', () => {
                        const isShow = askHeadEl.getAttribute('isShow')
                        if (isShow === "true") {
                            popupEl.style.top = 'auto';
                            popupEl.style.bottom = '0';
                            popupEl.style.height = '50px';
                            popupEl.style.width = '210px';
                            askHeadEl.setAttribute('isShow', "false")
                            askHeadEl.setAttribute('title', "Click to show")
                        } else {
                            popupEl.style.top = '0';
                            popupEl.style.bottom = 'auto';
                            popupEl.style.height = '100%';
                            popupEl.style.width = `${contentAskWidth}px`;
                            askHeadEl.setAttribute('isShow', "true")
                            askHeadEl.setAttribute('title', "Click to hide")
                            inputEl.focus()
                        }                       
                    })
                }
            }  
        }, 5);
                   
    } else  {
        popupDiv.style.position = 'absolute';
        popupDiv.draggable = false;
        popupDiv.style.left = `${position.left}px`;
        popupDiv.style.top = `${position.top}px`;
        popupDiv.style.width = `${contentWidth}px`;
        popupDiv.innerHTML = htmlPopup(text, type, nativeLang);
    }
   
    document.body.appendChild(popupDiv);
    // set type poupup
    document.getElementById(popupID).setAttribute('type', type)

    // set uuid poupup
    const uuid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    document.getElementById(popupID).setAttribute('uuid', uuid)

    // add draggable
    if (type !== 'chatgpt-ask') {
        const popup = document.getElementById(popupID)
        const popupHead = document.getElementById(popupHeadID)
        let isDragging = false;
        let offsetX: number, offsetY: number;
    
        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            let x = e.clientX - offsetX + window.scrollX;
            let y = e.clientY - offsetY + window.scrollY;
            
            popup.style.left = `${x}px`;
            popup.style.top = `${y}px`;
        }
        const onMouseUp = () => {
            isDragging = false;
            
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
        popupHead.addEventListener('mousedown', (e) => {
            const element = e.target as Element
            if ((element).matches('select, select *')) {
                return;
            }
            e.preventDefault();
            isDragging = true;
            offsetX = e.clientX - popup.getBoundingClientRect().left;
            offsetY = e.clientY - popup.getBoundingClientRect().top;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

     // event onChange language
    if (type !== 'chatgpt-ask' && type !== 'chatgpt-grammar') {
        const langEl = document.getElementById(languageID)
        if (langEl) {
            langEl.addEventListener('change', (event: Event) => {
                // stop steam if avaiable
                if (port !== null) {
                    const action  = 'abort'
                    port.postMessage({action})
                    port = null
                }
                // generate again
                setTimeout(() => {
                    const element = event.target as HTMLSelectElement
                    document.querySelector(`#${boxChatID} > .${boxAnswerClass}:last-child`)?.remove()
                    const boxChat = document.getElementById(boxChatID)
                    boxChat.innerHTML += htmlAnswerItem()

                    const language = element.value;
                    const selectionText = element.getAttribute('q')
                    const type = document.getElementById(popupID).getAttribute('type')
                    chatGPT(selectionText, type, language)
                }, 100)
                
            })
        }
    }
}

const initPopupQuiz = async () => {
    const {nativeLang} = await getDataFromStorage()
    popupDiv = document.createElement('div');
    popupDiv.className = classes.chatgptPopup;
    popupDiv.id = popupID;
    popupDiv.style.display = 'none';
    popupDiv.style.position = 'fixed';
    popupDiv.style.top = 'auto'
    popupDiv.style.bottom = '0'
    popupDiv.style.right = '0'
    popupDiv.style.height = '500px'
    popupDiv.style.borderBottomLeftRadius = '0'
    popupDiv.style.width = `${contentAskWidth}px`
    popupDiv.innerHTML = htmlQuizSlover('chatgpt-quiz-slover', nativeLang)
    
    document.body.appendChild(popupDiv);
    // set type poupup
    document.getElementById(popupID).setAttribute('type', 'chatgpt-quiz-slover')
    // set uuid poupup
    const uuid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    document.getElementById(popupID).setAttribute('uuid', uuid)

    const langEl = document.getElementById(languageID)
    if (langEl) {
        langEl.addEventListener('change', (event: Event) => {
            event.stopPropagation()
            // stop steam if avaiable
            if (port !== null) {
                const action  = 'abort'
                port.postMessage({action})
                port = null
            }
            // generate again
            setTimeout(() => {
                const element = event.target as HTMLSelectElement
                document.querySelector(`#${boxChatID} > .${boxAnswerClass}:last-child`)?.remove()
                const boxChat = document.getElementById(boxChatID)
                boxChat.innerHTML += htmlAnswerItem()

                const language = element.value;
                const selectionText = element.getAttribute('q')
                const type = document.getElementById(popupID).getAttribute('type')
                chatGPT(selectionText, type, language)
            }, 100)
            
        })
    }
}

const capture = (startX: number, startY: number, endX: number, endY: number) => {
    const popup = document.getElementById(popupID)
    if (!popup) return
    const uuid = popup.getAttribute('uuid')
    currentPortName = `content-script-${uuid}`
    
    port = chrome.runtime.connect({
        name: currentPortName,
    })
    // send to background
    const action = 'capture'
    port.postMessage({action})

    port.onMessage.addListener((data: any) => {
        if (data.action === 'capture' && data.portName === currentPortName) {

            // show popup
            document.getElementById(popupID).style.display = 'block'

            const {dataUrl} = data.message

            let img = new Image();
            img.onload = async () => {
                let zoomFactor = window.devicePixelRatio;

                let adjustedCoords = {
                    startX: startX * zoomFactor,
                    startY: startY * zoomFactor,
                    endX: endX * zoomFactor,
                    endY: endY * zoomFactor
                };

                let width = adjustedCoords.endX - adjustedCoords.startX;
                let height = adjustedCoords.endY - adjustedCoords.startY;

                let canvas = document.createElement('canvas');
                let ctx = canvas.getContext('2d');

                canvas.width = width;
                canvas.height = height;

                ctx.drawImage(img, adjustedCoords.startX, adjustedCoords.startY, width, height, 0, 0, width, height);
                
                let imagebas64 = canvas.toDataURL('image/png');
            
                // apend image
                const boxChatEl = document.getElementById(boxChatID)
                boxChatEl.innerHTML = `<div style="display: flex; justify-content: end;">
                                            <div style="max-height: 250px; max-width: 84%;">
                                            <img style="height: 100%; max-width: 100%; border-radius: 8px;" src="${imagebas64}" />
                                            </div>
                                        </div>
                                        ${htmlAnswerItem()}`
                // Content Security Policy (CSP) some pages. Need use server

                const srcTesseract = chrome.runtime.getURL('utils/tesseract.min.js')
               
                import(srcTesseract).then(async () => {
                    try {
                        const worker = await Tesseract.createWorker();
                        var { data: { text } } = await worker.recognize(imagebas64);
                        await worker.terminate();

                        if (text.length === 0) {
                            removeIconAndPopup()
                            return
                        }

                        document.getElementById(languageID).setAttribute('q', text)
                        const {nativeLang} = await getDataFromStorage()
                        chatGPT(text, 'chatgpt-quiz-slover', nativeLang)

                    } catch (error: any) {
                        alert(error)
                        console.error("Error in Tesseract OCR:", error);
                        removeIconAndPopup()
                    }
                })
                
            };
            
            img.onerror = () => {
                console.error("Error loading image.");
            };
            img.src = dataUrl;
        }
        if (data.action === 'image' && data.portName === currentPortName) {
            const {q} = data.message
            alert(q)
        }
    });
}

const preCapture = () => {
    document.body.style.cursor = 'cell';
    document.body.style.userSelect = 'none';
    document.body.style.overflow = 'hidden';

    let overlay = document.createElement('div');
    let selection = document.createElement('div');

    overlay.id = overlayID;
    overlay.className = classes.overlay;

    selection.id = selectionID;
    selection.className = classes.selection;

    const onMouseDown = (e: MouseEvent) => {
        selecting = true;
        startX = e.clientX;
        startY = e.clientY;
        document.body.appendChild(selection);
    };

    const onMouseMove = (e: MouseEvent) => {
        if (!selecting) return;
        endX = e.clientX;
        endY = e.clientY;

        const left = Math.min(startX, endX);
        const top = Math.min(startY, endY);
        const width = Math.abs(endX - startX);
        const height = Math.abs(endY - startY);

        selection.style.left = `${left}px`;
        selection.style.top = `${top}px`;
        selection.style.width = `${width}px`;
        selection.style.height = `${height}px`;
    };

    const onMouseUp = async (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        const w = selection.clientWidth 
        const h = selection.clientHeight 

        selecting = false;
        overlay.remove();
        selection.remove();

        document.body.style.cursor = 'initial';
        document.body.style.userSelect = 'auto';
        document.body.style.overflow = '';

        if (w > 20 || h > 20) {
            await initPopupQuiz();
            capture(startX, startY, endX, endY);
        }

        startX = null
        startY = null
        endX = null
        endY = null

        // Cleanup
        overlay.removeEventListener('mousedown', onMouseDown);
        overlay.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        overlay.removeEventListener('mouseleave', onMouseLeave);
    };

    const onMouseLeave = (e: MouseEvent) => {
        if (selecting) {
            onMouseUp(e);
        }
    };

    overlay.addEventListener('mousedown', onMouseDown);
    overlay.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);  // Listen on the document
    overlay.addEventListener('mouseleave', onMouseLeave);

    document.body.appendChild(overlay);
};


document.addEventListener('mouseup', async () => {
    const {openaiKey, settingPopup, nativeLang, type} = await getDataFromStorage()
    if (!openaiKey) return

    if (settingPopup === 'hide') return

    const activeElement = document.activeElement as (HTMLInputElement | HTMLTextAreaElement | null);
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        // TODO
        return
    }

    // if already show popup
    const popup = document.getElementById(popupID) as HTMLElement
    if (popup) return

    const selection = document.getSelection()
    if (selection.rangeCount === 0) return

    const selectionRect = selection.getRangeAt(0).getBoundingClientRect()
    const selectionText = selection.toString();

    if (selectionText.length > 1) {

        if (settingPopup === 'display_icon') {
            iconDiv = document.createElement('div')
            iconDiv.className = classes.chatgptIcon
        
            // Calculate the position for the icon button, considering page scroll
            const position = getPosition(selection.getRangeAt(0))
            const iconWidth = 60 // Width of the icon
            const left = position.left + window.scrollX + position.width / 2 - iconWidth / 2;

            // Add a small gap between the selection and the icon
            const spacing = 5;
            let top = position.bottom + spacing;

            iconDiv.style.left = `${left}px`
            iconDiv.style.top = `${top}px`
            iconDiv.id = iconID
            iconDiv.innerHTML = iconHtml()

            // append to body
            document.body.appendChild(iconDiv)
            
            const defaultElement = document.getElementById(defaultID);
            if (defaultElement) {
                defaultElement.onclick = async () => {
                    await initPopup(type, {
                        text: selectionText, 
                        selectedTextRect:selectionRect
                    })
                    chatGPT(selectionText, type, nativeLang)
                    removeIcon()
                }
            }

            const menuElement = document.getElementById(menuID);
            if (menuElement) {
                menuElement.onclick = async (event: Event) => {
                    event.stopPropagation();
                    const subMenu = document.getElementById(subMenuID)
                    if (subMenu) {
                        if (subMenu.offsetParent !== null) {
                            subMenu.style.display = 'none'
                        } else {
                            subMenu.style.display = 'flex'

                            // action
                            const translateEl = document.getElementById(subTranslate);
                            if (translateEl) {
                                translateEl.onclick = async () => {
                                    removeIcon()
                                    await initPopup('chatgpt-translate',{
                                        text: selectionText, 
                                        selectedTextRect:selectionRect
                                    })
                                    chatGPT(selectionText, 'chatgpt-translate', nativeLang)
                                }
                            }
                            const explainEl = document.getElementById(subExplain);
                            if (explainEl) {
                                explainEl.onclick = async () => {
                                    removeIcon()
                                    await initPopup('chatgpt-explain', {
                                        text: selectionText, 
                                        selectedTextRect:selectionRect
                                    })
                                    chatGPT(selectionText, 'chatgpt-explain', nativeLang)
                                }
                            }
                            const summarizeEl = document.getElementById(subSummarize);
                            if (summarizeEl) {
                                summarizeEl.onclick = async () => {
                                    removeIcon()
                                    await initPopup('chatgpt-summarize', {
                                        text: selectionText, 
                                        selectedTextRect:selectionRect
                                    })
                                    chatGPT(selectionText, 'chatgpt-summarize', nativeLang)
                                }
                            }
                            const rewriteEl = document.getElementById(subRewrite);
                            if (rewriteEl) {
                                rewriteEl.onclick = async () => {
                                    removeIcon()
                                    await initPopup('chatgpt-rewrite', {
                                        text: selectionText, 
                                        selectedTextRect:selectionRect
                                    })
                                    chatGPT(selectionText, 'chatgpt-rewrite', nativeLang)
                                }
                            }
                            const grammarEl = document.getElementById(subGrammar);
                            if (grammarEl) {
                                grammarEl.onclick = async () => {
                                    removeIcon()
                                    await initPopup('chatgpt-grammar', {
                                        text: selectionText, 
                                        selectedTextRect:selectionRect
                                    })
                                    chatGPT(selectionText, 'chatgpt-grammar', nativeLang)
                                }
                            }

                            const askEl = document.getElementById(subAsk);
                            if (askEl) {
                                askEl.onclick = async () => {
                                    removeIcon()
                                    await initPopup('chatgpt-ask', {
                                        text: selectionText, 
                                        selectedTextRect:selectionRect
                                    })
                                }
                            }

                        }
                    }
                }
            }
        
        } else {
            await initPopup(type, {
                text: selectionText, 
                selectedTextRect:selectionRect
            })
            chatGPT(selectionText, type, nativeLang)
        }     
    }
})

document.addEventListener('click', async (evt: MouseEvent) => {

    const clickedElement = evt.target as HTMLElement;
    const { id } = clickedElement
    if (id === popupID || id === defaultID) {
        removeIcon()
    }
    else {
        const popup = document.getElementById(popupID)
        if (popup) {
            const type = popup.getAttribute('type')
            // handle stop stream
            const stopStreamEl  = findDiv(clickedElement, stopStreamID)
            if (stopStreamEl) {
                setTimeout(() => {
                    document.getElementById(stopStreamID)?.remove()
                }, 5)
                if (port !== null) {
                    const action = 'abort'
                    port.postMessage({action})
                    port = null

                    // TODO add copy
                    // addCopy(id)
                }               
            }

            // check type popup
            
            if (type !== 'chatgpt-ask') {
                if (!clickedElement.closest(`#${popupID}`)) {
                    removeIconAndPopup()  
                } else {
                    removeIcon()
                    
                    // click in popup and copy answer
                    await handleCopy(clickedElement)
                }
            } else {
                // click in popup and copy answer
               await handleCopy(clickedElement)
            }
        } else {
            if (!clickedElement.closest(`#${popupID}`)) {
                removeIconAndPopup()  
            } else {
                removeIcon()
            }
            
        }
    }
})
// contextMenu
chrome.runtime.onMessage.addListener(async (data: any) => {
    const popup = document.getElementById(popupID) as HTMLElement
    if (popup) return
    removeIconAndPopup()
    // selection
    if (data.type === 'chatgpt-quiz-solver') {
        preCapture()
    } else {
        const selection = document.getSelection();
        await initPopup(data.type, {
            text: selection.toString(), 
            selectedTextRect:selection.getRangeAt(0).getBoundingClientRect()
        })
        if (data.type !== 'chatgpt-ask' && data.type !== 'chatgpt-quiz-solver') {
            chatGPT(selection.toString(), data.type)
        }
    }
})

// Right click
document.addEventListener('contextmenu', () => {
    removeIcon()
    document.getElementById(overlayID)?.remove()
    document.getElementById(selectionID)?.remove()

    // const popup = document.getElementById(popupID) as HTMLElement
    // if (popup) {
    //     const type = popup.getAttribute('type')
    //     if (type !== 'chatgpt-ask') {
    //         removeIconAndPopup()  
    //     }
    // } else {
    //     removeIconAndPopup()  
    // }
})
