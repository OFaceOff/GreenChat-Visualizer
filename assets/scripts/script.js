lucide.createIcons();
let chats = [], activeChatId = null, editingChatId = null, contextMenuId = null, isDarkMode = localStorage.getItem('greenchat_theme') === 'dark', currentSenderIsMe = true, filterUnread = false, longPressTimer;
let visibleMessageCount = 100;
let currentSearchIndex = -1;
let searchMatchElements = [];

const contactListEl = document.getElementById('contactList'), messageInput = document.getElementById('messageInput'), senderToggle = document.getElementById('senderToggle'), sendIcon = document.getElementById('sendIcon');
const contextMenu = document.getElementById('globalContextMenu');
const uploadMenu = document.getElementById('uploadMenu');
const chatMenu = document.getElementById('globalChatMenu');

function applyTheme() { 
    if(isDarkMode){
        document.body.classList.add('dark-mode');
        document.documentElement.classList.add('dark');
        document.getElementById('themeLabel').textContent="Escuro";
    } else {
        document.body.classList.remove('dark-mode');
        document.documentElement.classList.remove('dark');
        document.getElementById('themeLabel').textContent="Claro";
    } 
}
function toggleTheme() { isDarkMode=!isDarkMode; localStorage.setItem('greenchat_theme', isDarkMode?'dark':'light'); applyTheme(); }

function showContextMenu(e, id) { e.preventDefault(); e.stopPropagation(); contextMenuId = id; closeAllMenus(); const chat = chats.find(c=>c.id===id); if(!chat) return; document.getElementById('ctxPin').textContent = chat.pinned ? "Desafixar conversa" : "Fixar conversa"; document.getElementById('ctxRead').textContent = chat.unread > 0 ? "Marcar como lida" : "Marcar como não lida"; let x = e.clientX, y = e.clientY; if (x + 200 > window.innerWidth) x = window.innerWidth - 210; if (y + 160 > window.innerHeight) y = window.innerHeight - 170; contextMenu.style.left = `${x}px`; contextMenu.style.top = `${y}px`; if (window.innerWidth < 768) { contextMenu.classList.add('mobile-sheet'); contextMenu.style.left = '0'; contextMenu.style.top = 'auto'; contextMenu.style.bottom = '0'; document.getElementById('mobileOverlay').classList.add('active'); if(navigator.vibrate) navigator.vibrate(15); } else { contextMenu.classList.remove('mobile-sheet'); } contextMenu.style.display = 'block'; }
function toggleUploadMenu(e) { e.stopPropagation(); if(uploadMenu.style.display === 'block') { closeAllMenus(); return; } closeAllMenus(); let rect = e.currentTarget.getBoundingClientRect(); uploadMenu.style.left = `${rect.left}px`; uploadMenu.style.top = `${rect.bottom + 10}px`; if (window.innerWidth < 768) { uploadMenu.classList.add('mobile-sheet'); uploadMenu.style.left = '0'; uploadMenu.style.top = 'auto'; uploadMenu.style.bottom = '0'; document.getElementById('mobileOverlay').classList.add('active'); } else { uploadMenu.classList.remove('mobile-sheet'); } uploadMenu.style.display = 'block'; }
function toggleDropdown(e, type) { 
    if(type === 'chatMenu') { 
        e.stopPropagation(); 
        closeAllMenus(); 
        let btnRect = e.currentTarget.getBoundingClientRect();
        let x = btnRect.right - 200;
        let y = btnRect.bottom + 5;
        
        chatMenu.style.left = `${x}px`; 
        chatMenu.style.top = `${y}px`; 
        chatMenu.style.display = 'block'; 
        chatMenu.className = "chat-dropdown-menu active"; 
    } 
}

function ctxAction(action) {
    if (!contextMenuId) return;
    const targetId = contextMenuId;
    closeAllMenus();
    
    setTimeout(() => {
        if (action === 'pin') togglePin(null, targetId);
        if (action === 'read') toggleRead(null, targetId);
        if (action === 'edit') openEditModalAction(new Event('click'), targetId);
        if (action === 'delete') deleteChatAction(null, targetId);
    }, 50);
}

