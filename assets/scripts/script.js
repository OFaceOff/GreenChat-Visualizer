tailwind.config = {
    darkMode: 'class',
}

lucide.createIcons();
let chats = [], activeChatId = null, editingChatId = null, contextMenuId = null, isDarkMode = localStorage.getItem('greenchat_theme') === 'dark', currentSenderIsMe = true, filterUnread = false, longPressTimer;

const contactListEl = document.getElementById('contactList'), messageInput = document.getElementById('messageInput'), senderToggle = document.getElementById('senderToggle'), sendIcon = document.getElementById('sendIcon');
const contextMenu = document.getElementById('globalContextMenu');
const chatMenu = document.getElementById('globalChatMenu');

function applyTheme() { if(isDarkMode){document.body.classList.add('dark-mode');document.getElementById('themeLabel').textContent="Escuro";}else{document.body.classList.remove('dark-mode');document.getElementById('themeLabel').textContent="Claro";} }
function toggleTheme() { isDarkMode=!isDarkMode; localStorage.setItem('greenchat_theme', isDarkMode?'dark':'light'); applyTheme(); }

function showContextMenu(e, id) {
    e.preventDefault(); e.stopPropagation();
    contextMenuId = id;
    closeAllMenus();
    
    const chat = chats.find(c=>c.id===id);
    if(!chat) return;

    document.getElementById('ctxPin').textContent = chat.pinned ? "Desafixar conversa" : "Fixar conversa";
    document.getElementById('ctxRead').textContent = chat.unread > 0 ? "Marcar como lida" : "Marcar como não lida";

    let x = e.clientX, y = e.clientY;
    if (x + 200 > window.innerWidth) x = window.innerWidth - 210;
    if (y + 160 > window.innerHeight) y = window.innerHeight - 170;

    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
    
    if (window.innerWidth < 768) {
        contextMenu.classList.add('mobile-sheet');
        contextMenu.style.left = '0'; contextMenu.style.top = 'auto'; contextMenu.style.bottom = '0';
        document.getElementById('mobileOverlay').classList.add('active');
        if(navigator.vibrate) navigator.vibrate(15);
    } else {
        contextMenu.classList.remove('mobile-sheet');
    }
    contextMenu.style.display = 'block';
}

function showChatMenu(e) {
    e.stopPropagation();
    closeAllMenus();
    
    let x = e.clientX - 180, y = e.clientY + 10;
    
    chatMenu.style.left = `${x}px`;
    chatMenu.style.top = `${y}px`;
    chatMenu.style.display = 'block'; 
    chatMenu.className = "chat-dropdown-menu active"; 
}

function toggleDropdown(e, type) {
    if(type === 'chatMenu') {
        showChatMenu(e);
    }
}

function ctxAction(action) {
    if(!contextMenuId) return;
    if(action === 'pin') togglePin(null, contextMenuId);
    if(action === 'read') toggleRead(null, contextMenuId);
    if(action === 'edit') openEditModalAction(new Event('click'), contextMenuId);
    if(action === 'delete') deleteChatAction(null, contextMenuId);
    closeAllMenus();
}

function closeAllMenus() {
    contextMenu.style.display = 'none';
    chatMenu.style.display = 'none';
    chatMenu.className = "hidden";
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('mobileOverlay').classList.remove('active');
    document.getElementById('attachMenu').classList.add('hidden');
    document.getElementById('emojiPicker').classList.add('hidden');
}

function saveChats() { try{localStorage.setItem('greenchat_data_v1',JSON.stringify(chats));}catch(e){alert("Memória cheia.");} }
function loadChats() {
    const s=localStorage.getItem('greenchat_data_v1');
    if(s){try{chats=JSON.parse(s);}catch(e){chats=[];}}else{chats=[];}
    ensureDevChat(); renderContactList();
}

