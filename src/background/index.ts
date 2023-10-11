import { getDataFromStorage, getChatHistory, updateHistory } from '../utils'

// chrome.runtime.onInstalled.addListener(async () => {
//     const url = chrome.runtime.getURL('/popup/index.html')
//     chrome.windows.create({
//         url,
//         type: 'popup',
//         width: 320,
//         height: 300,
//     })
// })

const sendToContentScript = (payload: { port: chrome.runtime.Port, action: string, message: {success: boolean, token: string, id?: string} }) => {
    const { port, action, message } = payload
    port.postMessage({
        action,
        portName: port.name,
        message: message,
    })
}

const handleHistory = async (nativeLang: string, text: string) => {
    const chatHistory = await getChatHistory()
    const message = [
        { role: 'system', content: `You are a helpful AI. Please answer using language with locale code is "${nativeLang}"` },
    ]
    // old history
    for(let [_, conversation] of Object.entries(chatHistory)) {
        for(let value of conversation) {
            message.push({
                role: 'user',
                content: value.question
            })
            message.push({
                role: 'AI',
                content: value.answer
            })
        }
    }
    message.push({
        role: 'user',
        content: text
    })
    return message
}

const chatGPTResponse = async (port: chrome.runtime.Port, input: {uuid: string, text: string, type: string}) => {
    const { openaiKey, nativeLang, model } = await getDataFromStorage()
   
    let prompt  = `You will be provided with words or sentences, and your task is to translate it into the language with locale code is "${nativeLang}" without explanation`;
    if (input.type === 'chatgpt-explain') {
        prompt = `You are an expert translator. Please explain the above text use the language with locale code is "${nativeLang}"`
    } else if (input.type === 'chatgpt-summarize') {
        prompt = `You are a professional text summarizer, you can only summarize the text, don't interpret it, make it shorter as possible`
    } else if (input.type === 'chatgpt-rewrite') {
        prompt = `You are a language expert, Please enhance the text to improve its clarity, conciseness, and coherence, ensuring it aligns with the expression of native speakers`
    } else if (input.type === 'chatgpt-grammar') {
        prompt = `You will be given statements. Your task is to correct them to standard grammar`
    } else if (input.type === 'chatgpt-ask') {
        prompt = `You are a helpful assistant. Please use the language with locale code is "${nativeLang}"`
    }
    // get error
    // const message = await handleHistory(nativeLang, input.text);
    const message = [
        {
            role: 'system', 
             content: prompt
        },
        {
            role: 'user', 
            content: input.text.trim()
        },
    ]
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
                temperature: 0,
                // max_tokens: 1000,
                top_p: 1,
                frequency_penalty: 1,
                presence_penalty: 1,
                stream: true
                 // Enable streaming mode
            }),
            signal: signal,
        });
        if (!response.body) {
            console.error('ReadableStream not yet supported in this browser.')
            sendToContentScript({
                port,
                action: 'chatGPTResponse',
                message: {
                    success: false,
                    token: 'ReadableStream not yet supported in this browser. Please update your browser',
                }
            });
            return
        }

        if (response.status !== 200) {
            console.error('Incorrect API key. Please update API key!')
            sendToContentScript({
                port,
                action: 'chatGPTResponse',
                message: {
                    success: false,
                    token: 'Incorrect API key. Please update API key!',
                }
            });
            return
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let answer = ''
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  await updateHistory(input.text, answer)
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
          
                for (const parsedLine of parsedLines) {
                    if (parsedLine) {
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
                                    success: true,
                                    id: parsedLine.id,
                                    token: content,
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
      
    } catch (error) {

        if (error.name === 'AbortError') {
            console.log('Fetch was aborted');
            sendToContentScript({
                port,
                action: 'chatGPTResponse',
                message: {
                    success: false,
                    token: 'Fetch was aborted',
                }
            });
        } else {
            sendToContentScript({
                port,
                action: 'chatGPTResponse',
                message: {
                    success: false,
                    token: error.message,
                }
            });
        }
    } 

}

chrome.runtime.onConnect.addListener(port => {
    if (port.name.startsWith('content-script')) {
        port.onMessage.addListener(async (message: {text: string, uuid: string, type: string}) => {
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
        // chrome.contextMenus.create({
        //     id: 'chatgpt-ask',
        //     parentId: 'chatgpt-wizard',
        //     title: 'Ask ChatGPT',
        //     contexts: ['selection'],
        // });
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
        // case 'chatgpt-ask':
        //     chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        //         chrome.tabs.sendMessage(tabs[0].id, {
        //             type: 'chatgpt-ask',
        //         })
        //     })
        //     break;
        default:
            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'chatgpt-translate',
                })
            })
            break;
    }

    
})
