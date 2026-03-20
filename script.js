let channels = [];
let previousClass = null;
const container = document.getElementById('streamContainer');
const chatSidebar = document.getElementById('chatSidebar');
const saveModal = document.getElementById('saveListModal');

///region Saving lists
function getSavedLists(){
    const lists = localStorage.getItem('multitwitch_lists');

    return lists ? JSON.parse(lists) : [];
}

function persistLists(lists) {
    localStorage.setItem('multitwitch_lists', JSON.stringify(lists));
}

function openSaveModal() {
    const nameInput = document.getElementById('listNameInput');
    nameInput.value = '';
    saveModal.classList.remove('hidden');
    nameInput.focus();
}

function closeSaveModal() {
    saveModal.classList.add('hidden');
}

function updateSaveButton() {
    const btn = document.getElementById('saveListBtn');
    btn.classList.toggle('hidden', channels.length === 0);
}

function saveList() {
    if (channels.length === 0) return;

    const nameInput = document.getElementById('listNameInput');
    const lists = getSavedLists();
    const name = nameInput.value.trim() || null;

    lists.push({ id: Date.now(), name, channels });
    persistLists(lists);
    closeSaveModal();
    renderSavedListsUI();
}

function renderSavedListsUI() {
    const container = document.getElementById('loadListContainer');
    const select = document.getElementById('savedListsSelect');
    const lists = getSavedLists();

    if (lists.length === 0)
    {
        container.classList.add('hidden');
        container.classList.remove('inline-block');
    }
    else
    {
        container.classList.remove('hidden');
        container.classList.add('inline-block');
    }

    select.innerHTML = `<option value="">Select a saved list</option>` +
        lists.map(l => `<option value="${l.id}">${l.name ?? l.channels.join(', ')}</option>`).join('');
}

function actionSelectedList(action) {
    const select = document.getElementById('savedListsSelect');
    const id = select.value;

    if (id.length === 0) return;

    if (action === 'load') {
        const list = getSavedLists().find(l => l.id == id);
        if (!list) return;

        channels = list.channels;
        renderStreams();
        renderChats();
        renderTags();
        updateURL();
    } else if (action === 'delete') {
        persistLists(getSavedLists().filter(l => l.id != id));
        renderSavedListsUI();
    }
}
///endregion

function updateURL() {
    const params = new URLSearchParams();
    let newURL = window.location.pathname;

    if (channels.length > 0)
    {
        params.set('channels', channels.join(','));
        newURL += '?' + params.toString();
    }
    
    window.history.replaceState({}, '', newURL);
}

function loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    const channelsParam = params.get('channels');
    if (channelsParam) {
        channels = channelsParam.split(',').filter(c => c.trim());
    }
    renderTags();
    renderStreams();
    renderChats();
}

function addChannel() {
    const input = document.getElementById('channel');
    const channel = input.value.trim().toLowerCase();

    if (!channel) return;
    
    if (!channels.includes(channel)) {
        channels.push(channel);
        renderStreams();
        addChat(channel);
        renderTags();
        updateURL();
    }
    
    input.value = '';
}

function removeChannel(channel) {
    channels = channels.filter(c => c !== channel);
    document.getElementById(channel).remove();
    document.getElementById('chat-' + channel).remove();
    updateGridClass();
    renderTags();
    updateURL();
    updateSaveButton();
}

function clearAll() {
    channels = [];
    renderStreams();
    renderChats();
    renderTags();
    updateURL();
}

function toggleChat() {
    const chatToggle = document.getElementById('chatToggle');

    if (chatSidebar.classList.contains('translate-x-full')) {
        chatSidebar.classList.remove('translate-x-full');
        chatToggle.textContent = 'Hide Chat';
    } else {
        chatSidebar.classList.add('translate-x-full');
        chatToggle.textContent = 'Show Chat';
    }
}

function addChat(channel) {
    const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

    chatSidebar.innerHTML += `
        <section id="chat-${channel}" class="border-b-2 border-gray-200 dark:border-twitch-border">
            <div class="bg-gray-100 dark:bg-twitch-dark p-2 font-semibold text-sm text-twitch-purple">
                ${channel}'s chat
            </div>
            <iframe
                src="https://www.twitch.tv/embed/${channel}/chat?parent=${window.location.hostname}${darkMode ? '&darkpopout' : ''}"
                scrolling="no"
                height="500"
                width="100%"
                class="border-0"
            >
            </iframe>
        </section>`;
}