function ensureDevChat() {
    let dev = chats.find(c => c.name === "Face Off (Dev)");
    if (!dev) {
        const now = new Date(), d = now.toLocaleDateString('pt-BR'), t = now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
        dev = { id: 999, name: "Face Off (Dev)", avatar: "https://avatars.githubusercontent.com/u/61838299?v=4", participants: ["Face Off (Dev)", "Você"], mainUser: "Você", messages: [
            {date: d, time: t, author: "Face Off (Dev)", text: "Welcome", type: "chat"},
            {date: d, time: t, author: "Face Off (Dev)", text: "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExNTRpengyOGJvYmtpaXgyazZ1N3JraXQ5MXh5dHFkZTNyZDhnbWI2eSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/IAaUnu2FV1MK9eEbaI/giphy.gif", type: "chat"},
            {date: d, time: t, author: "Face Off (Dev)", text: "Olá! 👋 Bem-vindo ao GreenChat Visualizer.\n\n1. 📂 Carregar conversas: Clique no ícone de upload.\n2. ➕ Criar Chats Falsos: Botão '+'.\n3. ✏️ Editar Contatos: Clique na foto ou nome de um contato.\n4. 📌 Organizar: Botão direito ou segurar no chat.", type: "chat"}
        ], lastMessage: "Olá! 👋 Bem-vindo...", unread: 1, isReadOnly: true, pinned: false, date: d, time: t };
        chats.unshift(dev); saveChats();
    } else {
        let changed = false;
        if(dev.avatar !== "https://avatars.githubusercontent.com/u/61838299?v=4") { dev.avatar = "https://avatars.githubusercontent.com/u/61838299?v=4"; changed=true; }
        const now = new Date(), d = now.toLocaleDateString('pt-BR'), t = now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
        if(!dev.date) { dev.date = d; changed=true; }
        if(!dev.time) { dev.time = t; changed=true; }
        if(changed) saveChats();
    }
}

function renderContactList(filter="") {
    contactListEl.innerHTML="";
    let f = chats.filter(c=>c.name.toLowerCase().includes(filter.toLowerCase()));
    if(filterUnread) f = f.filter(c=>c.unread>0);
    f.sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0));
    f.forEach((c,i)=>{
        const active=c.id===activeChatId?'active':'', pin=c.pinned?`<i data-lucide="pin" class="w-3 h-3 text-secondary mr-2 transform rotate-45"></i>`:'', tick=c.lastMessageIsMine?`<span class="mr-1 text-[#53bdeb]"><svg viewBox="0 0 16 11" height="11" width="16"><path fill="currentColor" d="M11.575,1.175L6.6,6.15L4.425,3.975L3,5.4L6.6,9L13,2.6L11.575,1.175z M8,9.55L7.425,9l-0.575,0.55L8,10.7L16,2.7L14.575,1.275L8,7.85L5.85,5.7L4.425,7.125L8,10.7L8,9.55z"></path></svg></span>`:'';
        
        const div = document.createElement('div');
        div.className = `chat-item relative flex flex-col cursor-pointer group ${active}`;
        div.onclick = (e) => { if(!e.target.closest('.chat-dropdown-trigger')) openChat(c.id); };
        
        div.oncontextmenu = (e) => showContextMenu(e, c.id);
        
        div.addEventListener('touchstart', (e) => { longPressTimer = setTimeout(() => showContextMenu(e, c.id), 500); }, {passive: true});
        div.addEventListener('touchend', () => clearTimeout(longPressTimer));
        div.addEventListener('touchmove', () => clearTimeout(longPressTimer));

        if(i<f.length-1 && !active) div.innerHTML+=`<div class="chat-separator absolute bottom-0 right-0 left-0"></div>`;
        div.innerHTML += `
            <div class="flex items-center px-3 py-3 w-full relative z-10 pointer-events-none">
                <div class="relative w-[49px] h-[49px] rounded-full overflow-hidden mr-3 shrink-0 bg-gray-300"><img src="${c.avatar}" class="w-full h-full object-cover"></div>
                <div class="flex-1 min-w-0 flex flex-col justify-center"><div class="flex justify-between items-baseline mb-0.5"><span class="text-primary font-normal text-[17px] truncate">${c.name}</span><span class="text-secondary text-[12px] shrink-0 ml-2 font-light">${c.time || ''}</span></div><div class="flex justify-between items-center"><div class="flex items-center text-secondary text-[14px] truncate flex-1 font-light leading-5">${tick}${c.lastMessage}</div><div class="flex items-center">${pin}${c.unread>0?`<div class="bg-[#25d366] text-white text-[12px] font-medium h-[19px] min-w-[19px] px-1 rounded-full flex items-center justify-center ml-1">${c.unread}</div>`:''}</div></div></div>
                <div class="chat-dropdown-trigger" onclick="showContextMenu(event, ${c.id})" style="pointer-events: auto;"><i data-lucide="chevron-down" class="w-5 h-5 text-secondary"></i></div>
            </div>`;
        contactListEl.appendChild(div);
    });
    lucide.createIcons();
}

