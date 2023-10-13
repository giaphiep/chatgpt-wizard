
import classes from './index.module.css';

type QA = { question: string, answer: string };
type Status = 'stream' | 'done' | 'error'

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
const footerID = 'gh-chatgpt-wizard-popup-footer'
const boxChatID = 'gh-chatgpt-wizard-boxchat'
const typingID = 'gh-chatgpt-wizard-typing'
const iconCloseID = 'gh-chatgpt-wizard-icon-close'
const btnSendID = 'gh-chatgpt-wizard-send'
const askHeadID = 'gh-chatgpt-wizard-ask-head'
const contentWidth = 500
const contentAskWidth = 450

let port = null as chrome.runtime.Port
let currentPortName = null as string

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
   
    let answerDiv = document.getElementById(chatID);
    // remove typing first
    document.getElementById(typingID)?.remove();
    const boxChatEl = document.getElementById(boxChatID)

    if (answerDiv) {
        answerDiv.textContent += message.token;
        // scroll to bottom
        boxChatEl.scrollTop = boxChatEl.scrollHeight;

    } else {
        boxChatEl.innerHTML += `<div id="box-${chatID}" class="${classes.answer}">
                <div id="${chatID}" class="${classes.answerDetail}">${message.token}</div>
            </div>`
    }
}

const setResponseToPopup = async (message: Message) => {
    if (popupDiv) {
        if (message.status === 'stream') {
            handleAnswer(message)
        } else if (message.status === 'done') {
            // add hover
            const chatID =  message.id
            const boxChatEl = document.getElementById(`box-${chatID}`)
            if (boxChatEl) {
                const iconCopy = chrome.runtime.getURL('icons/copy.svg')
                boxChatEl.style.cursor = 'pointer';
                boxChatEl.innerHTML += `<div class=${classes.copy}>
                                            <img style="width: 17px; height: 17px;" src=${iconCopy} />
                                            <span id="copied-${chatID}" style="font-size:12px;"></span>
                                    </div>`
            }
        }
    }
}

