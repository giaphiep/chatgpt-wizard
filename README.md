# ChatGPT Wizard

Demo Video: https://www.youtube.com/watch?v=QB5P8hR_cH8

This Chrome extension, developed using manifest version 3, integrates the functionalities of ChatGPT for various tasks such as translation, explanation, summarization, rewriting, grammar correction, read highlighted text, and ask ChatGPT regarding highlighted text

Select an unknown sentence, and let ChatGPT Wizard help you.

![Screenshot1](https://github.com/giaphiep/chatgpt-wizard/blob/main/screenshots/1.gif)
![Screenshot2](https://github.com/giaphiep/chatgpt-wizard/blob/main/screenshots/2.gif)
![Screenshot3](https://github.com/giaphiep/chatgpt-wizard/blob/main/screenshots/3.gif)

## Install

1. Run

In Terminal 1

```
cd extension
bun install
bun run build
```

Optional: If you want to use your own server, you need to add the server URL to the "host_permissions" parameter in the file located at extension/src/manifest.json and then rebuild it. After this, open Terminal 2.

```
cd server
bun install
bun run start
```

These commands will generate a folder named "chatgpt-wizard" after the build process is complete

2. Now, open the Chrome extensions page by navigating to chrome://extensions/
3. In the top right corner of the extensions page, enable Developer Mode by toggling the switch
4. Next, click the "Load Unpacked" button, and then select the "chatgpt-wizard" folder from your system

## Usage

1.  Start by opening the extension settings page by clicking on its icon. Here, you'll need to input your API key, which you can obtain from the [https://platform.openai.com/account/api-keys](https://platform.openai.com/account/api-keys)
2.  After obtaining your OpenAI API key, register it in the designated input field along with any other required information.
3.  Once you've completed this setup, refresh web pages as needed. Now, you'll be able to highlight sentences on any website, and you'll notice an icon button appear when you release the highlight.

## Support

If you find the extension useful and would like to support its development, please consider making a donation. Your contributions help me continue improving and maintaining this tool.

[Buy Me a Coffee](https://ko-fi.com/giaphiep) and contribute what you can. Greatly appreciate your support!

## Contributing

[TODO]

## License

MIT

[TODO]