function togglePin(e,id){if(e)e.stopPropagation();const c=chats.find(x=>x.id===id);if(c){c.pinned=!c.pinned;saveChats();renderContactList();}}
function toggleRead(e,id){if(e)e.stopPropagation();const c=chats.find(x=>x.id===id);if(c){c.unread=c.unread>0?0:1;saveChats();renderContactList();}}
function deleteChatAction(e,id){if(e)e.stopPropagation();if(confirm("Apagar?")){chats=chats.filter(x=>x.id!==id);saveChats();if(activeChatId===id)closeChat();renderContactList();}}

function openChat(id) {
    activeChatId=id; const c=chats.find(x=>x.id===id); if(!c)return; c.unread=0; saveChats();
    document.getElementById('emptyState').style.display='none'; document.getElementById('chatContent').classList.remove('hidden'); document.getElementById('chatContent').style.display='flex';
    document.getElementById('headerName').textContent=c.name; document.getElementById('headerAvatar').src=c.avatar; 
    document.getElementById('headerInfo').textContent = c.participants.length>2 ? 'Grupo...' : 'online';
    if(c.isReadOnly) { messageInput.disabled=true; messageInput.placeholder="Somente leitura"; messageInput.classList.add('cursor-not-allowed'); senderToggle.classList.add('hidden'); sendIcon.setAttribute('data-lucide','mic'); }
    else { messageInput.disabled=false; messageInput.placeholder="Digite uma mensagem"; messageInput.classList.remove('cursor-not-allowed'); senderToggle.classList.remove('hidden'); messageInput.focus(); sendIcon.setAttribute('data-lucide','send'); }
    if(window.innerWidth<768){document.getElementById('sidebar').style.display='none';document.getElementById('chatArea').style.display='flex';}
    renderMessages(c); renderContactList(document.getElementById('searchInput').value);
}

function renderMessages(c) {
    const con=document.getElementById('messagesContainer'); con.innerHTML=''; let ld=null;
    c.messages.forEach(m=>{
        if(m.date!==ld){con.innerHTML+=`<div class="flex justify-center my-3 sticky top-2 z-20"><span class="bg-[var(--window-bg)] bg-opacity-95 text-secondary text-[12.5px] py-1.5 px-3 rounded-lg shadow-sm uppercase font-medium">${m.date}</span></div>`;ld=m.date;}
        const out=m.author===c.mainUser, img=/\.(jpeg|jpg|gif|png)/i.test(m.text), content=img?`<img src="${m.text}" onclick="openImageModal(this.src)" class="block">`:`<span class="text-[14.2px] leading-[19px] whitespace-pre-wrap">${m.text.replace(/\n/g,'<br>')}</span>`;
        con.innerHTML+=`<div class="flex w-full mb-0.5 ${out?'justify-end':'justify-start'}"><div class="message-bubble ${out?'message-out':'message-in'}">${!out&&c.participants.length>2?`<div class="text-[13px] font-medium mb-1" style="color:${getColor(m.author)}">${m.author}</div>`:''}${content}<div class="flex justify-end items-end gap-1 float-right ml-2 mt-1 relative top-[4px] h-[15px]"><span class="text-[11px] text-[var(--text-secondary)] opacity-80">${m.time}</span></div></div></div>`;
    });
    lucide.createIcons(); con.scrollTop=con.scrollHeight;
}

async function handleFileUpload(e) { const f=e.target.files[0]; if(!f)return; const t=await f.text(); processChatText(f.name,t); e.target.value=''; }
function processChatText(n,t) {
    const lines=t.split('\n'), msgs=[], parts=new Set(); let curr=null;
    const regex = /^\[?(\d{2}\/\d{2}\/\d{2,4})\s?,?\s?(\d{2}:\d{2}(?::\d{2})?)\]?\s(.*?):\s(.*)/;
    lines.forEach(l=>{
        l=l.trim().replace(/[\u200E\u200F]/g, ''); if(!l)return;
        const m=l.match(regex);
        if(m){ if(curr)msgs.push(curr); parts.add(m[3].trim()); curr={date:m[1],time:m[2].substring(0,5),author:m[3].trim(),text:m[4],type:'chat'}; }
        else if(curr) curr.text+='\n'+l;
    });
    if(curr)msgs.push(curr); if(!msgs.length)return alert("Arquivo inválido");
    const p=Array.from(parts), name=p[0]||n.replace('.txt','').trim(), main=p[1]||"Você", nc={id:Date.now(),name:name,avatar:`https://ui-avatars.com/api/?name=${name}&background=random`,participants:p,mainUser:main,messages:msgs,lastMessage:msgs[msgs.length-1].text.substring(0,30),lastMessageIsMine:false,date:msgs[msgs.length-1].date,time:msgs[msgs.length-1].time,unread:0,pinned:false,isReadOnly:true};
    chats.unshift(nc); saveChats(); renderContactList(); openChat(nc.id);
}