const findClosestIdStartingWith = (el: HTMLElement, startStr: string): HTMLElement | null => {
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
    const answerEl = findClosestIdStartingWith(clickedElement, 'box-chatcmpl-');
    if (answerEl) {
        try {
            // Extract the chatID from the clicked element's ID
            const chatID = answerEl.id.replace('box-', '');
            
            // Perform the copy operation
            const text = document.getElementById(chatID).innerText;
            await navigator.clipboard.writeText(text);
            
            // Show message copied!
            const copied = document.getElementById(`copied-${chatID}`);
            if (copied) {
                copied.style.display = 'block';
                copied.innerText = 'Copied!';
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
        document.body.removeChild(popupDiv)
        popupDiv = null
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
    const iconTranslate = chrome.runtime.getURL('icons/icon-translate.svg')
    const iconExplain = chrome.runtime.getURL('icons/icon-explain.svg')
    const iconSummarize = chrome.runtime.getURL('icons/icon-summarize.svg')
    const iconEdit = chrome.runtime.getURL('icons/icon-edit.svg')
    const iconGrammar = chrome.runtime.getURL('icons/icon-grammar.svg')
    const iconAsk = chrome.runtime.getURL('icons/icon-ask.svg')

    const icon64URL = chrome.runtime.getURL('icons/icon-64.png')

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

const htmlPopup = (text: string, type: string) => {
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
    const icon64URL = chrome.runtime.getURL('icons/icon-64.png')
    return `<div class="${classes.popup}">
            <div class="${classes.popupHead}" style="cursor: move;" title="Drag me!">
                <div style="display: flex;align-items: center;">
                    <image style="width: 32px; height: 32px; margin: 0; filter: none;" src="${icon64URL}" alt=${title} />
                    <p class="${classes.popupTitle}">${title}</p>
                </div>
            </div>
            <div id="${boxChatID}" class="${classes.boxChat}">
                <div  class="${classes.question}">
                    <div class="${classes.questionDetail}">${text.trim()}</div>
                </div>

                <div id="${typingID}" class="${classes.answer}">
                    <div style="white-space: nowrap" class="${classes.answerDetail}">
                        <div class="${classes.typing}">
                            <div class="${classes.typing_dot}"></div>
                            <div class="${classes.typing_dot}"></div>
                            <div class="${classes.typing_dot}"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="${classes.popupFooter}"> 
                Powered by ChatGPT Wizard
            </div>
        </div>`
}

const htmlAskPopup = (text: string) => {

    const icon64URL = chrome.runtime.getURL('icons/icon-64.png')
    const iconClose = chrome.runtime.getURL('icons/close.svg')
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

// const getCaretCoordinates = (element: HTMLInputElement | HTMLTextAreaElement, position: number): { left: number, top: number } => {
//     const properties: string[] = [
//         'direction', 'boxSizing', 'width', 'height', 'overflowX', 'overflowY', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderStyle', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
//         'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'fontSizeAdjust', 'lineHeight', 'fontFamily',
//         'textAlign', 'textTransform', 'textIndent', 'textDecoration', 'letterSpacing', 'wordSpacing', 'tabSize', 'MozTabSize'
//     ];

//     const isFirefox = (window as any).mozInnerScreenX == null;

//     let coords = { top: 0, left: 0 };

//     if (isFirefox) {
//         const rect = element.getBoundingClientRect();
//         coords.left = rect.left;
//         coords.top = rect.top;
//     }

//     const span = document.createElement('span');
//     span.style.cssText = 'position: absolute; white-space: pre-wrap;';
    
//     properties.forEach((prop: any) => span.style[prop] = window.getComputedStyle(element)[prop]);

//     document.body.appendChild(span);

//     const escaped = element.value.substring(0, position).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
//     span.innerHTML = escaped + '&nbsp;';
    
//     const coordinates = {
//         left: span.offsetLeft + element.scrollLeft,
//         top: span.offsetTop + element.scrollTop
//     };

//     document.body.removeChild(span);

//     return coordinates;
// }


// const getPopupPositionV2 = (selectedTextRect: DOMRect, element?: HTMLInputElement | HTMLTextAreaElement) => {
//     let selectedRect = selectedTextRect;
    
//     if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
//         const caretPos = getCaretCoordinates(element, (element as HTMLInputElement).selectionStart);
//         selectedRect = {
//             left: caretPos.left + element.getBoundingClientRect().left,
//             top: caretPos.top + element.getBoundingClientRect().top,
//             right: caretPos.left + element.getBoundingClientRect().left + 10, // you might need to adjust this
//             bottom: caretPos.top + element.getBoundingClientRect().top + 10, // and this
//             width: 10, // and possibly this
//             height: 10 // and this
//         } as DOMRect;
//     }

//     const viewportWidth = window.innerWidth;
//     const availableSpaceRight = viewportWidth - (window.scrollX + selectedRect.right + contentWidth);
//     const availableSpaceLeft = selectedRect.left - (window.scrollX + contentWidth);

//     let left = selectedRect.left - window.scrollX + (selectedRect.width / 2) - (contentWidth / 2);
    
//     if (availableSpaceRight > 0 && availableSpaceRight > availableSpaceLeft) {
//         left = (selectedRect.right - selectedRect.width / 2) - window.scrollX;
//     } else if (availableSpaceLeft > 0 && availableSpaceRight < availableSpaceLeft) {
//         left = selectedRect.left - window.scrollX - contentWidth + selectedRect.width / 2;
//     }

//     return {
//         top: selectedRect.bottom + window.scrollY,
//         left: left,
//     }
// }


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

const handleSendChat = () => {
    const inputEl = document.getElementById(textareaID) as HTMLTextAreaElement
    const question = inputEl.value.trim()
    if (question.length === 0) return

    const boxChat = document.getElementById(boxChatID) as HTMLElement
    inputEl.value = ''
    inputEl.style.height = '45px'
    boxChat.style.height = 'calc(100% - 45px)'

    // append to bodychat
    boxChat.innerHTML += `<div  class="${classes.question}">
                        <div class="${classes.questionDetail}">${question}</div>
                    </div>
                    <div id="${typingID}" class="${classes.answer}">
                        <div style="white-space: nowrap" class="${classes.answerDetail}">
                            <div class="${classes.typing}">
                                <div class="${classes.typing_dot}"></div>
                                <div class="${classes.typing_dot}"></div>
                                <div class="${classes.typing_dot}"></div>
                            </div>
                        </div>
                    </div>`
    const uuid = document.getElementById(popupID).getAttribute('uuid') 
    chatGPT(question, 'chatgpt-ask', uuid)
}

const initPopup = async (text: string, selectedTextRect: DOMRect, type = 'chatgpt-translate') => {
    const position = getPopupPosition(selectedTextRect)

    // Create the popupDiv and set its styles
    popupDiv = document.createElement('div');
   
    popupDiv.style.backgroundColor = 'white';
    popupDiv.style.padding = '0 10px 10px 10px';
    popupDiv.style.zIndex = '2147483647';
    popupDiv.style.color = 'black';
    popupDiv.style.border = 'solid transparent';
    popupDiv.style.borderRadius = '8px';
    popupDiv.style.boxShadow = '0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)';
    popupDiv.style.transition = 'left 0.1s, top 0.1s';
    popupDiv.id = popupID;
    if (type === 'chatgpt-ask') {
        popupDiv.style.position = 'fixed';
        popupDiv.style.top = '0'
        popupDiv.style.right = '0'
        popupDiv.style.height = '100%'
        popupDiv.style.borderTopRightRadius = '0'
        popupDiv.style.borderBottomRightRadius = '0'
        popupDiv.style.width = `${contentAskWidth}px`;
        popupDiv.innerHTML = htmlAskPopup(text);

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
                            popupEl.style.width = '450px';
                            askHeadEl.setAttribute('isShow', "true")
                            askHeadEl.setAttribute('title', "Click to hide")
                            inputEl.focus()
                        }                       
                    })
                }
            }  
        }, 5);
                   
    } else {
        popupDiv.style.position = 'absolute';
        popupDiv.draggable = true;
        popupDiv.style.left = `${position.left}px`;
        popupDiv.style.top = `${position.top}px`;
        popupDiv.style.width = `${contentWidth}px`;
        popupDiv.innerHTML = htmlPopup(text, type);
    }
   
    document.body.appendChild(popupDiv);
    // set type poupup
    document.getElementById(popupID).setAttribute('type', type)

    // add draggable
    if (type !== 'chatgpt-ask') {
        const draggable = document.getElementById(popupID)
        let isDragging = false;
        let offsetX: number, offsetY: number;
    
        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const x = e.clientX - offsetX + window.scrollX;
            const y = e.clientY - offsetY + window.scrollY;
        
            draggable.style.left = `${x}px`;
            draggable.style.top = `${y}px`;
        }
        const onMouseUp = () => {
            isDragging = false;
            
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
        draggable.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isDragging = true;
            offsetX = e.clientX - draggable.getBoundingClientRect().left;
            offsetY = e.clientY - draggable.getBoundingClientRect().top;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    } else {
        // set uuid poupup
        const uuid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
        document.getElementById(popupID).setAttribute('uuid', uuid)
    }
}