function closeAllMenus() { contextMenu.style.display = 'none'; uploadMenu.style.display = 'none'; chatMenu.style.display = 'none'; chatMenu.className = "hidden"; document.getElementById('mainMenu').classList.add('hidden'); document.getElementById('mobileOverlay').classList.remove('active'); document.getElementById('attachMenu').classList.add('hidden'); document.getElementById('emojiPicker').classList.add('hidden'); }

function saveChats() { try{localStorage.setItem('greenchat_data_v1',JSON.stringify(chats));}catch(e){console.warn("Memória cheia.");} }
function loadChats() { const s=localStorage.getItem('greenchat_data_v1'); if(s){try{chats=JSON.parse(s);}catch(e){chats=[];}}else{chats=[];} ensureDevChat(); renderContactList(); }
function ensureDevChat() {
    let dev = chats.find(c => c.name === "Face Off (Dev)");
    if (!dev) {
        const now = new Date(), d = now.toLocaleDateString('pt-BR'), t = now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
        dev = { id: 999, name: "Face Off (Dev)", avatar: "https://avatars.githubusercontent.com/u/61838299?v=4", participants: ["Face Off (Dev)", "Você"], mainUser: "Você", messages: [ {date: d, time: t, author: "Face Off (Dev)", text: "Welcome", type: "chat"}, {date: d, time: t, author: "Face Off (Dev)", text: "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExNTRpengyOGJvYmtpaXgyazZ1N3JraXQ5MXh5dHFkZTNyZDhnbWI2eSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/IAaUnu2FV1MK9eEbaI/giphy.gif", type: "chat"}, {date: d, time: t, author: "Face Off (Dev)", text: "Olá! 👋 Bem-vindo ao GreenChat Visualizer.\n\n1. 📂 Carregar conversas: Clique no ícone de upload.\n2. ➕ Criar Chats Falsos: Botão '+'.\n3. ✏️ Editar Contatos: Clique na foto ou nome de um contato.\n4. 📌 Organizar: Botão direito ou segurar no chat.", type: "chat"} ], lastMessage: "Olá! 👋 Bem-vindo...", unread: 1, isReadOnly: true, pinned: false, date: d, time: t };
        chats.unshift(dev); saveChats();
    } else { if(dev.avatar !== "https://avatars.githubusercontent.com/u/61838299?v=4") { dev.avatar = "https://avatars.githubusercontent.com/u/61838299?v=4"; saveChats(); } }
}

function renderContactList(filter="") {
    contactListEl.innerHTML=""; let f = chats.filter(c=>c.name.toLowerCase().includes(filter.toLowerCase())); if(filterUnread) f = f.filter(c=>c.unread>0); f.sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0));
    f.forEach((c,i)=>{
        const active=c.id===activeChatId?'active':'', pin=c.pinned?`<i data-lucide="pin" class="w-3 h-3 text-secondary mr-2 transform rotate-45"></i>`:'', tick=c.lastMessageIsMine?`<span class="mr-1 text-[#53bdeb]"><svg viewBox="0 0 16 11" height="11" width="16"><path fill="currentColor" d="M11.575,1.175L6.6,6.15L4.425,3.975L3,5.4L6.6,9L13,2.6L11.575,1.175z M8,9.55L7.425,9l-0.575,0.55L8,10.7L16,2.7L14.575,1.275L8,7.85L5.85,5.7L4.425,7.125L8,10.7L8,9.55z"></path></svg></span>`:'';
        const div = document.createElement('div'); div.className = `chat-item relative flex flex-col cursor-pointer group ${active}`; div.onclick = (e) => { if(!e.target.closest('.chat-dropdown-trigger')) openChat(c.id); };
        div.oncontextmenu = (e) => showContextMenu(e, c.id);
        div.addEventListener('touchstart', (e) => { longPressTimer = setTimeout(() => showContextMenu(e, c.id), 500); }, {passive: true});
        div.addEventListener('touchend', () => clearTimeout(longPressTimer));
        div.addEventListener('touchmove', () => clearTimeout(longPressTimer));
        if(i<f.length-1 && !active) div.innerHTML+=`<div class="chat-separator absolute bottom-0 right-0 left-0"></div>`;
        div.innerHTML += `<div class="flex items-center px-3 py-3 w-full relative z-10 pointer-events-none"><div class="relative w-[49px] h-[49px] rounded-full overflow-hidden mr-3 shrink-0 bg-gray-300"><img src="${c.avatar}" class="w-full h-full object-cover"></div><div class="flex-1 min-w-0 flex flex-col justify-center"><div class="flex justify-between items-baseline mb-0.5"><span class="text-primary font-normal text-[17px] truncate">${c.name}</span><span class="text-secondary text-[12px] shrink-0 ml-2 font-light">${c.time || ''}</span></div><div class="flex justify-between items-center"><div class="flex items-center text-secondary text-[14px] truncate flex-1 font-light leading-5">${tick}${c.lastMessage}</div><div class="flex items-center">${pin}${c.unread>0?`<div class="bg-[#25d366] text-white text-[12px] font-medium h-[19px] min-w-[19px] px-1 rounded-full flex items-center justify-center ml-1">${c.unread}</div>`:''}</div></div></div><div class="chat-dropdown-trigger" onclick="showContextMenu(event, ${c.id})" style="pointer-events: auto;"><i data-lucide="chevron-down" class="w-5 h-5 text-secondary"></i></div></div>`;
        contactListEl.appendChild(div);
    });
    lucide.createIcons();
}