function toggleMenu(e){e.stopPropagation(); document.getElementById('mainMenu').classList.toggle('hidden');}
function toggleDrawer(id){document.getElementById(id).classList.toggle('open');}
function toggleUnreadFilter(b){filterUnread=!filterUnread; b.querySelector('i').style.color=filterUnread?'#00a884':''; renderContactList(document.getElementById('searchInput').value);}
function openSettings(){closeAllMenus(); document.getElementById('settingsModal').classList.remove('hidden'); requestAnimationFrame(()=>{document.getElementById('settingsModal').classList.remove('opacity-0'); document.getElementById('settingsContent').classList.add('scale-100');});}
function closeSettings(){document.getElementById('settingsModal').classList.add('opacity-0'); document.getElementById('settingsContent').classList.remove('scale-100'); setTimeout(()=>document.getElementById('settingsModal').classList.add('hidden'),200);}
function openHelpModal(){closeAllMenus(); document.getElementById('helpModal').classList.remove('hidden'); requestAnimationFrame(()=>{document.getElementById('helpModal').classList.remove('opacity-0'); document.getElementById('helpModalContent').classList.add('scale-100');});}
function closeHelpModal(){document.getElementById('helpModal').classList.add('opacity-0'); document.getElementById('helpModalContent').classList.remove('scale-100'); setTimeout(()=>document.getElementById('helpModal').classList.add('hidden'),200);}
function openCreateChatModal(){document.getElementById('createChatModal').classList.remove('hidden'); requestAnimationFrame(()=>{document.getElementById('createChatModal').classList.remove('opacity-0'); document.getElementById('createChatContent').classList.add('scale-100'); document.getElementById('newChatName').focus();});}
function closeCreateChatModal(){document.getElementById('createChatModal').classList.add('opacity-0'); document.getElementById('createChatContent').classList.remove('scale-100'); setTimeout(()=>document.getElementById('createChatModal').classList.add('hidden'),200);}
function confirmCreateChat(){const n=document.getElementById('newChatName').value.trim(); if(!n)return; const nc={id:Date.now(),name:n,avatar:`https://ui-avatars.com/api/?name=${n}&background=random`,participants:[n,"Você"],mainUser:"Você",messages:[],lastMessage:"Nova conversa",lastMessageIsMine:false,date:new Date().toLocaleDateString('pt-BR'),time:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),unread:0,pinned:false,isReadOnly:false}; chats.unshift(nc); saveChats(); renderContactList(); closeCreateChatModal(); openChat(nc.id);}
function openEditModalAction(e,id){ if(e)e.stopPropagation(); closeAllMenus(); editingChatId=id; const c=chats.find(x=>x.id===id); if(!c)return; document.getElementById('editNameInput').value=c.name; document.getElementById('editAvatarInput').value=c.avatar; document.getElementById('editAvatarPreview').src=c.avatar; const ro=c.name==="Face Off (Dev)"; document.getElementById('editNameInput').disabled=ro; document.getElementById('editAvatarInput').disabled=ro; document.getElementById('avatarUploadOverlay').classList.toggle('hidden',ro); document.getElementById('editNameWarning').classList.toggle('hidden',!ro); document.getElementById('editContactModal').classList.remove('hidden'); requestAnimationFrame(()=>{document.getElementById('editContactModal').classList.remove('opacity-0'); document.getElementById('editModalContent').classList.add('scale-100');});}
function handleAvatarFileSelected(e){const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=ev=>{document.getElementById('editAvatarPreview').src=ev.target.result;document.getElementById('editAvatarInput').value=ev.target.result;}; r.readAsDataURL(f);}
function closeEditModal(){document.getElementById('editContactModal').classList.add('opacity-0'); document.getElementById('editModalContent').classList.remove('scale-100'); setTimeout(()=>document.getElementById('editContactModal').classList.add('hidden'),200);}
function saveContactEdits(){if(!editingChatId)return; const c=chats.find(x=>x.id===editingChatId); if(c && c.name!=="Face Off (Dev)"){ c.name=document.getElementById('editNameInput').value; c.avatar=document.getElementById('editAvatarInput').value; saveChats(); renderContactList(); if(activeChatId===editingChatId){document.getElementById('headerName').textContent=c.name;document.getElementById('headerAvatar').src=c.avatar;} } closeEditModal();}
function openContactInfo(){if(activeChatId)openEditModalAction(null,activeChatId);}
function closeChat(e){if(e)e.stopPropagation(); activeChatId=null; if(window.innerWidth<768){document.getElementById('chatArea').style.display='none';document.getElementById('sidebar').style.display='flex';} renderContactList(); }
function clearAllChats(){if(confirm("Apagar tudo?")){localStorage.removeItem('greenchat_data_v1'); chats=[]; activeChatId=null; loadChats(); closeSettings();}}
function clearSiteCache(){if(confirm("Resetar?")){localStorage.clear(); location.reload();}}
function openImageModal(s){document.getElementById('modalImage').src=s; openModal('imageModal', 'modalImage');}
function closeImageModal(){closeModal('imageModal', 'modalImage');}
function toggleSender(){currentSenderIsMe=!currentSenderIsMe; senderToggle.textContent=currentSenderIsMe?"Você":"Contato"; senderToggle.className=`sender-toggle ${currentSenderIsMe?'sender-me':'sender-them'} mr-2 shrink-0`;}
function handleInputKey(e){if(e.key==='Enter')sendMessage();}
function sendMessage(){if(!activeChatId)return; const c=chats.find(x=>x.id===activeChatId); if(!c||c.isReadOnly)return; const txt=messageInput.value.trim(); if(!txt)return; const now=new Date(), d=now.toLocaleDateString('pt-BR'), t=now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); c.messages.push({date:d,time:t,author:currentSenderIsMe?c.mainUser:c.name,text:txt,type:'chat'}); c.lastMessage=txt; c.lastMessageIsMine=currentSenderIsMe; c.time=t; messageInput.value=''; chats=chats.filter(x=>x.id!==c.id); chats.unshift(c); saveChats(); renderMessages(c); renderContactList(document.getElementById('searchInput').value); updateSendIcon();}

