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
const mainMenu = document.getElementById('mainMenu');
const imageModal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');

const REGEX_LINE = /^\[?(\d{2}\/\d{2}\/\d{2,4})\s?,?\s?(\d{2}:\d{2}(?::\d{2})?)\]?\s(.*?):\s(.*)/;
const REGEX_SYSTEM = /^\[?(\d{2}\/\d{2}\/\d{2,4})\s?,?\s?(\d{2}:\d{2}(?::\d{2})?)\]?\s(.*)/;
const REGEX_IMAGE_URL = /\.(jpeg|jpg|gif|png)(\?.*)?$/i;

function saveChats() {
    try {
        localStorage.setItem('greenchat_data_v1', JSON.stringify(chats));
    } catch (e) {
        console.error(e);
        alert("Atenção: Espaço de armazenamento cheio.");
    }
}

function loadChats() {
    const saved = localStorage.getItem('greenchat_data_v1');
    if (saved) {
        try {
            chats = JSON.parse(saved);
        } catch (e) {
            chats = [];
        }
    } else {
        chats = [];
    }

    let devChat = chats.find(c => c.name === "Face Off (Dev)");
    
    if (!devChat) {
        const today = new Date().toLocaleDateString('pt-BR');
        const now = new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        
        devChat = {
            id: 999999999,
            name: "Face Off (Dev)",
            avatar: "https://avatars.githubusercontent.com/u/61838299?v=4",
            participants: ["Face Off (Dev)", "Você"],
            mainUser: "Você",
            messages: [
                {
                    date: today,
                    time: now,
                    author: "Face Off (Dev)",
                    text: "Welcome",
                    type: "chat"
                },
                {
                    date: today,
                    time: now,
                    author: "Face Off (Dev)",
                    text: "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ2tzN3ZvZWp4dTJneTZkeDJsMjlsb3hkZ2tvZDZzeW5jbzB4dHNpeiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3NjABnBOieYQE4BpkP/giphy.gif",
                    type: "chat"
                }
            ],
            lastMessage: "GIF",
            lastMessageIsMine: false,
            date: today,
            time: now,
            unread: 1
        };
        chats.unshift(devChat);
        saveChats(); 
    } else {
        if (devChat.avatar !== "https://avatars.githubusercontent.com/u/61838299?v=4") {
            devChat.avatar = "https://avatars.githubusercontent.com/u/61838299?v=4";
            saveChats();
        }
    }

    renderContactList();
}

function openImageModal(src) {
    modalImage.src = src;
    imageModal.classList.remove('hidden');
    
    requestAnimationFrame(() => {
        imageModal.classList.remove('opacity-0');
        modalImage.classList.remove('scale-95');
        modalImage.classList.add('scale-100');
    });
}

function closeImageModal() {
    imageModal.classList.add('opacity-0');
    modalImage.classList.remove('scale-100');
    modalImage.classList.add('scale-95');
    
    setTimeout(() => {
        imageModal.classList.add('hidden');
        modalImage.src = ''; 
    }, 300); 
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !imageModal.classList.contains('hidden')) {
        closeImageModal();
    }
});

function clearAllChats() {
    if(confirm("Tem certeza que deseja apagar todas as conversas salvas?")) {
        localStorage.removeItem('greenchat_data_v1');
        chats = [];
        activeChatId = null;
        loadChats(); 
        closeChat(); 
        toggleMenu(); 
    }
}

function toggleMenu() {
    mainMenu.classList.toggle('hidden');
}

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
        alert("Formato de arquivo não reconhecido ou arquivo vazio.");
        return;
    }

    const participantsArray = Array.from(participants);
    const mainUser = participantsArray[1] || participantsArray[0]; 
    const chatName = filename.replace('.txt', '').replace('Conversa do WhatsApp com ', '');

    const existingIndex = chats.findIndex(c => c.name === chatName);
    
    const newChat = {
        id: existingIndex >= 0 ? chats[existingIndex].id : Date.now(),
        name: chatName,
        avatar: `https://ui-avatars.com/api/?name=${participantsArray[0] || '?'}&background=random&color=fff&size=128`,
        participants: participantsArray,
        mainUser: mainUser,
        messages: messages,
        lastMessage: messages[messages.length-1].text.substring(0, 35) + (messages[messages.length-1].text.length > 35 ? '...' : ''),
        lastMessageIsMine: messages[messages.length-1].author === mainUser,
        date: messages[messages.length-1].date,
        time: messages[messages.length-1].time,
        unread: 0
    };

    if (existingIndex >= 0) {
        chats[existingIndex] = newChat;
        chats.unshift(chats.splice(existingIndex, 1)[0]);
    } else {
        chats.unshift(newChat);
    }

    saveChats();
    renderContactList();
    openChat(newChat.id);
}