function renderChats() {
    chatSidebar.innerHTML = '';

    channels.forEach(channel => addChat(channel));
}

///region Tags drag 'n drop
function onTagDragStart(e) {
    e.dataTransfer.setData('text/plain', e.currentTarget.dataset.channel);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('opacity-40');
}

function onTagDragEnd(e) {
    e.currentTarget.classList.remove('opacity-40');
    document.querySelectorAll('#tagContainer [draggable]').forEach(el => {
        el.classList.remove('ring-2', 'ring-twitch-purple');
    });
}

function onTagDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    document.querySelectorAll('#tagContainer [draggable]').forEach(el => {
        el.classList.remove('ring-2', 'ring-twitch-purple');
    });
    e.currentTarget.classList.add('ring-2', 'ring-twitch-purple');
}

function onTagDrop(e) {
    e.preventDefault();
    const srcChannel = e.dataTransfer.getData('text/plain');
    const targetChannel = e.currentTarget.dataset.channel;

    if (srcChannel === targetChannel) return;

    const oldIndex = channels.indexOf(srcChannel);
    const newIndex = channels.indexOf(targetChannel);
    if (oldIndex === -1 || newIndex === -1) return;

    channels.splice(oldIndex, 1);
    channels.splice(oldIndex < newIndex ? newIndex - 1 : newIndex, 0, srcChannel);

    const srcStream = document.getElementById(srcChannel);
    const targetStream = document.getElementById(targetChannel);
    targetStream.before(srcStream);

    renderTags();
    updateURL();
}
///endregion

function renderTags() {
    const container = document.getElementById('tagContainer');
    container.innerHTML = channels.map(channel => `
        <div
            data-channel="${channel}"
            draggable="true"
            ondragstart="onTagDragStart(event)"
            ondragend="onTagDragEnd(event)"
            ondragover="onTagDragOver(event)"
            ondrop="onTagDrop(event)"
            class="bg-purple-100 dark:bg-twitch-border px-3 py-1.5 rounded-full text-sm flex items-center gap-2 cursor-grab"
        >
            <span>${channel}</span>
            <button 
                onclick="removeChannel(this.closest('[data-channel]').dataset.channel)"
                class="hover:text-red-400 transition w-4 h-4 flex items-center justify-center text-lg leading-none"
            >×</button>
        </div>
    `).join('');

    //Because of the tags being added, there's a slight delay before the header height is correct
    //This does causes twitch autoplay to not work on some streams ... eh
    setTimeout(() => {
        const headerHeight = document.getElementsByTagName('header')[0].offsetHeight;
        document.documentElement.style.setProperty('--header-height', headerHeight + 'px');
    }, 150)
}

function getGridClass(count) {
    const gridClasses = {
        2: 'lg:grid-cols-2',
        3: 'lg:grid-cols-2',
        4: 'lg:grid-cols-2 lg:grid-rows-2',
        5: 'lg:grid-cols-3 lg:grid-rows-2',
        6: 'lg:grid-cols-3 lg:grid-rows-2',
        7: 'lg:grid-cols-3 lg:grid-rows-3',
    };

    if (count > 7)
        count = 7;

    return gridClasses[count]?.split(' ');
}

function updateGridClass() {
    if (previousClass) {
        container.classList.remove(...previousClass);
    }
    const gridClass = getGridClass(channels.length);
    previousClass = gridClass;
    if (!gridClass) return;

    container.classList.add(...gridClass);
}

function renderStreams() {
    updateGridClass();
    updateSaveButton();

    if (channels.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center text-center px-4">
                <h2 class="text-twitch-purple text-2xl font-bold mb-4">No streams yet!</h2>
                <p class="text-gray-400 max-w-lg">
                    Enter Twitch usernames above to start watching multiple streams at once.
                    Perfect for watching tournaments, co-streams, or just keeping up with your favorite streamers!
                </p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        ${channels.map(channel => `
            <iframe
                id="${channel}"
                src="https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}"
                allowfullscreen
                scrolling="no"
                height="100%"
                width="100%"
                class="border-0"
            >
            </iframe>
        `).join('')}
    `;
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('channel').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addChannel();
    });

    loadFromURL();
    renderSavedListsUI();
});
