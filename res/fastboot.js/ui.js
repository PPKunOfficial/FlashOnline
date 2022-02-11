// @license magnet:?xt=urn:btih:d3d9a9a6595521f9666a5e94cc830dab83b65699&dn=expat.txt MIT

import * as fastboot from "./fastboot.mjs";
import { BlobStore } from "./download.js";

let device = new fastboot.FastbootDevice();
window.device = device;
let blobStore = new BlobStore();

// Enable verbose debug logging
fastboot.setDebugLevel(2);

async function connectDevice() {
    let statusField = document.querySelector(".status-field");
    statusField.textContent = "连接中...";

    try {
        await device.connect();
    } catch (error) {
        statusField.textContent = `连接设备错误: ${error.message}`;
        return;
    }

    let product = await device.getVariable("product");
    let serial = await device.getVariable("serialno");
    let status = `连接到 ${product} (serial: ${serial})`;
    statusField.textContent = status;
}

async function sendFormCommand(event) {
    event.preventDefault();

    let inputField = document.querySelector(".command-input");
    let command = inputField.value;
    let result = (await device.runCommand(command)).text;
    console.log(result);
    document.querySelector(".result-field").textContent = result;
    inputField.value = "";
}

async function flashFormFile(event) {
    event.preventDefault();

    let fileField = document.querySelector(".flash-file");
    let partField = document.querySelector(".flash-partition");
    let file = fileField.files[0];
    await device.flashBlob(partField.value, file);
    fileField.value = "刷入完成，请重启查看是否成功";
    partField.value = "刷入完成，请重启查看是否成功";
}

function reconnectCallback() {
    let reconnectButton = document.querySelector(".reconnect-button");
    reconnectButton.style.display = "block";
    reconnectButton.onclick = async () => {
        await device.connect();
        reconnectButton.style.display = "none";
    };
}

async function flashFactoryZip(blob) {
    let statusField = document.querySelector(".factory-status-field");
    statusField.textContent = "刷入中...";

    let progressBar = document.querySelector(".factory-progress-bar");

    try {
        await device.flashFactoryZip(
            blob,
            false,
            reconnectCallback,
            // Progress callback
            (action, item, progress) => {
                let userAction = fastboot.USER_ACTION_MAP[action];
                statusField.textContent = `${userAction} ${item}`;
                document.getElementsByName('flash-progress')[0].setAttribute('aria-valuenow',progress*100)
                //progressBar.aria-valuenow = progress*100;
            }
        );
    } catch (error) {
        statusField.textContent = `刷入zip文档错误: ${error.message}`;
        throw error;
    }

    statusField.textContent = "成功刷入厂商zip文档";
}

async function flashSelectedFactoryZip(event) {
    event.preventDefault();

    let fileField = document.querySelector(".factory-file");
    await flashFactoryZip(fileField.files[0]);
    fileField.value = "";
}

fastboot.configureZip({
    workerScripts: {
        inflate: ["/res/fastboot.js/vendor/z-worker-pako.js", "/res/fastboot.js/vendor/pako_inflate.min.js"],
    },
});

document
    .querySelector(".command-form")
    .addEventListener("submit", sendFormCommand);
document
    .querySelector(".connect-button")
    .addEventListener("click", connectDevice);
document
    .querySelector(".flash-form")
    .addEventListener("submit", flashFormFile);
document
    .querySelector(".factory-form")
    .addEventListener("submit", flashSelectedFactoryZip);

// @license-end