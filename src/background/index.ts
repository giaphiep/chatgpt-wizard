import { getDataFromStorage, getChatHistory, updateHistory } from '../utils'
type Status = 'stream' | 'done' | 'error'
type QA = { question: string, answer: string };

interface Input {
    text: string;
    uuid?: string;
    nativeLang?: string;
    type?: string;
}
interface Message {
    status?: Status;
    token?: string;
    chat?: QA,
    uuid?: string;
    id?: string;
    type?: string;
}
interface Payload {
    port: chrome.runtime.Port;
    action: string;
    message: Message;
}

const sendToContentScript = (payload: Payload) => {
    const { port, action, message } = payload
    port.postMessage({
        action,
        portName: port.name,
        message: message,
    })
}
const systemPropmt = (type: string, nativeLang?: string) => {
    let prompt  = `You will be provided with words or sentences, and your task is to translate it into the language with locale code is "${nativeLang}" without explanation`;
    if (type === 'chatgpt-explain') {
        prompt = `You are an expert translator. Please explain the above text use the language with locale code is "${nativeLang}"`
    } else if (type === 'chatgpt-summarize') {
        prompt = `You are a professional text summarizer, you can only summarize the text, don't interpret it, make it shorter as possible`
    } else if (type === 'chatgpt-rewrite') {
        prompt = `You are a language expert, Please enhance the text to improve its clarity, conciseness, and coherence, ensuring it aligns with the expression of native speakers`
    } else if (type === 'chatgpt-grammar') {
        prompt = `You will be given statements. Your task is to correct them to standard grammar`
    } else if (type === 'chatgpt-ask') {
        prompt = `Please answer in the language with the locale code ${nativeLang}. You are a helpful assistant`
    }
    return prompt
}

const handleHistory = async (input: Input) =>  {
    const chatHistory = await getChatHistory(input.uuid)
    const prompt = systemPropmt(input.type, input.nativeLang)

    const message = [
        { role: 'system', content: prompt}
    ]
    // old history
    if (chatHistory.length > 0) {
        for(let value of chatHistory) {
            message.push({
                role: 'user',
                content: value.question
            })
            message.push({
                role: 'assistant',
                content: value.answer
            })
        }
    }
    message.push({
        role: 'user',
        content: input.text
    })
    return message
}