function renderContactList(filter = "") {
    contactListEl.innerHTML = "";
    
    const filteredChats = chats.filter(chat => 
        chat.name.toLowerCase().includes(filter.toLowerCase())
    );
    
    if (filteredChats.length === 0 && chats.length === 0) {
        return;
    }

    filteredChats.forEach((chat, index) => {
        const isActive = chat.id === activeChatId;
        
        const itemContainer = document.createElement('div');
        itemContainer.className = `chat-item relative flex flex-col cursor-pointer ${isActive ? 'active' : 'bg-white'}`;
        itemContainer.onclick = () => openChat(chat.id);

        const tickIcon = chat.lastMessageIsMine ? 
            `<span class="mr-1 text-[#53bdeb]">
                <svg viewBox="0 0 16 11" height="11" width="16" class="" version="1.1"><path fill="currentColor" d="M11.575,1.175L6.6,6.15L4.425,3.975L3,5.4L6.6,9L13,2.6L11.575,1.175z M8,9.55L7.425,9l-0.575,0.55L8,10.7L16,2.7L14.575,1.275L8,7.85L5.85,5.7L4.425,7.125L8,10.7L8,9.55z"></path></svg>
             </span>` : '';

        const today = new Date().toLocaleDateString('pt-BR');

        contentDiv = document.createElement('div');
        contentDiv.className = "flex items-center px-3 py-3 w-full";
        contentDiv.innerHTML = `
            <div class="relative w-[49px] h-[49px] rounded-full overflow-hidden mr-3 shrink-0 bg-[#dfe3e5]">
                <img src="${chat.avatar}" class="w-full h-full object-cover">
            </div>
            <div class="flex-1 min-w-0 flex flex-col justify-center">
                <div class="flex justify-between items-baseline mb-0.5">
                    <span class="text-[#111b21] font-normal text-[17px] truncate" title="${chat.name}">${chat.name}</span>
                    <span class="text-[#667781] text-[12px] shrink-0 ml-2 font-light">${chat.date === today ? chat.time : chat.date}</span>
                </div>
                <div class="flex justify-between items-center">
                    <div class="flex items-center text-[#667781] text-[14px] truncate flex-1 font-light leading-5">
                        ${tickIcon}
                        <span class="truncate">${chat.lastMessage}</span>
                    </div>
                    ${chat.unread > 0 ? `<div class="bg-[#25d366] text-white text-[12px] font-medium h-[19px] min-w-[19px] px-1 rounded-full flex items-center justify-center ml-1">${chat.unread}</div>` : ''}
                </div>
            </div>
        `;
        
        itemContainer.appendChild(contentDiv);

        if (index < filteredChats.length - 1 && !isActive) {
            const separator = document.createElement('div');
            separator.className = "chat-separator";
            itemContainer.appendChild(separator);
        }

        contactListEl.appendChild(itemContainer);
    });
}

function openChat(chatId) {
    activeChatId = chatId;
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    
    chat.unread = 0;

    emptyState.style.display = 'none';
    chatContent.style.display = 'flex';
    chatContent.classList.remove('hidden');

    if (window.innerWidth < 768) {
        sidebar.style.display = 'none';
        chatArea.style.display = 'flex';
    }

    headerName.textContent = chat.name;
    headerAvatar.src = chat.avatar;

    if (chat.participants.length > 2) {
        const others = chat.participants.filter(p => p !== chat.mainUser).join(', ');
        headerInfo.textContent = others.substring(0, 60) + (others.length > 60 ? '...' : '');
    } else {
        const lastMsgReceived = [...chat.messages].reverse().find(m => m.author !== chat.mainUser);
        if (lastMsgReceived) {
            headerInfo.textContent = `visto por último ${lastMsgReceived.date === chat.date ? 'hoje' : 'em ' + lastMsgReceived.date} às ${lastMsgReceived.time}`;
        } else {
            headerInfo.textContent = "clique para dados do contato";
        }
    }

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
        
        const isImage = (REGEX_IMAGE_URL.test(msg.text) || msg.text.includes("giphy.gif"));
        
        let contentHtml = '';
        
        if (isImage) {
            contentHtml = `<img src="${msg.text}" alt="Imagem" onclick="openImageModal(this.src)" class="block">`;
        } else {
            contentHtml = `<span class="text-[14.2px] leading-[19px] whitespace-pre-wrap">${msg.text.replace(/\n/g, '<br>')}</span>`;
        }

        const statusIcon = isOut ? `
            <span class="ml-1 text-[#53bdeb] relative top-[2px]">
                <svg viewBox="0 0 16 11" height="11" width="16" class="" version="1.1"><path fill="currentColor" d="M11.575,1.175L6.6,6.15L4.425,3.975L3,5.4L6.6,9L13,2.6L11.575,1.175z M8,9.55L7.425,9l-0.575,0.55L8,10.7L16,2.7L14.575,1.275L8,7.85L5.85,5.7L4.425,7.125L8,10.7L8,9.55z"></path></svg>
            </span>` : '';

        msgDiv.innerHTML = `
            <div class="message-bubble ${isOut ? 'message-out' : 'message-in'}">
                ${showAuthorName ? `<div class="text-[13px] font-medium mb-1 leading-none hover:underline cursor-pointer" style="color: ${nameColor}">${msg.author}</div>` : ''}
                ${contentHtml}
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

loadChats();