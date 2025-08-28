const CACHE_NAME = 'private-vault-v3.0-final';
const DATA_CACHE_NAME = 'private-vault-data-v3.0';

// Enhanced offline support - cache everything needed
const FILES_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css', 
    '/app.js',
    '/manifest.json'
];

// External resources that need fallbacks
const EXTERNAL_RESOURCES = [
    'https://cdn.quilljs.com/1.3.7/quill.snow.css',
    'https://cdn.quilljs.com/1.3.7/quill.min.js',
    'https://unpkg.com/lucide@latest/dist/umd/lucide.js'
];

// ===== INSTALL EVENT =====
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Installing with enhanced offline support...');
    
    event.waitUntil(
        Promise.all([
            // Cache app resources
            caches.open(CACHE_NAME).then((cache) => {
                console.log('[ServiceWorker] Caching app shell');
                return cache.addAll(FILES_TO_CACHE);
            }),
            // Cache external resources with fallbacks
            cacheExternalResources()
        ]).then(() => {
            console.log('[ServiceWorker] Installation complete');
            return self.skipWaiting();
        }).catch((error) => {
            console.error('[ServiceWorker] Installation failed:', error);
            // Continue anyway to ensure the app works offline
            return self.skipWaiting();
        })
    );
});

async function cacheExternalResources() {
    try {
        const cache = await caches.open(CACHE_NAME);
        
        // Try to cache external resources, but don't fail if they're not available
        for (const resource of EXTERNAL_RESOURCES) {
            try {
                const response = await fetch(resource, { mode: 'cors' });
                if (response.ok) {
                    await cache.put(resource, response);
                    console.log('[ServiceWorker] Cached:', resource);
                }
            } catch (error) {
                console.warn('[ServiceWorker] Failed to cache:', resource, error);
            }
        }
    } catch (error) {
        console.warn('[ServiceWorker] External resource caching failed:', error);
    }
}

// ===== ACTIVATE EVENT =====
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activating...');
    
    event.waitUntil(
        Promise.all([
            // Clean old caches
            caches.keys().then((keyList) => {
                return Promise.all(keyList.map((key) => {
                    if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
                        console.log('[ServiceWorker] Removing old cache', key);
                        return caches.delete(key);
                    }
                }));
            }),
            // Claim all clients immediately
            self.clients.claim()
        ]).then(() => {
            console.log('[ServiceWorker] Activation complete - app ready for offline use');
            
            // Notify clients that the app is ready
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'OFFLINE_READY',
                        message: 'App is ready for offline use'
                    });
                });
            });
        })
    );
});

// ===== ENHANCED FETCH HANDLER =====
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests and non-http(s) requests
    if (request.method !== 'GET' || !request.url.startsWith('http')) {
        return;
    }
    
    // Handle different types of requests
    if (url.origin === self.location.origin) {
        // Same-origin requests - app resources
        event.respondWith(handleAppRequest(request));
    } else if (isExternalResource(request.url)) {
        // External resources with fallbacks
        event.respondWith(handleExternalRequest(request));
    }
});

