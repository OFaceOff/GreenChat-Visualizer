lucide.createIcons();

let chats = []; 
let activeChatId = null;

const contactListEl = document.getElementById('contactList');
const searchInput = document.getElementById('searchInput');
const chatArea = document.getElementById('chatArea');
const sidebar = document.getElementById('sidebar');
const emptyState = document.getElementById('emptyState');
const chatContent = document.getElementById('chatContent');
const headerAvatar = document.getElementById('headerAvatar');
const headerName = document.getElementById('headerName');
const headerInfo = document.getElementById('headerInfo');
const messagesContainer = document.getElementById('messagesContainer');

const REGEX_LINE = /^\[?(\d{2}\/\d{2}\/\d{2,4})\s?,?\s?(\d{2}:\d{2}(?::\d{2})?)\]?\s(.*?):\s(.*)/;
const REGEX_SYSTEM = /^\[?(\d{2}\/\d{2}\/\d{2,4})\s?,?\s?(\d{2}:\d{2}(?::\d{2})?)\]?\s(.*)/;

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const text = await file.text();
    processChatText(file.name, text);
    event.target.value = ''; 
}

function processChatText(filename, text) {
    const lines = text.split('\n');
    const messages = [];
    const participants = new Set();
    
    let currentMessage = null;

    lines.forEach(line => {
        line = line.trim().replace(/[\u200E\u200F]/g, '');
        if (!line) return;

        const match = line.match(REGEX_LINE);
        
        if (match) {
            if (currentMessage) messages.push(currentMessage);

            const author = match[3].trim();
            participants.add(author);

            currentMessage = {
                date: match[1],
                time: match[2].substring(0, 5),
                author: author,
                text: match[4],
                type: 'chat'
            };
        } else {
            const systemMatch = line.match(REGEX_SYSTEM);
            if (systemMatch && !line.includes(': ')) {
                if (currentMessage) messages.push(currentMessage);
                currentMessage = {
                    date: systemMatch[1],
                    time: systemMatch[2].substring(0, 5),
                    author: 'System',
                    text: systemMatch[3],
                    type: 'system'
                };
            } else if (currentMessage) {
                currentMessage.text += '\n' + line;
            }
        }
    });

    if (currentMessage) messages.push(currentMessage);

    if (messages.length === 0) {
        alert("Formato de arquivo não reconhecido.");
        return;
    }

    const participantsArray = Array.from(participants);
    
    const mainUser = participantsArray[1] || participantsArray[0]; 

    const newChat = {
        id: Date.now(),
        name: filename.replace('.txt', '').replace('Conversa do WhatsApp com ', ''),
        avatar: `https://ui-avatars.com/api/?name=${participantsArray[0] || '?'}&background=random&color=fff`,
        participants: participantsArray,
        mainUser: mainUser,
        messages: messages,
        lastMessage: messages[messages.length-1].text.substring(0, 30) + '...',
        time: messages[messages.length-1].time,
        unread: 0
    };

    chats.unshift(newChat);
    renderContactList();
    openChat(newChat.id);
}

function renderContactList(filter = "") {
    contactListEl.innerHTML = "";
    
    if (chats.length === 0) {
        contactListEl.innerHTML = `
        <div class="flex flex-col items-center justify-center mt-20 px-10 text-center opacity-80">
            <div class="bg-[#f0f2f5] p-4 rounded-full mb-4">
                <i data-lucide="file-down" class="w-8 h-8 text-[#00a884]"></i>
            </div>
            <h3 class="text-[#3b4a54] font-medium mb-1">Carregue suas conversas</h3>
            <p class="text-[#8696a0] text-sm">Clique no ícone de upload acima e selecione um arquivo .txt para visualizar.</p>
        </div>`;
        lucide.createIcons();
        return;
    }

    const filteredChats = chats.filter(chat => 
        chat.name.toLowerCase().includes(filter.toLowerCase())
    );

    filteredChats.forEach(chat => {
        const isActive = chat.id === activeChatId;
        const item = document.createElement('div');
        item.className = `chat-item flex items-center px-3 py-3 cursor-pointer border-b border-[#f0f2f5] ${isActive ? 'active' : 'bg-white'}`;
        item.onclick = () => openChat(chat.id);

        item.innerHTML = `
            <div class="relative w-12 h-12 rounded-full overflow-hidden mr-3 shrink-0 bg-[#dfe3e5]">
                <img src="${chat.avatar}" class="w-full h-full object-cover">
            </div>
            <div class="flex-1 min-w-0 flex flex-col justify-center">
                <div class="flex justify-between items-baseline mb-0.5">
                    <span class="text-[#111b21] font-normal text-[17px] truncate" title="${chat.name}">${chat.name}</span>
                    <span class="text-[#667781] text-[12px] shrink-0 ml-2 font-light">${chat.time}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-[#667781] text-[14px] truncate flex-1 font-light leading-5">${chat.lastMessage}</span>
                </div>
            </div>
        `;
        contactListEl.appendChild(item);
    });
}

