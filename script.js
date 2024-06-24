// ==UserScript==
// @name         social-autoblocker
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Collect usernames to block and download them as a .txt file.
// @author       jimididit
// @include        *://*.instagram.com/*
// @include        *://*.tiktok.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

// Use of an Immediately Invoked Function Expression (IIFE) to avoid polluting the global scope.

window.addEventListener('load', function() {
    'use strict'; // Enforcing stricter parsing and error handling in the script.

    console.log('Running Autoblock and Blocklist Creator Script');

    const configs = {
        "www.instagram.com" : {
            // Key to access Instagram block list in localStorage.

            blockListKey : 'instagramBlockList',
            profileUrl : (username) => {return `https://www.instagram.com/${username}`},
            actions_list : [
                {info : "Searching for option button", target : '[role="button"]:has([aria-label="Options"])', action : "click", timeout: 5000, sleep:1000},
                {info : "Searching for follow button", target : 'button:nth-child(1)', action : "store", timeout: 5000, sleep:1000},
                {info : "Searching for block button", target : '[role="dialog"] button:nth-child(1)', action : "click", check : (self,stored) => {return self.innerText != stored.at(-1)} , timeout: 5000, sleep:1000},
                {info : "Searching for block confirmation button", target : '[role="dialog"] button:nth-child(1):nth-last-of-type(2)', action : "click", timeout: 5000, sleep:1000},
            ]
        },
        "www.tiktok.com" : {
            // Key to access Instagram block list in localStorage.
            blockListKey : 'tiktokBlockList',
            profileUrl : (username) => {
                username = username.startsWith("@") ? username : "@" + username
                return `https://www.tiktok.com/${username}`
            },
            actions_list : [
                {info : "Searching for option button", target : '[data-e2e="user-more"]', action : "mouseover", timeout: 5000, sleep:1000},
                {info : "Searching for follow button", target : '[data-e2e="follow-button"]', action : "store", timeout: 5000, sleep:1000},
                {info : "Searching for block button", target : '[data-e2e="user-report"] [role="button"]:nth-last-of-type(1)', action : "click", check : (self,stored) => {return self.innerText != stored.at(-1)}, timeout: 5000, sleep:1000},
                {info : "Searching for block confirmation button", target : 'button[data-e2e="block-popup-block-btn"]', action : "click", timeout: 5000, sleep:1000},
            ]
        }
    }

    // Initialize the script by checking if there's a post-navigation task to be performed.
    checkForPostNavigationTask();

    /**
     * Checks for tasks that should continue after page navigation.
     * This typically involves continuing a blocking process that was interrupted by a page load.
     */
    function checkForPostNavigationTask() {
        const task = JSON.parse(localStorage.getItem('autoBlock'));
        if (task) {
            performBlockOperation(task);
        }
    }

    function sleep(time) {
        return new Promise(resolve => setTimeout(resolve, time));
    }

    /**
     * Perform blocking operation based on the task details.
     * @param {Object} task - Task information including the username.
     */
    async function performBlockOperation(task) {
        // Check if the current location is the correct user page, if not redirect.

        let host = window.location.hostname
        let url = configs[host].profileUrl(task.username)
        
        if (!window.location.href.includes(url)) {
            window.location.href = url;
            return;
        }

        let store = []

        for (let action of configs[host].actions_list){

            console.info(action.info)
            let target
            try {
                target = await waitForElement(action.target, action.timeout) 
            } catch (error) {
                break
            }

            if (!target) break

            if (action.check && !action.check(target,store)) break

            if (action.action == "store") {
                store.push(target.innerText)
            }
            else {
                simulateMouseEvent(target, action.action);
            }

            await sleep(action.sleep)
        }

        // Move on to the next user in the queue.
        handleNextUser();
    }

     /**
     * Processes the next user in the queue.
     */
    function handleNextUser() {
        const users = JSON.parse(localStorage.getItem('autoBlockQueue') || '[]');
        if (users.length > 0) {
            const nextUser = users.shift();
            localStorage.setItem('autoBlockQueue', JSON.stringify(users));
            localStorage.setItem('autoBlock', JSON.stringify(nextUser));
            checkForPostNavigationTask();
        } else {
            alert('All users have been blocked');
            localStorage.removeItem('autoBlockQueue');
            localStorage.removeItem('autoBlock');
        }
    }

    /**
     * Waits for a DOM element to appear within a specified timeout.
     * @param {String} selector - The CSS selector of the element.
     * @param {Number} timeout - The timeout in milliseconds.
     * @returns {Promise<Element>} A promise that resolves with the element.
     */
    function waitForElement(selector, timeout) {
        return new Promise((resolve, reject) => {
            const intervalTime = 100;
            const endTime = Number(new Date()) + timeout;
            const timer = setInterval(() => {
                if (Number(new Date()) > endTime) {
                    clearInterval(timer);
                    reject(new Error("Element not found within time: " + selector));
                }
                const el = document.querySelector(selector);
                if (el) {
                    clearInterval(timer);
                    resolve(el);
                }
            }, intervalTime);
        });
    }

    /**
     * Simulates a mouse event on the specified element.
     * @param {Element} element - The DOM element to target.
     * @param {String} eventType - The type of event ('click', 'mouseover', etc.).
     */
    function simulateMouseEvent(element, eventType) {
        console.log(`Simulating ${eventType} event`);
        const event = new MouseEvent(eventType, {
            view: window,
            bubbles: true,
            cancelable: true
        });
        element.dispatchEvent(event);
        console.log(`${eventType} event triggered`);
    }

    // Initialize the user interface.
    function init() {


        const card = createCard('Block List Manager');

        addButton(card, 'Start', () => {
            if (localStorage.getItem("autoBlockQueue") != []){
                handleNextUser();
            }
        });
        addButton(card, 'Stop', () => {
            localStorage.setItem("autoBlockQueue", [])
        });
        createFileInput(card);

        createHideButton(card);

    }

    // Create a file input for handling block list uploads.
    function createHideButton(card) {
        const btn = document.createElement('button');
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" fill="none"/><circle cx="128" cy="128" r="12"/><circle cx="128" cy="60" r="12"/><circle cx="128" cy="196" r="12"/></svg>'
        btn.style.width = '32px';
        btn.style.height = '32px';
        btn.style.position = "absolute"
        btn.style.top = '20px';
        btn.style.right = '20px';
        btn.style.backgroundColor = '#fff';
        btn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
        btn.style.borderRadius = '8px';
        btn.style.zIndex = '1000000';
        btn.onclick = () => {card.style.display = card.style.display == "block" ? "none" : "block" };
        document.body.appendChild(btn);
    }

    // Create a file input for handling block list uploads.
    function createFileInput(card) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.style.width = '100%';
        fileInput.style.marginTop = '10px';
        fileInput.onchange = handleFileUpload;
        card.appendChild(fileInput);
    }

    // Handle the upload of a file and process the included usernames.
    async function handleFileUpload(event) {
        const file = event.target.files[0];
        const text = await file.text();
        const usernames = text.split(/\r?\n/).filter(u => u.trim() !== '').map(username => ({username: username.trim(), action: 'block'}));
        localStorage.setItem('autoBlockQueue', JSON.stringify(usernames));
    }

    // Create the main UI card that hosts all UI elements.
    function createCard(cardTitle) {
        const card = document.createElement('div');
        card.style.position = 'fixed';
        card.style.top = '60px';
        card.style.display = 'none';
        card.style.right = '20px';
        card.style.width = '250px';
        card.style.backgroundColor = '#fff';
        card.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
        card.style.padding = '10px';
        card.style.borderRadius = '8px';
        card.style.zIndex = '1000000';

        const title = document.createElement('h3');
        title.innerText = cardTitle;
        title.style.textAlign = 'center';
        title.style.marginBottom = '10px';
        title.style.color = '#333333';
        card.appendChild(title);

        document.body.appendChild(card);
        return card;
    }

    // Add a button to the card with defined actions.
    function addButton(card, text, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.backgroundColor = 'rgb(254, 44, 85)';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.padding = '10px';
        button.style.marginTop = '5px';
        button.style.width = '100%';
        button.style.borderRadius = '5px';
        button.style.cursor = 'pointer';
        button.onclick = onClick;
        card.appendChild(button);
    }

    // Call init function to initialize interface
    init();
}, false);