function togglePin(e,id){if(e)e.stopPropagation();const c=chats.find(x=>x.id===id);if(c){c.pinned=!c.pinned;saveChats();renderContactList();}}
function toggleRead(e,id){if(e)e.stopPropagation();const c=chats.find(x=>x.id===id);if(c){c.unread=c.unread>0?0:1;saveChats();renderContactList();}}

function deleteChatAction(e, id) {
    if (e) e.stopPropagation();
    closeAllMenus();
    const targetId = id || activeChatId;
    if (!targetId) return;
    
    setTimeout(() => {
        if (confirm("Tem certeza que deseja apagar esta conversa?")) {
            chats = chats.filter(x => x.id !== targetId);
            saveChats();
            if (activeChatId === targetId) closeChat();
            renderContactList(document.getElementById('searchInput').value);
        }
    }, 50);
}

function clearChatMessages() {
    closeAllMenus();
    if (!activeChatId) return;
    
    setTimeout(() => {
        if (confirm("Tem certeza que deseja limpar todas as mensagens desta conversa?")) {
            const c = chats.find(x => x.id === activeChatId);
            if (c) {
                c.messages = [];
                c.lastMessage = "";
                saveChats();
                renderMessages(c);
                renderContactList();
            }
        }
    }, 50);
}

function openChat(id) {
    activeChatId=id; const c=chats.find(x=>x.id===id); if(!c)return; c.unread=0; saveChats();
    visibleMessageCount = 100;
    
    document.getElementById('emptyState').style.display='none'; document.getElementById('chatContent').classList.remove('hidden'); document.getElementById('chatContent').style.display='flex';
    document.getElementById('headerName').textContent=c.name; document.getElementById('headerAvatar').src=c.avatar; 
    document.getElementById('headerInfo').textContent = c.participants.length>2 ? 'Grupo...' : 'online';
    if(c.isReadOnly) { messageInput.disabled=true; messageInput.placeholder="Somente leitura"; messageInput.classList.add('cursor-not-allowed'); senderToggle.classList.add('hidden');  updateSendIcon(false); }
    else { messageInput.disabled=false; messageInput.placeholder="Digite uma mensagem"; messageInput.classList.remove('cursor-not-allowed'); senderToggle.classList.remove('hidden'); messageInput.focus(); updateSendIcon(); }
    if(window.innerWidth<768){document.getElementById('sidebar').style.display='none';document.getElementById('chatArea').style.display='flex';}
    renderMessages(c); renderContactList(document.getElementById('searchInput').value);
}

