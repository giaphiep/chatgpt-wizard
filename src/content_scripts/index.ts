
import classes from './index.module.css';

const getDataFromStorage = (): Promise<{ openaiKey: string; nativeLang?: string; settingPopup?: string, type?: string }> => new Promise((resolve, reject) => {
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

const debounce = <T extends (...args: any[]) => any>(func: T, wait: number): T => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return function(this: ThisParameterType<T>, ...args: Parameters<T>): ReturnType<T> {
        const later = () => {
            clearTimeout(timeout!);
            func.apply(this, args);
        };
        clearTimeout(timeout!);
        timeout = setTimeout(later, wait);
        return timeout as any as ReturnType<T>;
    } as T;
}


interface SelectedEventInfoInterface {
    x: number
    y: number
}

interface SelectedEventInterface extends Event {
    info: SelectedEventInfoInterface
}

class SelectedEvent extends Event {
    info: SelectedEventInfoInterface

    constructor(type: string, info: SelectedEventInfoInterface) {
        super(type)
        this.info = info
    }
}

let selectionEndTimeout: NodeJS.Timeout = null
let iconDiv: HTMLElement = null
let popupDiv: HTMLElement = null

const iconID = 'gh-chatgpt-id'
const menuID = 'gh-chatgpt-menu-id'
const subMenuID = 'gh-chatgpt-submenu-id'
const subTranslate = 'gh-chatgpt-translate-id'
const subExplain = 'gh-chatgpt-explain-id'
const subSummarize = 'gh-chatgpt-summarize-id'
const subRewrite = 'gh-chatgpt-rewrite-id'

const popupID = 'gh-chatgpt-popup-id'
const boxChatID = 'gh-chatgpt-boxchat-id'
const answerID = 'gh-chatgpt-answer-id'
const typingID = 'gh-chatgpt-typing-id'

let port = null as chrome.runtime.Port
let currentPortName = null as string

const setResponseToPopup = (message: {success: boolean, token: string, id?: string}) => {
    if (popupDiv) {
        const divID = `${answerID}-${message?.id}`
        let answerDiv = document.getElementById(divID);
        // remove typing first
        document.getElementById(typingID)?.remove();

        if (answerDiv) {
            // If it exists, update its content
            answerDiv.textContent += message.token;
        } else {
            // If it doesn't exist, create it and append to `boxChatID`
            const div = document.createElement('div');
            div.innerHTML = `<div class="${classes.answer}">
                <div id="${divID}" class="${classes.answerDetail}">
                    ${message.token}
                </div>
            </div>`;
            document.getElementById(boxChatID).appendChild(div);
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

const removeChatHistory = (uuid: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.remove(uuid, () => {
            // Check for errors in chrome.runtime.lastError
            if (chrome.runtime.lastError) {
                return reject(new Error(chrome.runtime.lastError.message));
            }
            console.log('Uuid removed from storage');
            resolve();
        });
    });
};

const htmlPopup = async (text: string, type: string) => {

    const icon64URL = chrome.runtime.getURL('icons/icon-64.png')
    let title = `ChatGPT Translate`
    if (type === 'chatgpt-explain') {
        title = `ChatGPT Explain`
    } else if (type === 'chatgpt-summarize') {
        title = `ChatGPT Summarize`;
    } else if (type === 'chatgpt-rewrite') {
        title = 'ChatGPT Rewrite'
    }

    return `<div class="${classes.popup}">
            <div class="${classes.popupHead}">
                <div style="display: flex;align-items: center;">
                    <image style="width: 32px; height: 32px" src="${icon64URL}" alt="${title}" />
                    <p class="${classes.popupTitle}">${title}</p>
                </div>
            </div>
            <div id="${boxChatID}" class="${classes.boxChat}">
                <div  class="${classes.question}">
                    <div class="${classes.questionDetail}">
                        ${text}
                    </div>
                </div>

                <div id="${typingID}" class="${classes.answer}">
                    <div class="${classes.answerDetail}">
                        <div class="${classes.typing}">
                            <div class="${classes.typing_dot}"></div>
                            <div class="${classes.typing_dot}"></div>
                            <div class="${classes.typing_dot}"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`
}

const initPopupWithIcon = async (text: string, type: string) => {
    // Get the position of the iconDiv
    const iconButtonRect = iconDiv.getBoundingClientRect()

    // Calculate the dynamic content width based on available space in the viewport
    const viewportWidth = window.innerWidth
    let maxContentWidth = 0.8 * viewportWidth
    if (viewportWidth >= 768) {
        maxContentWidth = 0.5 * viewportWidth
    }
    const contentWidth = maxContentWidth < 500 ? maxContentWidth : 500

    // Calculate the position of the popupDiv based on the iconDiv
    const contentLeft = iconButtonRect.left + iconButtonRect.width / 2 - contentWidth / 2

    // Check if there is more space on the right or left of iconDiv
    const availableSpaceRight = window.innerWidth - (iconButtonRect.left + iconButtonRect.width + contentWidth)
    const availableSpaceLeft = iconButtonRect.left

    // Create the popupDiv and set its position
    popupDiv = document.createElement('div')
    popupDiv.style.position = 'absolute'
    popupDiv.style.backgroundColor = 'white'
    popupDiv.style.padding = '10px'
    popupDiv.style.zIndex = '2147483647'
    popupDiv.style.width = `${contentWidth}px`
    popupDiv.style.color = 'black'
    popupDiv.style.border = 'solid transparent'
    popupDiv.style.borderRadius = '8px'
    popupDiv.style.boxShadow = '0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)'
    popupDiv.id = popupID

    // Determine the position of popupDiv based on available space
    const iconWidth = 60
    const iconHeight = 30
    if (availableSpaceRight >= contentWidth) {
        popupDiv.style.left = `${iconButtonRect.right + window.scrollX - iconWidth}px`
    } else if (availableSpaceLeft >= contentWidth) {
        popupDiv.style.right = `${window.innerWidth - iconButtonRect.left + window.scrollX - iconWidth}px`
    } else {
        // Fallback position (centered if there's not enough space on either side)
        popupDiv.style.left = `${contentLeft + window.scrollX}px`
    }

    popupDiv.style.top = `${iconButtonRect.bottom - iconHeight}px`

    popupDiv.innerHTML = await htmlPopup(text, type)
    document.body.appendChild(popupDiv)
}

const initPopup = async (text: string, selectedText: Selection, type: string) => {
    const selectedTextRect = selectedText.getRangeAt(0).getBoundingClientRect();

    // Calculate the dynamic content width based on available space in the viewport
    const viewportWidth = window.innerWidth;
    let maxContentWidth = 0.8 * viewportWidth;
    if (viewportWidth >= 768) {
        maxContentWidth = 0.5 * viewportWidth;
    }
    const contentWidth = maxContentWidth < 500 ? maxContentWidth : 500;

    // Calculate the available space to the left and right of the selected text
    const availableSpaceRight = viewportWidth - (selectedTextRect.right + contentWidth);
    const availableSpaceLeft = selectedTextRect.left - contentWidth;

    // Create the popupDiv and set its styles
    popupDiv = document.createElement('div');
    popupDiv.style.position = 'absolute';
    popupDiv.style.backgroundColor = 'white';
    popupDiv.style.padding = '10px';
    popupDiv.style.zIndex = '2147483647';
    popupDiv.style.width = `${contentWidth}px`;
    popupDiv.style.color = 'black';
    popupDiv.style.border = 'solid transparent';
    popupDiv.style.borderRadius = '8px';
    popupDiv.style.boxShadow = '0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)';
    popupDiv.id = popupID

    // Set position based on available space
    if (availableSpaceRight > 0) {
        popupDiv.style.left = `${(selectedTextRect.right - selectedTextRect.width / 2) + window.scrollX}px`;
    } else if (availableSpaceLeft > 0) {
        popupDiv.style.left = `${selectedTextRect.left + window.scrollX - selectedTextRect.width / 2}px`;
    } else {
        // Fallback position: Centered under the selected text
        const centeredLeft = selectedTextRect.left + window.scrollX + (selectedTextRect.width / 2) - (contentWidth / 2);
        popupDiv.style.left = `${centeredLeft}px`;
    }
    popupDiv.style.top = `${selectedTextRect.bottom + window.scrollY}px`;

    popupDiv.innerHTML = await htmlPopup(text, type);
    document.body.appendChild(popupDiv);
}

const quickFeatures = () => {
    const iconTranslate = chrome.runtime.getURL('icons/icon-translate.svg')
    const iconExplain = chrome.runtime.getURL('icons/icon-explain.svg')
    const iconSummarize = chrome.runtime.getURL('icons/icon-summarize.svg')
    const iconEdit = chrome.runtime.getURL('icons/icon-edit.svg')

    return `<span class="${classes.menuTitle}">Quick features</span>
            <div id="${subTranslate}" class="${classes.menuItem}">
                <div class="${classes.iconItem}">
                    <img style="width: 15px; height: 15px;" alt="Translate" src="${iconTranslate}"></img>
                    <span style="padding-left: 8px; color: #000;">Translate</span>
                </div>
            </div>
            <div id="${subExplain}" class="${classes.menuItem}">
                <div class="${classes.iconItem}">
                    <img style="width: 15px; height: 15px;" alt="Explain" src="${iconExplain}"></img>
                    <span style="padding-left: 8px; color: #000;">Explain</span>
                </div>
            </div>
            <div id="${subSummarize}" class="${classes.menuItem}">
                <div class="${classes.iconItem}">
                    <img style="width: 15px; height: 15px;" alt="Summarize" src="${iconSummarize}"></img>
                    <span style="padding-left: 8px; color: #000;">Summarize</span>
                </div>
            </div>
            <div id="${subRewrite}" class="${classes.menuItem}">
                <div class="${classes.iconItem}">
                    <img style="width: 15px; height: 15px;" alt="Rewrite" src="${iconEdit}"></img>
                    <span style="padding-left: 8px; color: #000;">Rewrite</span>
                </div>
            </div>`
}

const chatGPT = async (text: string, type = 'chatgpt-translate') => {
    const uuid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    currentPortName = `content-script-${uuid}`
    port = chrome.runtime.connect({
        name: currentPortName,
    })
    // save to local
    // await chrome.storage.local.set({uuid: [text]})
    // send to background
    port.postMessage({text, uuid, type})
    port.onMessage.addListener(async (data: any) => {
        if (data.action === 'chatGPTResponse' && data.portName === currentPortName) {
            setResponseToPopup(data.message)
        }
    })
}

document.addEventListener('selectionEnd', async () => {
    const {openaiKey, settingPopup} = await getDataFromStorage()
    if (!openaiKey) return

    if (settingPopup === 'hide') return

    const selectionText = document.getSelection().toString()
    if (selectionText.length > 1) {
        if (settingPopup === 'display_icon') {
            // Create the icon button
            iconDiv = document.createElement('div')
            const icon64URL = chrome.runtime.getURL('icons/icon-64.png')
            iconDiv.style.position = 'absolute'
            iconDiv.style.backgroundColor = 'transparent'
            iconDiv.style.height = '30px'
            iconDiv.style.width = '60px'
            iconDiv.style.borderRadius = '8px'
            iconDiv.style.boxShadow = 'rgba(0, 0, 0, 0.2) 0px 4px 8px 0px, rgba(0, 0, 0, 0.19) 0px 6px 20px 0px'

            // Calculate the position for the icon button, considering page scroll
            const selectionRect = getPosition(document.getSelection().getRangeAt(0))
            const iconWidth = 60 // Width of the icon
            const left = selectionRect.left + window.scrollX + selectionRect.width / 2 - iconWidth / 2;

             // Add a small gap between the selection and the icon
            const spacing = 5;
            let top = selectionRect.bottom + spacing;

            iconDiv.style.left = `${left}px`
            iconDiv.style.top = `${top}px`
            iconDiv.style.zIndex = '2147483647'
            iconDiv.style.display = 'flex';
            iconDiv.style.alignContent = 'center';
            iconDiv.style.background = '#fff';
            iconDiv.style.padding = '2px';
            iconDiv.id = iconID
            iconDiv.innerHTML = `
                <img class="${classes.icon}" atl="ChatGPT Extension" src="${icon64URL}" />
                <div id="${menuID}" class="${classes.menu}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M1 4L6 9L11 4H1Z" fill="#12a37f"></path>
                    </svg>
                </div>
                `
            // add event hover
            iconDiv.onmouseover = () => {
                iconDiv.style.cursor = 'pointer'
            }
         
            // add event click
            iconDiv.onclick = async () => {
                const {type} = await getDataFromStorage()
                await initPopupWithIcon(selectionText, type)
                chatGPT(selectionText, type)
            }
            // append to body
            document.body.appendChild(iconDiv)

            // add event click
            const menuElement = document.getElementById(menuID);
            if (menuElement) {
                menuElement.onclick = async (event: any) => {
                    event.stopPropagation();
                    const sub = document.getElementById(subMenuID);
                    if (sub) {
                        sub?.remove()
                    } else {
                        const subMenu = document.createElement('div')
                        subMenu.className =`${classes.menuBox}`
                        subMenu.id = subMenuID
                        subMenu.innerHTML = quickFeatures()
                        menuElement.appendChild(subMenu)
                        
                        // TODO handle event each type
                        const typeTranslate = document.getElementById(subTranslate);
                        if (typeTranslate) {
                            typeTranslate.onclick = async (event: any) => {
                                event.stopPropagation();
                                await initPopupWithIcon(selectionText, 'chatgpt-translate')
                                chatGPT(selectionText, 'chatgpt-translate')
                            }
                        }

                        const typeExplain = document.getElementById(subExplain);
                        if (typeExplain) {
                            typeExplain.onclick = async (event: any) => {
                                event.stopPropagation();
                                await initPopupWithIcon(selectionText, 'chatgpt-explain')
                                chatGPT(selectionText, 'chatgpt-explain')
                            }
                        }

                        const typeSummarize = document.getElementById(subSummarize);
                        if (typeSummarize) {
                            typeSummarize.onclick = async (event: any) => {
                                event.stopPropagation();
                                await initPopupWithIcon(selectionText, 'chatgpt-summarize')
                                chatGPT(selectionText, 'chatgpt-summarize')
                            }
                        }

                        const typeRewrite = document.getElementById(subRewrite);
                        if (typeRewrite) {
                            typeRewrite.onclick = async (event: any) => {
                                event.stopPropagation();
                                await initPopupWithIcon(selectionText, 'chatgpt-rewrite')
                                chatGPT(selectionText, 'chatgpt-rewrite')
                            }
                        }
                    }
                }
            }
           
        } else {
            const selectedText = document.getSelection();
            const {type} = await getDataFromStorage()
            await initPopup(selectionText, selectedText, type)
            chatGPT(selectionText, type)
        }
    }
})

document.addEventListener('click', (evt: MouseEvent) => {
    const clickedElement = evt.target as Element;
    const iconElement = document.getElementById(iconID);
    const popupElement = document.getElementById(popupID);

    // remove icon
    if (iconElement) {
        iconElement?.remove();
        iconDiv = null
    }
    // keep popup open
    if (!clickedElement.closest(`#${popupID}`)) {
        if (popupElement) {
            popupElement.remove();
            popupDiv = null
        }
    }
})

// debounce version of selection event
document.addEventListener('mouseup', (evt: MouseEvent) => {
    selectionEndTimeout = setTimeout(() => {
        const noContentWindow = !popupDiv
        const haveText = window.getSelection().toString() !== ''
        if (noContentWindow && haveText) {
            const coordinates = {
                x: evt.pageX - document.body.scrollLeft,
                y: evt.pageY - document.body.scrollTop,
            }
            const info = {
                ...coordinates,
            }
            const selectionEndEvent = new SelectedEvent('selectionEnd', info)
            document.dispatchEvent(selectionEndEvent)
        }
    }, 100)
})
document.addEventListener('selectionchange', () => {
    if (selectionEndTimeout) {
        clearTimeout(selectionEndTimeout)
    }
})
// end debounce version of selection event

// TODO
chrome.runtime.onMessage.addListener(async (data: any) => {
    if (data.type === 'chatgpt-translate') {
        removeIconAndPopup()
        const selectedText = document.getSelection();
        await initPopup(selectedText.toString(), selectedText, data.type)
        chatGPT(selectedText.toString(), data.type)
    } else if (data.type === 'chatgpt-explain') {
        removeIconAndPopup()
        const selectedText = document.getSelection();
        await initPopup(selectedText.toString(), selectedText, data.type)
        chatGPT(selectedText.toString(), data.type)
    } else if (data.type === 'chatgpt-summarize') {
        removeIconAndPopup()
        const selectedText = document.getSelection();
        await initPopup(selectedText.toString(), selectedText, data.type)
        chatGPT(selectedText.toString(), data.type)
    } else if (data.type === 'chatgpt-rewrite') {
        removeIconAndPopup()
        const selectedText = document.getSelection();
        await initPopup(selectedText.toString(), selectedText, data.type)
        chatGPT(selectedText.toString(), data.type)
    }
})