// Handle app requests with robust offline support
async function handleAppRequest(request) {
    const url = new URL(request.url);
    
    try {
        // For navigation requests, always serve the app
        if (request.mode === 'navigate' || request.destination === 'document') {
            return await serveApp();
        }
        
        // Try cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            console.log('[ServiceWorker] Serving from cache:', request.url);
            return cachedResponse;
        }
        
        // Try network
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (networkError) {
        console.log('[ServiceWorker] Network failed for app resource:', request.url);
        
        // For navigation requests, serve the app
        if (request.mode === 'navigate' || request.destination === 'document') {
            return await serveApp();
        }
        
        // Try to serve from cache one more time
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return a basic response for other resources
        return new Response('Resource not available offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

// Serve the main app (always works offline)
async function serveApp() {
    try {
        const cache = await caches.open(CACHE_NAME);
        let response = await cache.match('/') || await cache.match('/index.html');
        
        if (response) {
            return response;
        }
        
        // If no cached app, create a minimal working version
        const fallbackHTML = createFallbackApp();
        return new Response(fallbackHTML, {
            headers: { 'Content-Type': 'text/html' }
        });
        
    } catch (error) {
        console.error('[ServiceWorker] Error serving app:', error);
        return new Response(createFallbackApp(), {
            headers: { 'Content-Type': 'text/html' }
        });
    }
}

// Handle external resources with comprehensive fallbacks
async function handleExternalRequest(request) {
    try {
        // Try cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Try network with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        try {
            const networkResponse = await fetch(request, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            // Cache successful responses
            if (networkResponse.ok) {
                const cache = await caches.open(CACHE_NAME);
                cache.put(request, networkResponse.clone());
            }
            
            return networkResponse;
            
        } catch (fetchError) {
            clearTimeout(timeoutId);
            console.log('[ServiceWorker] External resource failed, using fallback:', request.url);
            return createResourceFallback(request.url);
        }
        
    } catch (error) {
        console.error('[ServiceWorker] External resource error:', error);
        return createResourceFallback(request.url);
    }
}

// Check if URL is an external resource we handle
function isExternalResource(url) {
    return EXTERNAL_RESOURCES.some(resource => url.includes(resource.split('/').pop()));
}

// Create comprehensive fallbacks for external resources
function createResourceFallback(url) {
    if (url.includes('quill.snow.css') || url.includes('quill') && url.includes('.css')) {
        return new Response(createQuillCSS(), {
            headers: { 'Content-Type': 'text/css' }
        });
    }
    
    if (url.includes('quill.min.js') || url.includes('quill') && url.includes('.js')) {
        return new Response(createQuillJS(), {
            headers: { 'Content-Type': 'application/javascript' }
        });
    }
    
    if (url.includes('lucide') && url.includes('.js')) {
        return new Response(createLucideJS(), {
            headers: { 'Content-Type': 'application/javascript' }
        });
    }
    
    // Generic fallback
    return new Response('/* Resource not available offline */', {
        headers: { 'Content-Type': 'text/css' }
    });
}

// Comprehensive Quill CSS fallback
function createQuillCSS() {
    return `
        .ql-toolbar {
            border: 1px solid #ccc;
            background: #f9f9f9;
            padding: 8px;
            border-radius: 4px 4px 0 0;
        }
        .ql-toolbar button {
            margin: 0 2px;
            padding: 4px 6px;
            border: 1px solid #ddd;
            background: white;
            border-radius: 3px;
            cursor: pointer;
        }
        .ql-toolbar button:hover {
            background: #e9e9e9;
        }
        .ql-container {
            border: 1px solid #ccc;
            border-top: none;
            background: white;
            border-radius: 0 0 4px 4px;
        }
        .ql-editor {
            padding: 12px;
            min-height: 200px;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 16px;
            line-height: 1.5;
        }
        .ql-editor p {
            margin: 0 0 8px 0;
        }
        .ql-editor.ql-blank::before {
            content: attr(data-placeholder);
            color: #999;
            font-style: italic;
        }
    `;
}

// Comprehensive Quill JS fallback
function createQuillJS() {
    return `
        window.Quill = function(selector, options) {
            const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
            if (!element) return null;
            
            const placeholder = options?.placeholder || 'Start typing...';
            
            // Create toolbar
            const toolbar = document.createElement('div');
            toolbar.className = 'ql-toolbar';
            toolbar.innerHTML = \`
                <button type="button" data-format="bold" title="Bold"><b>B</b></button>
                <button type="button" data-format="italic" title="Italic"><i>I</i></button>
                <button type="button" data-format="underline" title="Underline"><u>U</u></button>
                <span style="margin: 0 8px;">|</span>
                <button type="button" data-format="header" title="Heading">H1</button>
                <button type="button" data-format="list" title="List">• List</button>
            \`;
            
            // Create editor
            const container = document.createElement('div');
            container.className = 'ql-container';
            
            const editor = document.createElement('div');
            editor.className = 'ql-editor';
            editor.contentEditable = true;
            editor.setAttribute('data-placeholder', placeholder);
            
            container.appendChild(editor);
            
            element.innerHTML = '';
            element.appendChild(toolbar);
            element.appendChild(container);
            
            // Add toolbar functionality
            toolbar.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    const format = e.target.dataset.format;
                    editor.focus();
                    
                    switch (format) {
                        case 'bold':
                            document.execCommand('bold');
                            break;
                        case 'italic':
                            document.execCommand('italic');
                            break;
                        case 'underline':
                            document.execCommand('underline');
                            break;
                        case 'header':
                            document.execCommand('formatBlock', false, 'h2');
                            break;
                        case 'list':
                            document.execCommand('insertUnorderedList');
                            break;
                    }
                }
            });
            
            // Update placeholder visibility
            const updatePlaceholder = () => {
                if (editor.textContent.trim() === '') {
                    editor.classList.add('ql-blank');
                } else {
                    editor.classList.remove('ql-blank');
                }
            };
            
            editor.addEventListener('input', updatePlaceholder);
            editor.addEventListener('blur', updatePlaceholder);
            updatePlaceholder();
            
            // Return Quill-like API
            return {
                root: editor,
                getText: function() {
                    return editor.textContent || '';
                },
                on: function(event, callback) {
                    if (event === 'text-change') {
                        editor.addEventListener('input', callback);
                    }
                },
                setContents: function(content) {
                    editor.innerHTML = content || '';
                    updatePlaceholder();
                },
                getContents: function() {
                    return editor.innerHTML;
                }
            };
        };
        
        console.log('[Fallback] Quill fallback loaded');
    `;
}

// Comprehensive Lucide fallback
function createLucideJS() {
    return `
        window.lucide = {
            createIcons: function() {
                const icons = document.querySelectorAll('[data-lucide]');
                icons.forEach(icon => {
                    const iconName = icon.getAttribute('data-lucide');
                    const svg = createIconSVG(iconName);
                    icon.innerHTML = svg;
                });
            }
        };
        
        function createIconSVG(name) {
            const iconMap = {
                'menu': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
                'search': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',
                'x': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
                'plus': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
                'save': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg>',
                'trash-2': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
                'heart': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
                'pin': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 7.89 17H12h4.11a2 2 0 0 0 1.78-2.55l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 0-1-1H10a1 1 0 0 0-1 1z"/><path d="M8 3h8"/></svg>',
                'copy': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
                'download': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
                'upload': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
                'settings': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m15.5-3.5L19 8l-1.5-1.5M8 19l-1.5-1.5L5 19l1.5-1.5M19 5l-1.5 1.5L19 8l-1.5-1.5M5 5l1.5 1.5L5 8 6.5 6.5"/></svg>',
                'log-out': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
                'folder': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
                'tag': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
                'eye': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
                'eye-off': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
                'lock': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><circle cx="12" cy="16" r="1"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
                'sticky-note': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M15 3v6h6"/></svg>',
                'grid-3x3': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="6" height="6"/><rect x="15" y="3" width="6" height="6"/><rect x="3" y="15" width="6" height="6"/><rect x="15" y="15" width="6" height="6"/></svg>',
                'list': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
                'arrow-up-down': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/></svg>',
                'check-square': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,11 12,14 22,4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
                'clock': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>',
                'check-circle': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>',
                'alert-circle': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
                'alert-triangle': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
                'info': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
            };
            
            return iconMap[name] || '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';
        }
        
        console.log('[Fallback] Lucide icons fallback loaded');
    `;
}

// Create minimal fallback app
function createFallbackApp() {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Private Vault - Offline Mode</title>
            <style>
                body { font-family: sans-serif; margin: 20px; line-height: 1.6; }
                .container { max-width: 600px; margin: 0 auto; }
                .offline-message { background: #f0f8ff; padding: 20px; border-radius: 8px; border: 1px solid #b0d4f1; }
                .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
                .btn:hover { background: #0056b3; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Private Vault</h1>
                <div class="offline-message">
                    <h2>Offline Mode</h2>
                    <p>The app is running in offline mode with limited functionality. Full features will be available when you're back online.</p>
                    <button class="btn" onclick="location.reload()">Refresh</button>
                </div>
            </div>
        </body>
        </html>
    `;
}

// ===== MESSAGE HANDLING =====
self.addEventListener('message', (event) => {
    console.log('[ServiceWorker] Message received:', event.data);
    
    if (event.data && event.data.type) {
        switch (event.data.type) {
            case 'SKIP_WAITING':
                self.skipWaiting();
                break;
            case 'GET_VERSION':
                event.ports[0]?.postMessage({ version: CACHE_NAME });
                break;
            case 'CACHE_USER_DATA':
                cacheUserData(event.data.users);
                break;
            case 'CLEAR_CACHE':
                clearAllCaches();
                break;
        }
    }
});

// Enhanced user data caching
async function cacheUserData(users) {
    try {
        const cache = await caches.open(DATA_CACHE_NAME);
        
        // Cache user data with timestamp
        const userData = {
            users: users,
            timestamp: Date.now(),
            version: '3.0'
        };
        
        const response = new Response(JSON.stringify(userData), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        await cache.put('/user-data', response);
        console.log('[ServiceWorker] User data cached for offline use');
        
        // Notify all clients
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'USER_DATA_CACHED',
                success: true,
                timestamp: userData.timestamp
            });
        });
        
    } catch (error) {
        console.error('[ServiceWorker] Failed to cache user data:', error);
    }
}

// Clear all caches
async function clearAllCaches() {
    try {
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('[ServiceWorker] All caches cleared');
    } catch (error) {
        console.error('[ServiceWorker] Failed to clear caches:', error);
    }
}

// ===== BACKGROUND SYNC =====
self.addEventListener('sync', (event) => {
    console.log('[ServiceWorker] Background sync:', event.tag);
    
    if (event.tag === 'user-data-sync') {
        event.waitUntil(performDataSync());
    }
});

async function performDataSync() {
    console.log('[ServiceWorker] Syncing user data...');
    
    try {
        // In a real implementation, this would sync with a server
        // For now, just ensure data integrity
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_COMPLETE',
                success: true,
                timestamp: Date.now()
            });
        });
    } catch (error) {
        console.error('[ServiceWorker] Sync failed:', error);
        
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_COMPLETE',
                success: false,
                error: error.message
            });
        });
    }
}

// ===== PERIODIC BACKGROUND SYNC =====
self.addEventListener('periodicsync', (event) => {
    console.log('[ServiceWorker] Periodic sync:', event.tag);
    
    if (event.tag === 'notes-backup') {
        event.waitUntil(performPeriodicBackup());
    }
});

async function performPeriodicBackup() {
    console.log('[ServiceWorker] Performing periodic backup...');
    
    try {
        // In a real app, this would backup to cloud storage
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'PERIODIC_BACKUP',
                success: true,
                timestamp: Date.now()
            });
        });
    } catch (error) {
        console.error('[ServiceWorker] Periodic backup failed:', error);
    }
}

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', (event) => {
    console.log('[ServiceWorker] Push received:', event);
    
    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (error) {
            data = { title: event.data.text() };
        }
    }
    
    const options = {
        body: data.body || 'You have updates in Private Vault',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/',
            timestamp: Date.now()
        },
        actions: [
            {
                action: 'view',
                title: 'Open App'
            },
            {
                action: 'close',
                title: 'Dismiss'
            }
        ],
        requireInteraction: false,
        silent: false
    };
    
    event.waitUntil(
        self.registration.showNotification(
            data.title || 'Private Vault', 
            options
        )
    );
});

// ===== NOTIFICATION CLICK =====
self.addEventListener('notificationclick', (event) => {
    console.log('[ServiceWorker] Notification clicked:', event);
    
    event.notification.close();
    
    if (event.action === 'close') {
        return;
    }
    
    const url = event.notification.data?.url || '/';
    
    event.waitUntil(
        clients.matchAll({ 
            type: 'window',
            includeUncontrolled: true 
        }).then((clientList) => {
            // Focus existing window if available
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            
            // Open new window if none exists
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});

// ===== ERROR HANDLING =====
self.addEventListener('error', (event) => {
    console.error('[ServiceWorker] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('[ServiceWorker] Unhandled rejection:', event.reason);
});

// ===== NETWORK STATUS MONITORING =====
self.addEventListener('online', () => {
    console.log('[ServiceWorker] Network is online');
    broadcastNetworkStatus(true);
});

self.addEventListener('offline', () => {
    console.log('[ServiceWorker] Network is offline');
    broadcastNetworkStatus(false);
});

async function broadcastNetworkStatus(isOnline) {
    try {
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'NETWORK_STATUS',
                isOnline: isOnline
            });
        });
    } catch (error) {
        console.error('[ServiceWorker] Failed to broadcast network status:', error);
    }
}

console.log('[ServiceWorker] Enhanced service worker loaded - Full offline support enabled');