function openChatSearch() {
    document.getElementById('chatSearchBar').classList.remove('hidden'); 
    document.getElementById('chatSearchInput').focus();
}

function closeChatSearch() {
    const bar = document.getElementById('chatSearchBar');
    const input = document.getElementById('chatSearchInput');
    bar.classList.add('hidden');
    input.value = "";
    document.getElementById('searchCounter').classList.add('hidden');
    const c = chats.find(x => x.id === activeChatId);
    if(c) renderMessages(c);
}

function handleChatSearch(term) {
    if (!activeChatId) return;
    const c = chats.find(x => x.id === activeChatId);
    
    currentSearchIndex = -1;
    searchMatchElements = [];
    
    if(c) {
        renderMessages(c, false, term);
        setTimeout(initSearchNavigation, 0);
    }
}

function handleSearchKey(e) {
    if (e.key === 'Enter') {
        navigateSearch(1);
    }
}

function initSearchNavigation() {
    searchMatchElements = document.querySelectorAll('.search-match');
    const counter = document.getElementById('searchCounter');
    
    if (searchMatchElements.length > 0) {
        counter.classList.remove('hidden');
        currentSearchIndex = 0;
        highlightCurrentMatch();
    } else {
        counter.classList.add('hidden');
        currentSearchIndex = -1;
    }
}

function navigateSearch(direction) {
    if (searchMatchElements.length === 0) return;

    currentSearchIndex += direction;

    if (currentSearchIndex >= searchMatchElements.length) currentSearchIndex = 0;
    if (currentSearchIndex < 0) currentSearchIndex = searchMatchElements.length - 1;

    highlightCurrentMatch();
}

function highlightCurrentMatch() {
    if (currentSearchIndex < 0 || currentSearchIndex >= searchMatchElements.length) return;

    searchMatchElements.forEach(el => {
        el.classList.remove('bg-orange-500', 'text-white');
        el.classList.add('bg-yellow-300', 'text-black');
    });

    const currentEl = searchMatchElements[currentSearchIndex];
    currentEl.classList.remove('bg-yellow-300', 'text-black');
    currentEl.classList.add('bg-orange-500', 'text-white');

    currentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const counter = document.getElementById('searchCounter');
    counter.textContent = `${currentSearchIndex + 1} de ${searchMatchElements.length}`;
}

