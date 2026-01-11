let channels = [];
let previousClass = null;
const container = document.getElementById('streamContainer');

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
        renderTags();
    }
    renderStreams();
}

function addChannel() {
    const input = document.getElementById('channel');
    const channel = input.value.trim().toLowerCase();

    if (!channel) return;
    
    if (!channels.includes(channel)) {
        channels.push(channel);
        renderStreams();
        renderTags();
        updateURL();
    }
    
    input.value = '';
}

function removeChannel(channel) {
    channels = channels.filter(c => c !== channel);
    document.getElementById(channel).remove();
    updateGridClass();
    renderTags();
    updateURL();
}

function clearAll() {
    channels = [];
    renderStreams();
    renderTags();
    updateURL();
}

function renderTags() {
    const container = document.getElementById('tagContainer');
    container.innerHTML = channels.map(channel => `
        <div class="bg-twitch-border px-3 py-1.5 rounded-full text-sm flex items-center gap-2">
            <span>${channel}</span>
            <button 
                onclick="removeChannel('${channel}')"
                class="hover:text-red-400 transition w-4 h-4 flex items-center justify-center text-lg leading-none"
            >×</button>
        </div>
    `).join('');
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
                frameborder="0"
                allowfullscreen
                scrolling="no"
                height="100%"
                width="100%"
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

    const headerHeight = document.getElementsByTagName('header')[0].offsetHeight;
    container.classList.add('h-[calc(100vh-' + headerHeight + 'px)]');
});