const chatGPT = async (text: string, type = 'chatgpt-translate', uuid?: string) => {
    if (!uuid) {
        uuid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
        currentPortName = `content-script-${uuid}`
    } else {
        currentPortName = `content-script-${uuid}`
    }
   
    port = chrome.runtime.connect({
        name: currentPortName,
    })
    port.postMessage({text, uuid, type})
    port.onMessage.addListener(async (data: any) => {
        if (data.action === 'chatGPTResponse' && data.portName === currentPortName) {
            setResponseToPopup(data.message)
        }
    })
}

document.addEventListener('mouseup', async () => {

   

    const {openaiKey, settingPopup, type} = await getDataFromStorage()
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


    const selection = document.getSelection();
    const selectionRect = selection.getRangeAt(0).getBoundingClientRect()
    const selectionText = selection.toString();

    if (selectionText.length > 1) {

        if (settingPopup === 'display_icon') {
            iconDiv = document.createElement('div')
            iconDiv.style.position = 'absolute'
            iconDiv.style.backgroundColor = 'transparent'
            iconDiv.style.height = '30px'
            iconDiv.style.width = '60px'
            iconDiv.style.borderRadius = '8px'
            iconDiv.style.boxShadow = 'rgba(0, 0, 0, 0.2) 0px 4px 8px 0px, rgba(0, 0, 0, 0.19) 0px 6px 20px 0px'

            // Calculate the position for the icon button, considering page scroll
            const position = getPosition(selection.getRangeAt(0))
            const iconWidth = 60 // Width of the icon
            const left = position.left + window.scrollX + position.width / 2 - iconWidth / 2;

             // Add a small gap between the selection and the icon
            const spacing = 5;
            let top = position.bottom + spacing;

            iconDiv.style.left = `${left}px`
            iconDiv.style.top = `${top}px`
            iconDiv.style.zIndex = '2147483647'
            iconDiv.style.display = 'flex';
            iconDiv.style.alignContent = 'center';
            iconDiv.style.background = '#fff';
            iconDiv.style.padding = '2px';
            iconDiv.id = iconID
            iconDiv.innerHTML = iconHtml()
   
            // append to body
            document.body.appendChild(iconDiv)
            
            const defaultElement = document.getElementById(defaultID);
            if (defaultElement) {
                defaultElement.onclick = async () => {
                    await initPopup(selectionText, selectionRect, type)
                    chatGPT(selectionText, type)
                }
            }

            const menuElement = document.getElementById(menuID);
            if (menuElement) {
                menuElement.onclick = async (event: any) => {
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
                                    await initPopup(selectionText, selectionRect, 'chatgpt-translate')
                                    chatGPT(selectionText, 'chatgpt-translate')
                                }
                            }
                            const explainEl = document.getElementById(subExplain);
                            if (explainEl) {
                                explainEl.onclick = async () => {
                                    removeIcon()
                                    await initPopup(selectionText, selectionRect, 'chatgpt-explain')
                                    chatGPT(selectionText, 'chatgpt-explain')
                                }
                            }
                            const summarizeEl = document.getElementById(subSummarize);
                            if (summarizeEl) {
                                summarizeEl.onclick = async () => {
                                    removeIcon()
                                    await initPopup(selectionText, selectionRect, 'chatgpt-summarize')
                                    chatGPT(selectionText, 'chatgpt-summarize')
                                }
                            }
                            const rewriteEl = document.getElementById(subRewrite);
                            if (rewriteEl) {
                                rewriteEl.onclick = async () => {
                                    removeIcon()
                                    await initPopup(selectionText, selectionRect, 'chatgpt-rewrite')
                                    chatGPT(selectionText, 'chatgpt-rewrite')
                                }
                            }
                            const grammarEl = document.getElementById(subGrammar);
                            if (grammarEl) {
                                grammarEl.onclick = async () => {
                                    removeIcon()
                                    await initPopup(selectionText, selectionRect, 'chatgpt-grammar')
                                    chatGPT(selectionText, 'chatgpt-grammar')
                                }
                            }

                            const askEl = document.getElementById(subAsk);
                            if (askEl) {
                                askEl.onclick = async () => {
                                    removeIcon()
                                    await initPopup(selectionText, selectionRect, 'chatgpt-ask')
                                    // chatGPT(selectionText, 'chatgpt-ask')
                                }
                            }

                        }
                    }
                }
            }
           
        } else {
            await initPopup(selectionText, selectionRect, type)
            chatGPT(selectionText, type)
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
            // check type popup
            const type = popup.getAttribute('type')
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

// Right click
document.addEventListener('contextmenu', () => {
    const popup = document.getElementById(popupID) as HTMLElement
    if (popup) {
        const type = popup.getAttribute('type')
        if (type !== 'chatgpt-ask') {
            removeIconAndPopup()  
        }
    } else {
        removeIconAndPopup()  
    }

   
})

// contextMenu
chrome.runtime.onMessage.addListener(async (data: any) => {
    const popup = document.getElementById(popupID) as HTMLElement
    if (popup) return
    removeIconAndPopup()
    const selection = document.getSelection();
    await initPopup(selection.toString(), selection.getRangeAt(0).getBoundingClientRect(), data.type)
    
    if (data.type !== 'chatgpt-ask') {
        chatGPT(selection.toString(), data.type)
    }
   
})