function renderMessages(c, preserveScroll = false, searchTerm = "") {
    const con = document.getElementById('messagesContainer');
    const previousHeight = con.scrollHeight;
    const previousTop = con.scrollTop;

    con.innerHTML = ''; 
    let ld = null;

    let messagesToRender = [];
    let isFiltering = searchTerm && searchTerm.length >= 2;

    if (isFiltering) {
        const lowerTerm = searchTerm.toLowerCase();
        messagesToRender = c.messages.filter(m => m.text && m.text.toLowerCase().includes(lowerTerm));
        
        if (messagesToRender.length === 0) {
            con.innerHTML = `<div class="flex justify-center mt-10"><span class="bg-[var(--window-bg)] text-secondary text-sm px-4 py-2 rounded-lg shadow-sm">Nenhuma mensagem encontrada.</span></div>`;
            return;
        }
    } else {
        const total = c.messages.length;
        const start = Math.max(0, total - visibleMessageCount);
        messagesToRender = c.messages.slice(start);

        if (start > 0) {
             con.innerHTML += `<div class="flex justify-center my-4"><button onclick="loadMoreMessages()" class="bg-[var(--window-bg)] text-[#00a884] text-xs font-bold px-4 py-2 rounded-full shadow-sm border border-[var(--border-color)] hover:shadow-md transition-all uppercase tracking-wide">Carregar mais antigas (${start})</button></div>`;
        }
    }

    messagesToRender.forEach(m=>{
        if(m.date!==ld){con.innerHTML+=`<div class="flex justify-center my-3 sticky top-2 z-20"><span class="bg-[var(--window-bg)] bg-opacity-95 text-secondary text-[12.5px] py-1.5 px-3 rounded-lg shadow-sm uppercase font-medium">${m.date}</span></div>`;ld=m.date;}
        let content;
        
        const isAudio = m.mediaType === 'audio' || (!m.mediaType && /\.(mp3|ogg|opus|wav)/i.test(m.text));
        const isVideo = m.mediaType === 'video' || (!m.mediaType && /\.(mp4|webm)/i.test(m.text));
        const isImage = m.mediaType === 'image' || (!m.mediaType && (/\.(jpeg|jpg|gif|png|webp)/i.test(m.text) || (m.text.startsWith('blob:') && !isAudio && !isVideo)));

        if (isImage) { const isSticker = m.text.includes('.webp'); content = `<img src="${m.text}" onclick="openImageModal(this.src)" class="${isSticker ? 'sticker-img' : 'media-photo block'}">`; } 
        else if (isVideo) { content = `<video src="${m.text}" controls class="max-w-full rounded-lg"></video>`; } 
        else if (isAudio) { content = `<audio src="${m.text}" controls class="w-60"></audio>`; } 
        else { 
            let txt = m.text.replace(/\n/g,'<br>');
            if (isFiltering) {
                const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                txt = txt.replace(regex, '<span class="search-match bg-yellow-300 text-black px-0.5 rounded transition-colors duration-200">$1</span>');
            }
            content = `<span class="text-[14.2px] leading-[19px] whitespace-pre-wrap">${txt}</span>`; 
        }
        
        const out=m.author===c.mainUser; const bubbleClass = (isImage && m.text.includes('.webp')) ? 'message-bubble has-sticker' : 'message-bubble ' + (out?'message-out':'message-in');
        con.innerHTML+=`<div class="flex w-full mb-0.5 ${out?'justify-end':'justify-start'}"><div class="${bubbleClass}">${!out&&c.participants.length>2?`<div class="text-[13px] font-medium mb-1" style="color:${getColor(m.author)}">${m.author}</div>`:''}${content}<div class="flex justify-end items-end gap-1 float-right ml-2 mt-1 relative top-[4px] h-[15px]"><span class="text-[11px] text-[var(--text-secondary)] opacity-80">${m.time}</span>${out ? '<span class="ml-0.5 text-[#53bdeb]"><svg viewBox="0 0 16 11" height="11" width="16"><path fill="currentColor" d="M11.575,1.175L6.6,6.15L4.425,3.975L3,5.4L6.6,9L13,2.6L11.575,1.175z M8,9.55L7.425,9l-0.575,0.55L8,10.7L16,2.7L14.575,1.275L8,7.85L5.85,5.7L4.425,7.125L8,10.7L8,9.55z"></path></svg></span>' : ''}</div></div></div>`;
    });
    lucide.createIcons(); 
    
    if (preserveScroll) {
        con.scrollTop = con.scrollHeight - previousHeight;
    } else {
        if (isFiltering) con.scrollTop = 0;
        else con.scrollTop = con.scrollHeight;
    }
}

function loadMoreMessages() {
    visibleMessageCount += 100;
    const c = chats.find(x => x.id === activeChatId);
    if(c) renderMessages(c, true);
}