function openChat(chatId) {
    activeChatId = chatId;
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    emptyState.style.display = 'none';
    chatContent.style.display = 'flex';
    chatContent.classList.remove('hidden');

    if (window.innerWidth < 768) {
        sidebar.style.display = 'none';
        chatArea.style.display = 'flex';
    }

    headerName.textContent = chat.name;
    headerAvatar.src = chat.avatar;
    headerInfo.textContent = chat.participants.join(', ');

    renderMessages(chat);
    renderContactList(searchInput.value);
}

function renderMessages(chat) {
    messagesContainer.innerHTML = "";
    let lastDate = null;

    chat.messages.forEach(msg => {
        if (msg.date !== lastDate) {
            const dateDiv = document.createElement('div');
            dateDiv.className = "flex justify-center my-3 sticky top-2 z-20";
            dateDiv.innerHTML = `<span class="bg-[#ffffff] bg-opacity-95 text-[#54656f] text-[12.5px] py-1.5 px-3 rounded-lg shadow-sm uppercase font-medium">${msg.date}</span>`;
            messagesContainer.appendChild(dateDiv);
            lastDate = msg.date;
        }

        if (msg.type === 'system') {
            const sysDiv = document.createElement('div');
            sysDiv.className = "message-system";
            sysDiv.innerHTML = `<i data-lucide="lock" class="w-3 h-3 inline mr-1 mb-0.5 opacity-70"></i>${msg.text}`;
            messagesContainer.appendChild(sysDiv);
            return;
        }

        const isOut = msg.author === chat.mainUser;
        const msgDiv = document.createElement('div');
        msgDiv.className = `flex w-full mb-0.5 ${isOut ? 'justify-end' : 'justify-start'}`;
        
        const showAuthorName = !isOut && chat.participants.length > 2;
        const nameColor = getColorForName(msg.author);
        const formattedText = msg.text.replace(/\n/g, '<br>');

        const statusIcon = isOut ? `
            <span class="ml-1 text-[#53bdeb] relative top-[2px]">
                <svg viewBox="0 0 16 11" height="11" width="16" class="" version="1.1"><path fill="currentColor" d="M11.575,1.175L6.6,6.15L4.425,3.975L3,5.4L6.6,9L13,2.6L11.575,1.175z M8,9.55L7.425,9l-0.575,0.55L8,10.7L16,2.7L14.575,1.275L8,7.85L5.85,5.7L4.425,7.125L8,10.7L8,9.55z"></path></svg>
            </span>` : '';

        msgDiv.innerHTML = `
            <div class="message-bubble ${isOut ? 'message-out' : 'message-in'}">
                ${showAuthorName ? `<div class="text-[13px] font-medium mb-1 leading-none hover:underline cursor-pointer" style="color: ${nameColor}">${msg.author}</div>` : ''}
                <span class="text-[14.2px] leading-[19px] whitespace-pre-wrap">${formattedText}</span>
                <div class="flex justify-end items-end gap-1 select-none float-right ml-2 mt-1 relative top-[4px] h-[15px]">
                    <span class="text-[11px] text-[rgba(17,27,33,0.5)] min-w-fit align-bottom">${msg.time}</span>
                    ${statusIcon}
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(msgDiv);
    });

    lucide.createIcons();
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function closeChat() {
    activeChatId = null;
    if (window.innerWidth < 768) {
        chatArea.style.display = 'none';
        sidebar.style.display = 'flex';
        renderContactList();
    }
}

function getColorForName(name) {
    const colors = ['#e542a3', '#1f7aec', '#dfa62a', '#6bcbef', '#35cd96', '#917ced', '#ff5722', '#795548'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

searchInput.addEventListener('input', (e) => renderContactList(e.target.value));

window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
        sidebar.style.display = 'flex';
        chatArea.style.display = 'flex';
        if (!activeChatId) {
            emptyState.style.display = 'flex';
            chatContent.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            chatContent.style.display = 'flex';
        }
    } else {
        if (activeChatId) {
            sidebar.style.display = 'none';
            chatArea.style.display = 'flex';
        } else {
            sidebar.style.display = 'flex';
            chatArea.style.display = 'none';
        }
    }
});

renderContactList();