const chatGPTResponse = async (port: chrome.runtime.Port, input: Input) => {
    const { openaiKey, nativeLang, model } = await getDataFromStorage()
    const prompt = systemPropmt(input.type, nativeLang)
    let message = [
        {
            role: 'system', 
                content: prompt
        },
        {
            role: 'user', 
            content: input.text.trim()
        },
    ]
    if (input.type === 'chatgpt-ask') {
        message = await handleHistory(input)
    }

    const abortController = new AbortController();
    const signal = abortController.signal;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${openaiKey}`,
            },
            body: JSON.stringify({
                model: model,
                messages: message,
                stream: true
            }),
            signal: signal,
        });
        if (!response.body) {
            sendToContentScript({
                port,
                action: 'chatGPTResponse',
                message: {
                    status: 'stream',
                    token: 'ReadableStream not yet supported in this browser. Please update your browser',
                    type: input.type || 'chatgpt-translate'
                }
            });
            return
        }

        if (response.status !== 200) {
            sendToContentScript({
                port,
                action: 'chatGPTResponse',
                message: {
                    status: 'stream',
                    token: 'Incorrect API key. Please update API key!',
                    type: input.type || 'chatgpt-translate'
                }
            });
            return
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let answer = ''
        let id = ''
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  break;
                }
                // Massage and parse the chunk of data
                const chunk = decoder.decode(value);
                const lines = chunk.split("\n");
                const parsedLines = lines
                  .map((line) => line.replace(/^data: /, "").trim()) // Remove the "data: " prefix
                  .filter((line) => line !== "" && line !== "[DONE]") // Remove empty lines and "[DONE]"
                  .map((line) => {
                    try {
                        return JSON.parse(line)
                    } catch (e) {
                        return null
                    }
                  }); // Parse the JSON string
          
                for (const [index, parsedLine] of parsedLines.entries()) {
                    if (parsedLine) {
                        if (index === 0) {
                            id = parsedLine.id
                        }
                        const { choices } = parsedLine;
                        const { delta } = choices[0];
                        const { content } = delta;
                        // Update the UI with the new content
                        if (content) {
                            answer +=content
                            sendToContentScript({
                                port,
                                action: 'chatGPTResponse',
                                message: {
                                    status: 'stream',
                                    id: parsedLine.id,
                                    token: content,
                                    type: input.type || 'chatgpt-translate',
                                }
                            });
                        }
                    }
                }
            }
        } catch (error) {
            port.disconnect()
            reader.releaseLock()
        }

        // update history chat
        if (answer.length > 0) {
            const chat = { question: input.text, answer: answer}
            updateHistory(input.uuid, chat)

            // send status done to content script
            sendToContentScript({
                port,
                action: 'chatGPTResponse',
                message: {
                    status: 'done',
                    id: id,
                    uuid: input.uuid,
                    chat: chat,
                    type: input.type || 'chatgpt-translate'
                }
            });
        }
    } catch (error) {

        if (error.name === 'AbortError') {
            console.log('Fetch was aborted');
            sendToContentScript({
                port,
                action: 'chatGPTResponse',
                message: {
                    status: 'stream',
                    token: 'Fetch was aborted',
                    type: input.type || 'chatgpt-translate'
                }
            });
        } else {
            sendToContentScript({
                port,
                action: 'chatGPTResponse',
                message: {
                    status: 'stream',
                    token: error.message,
                    type: input.type || 'chatgpt-translate'
                }
            });
        }
    } 

}

chrome.runtime.onConnect.addListener(port => {
    if (port.name.startsWith('content-script')) {
        port.onMessage.addListener(async (message: Input) => {
            await chatGPTResponse(port, message)
        })
    }
})

chrome.contextMenus.create({
    id: 'chatgpt-wizard',
    title: 'ChatGPT Wizard',
    contexts: ['selection'],
}, () => {
    if (chrome.runtime.lastError) {
        console.log('Context menu item already exists');
    } else {
        console.log('Context menu item created successfully');

        chrome.contextMenus.create({
            id: 'chatgpt-translate',
            parentId: 'chatgpt-wizard',
            title: 'Translate',
            contexts: ['selection'],
        });

        chrome.contextMenus.create({
            id: 'chatgpt-explain',
            parentId: 'chatgpt-wizard',
            title: 'Explain',
            contexts: ['selection'],
        });

        chrome.contextMenus.create({
            id: 'chatgpt-summarize',
            parentId: 'chatgpt-wizard',
            title: 'Summarize',
            contexts: ['selection'],
        });
        
        chrome.contextMenus.create({
            id: 'chatgpt-rewrite',
            parentId: 'chatgpt-wizard',
            title: 'Rewrite',
            contexts: ['selection'],
        });
        chrome.contextMenus.create({
            id: 'chatgpt-grammar',
            parentId: 'chatgpt-wizard',
            title: 'Grammar Correction',
            contexts: ['selection'],
        });
        chrome.contextMenus.create({
            id: 'chatgpt-ask',
            parentId: 'chatgpt-wizard',
            title: 'Ask ChatGPT',
            contexts: ['selection'],
        });
    }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    switch (info.menuItemId) {
        case 'chatgpt-explain':
            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'chatgpt-explain',
                })
            })
            break;
        case 'chatgpt-summarize':
            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'chatgpt-summarize',
                })
            })
            break;
        case 'chatgpt-rewrite':
            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'chatgpt-rewrite',
                })
            })
            break;
        case 'chatgpt-grammar':
            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'chatgpt-grammar',
                })
            })
            break;
        case 'chatgpt-ask':
            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'chatgpt-ask',
                })
            })
            break;
        default:
            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'chatgpt-translate',
                })
            })
            break;
    }

    
})