async function handleFileUpload(e) { const f=e.target.files[0]; if(!f)return; const t=await f.text(); processChatText(f.name,t); e.target.value=''; }
async function handleFolderUpload(e) {
    const files = Array.from(e.target.files); document.getElementById('loadingOverlay').classList.remove('hidden'); document.getElementById('loadingOverlay').style.display = 'flex';
    setTimeout(async () => {
        try { const mediaMap = {}; let chatFile = null;
            for (let f of files) { if(f.name.toLowerCase().endsWith('.txt')) { if(!chatFile || f.name.toLowerCase() === '_chat.txt') chatFile = f; } else { mediaMap[f.name] = URL.createObjectURL(f); } }
            if(!chatFile) { alert("Nenhum arquivo de texto (.txt) encontrado."); return; }
            const text = await chatFile.text(); processChatText(chatFile.name, text, mediaMap);
        } catch (err) { alert("Erro ao processar."); } finally { document.getElementById('loadingOverlay').classList.add('hidden'); document.getElementById('loadingOverlay').style.display = 'none'; }
    }, 100);
}
function processChatText(n, t, mediaMap = {}) {
    const lines=t.split('\n'), msgs=[], parts=new Set(); let curr=null;
    
    const regex = /^\[?(\d{2}\/\d{2}\/\d{2,4})[,\s-]*(\d{2}:\d{2}(?::\d{2})?)?\]?[\s\u200e\u200f-]*([^:]+):[\s\u200e\u200f]*(.*)/;
    
    lines.forEach(l=>{
        l=l.trim(); if(!l)return;
        const cleanLine = l.replace(/[\u200e\u200f\u202a\u202c]/g, '');
        const m=cleanLine.match(regex);
        if(m){ 
            if(curr)msgs.push(curr); 
            const authorName = m[3].trim();
            parts.add(authorName); 
            let content = m[4];
            let detectedType = null;

            const attachMatch = content.match(/<anexado: (.*?)>/);
            if (attachMatch && attachMatch[1]) { 
                const fName = attachMatch[1].trim(); 
                const lowerName = fName.toLowerCase();
                
                if (/\.(jpeg|jpg|gif|png|webp)$/i.test(lowerName)) detectedType = 'image';
                else if (/\.(mp4|webm)$/i.test(lowerName)) detectedType = 'video';
                else if (/\.(mp3|ogg|opus|wav)$/i.test(lowerName)) detectedType = 'audio';

                if (mediaMap[fName]) content = mediaMap[fName]; 
            }
            
            let timeStr = m[2] || '';
            if(timeStr.length > 5) timeStr = timeStr.substring(0,5);
            
            curr={date:m[1], time:timeStr, author:authorName, text:content, type:'chat', mediaType: detectedType}; 
        } else if(curr) curr.text+='\n'+cleanLine;
    });
    if(curr)msgs.push(curr); if(!msgs.length)return alert("Arquivo inválido");
    const p=Array.from(parts), name=p[0]||n.replace('.txt','').trim();
    
    let main = "Você";
    if (p.includes("Você")) main = "Você";
    else if (p.length > 0) main = p[0];

    const nc={
        id:Date.now(),name:name,avatar:`https://ui-avatars.com/api/?name=${name}&background=random`,
        participants:p, mainUser:main, 
        messages:msgs, lastMessage:msgs[msgs.length-1].text.substring(0,30),
        lastMessageIsMine:(msgs[msgs.length-1].author === main), 
        date:msgs[msgs.length-1].date, time:msgs[msgs.length-1].time, 
        unread:0, pinned:false, isReadOnly:true
    };
    chats.unshift(nc); saveChats(); renderContactList(); openChat(nc.id);
}

function openEditModalAction(e, id) {
    if(e) e.stopPropagation(); closeAllMenus(); editingChatId=id; const c=chats.find(x=>x.id===id); if(!c)return;
    const nI = document.getElementById('editNameInput'), aI = document.getElementById('editAvatarInput');
    nI.value = c.name; aI.value = c.avatar; document.getElementById('editAvatarPreview').src = c.avatar;
    
    if((!c.participants || c.participants.length === 0) && c.messages.length > 0) {
            const uniqueAuthors = new Set(c.messages.map(m => m.author));
            c.participants = Array.from(uniqueAuthors);
    }

    const pList = document.getElementById('participantsList'); pList.innerHTML = "";
    if (c.participants && c.participants.length > 0) {
        c.participants.forEach(p => {
            const row = document.createElement('div');
            row.className = "flex items-center justify-between p-2 hover:bg-[var(--hover-chat)] rounded cursor-pointer border-b border-theme last:border-0";
            row.innerHTML = `<span class="text-sm text-primary font-medium truncate flex-1">${p}</span><input type="radio" name="mainUserSelect" value="${p}" class="participant-radio" ${c.mainUser === p ? 'checked' : ''}>`;
            row.onclick = () => row.querySelector('input').checked = true;
            pList.appendChild(row);
        });
        document.getElementById('identitySection').style.display = 'block';
    } else { document.getElementById('identitySection').style.display = 'none'; }

    if(c.name === "Face Off (Dev)") {
        nI.disabled=true; aI.disabled=true; nI.classList.add('opacity-50'); aI.classList.add('opacity-50');
        document.getElementById('avatarUploadOverlay').classList.add('hidden'); document.getElementById('editNameWarning').classList.remove('hidden');
    } else {
        nI.disabled=false; aI.disabled=false; nI.classList.remove('opacity-50'); aI.classList.remove('opacity-50');
        document.getElementById('avatarUploadOverlay').classList.remove('hidden'); document.getElementById('editNameWarning').classList.add('hidden');
    }
    openModal('editContactModal', 'editModalContent');
}

