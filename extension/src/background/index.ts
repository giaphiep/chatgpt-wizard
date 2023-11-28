import { getDataFromStorage, getChatHistory, updateHistory } from '../utils'
type Status = 'stream' | 'done' | 'stop' | 'read';
type Q = string | Array<{
        type: string;
        text?: string;
        image_url?: any
      }>
type QA = {
  question: Q;
  answer: string;
};
interface HistoryChat {
  role: string;
  content: Q;
}
interface PromptMap {
    [key: string]: string;
}
interface Input {
    text: string;
    uuid?: string;
    nativeLang?: string;
    type?: string;
    action: string;
    language?: string;
    image?: string;
    tone?: string;
    activeElement?: HTMLElement;
    src?: string;
}

interface Message {
  status?: Status;
  token?: string;
  chat?: QA;
  uuid?: string;
  id?: string;
  type?: string;
  dataUrl?: string;
  q?: string;
  base64Chunk?: string;
}

const portToAbortController: Record<string, AbortController> = {};

/**
 * Sends a message to the content script through the specified port.
 * @param port - The port to send the message through.
 * @param action - The action to perform.
 * @param message - The message to send.
 */
const sendToContentScript = (
  port: chrome.runtime.Port,
  action: string,
  message: Message,
  base64Chunk?: string
) => {
  port.postMessage({
    action,
    portName: port.name,
    message,
    base64Chunk,
  });
};

/**
 * Returns a system prompt based on the type of the input.
 * @param type - The type of the input.
 * @param nativeLang - The native language of the user.
 * @returns The system prompt.
 */
const systemPrompt = (type: string, nativeLang?: string, tone?: string) => {
    const prompts: PromptMap = {
      'chatgpt-explain': `You are an expert translator. Your task is explain the above text in the language whose ISO 639 code is ${nativeLang}`,
      'chatgpt-summarize': `You are a professional text summarizer, you can only summarize the text, don't interpret it, make it shorter as possible. Please summarize the text in the language whose ISO 639 code is ${nativeLang}`,
      'chatgpt-rewrite': `You are a language expert, Please enhance the text to improve its clarity, conciseness, and coherence in the language whose ISO 639 code is ${nativeLang}`,
      'chatgpt-grammar': `You will be given statements. Your task is to correct them to standard grammar`,
      'chatgpt-ask': `You are a helpful assistant`,
      'chatgpt-vision': `You are a helpful assistant`,
      'chatgpt-prompt': `You are a helpful assistant. ${
        tone
          ? `Please use the ${tone} tone and the language with the ISO 639 code ${nativeLang}.`
          : `Please use the language with the ISO 639 code ${nativeLang}.`
      }`,
      'chatgpt-quiz-slover': `You will be given one or more quizzes. Your task is to identify the correct answers then explain them in detail after the correct answers. Please use the language in "${nativeLang}"`,
      default: `You will be provided with words or sentences. Your task is only to translate these words or sentences into the language whose ISO 639 code is ${nativeLang}`,
    };

    return prompts[type] || prompts.default;
}

/**
 * Retrieves chat history for a given UUID and generates a message array to display in the chat UI.
 * @param input - An object containing the user's input and UUID.
 * @returns An array of message objects containing the chat history and the user's latest input.
 */
const handleHistory = async (input: Input) =>  {
    const chatHistory = await getChatHistory(input.uuid)

    const message = []
    const prompt = systemPrompt(input.type, input.nativeLang);
    message.push({ role: 'system', content: prompt });

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
    } else {
        if (input.type === 'chatgpt-vision') {
            message.push({
                role: 'user',
                content: [
                {
                    type: 'text',
                    text: input.text,
                },
                {
                    type: 'image_url',
                    image_url: {
                    url: input.src,
                    },
                },
                ],
            });
            return message;
        }
    }

    // add new message
    message.push({
        role: 'user',
        content: input.text
    })
    return message
}