function updateSendIcon() {
    const hasText = messageInput.value.trim().length > 0;
    if (hasText) {
        sendIcon.setAttribute('data-lucide', 'send');
        sendIcon.parentElement.classList.add('text-[#00a884]');
    } else {
        sendIcon.setAttribute('data-lucide', 'mic');
        sendIcon.parentElement.classList.remove('text-[#00a884]');
    }
    lucide.createIcons();
}

function toggleEmojiPicker() { closeAllMenus(); document.getElementById('emojiPicker').classList.toggle('hidden'); if(document.getElementById('emojiPicker').innerHTML==="") ["😀","😂","😍","👍","❤️","🎉"].forEach(e=>{const b=document.createElement('button');b.className="text-2xl p-1";b.textContent=e;b.onclick=()=>{messageInput.value+=e;messageInput.focus();updateSendIcon();};document.getElementById('emojiPicker').appendChild(b);}); }
function toggleAttachMenu() { closeAllMenus(); document.getElementById('attachMenu').classList.toggle('hidden'); }

function getColor(n){const c=['#e542a3','#1f7aec','#dfa62a','#6bcbef','#35cd96','#917ced'];let h=0;for(let i=0;i<n.length;i++)h=n.charCodeAt(i)+((h<<5)-h);return c[Math.abs(h)%c.length];}

window.addEventListener('resize', () => { if (window.innerWidth >= 768) { document.getElementById('sidebar').style.display='flex'; document.getElementById('chatArea').style.display='flex'; if(!activeChatId){document.getElementById('emptyState').style.display='flex';document.getElementById('chatContent').style.display='none';}else{document.getElementById('emptyState').style.display='none';document.getElementById('chatContent').style.display='flex';} } else { if(activeChatId){document.getElementById('sidebar').style.display='none';document.getElementById('chatArea').style.display='flex';}else{document.getElementById('sidebar').style.display='flex';document.getElementById('chatArea').style.display='none';} } });
document.getElementById('searchInput').addEventListener('input', (e) => renderContactList(e.target.value));

applyTheme(); loadChats();