function saveContactEdits() {
    if(!editingChatId)return; const c=chats.find(x=>x.id===editingChatId);
    if(c && c.name!=="Face Off (Dev)"){ 
        c.name=document.getElementById('editNameInput').value; c.avatar=document.getElementById('editAvatarInput').value;
        const selected = document.querySelector('input[name="mainUserSelect"]:checked');
        if (selected) { c.mainUser = selected.value; if(c.messages.length > 0) c.lastMessageIsMine = (c.messages[c.messages.length-1].author === c.mainUser); }
        saveChats(); renderContactList(); 
        if(activeChatId===editingChatId){ document.getElementById('headerName').textContent=c.name; document.getElementById('headerAvatar').src=c.avatar; openChat(activeChatId); } 
    }
    closeEditModal();
}

function toggleMenu(e){e.stopPropagation(); document.getElementById('mainMenu').classList.toggle('hidden');}
function toggleDrawer(id){document.getElementById(id).classList.toggle('open');}
function toggleUnreadFilter(b){filterUnread=!filterUnread; b.querySelector('i').style.color=filterUnread?'#00a884':''; renderContactList(document.getElementById('searchInput').value);}
function openSettings(){closeAllMenus();openModal('settingsModal','settingsContent');}
function closeSettings(){closeModal('settingsModal','settingsContent');}
function openHelpModal(){closeAllMenus();openModal('helpModal','helpModalContent');}
function closeHelpModal(){closeModal('helpModal','helpModalContent');}
function openCreateChatModal(){document.getElementById('newChatName').value='';openModal('createChatModal','createChatContent','newChatName');}
function closeCreateChatModal(){closeModal('createChatModal','createChatContent');}
function confirmCreateChat(){const n=document.getElementById('newChatName').value.trim();if(!n)return;const nc={id:Date.now(),name:n,avatar:`https://ui-avatars.com/api/?name=${n}&background=random`,participants:[n,"Você"],mainUser:"Você",messages:[],lastMessage:"Nova conversa",lastMessageIsMine:false,date:new Date().toLocaleDateString('pt-BR'),time:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),unread:0,pinned:false,isReadOnly:false};chats.unshift(nc);saveChats();renderContactList();closeCreateChatModal();openChat(nc.id);}
function handleAvatarFileSelected(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{document.getElementById('editAvatarPreview').src=ev.target.result;document.getElementById('editAvatarInput').value=ev.target.result;};r.readAsDataURL(f);}
function closeEditModal(){closeModal('editContactModal','editModalContent');}
function openContactInfo(){if(activeChatId)openEditModalAction(new Event('click'), activeChatId);}

function closeChat(e) {
    if(e) e.stopPropagation(); 
    activeChatId = null; 
    
    document.getElementById('emptyState').style.display = 'flex';
    document.getElementById('chatContent').classList.add('hidden');
    document.getElementById('chatContent').style.display = 'none';

    if (window.innerWidth < 768) {
        document.getElementById('chatArea').style.display = 'none';
        document.getElementById('sidebar').style.display = 'flex';
    } 
    
    renderContactList(); 
}