/**
 * Handles the chat response from OpenAI's GPT-3 API.
 * @param port - The Chrome runtime port to communicate with the content script.
 * @param input - The input object containing the user's message and metadata.
 * @param abortController - The AbortController object to cancel the API request if needed.
 * @returns void
 */
const chatGPTResponse = async (port: chrome.runtime.Port, input: Input, abortController: AbortController) => {
    const { openaiKey, model } = await getDataFromStorage()
    const prompt = systemPrompt(input.type, input.language, input?.tone)
    let message: HistoryChat[] = [
      {
        role: 'system',
        content: prompt,
      },
      {
        role: 'user',
        content: input.text.trim(),
      },
    ];

    let useModel = model || 'gpt-3.5-turbo-1106';
    if (input.type === 'chatgpt-vision') {
        useModel = 'gpt-4-vision-preview';
    }

    if (input.type === 'chatgpt-ask' || input.type === 'chatgpt-vision') {
        message = await handleHistory(input)
    }
    const signal = abortController.signal;

    try {
        const response = await fetch(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${openaiKey}`,
            },
            body: JSON.stringify({
              model: useModel,
              messages: message,
              stream: true,
              max_tokens: 4096,
            }),
            signal: signal,
          }
        );
        if (!response.body) {
            sendToContentScript(port, 'stream', {
                status: 'stream',
                token: 'ReadableStream not yet supported in this browser. Please update your browser',
                type: input.type || 'chatgpt-translate'
            });
            return
        }

        if (response.status !== 200) {
            sendToContentScript(port, 'stream', {
                status: 'stream',
                token: 'Incorrect API key. Please update API key!',
                type: input.type || 'chatgpt-translate'
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
                            sendToContentScript(port, 'stream', {
                                    status: 'stream',
                                    id: parsedLine.id,
                                    token: content,
                                    type: input.type || 'chatgpt-translate'
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
            let chat
            if (input.type === 'chatgpt-vision' && input.src) {
                chat = {
                    question: [
                        {
                            type: 'text',
                            text: input.text,
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: input.src,
                        },
                    }
                ], answer: answer };
                updateHistory(input.uuid, chat);
            } else {
                chat = { question: input.text, answer: answer };
                updateHistory(input.uuid, chat);
            }

            //  const chat = { question: input.text, answer: answer };
            //  updateHistory(input.uuid, chat);
            
            

            // send status done to content script
            sendToContentScript(port, 'stream', {
                    status: 'done',
                    id: id,
                    uuid: input.uuid,
                    // chat: chat,
                    type: input.type || 'chatgpt-translate'
            });
        }
    } catch (error) {

        const errorMessage = error.name === 'AbortError' ? 'Stopped generate' : error.message;
        sendToContentScript(port, 'stream', {
                status: 'stream',
                token:errorMessage,
                type: input.type || 'chatgpt-translate'
        });
    } 

}

const readText = async (
  port: chrome.runtime.Port,
  input: Input,
  abortController: AbortController
) => {
  const { openaiKey, voice } = await getDataFromStorage();
  const signal = abortController.signal;
    try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1',
            voice: voice,
            input: input.text,
            // stream: true,
          }),
          signal: signal,
        });
        if (!response.ok) {
           throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const stream = response.body;
        const reader = stream.getReader()

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
                sendToContentScript(port, 'read', {
                    status: 'done',
                    type: 'chatgpt-read',
                });
                break;
          }

            // Send each chunk to the content script
            const base64Chunk = btoa(String.fromCharCode.apply(null, value));
            sendToContentScript(port, 'read', {
              status: 'stream',
              base64Chunk: base64Chunk,
              type: 'chatgpt-read',
            });
        }
    } catch (error) {
        const errorMessage =
            error.name === 'AbortError' ? 'Stopped generate' : error.message;
            sendToContentScript(port, 'read', {
            status: 'stop',
            token: errorMessage,
            type: input.type || 'chatgpt-read',
            });
    }
};
/**
 * Sends a message to the currently active tab in the current window.
 * @param message - The message to send to the active tab.
 */
const sendMessageToActiveTab = (message: Message) => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, message);
    });
}

chrome.runtime.onConnect.addListener(port => {
    if (port.name.startsWith('content-script')) {
        const abortController = new AbortController();
        portToAbortController[port.sender.tab.id] = abortController;

        port.onMessage.addListener(async (message: Input) => {
            if (message.action === 'abort') {
                const controller = portToAbortController[port.sender.tab.id];
                if (controller) {
                    controller.abort();
                    delete portToAbortController[port.sender.tab.id];
                }
            } else {
                if (message.action === 'stream') {
                    await chatGPTResponse(port, message, abortController);
                } else if (message.action === 'capture') {
                    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
                        if (chrome.runtime.lastError) {
                            console.error(chrome.runtime.lastError);
                            return;
                        }
                        // send image base64 to content script
                        sendToContentScript(port, 'capture', {dataUrl: dataUrl});
                    });
                }  else if (message.action === 'read') {
                    await readText(port, message, abortController);
                } else {
                    // TOO: handle other action
                }
            }
        });

        port.onDisconnect.addListener(() => {
            delete portToAbortController[port.sender.tab.id];
        });
    }
});

chrome.contextMenus.create({
    id: 'chatgpt-wizard',
    title: 'ChatGPT Wizard',

    contexts: ['all'],
}, () => {
    if (chrome.runtime.lastError) {
        console.log('Context menu item already exists');
    } else {

        chrome.contextMenus.create({
            id: 'chatgpt-quiz-solver',
            parentId: 'chatgpt-wizard',
            title: 'Quiz Solver (Cmd+Shift+S)',
            contexts: ['all'],
        });

        chrome.contextMenus.create({
            id: 'chatgpt-prompt',
            parentId: 'chatgpt-wizard',
            title: 'Create your prompt (Cmd+Shift+P)',
            contexts: ['editable'],
        });

        chrome.contextMenus.create({
          id: 'chatgpt-vision',
          parentId: 'chatgpt-wizard',
          title: 'Ask ChatGPT this image',
          contexts: ['image'],
        });

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
        chrome.contextMenus.create({
          id: 'chatgpt-read',
          parentId: 'chatgpt-wizard',
          title: 'Read it',
          contexts: ['selection'],
        });
       
    }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    switch (info.menuItemId) {
      case 'chatgpt-explain':
        sendMessageToActiveTab({ type: 'chatgpt-explain' });
        break;
      case 'chatgpt-summarize':
        sendMessageToActiveTab({ type: 'chatgpt-summarize' });
        break;
      case 'chatgpt-rewrite':
        sendMessageToActiveTab({ type: 'chatgpt-rewrite' });
        break;
      case 'chatgpt-grammar':
        sendMessageToActiveTab({ type: 'chatgpt-grammar' });
        break;
      case 'chatgpt-ask':
        sendMessageToActiveTab({ type: 'chatgpt-ask' });
        break;
      case 'chatgpt-quiz-solver':
        sendMessageToActiveTab({ type: 'chatgpt-quiz-solver' });
        break;
      case 'chatgpt-prompt':
        if (info.editable) {
          sendMessageToActiveTab({ type: 'chatgpt-prompt' });
        }
        break;
      case 'chatgpt-vision':
        sendMessageToActiveTab({ type: 'chatgpt-vision' });
        break;
      default:
        sendMessageToActiveTab({ type: 'chatgpt-translate' });
        break;
    }
});

chrome.commands.onCommand.addListener((command) => {
    switch(command) {
        case 'quiz_solver':
            sendMessageToActiveTab({ type: 'chatgpt-quiz-solver' });
            break;
        case 'create_prompt':
            sendMessageToActiveTab({ type: 'chatgpt-prompt' });
            break;
    }
});