function clearAllChats(){if(confirm("Apagar tudo?")){localStorage.removeItem('greenchat_data_v1'); chats=[]; activeChatId=null; loadChats(); closeSettings();}}
function clearSiteCache(){if(confirm("Resetar?")){localStorage.clear(); location.reload();}}
function openImageModal(s){document.getElementById('modalImage').src=s; openModal('imageModal', 'modalImage');}
function closeImageModal(){closeModal('imageModal', 'modalImage');}
function toggleSender(){currentSenderIsMe=!currentSenderIsMe;senderToggle.textContent=currentSenderIsMe?"Você":"Contato";senderToggle.className=`sender-toggle ${currentSenderIsMe?'sender-me':'sender-them'} mr-2 shrink-0`;}
function handleInputKey(e){if(e.key==='Enter')sendMessage();}
function sendMessage(){if(!activeChatId)return; const c=chats.find(x=>x.id===activeChatId); if(!c||c.isReadOnly)return; const txt=messageInput.value.trim(); if(!txt)return; const now=new Date(), d=now.toLocaleDateString('pt-BR'), t=now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); c.messages.push({date:d,time:t,author:currentSenderIsMe?c.mainUser:c.name,text:txt,type:'chat'}); c.lastMessage=txt; c.lastMessageIsMine=currentSenderIsMe; c.time=t; messageInput.value=''; chats=chats.filter(x=>x.id!==c.id); chats.unshift(c); saveChats(); renderMessages(c); renderContactList(document.getElementById('searchInput').value); updateSendIcon();}
function updateSendIcon(){const v=messageInput.value.trim().length>0; const w=document.getElementById('sendIconWrapper'); if(w){if(v){w.className="flex items-center justify-center text-[#00a884]";w.innerHTML=`<i data-lucide="send" class="w-[24px] h-[24px]"></i>`;}else{w.className="flex items-center justify-center text-icon-color";w.innerHTML=`<i data-lucide="mic" class="w-[24px] h-[24px]"></i>`;}lucide.createIcons();}}
function toggleEmojiPicker(){closeAllMenus();document.getElementById('emojiPicker').classList.toggle('hidden');if(document.getElementById('emojiPicker').innerHTML==="")["😀","😂","😍","👍","❤️","🎉"].forEach(e=>{const b=document.createElement('button');b.className="text-2xl p-1";b.textContent=e;b.onclick=()=>{messageInput.value+=e;messageInput.focus();updateSendIcon();};document.getElementById('emojiPicker').appendChild(b);});}
function toggleAttachMenu(){closeAllMenus();document.getElementById('attachMenu').classList.toggle('hidden');}
function getColor(n){const c=['#e542a3','#1f7aec','#dfa62a','#6bcbef','#35cd96','#917ced'];let h=0;for(let i=0;i<n.length;i++)h=n.charCodeAt(i)+((h<<5)-h);return c[Math.abs(h)%c.length];}
function openModal(id,cid,fid){closeAllMenus();const el=document.getElementById(id);const c=document.getElementById(cid);el.classList.remove('hidden');el.style.display='flex';requestAnimationFrame(()=>{el.classList.remove('opacity-0');c.classList.remove('scale-95');c.classList.add('scale-100');if(fid)document.getElementById(fid).focus();});}
function closeModal(id,cid){const el=document.getElementById(id);const c=document.getElementById(cid);el.classList.add('opacity-0');c.classList.remove('scale-100');c.classList.add('scale-95');setTimeout(()=>{el.classList.add('hidden');el.style.display='';},200);}
document.addEventListener('keydown',(e)=>{if(e.key==='Escape'&&!document.getElementById('imageModal').classList.contains('hidden'))closeImageModal();});
document.getElementById('searchInput').addEventListener('input',(e)=>renderContactList(e.target.value));
window.addEventListener('resize',()=>{if(window.innerWidth>=768){document.getElementById('sidebar').style.display='flex';document.getElementById('chatArea').style.display='flex';if(!activeChatId){document.getElementById('emptyState').style.display='flex';document.getElementById('chatContent').style.display='none';}else{document.getElementById('emptyState').style.display='none';document.getElementById('chatContent').style.display='flex';}}else{if(activeChatId){document.getElementById('sidebar').style.display='none';document.getElementById('chatArea').style.display='flex';}else{document.getElementById('sidebar').style.display='flex';document.getElementById('chatArea').style.display='none';}}});

applyTheme(); loadChats();