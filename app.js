/**
 * Final Private Vault - Complete Note-Taking Application
 * ALL CRITICAL FIXES + NEW FEATURES:
 * - Fixed category updating
 * - Complete tags management system  
 * - Dynamic note card sizing (masonry layout)
 * - Perfect offline functionality
 * - Enhanced user experience
 */

// ===== APPLICATION STATE =====
class NotesApp {
    constructor() {
        this.currentUser = null;
        this.notes = [];
        this.categories = [];
        this.tags = [];
        this.allTags = new Set(); // Track all available tags
        this.currentNote = null;
        this.searchQuery = '';
        this.activeFilter = 'all';
        this.activeCategory = null;
        this.activeTag = null;
        this.sortBy = 'dateModified';
        this.viewMode = 'grid';
        this.quillEditor = null;
        this.isInitialized = false;
        this.deferredPrompt = null;
        this.sidebarCollapsed = false;
        this.isOffline = !navigator.onLine;
        
        // Bind methods
        this.debounce = this.debounce.bind(this);
        this.showToast = this.showToast.bind(this);
        
        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.isOffline = false;
            this.showToast('Back online!', 'success');
            this.syncOfflineChanges();
        });
        
        window.addEventListener('offline', () => {
            this.isOffline = true;
            this.showToast('Working offline', 'info');
        });
    }

    // ===== INITIALIZATION =====
    async init() {
        if (this.isInitialized) return;
        
        try {
            await this.preloadCriticalResources();
            await this.setupEventListeners();
            await this.initializePWA();
            await this.checkAutoLogin();
            this.setupKeyboardShortcuts();
            this.isInitialized = true;
            console.log('Notes App initialized successfully');
            
            // Show offline status if needed
            if (this.isOffline) {
                this.showToast('App ready - working offline', 'info');
            }
        } catch (error) {
            console.error('Error initializing app:', error);
            this.showToast('App initialized with limited functionality', 'warning');
        }
    }

    // ===== PRELOAD CRITICAL RESOURCES =====
    async preloadCriticalResources() {
        try {
            // Cache essential data for offline use
            const userData = this.loadUsers();
            if ('caches' in window) {
                const cache = await caches.open('private-vault-user-data');
                await cache.put('/user-data', new Response(JSON.stringify(userData)));
            }
        } catch (error) {
            console.warn('Could not preload resources:', error);
        }
    }

    // ===== PWA FEATURES =====
    async initializePWA() {
        // Register enhanced service worker
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('SW registered:', registration);
                
                // Listen for service worker updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showToast('App updated! Refresh to see changes.', 'success');
                        }
                    });
                });
                
                // Listen for service worker messages
                navigator.serviceWorker.addEventListener('message', event => {
                    this.handleServiceWorkerMessage(event.data);
                });
                
            } catch (error) {
                console.log('SW registration failed:', error);
            }
        }

        // Handle install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallBanner();
        });

        // Handle app installed
        window.addEventListener('appinstalled', () => {
            this.hideInstallBanner();
            this.showToast('App installed successfully!', 'success');
        });
    }

    handleServiceWorkerMessage(data) {
        if (!data || !data.type) return;
        
        switch (data.type) {
            case 'CACHE_UPDATED':
                this.showToast('App updated and cached for offline use', 'success');
                break;
            case 'OFFLINE_READY':
                this.showToast('App ready for offline use', 'info');
                break;
            case 'SYNC_COMPLETE':
                this.showToast(data.success ? 'Data synced' : 'Sync failed', data.success ? 'success' : 'error');
                break;
        }
    }

    showInstallBanner() {
        const banner = document.getElementById('install-banner');
        if (banner) {
            banner.classList.remove('hidden');
        }
        
        const installBtn = document.getElementById('install-btn');
        if (installBtn) {
            installBtn.onclick = async () => {
                if (this.deferredPrompt) {
                    this.deferredPrompt.prompt();
                    const result = await this.deferredPrompt.userChoice;
                    if (result.outcome === 'accepted') {
                        console.log('User accepted install');
                    }
                    this.deferredPrompt = null;
                    this.hideInstallBanner();
                }
            };
        }

        const dismissBtn = document.getElementById('install-dismiss');
        if (dismissBtn) {
            dismissBtn.onclick = () => {
                this.hideInstallBanner();
            };
        }
    }

    hideInstallBanner() {
        const banner = document.getElementById('install-banner');
        if (banner) {
            banner.classList.add('hidden');
        }
    }

    // ===== EVENT LISTENERS =====
    setupEventListeners() {
        // Authentication
        const signupBtn = document.getElementById('signup');
        const loginBtn = document.getElementById('login');
        const logoutBtn = document.getElementById('logout');
        const togglePasswordBtn = document.getElementById('toggle-password');
        
        if (signupBtn) signupBtn.addEventListener('click', () => this.handleSignup());
        if (loginBtn) loginBtn.addEventListener('click', () => this.handleLogin());
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.handleLogout());
        if (togglePasswordBtn) togglePasswordBtn.addEventListener('click', (e) => this.togglePasswordVisibility(e));

        // Search
        const searchInput = document.getElementById('search-input');
        const searchClear = document.getElementById('search-clear');
        if (searchInput) {
            searchInput.addEventListener('input', 
                this.debounce((e) => this.handleSearch(e.target.value), 300));
        }
        if (searchClear) {
            searchClear.addEventListener('click', () => this.clearSearch());
        }

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                this.setActiveFilter(filter);
            });
        });

        // Toolbar
        const newNoteBtn = document.getElementById('new-note');
        const emptyNewNoteBtn = document.getElementById('empty-new-note');
        const gridViewBtn = document.getElementById('grid-view');
        const listViewBtn = document.getElementById('list-view');
        const bulkSelectBtn = document.getElementById('bulk-select');
        
        if (newNoteBtn) newNoteBtn.addEventListener('click', () => this.createNote());
        if (emptyNewNoteBtn) emptyNewNoteBtn.addEventListener('click', () => this.createNote());
        if (gridViewBtn) gridViewBtn.addEventListener('click', () => this.setViewMode('grid'));
        if (listViewBtn) listViewBtn.addEventListener('click', () => this.setViewMode('list'));
        if (bulkSelectBtn) bulkSelectBtn.addEventListener('click', () => this.toggleBulkSelect());

        // Sort dropdown
        const sortBtn = document.getElementById('sort-btn');
        if (sortBtn) {
            sortBtn.addEventListener('click', () => this.toggleSortMenu());
        }
        document.querySelectorAll('[data-sort]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setSortBy(e.target.dataset.sort);
                this.toggleSortMenu();
            });
        });

        // Modals
        const closeModalBtn = document.getElementById('close-modal');
        const saveNoteBtn = document.getElementById('save-note');
        const deleteNoteBtn = document.getElementById('delete-note');
        
        if (closeModalBtn) closeModalBtn.addEventListener('click', () => this.closeNoteModal());
        if (saveNoteBtn) saveNoteBtn.addEventListener('click', () => this.saveCurrentNote());
        if (deleteNoteBtn) deleteNoteBtn.addEventListener('click', () => this.deleteCurrentNote());

        // Category management
        const addCategoryBtn = document.getElementById('add-category');
        const saveCategoryBtn = document.getElementById('save-category');
        const cancelCategoryBtn = document.getElementById('cancel-category');
        const closeCategoryModalBtn = document.getElementById('close-category-modal');
        
        if (addCategoryBtn) addCategoryBtn.addEventListener('click', () => this.showCategoryModal());
        if (saveCategoryBtn) saveCategoryBtn.addEventListener('click', () => this.saveCategory());
        if (cancelCategoryBtn) cancelCategoryBtn.addEventListener('click', () => this.closeCategoryModal());
        if (closeCategoryModalBtn) closeCategoryModalBtn.addEventListener('click', () => this.closeCategoryModal());

        // Category selection
        const noteCategoryBtn = document.getElementById('note-category-btn');
        const closeCategorySelectModalBtn = document.getElementById('close-category-select-modal');
        
        if (noteCategoryBtn) noteCategoryBtn.addEventListener('click', () => this.showCategorySelectModal());
        if (closeCategorySelectModalBtn) closeCategorySelectModalBtn.addEventListener('click', () => this.closeCategorySelectModal());

        // FIXED: Tags management - Complete system
        const addTagBtn = document.getElementById('add-tag');
        const noteTagsBtn = document.getElementById('note-tags-btn');
        const closeTagsModalBtn = document.getElementById('close-tags-modal');
        const saveTagsBtn = document.getElementById('save-tags');
        const cancelTagsBtn = document.getElementById('cancel-tags');
        const closeCreateTagModalBtn = document.getElementById('close-create-tag-modal');
        const saveCreateTagBtn = document.getElementById('save-create-tag');
        const cancelCreateTagBtn = document.getElementById('cancel-create-tag');
        
        if (addTagBtn) addTagBtn.addEventListener('click', () => this.showCreateTagModal());
        if (noteTagsBtn) noteTagsBtn.addEventListener('click', () => this.showTagsModal());
        if (closeTagsModalBtn) closeTagsModalBtn.addEventListener('click', () => this.closeTagsModal());
        if (saveTagsBtn) saveTagsBtn.addEventListener('click', () => this.saveTags());
        if (cancelTagsBtn) cancelTagsBtn.addEventListener('click', () => this.closeTagsModal());
        if (closeCreateTagModalBtn) closeCreateTagModalBtn.addEventListener('click', () => this.closeCreateTagModal());
        if (saveCreateTagBtn) saveCreateTagBtn.addEventListener('click', () => this.saveCreateTag());
        if (cancelCreateTagBtn) cancelCreateTagBtn.addEventListener('click', () => this.closeCreateTagModal());

        // Tag input handling
        const tagInput = document.getElementById('tag-input');
        if (tagInput) {
            tagInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    this.addTagFromInput();
                }
            });
        }

        // Settings
        const settingsBtn = document.getElementById('settings-btn');
        const closeSettingsModalBtn = document.getElementById('close-settings-modal');
        const exportBtn = document.getElementById('export-btn');
        const exportAllBtn = document.getElementById('export-all');
        const importNotesBtn = document.getElementById('import-notes');
        
        if (settingsBtn) settingsBtn.addEventListener('click', () => this.showSettingsModal());
        if (closeSettingsModalBtn) closeSettingsModalBtn.addEventListener('click', () => this.closeSettingsModal());
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportNotes());
        if (exportAllBtn) exportAllBtn.addEventListener('click', () => this.exportNotes());
        if (importNotesBtn) importNotesBtn.addEventListener('click', () => this.importNotes());

        // Sidebar toggle - FIXED
        const sidebarToggleBtn = document.getElementById('sidebar-toggle');
        if (sidebarToggleBtn) {
            sidebarToggleBtn.addEventListener('click', () => this.toggleSidebar());
        }

        // Modal backdrop clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                this.closeAllModals();
            }
        });

        // Color picker
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('color-option')) {
                this.selectColor(e.target);
            }
        });

        // File input for imports
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileImport(e));
        }

        // Auto-save on editor changes
        this.setupAutoSave();
        
        // Masonry layout updates
        this.setupMasonryUpdates();
    }

    // ===== FIXED: SIDEBAR TOGGLE =====
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        
        // For mobile
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('open');
            
            // Add backdrop for mobile
            if (sidebar.classList.contains('open')) {
                this.addSidebarBackdrop();
            } else {
                this.removeSidebarBackdrop();
            }
        } else {
            // For desktop - collapse/expand
            this.sidebarCollapsed = !this.sidebarCollapsed;
            sidebar.classList.toggle('collapsed', this.sidebarCollapsed);
            
            // Trigger masonry layout update
            setTimeout(() => this.updateMasonryLayout(), 300);
        }
    }

    addSidebarBackdrop() {
        let backdrop = document.querySelector('.sidebar-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'sidebar-backdrop';
            backdrop.style.cssText = `
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.5);
                z-index: 1005;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(backdrop);
            
            backdrop.addEventListener('click', () => {
                this.toggleSidebar();
            });
            
            // Trigger opacity transition
            setTimeout(() => {
                backdrop.style.opacity = '1';
            }, 10);
        }
    }

    removeSidebarBackdrop() {
        const backdrop = document.querySelector('.sidebar-backdrop');
        if (backdrop) {
            backdrop.style.opacity = '0';
            setTimeout(() => {
                backdrop.remove();
            }, 300);
        }
    }

    // ===== MASONRY LAYOUT SYSTEM =====
    setupMasonryUpdates() {
        // Update layout when window resizes
        window.addEventListener('resize', this.debounce(() => {
            this.updateMasonryLayout();
        }, 250));
        
        // Update layout when notes are rendered
        const notesContainer = document.getElementById('notes-container');
        if (notesContainer) {
            const observer = new MutationObserver(() => {
                this.updateMasonryLayout();
            });
            observer.observe(notesContainer, { childList: true, subtree: true });
        }
    }

    updateMasonryLayout() {
        const notesGrid = document.getElementById('notes-grid');
        if (!notesGrid || !notesGrid.classList.contains('masonry-grid')) return;
        
        // For browsers that don't support CSS masonry
        if (!CSS.supports('grid-template-rows', 'masonry')) {
            this.implementJavaScriptMasonry();
        }
        
        // Trigger reflow for proper sizing
        setTimeout(() => {
            const cards = notesGrid.querySelectorAll('.note-card');
            cards.forEach(card => {
                card.style.height = 'auto';
            });
        }, 50);
    }

    implementJavaScriptMasonry() {
        const notesGrid = document.getElementById('notes-grid');
        if (!notesGrid) return;
        
        const cards = Array.from(notesGrid.querySelectorAll('.note-card'));
        if (cards.length === 0) return;
        
        // Reset grid to default
        notesGrid.style.columns = '';
        notesGrid.style.columnGap = '';
        
        // Calculate optimal columns based on container width
        const containerWidth = notesGrid.offsetWidth;
        const cardWidth = 280; // Minimum card width
        const gap = 16;
        const columns = Math.max(1, Math.floor((containerWidth + gap) / (cardWidth + gap)));
        
        if (window.innerWidth > 768) {
            notesGrid.style.columns = columns;
            notesGrid.style.columnGap = gap + 'px';
            
            cards.forEach(card => {
                card.style.breakInside = 'avoid';
                card.style.marginBottom = gap + 'px';
                card.style.display = 'inline-block';
                card.style.width = '100%';
            });
        } else {
            // Single column on mobile
            notesGrid.style.columns = '1';
            cards.forEach(card => {
                card.style.marginBottom = gap + 'px';
            });
        }
    }

    // ===== AUTHENTICATION =====
    async handleSignup() {
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        
        if (!usernameInput || !passwordInput) return;
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!username || !password) {
            this.showAuthMessage('Both fields are required.', 'error');
            return;
        }

        if (password.length < 6) {
            this.showAuthMessage('Password must be at least 6 characters long.', 'error');
            return;
        }

        try {
            const users = this.loadUsers();
            
            if (users[username]) {
                this.showAuthMessage('User already exists.', 'error');
                return;
            }

            const hashedPassword = await this.hashPassword(password);
            users[username] = {
                password: hashedPassword,
                notes: [],
                categories: this.getDefaultCategories(),
                tags: [],
                settings: {
                    defaultView: 'grid'
                },
                createdAt: new Date().toISOString()
            };
            
            this.saveUsers(users);
            this.showAuthMessage('Account created successfully! Please sign in.', 'success');
            
            // Clear form
            usernameInput.value = '';
            passwordInput.value = '';
            
        } catch (error) {
            console.error('Signup error:', error);
            this.showAuthMessage('An error occurred during signup.', 'error');
        }
    }

    async handleLogin() {
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const rememberMeCheckbox = document.getElementById('remember-me');
        
        if (!usernameInput || !passwordInput || !rememberMeCheckbox) return;
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const rememberMe = rememberMeCheckbox.checked;

        if (!username || !password) {
            this.showAuthMessage('Both fields are required.', 'error');
            return;
        }

        try {
            const users = this.loadUsers();
            
            if (!users[username]) {
                this.showAuthMessage('User not found.', 'error');
                return;
            }

            const hashedPassword = await this.hashPassword(password);
            
            if (users[username].password === hashedPassword) {
                this.currentUser = username;
                
                if (rememberMe) {
                    localStorage.setItem('rememberedUser', username);
                } else {
                    localStorage.removeItem('rememberedUser');
                }
                
                await this.loadUserData();
                this.showMainApp();
                this.showToast('Welcome back!', 'success');
            } else {
                this.showAuthMessage('Invalid credentials.', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showAuthMessage('An error occurred during login.', 'error');
        }
    }

    handleLogout() {
        this.currentUser = null;
        this.notes = [];
        this.categories = [];
        this.tags = [];
        this.allTags.clear();
        this.currentNote = null;
        
        localStorage.removeItem('rememberedUser');
        
        this.showAuthSection();
        this.clearForms();
        this.showToast('Signed out successfully', 'success');
    }

    // FIXED: Auto-login with offline support
    async checkAutoLogin() {
        const rememberedUser = localStorage.getItem('rememberedUser');
        
        if (rememberedUser) {
            const users = this.loadUsers();
            if (users[rememberedUser]) {
                this.currentUser = rememberedUser;
                await this.loadUserData();
                this.showMainApp();
                return;
            }
        }
        
        this.showAuthSection();
    }

    showAuthMessage(message, type = 'error') {
        const messageEl = document.getElementById('auth-message');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `auth-message ${type}`;
            
            setTimeout(() => {
                messageEl.textContent = '';
                messageEl.className = 'auth-message';
            }, 5000);
        }
    }

    // FIXED: Password visibility toggle
    togglePasswordVisibility(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const passwordInput = document.getElementById('password');
        const toggleIcon = document.querySelector('#toggle-password i');
        
        if (!passwordInput || !toggleIcon) return;
        
        try {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleIcon.setAttribute('data-lucide', 'eye-off');
            } else {
                passwordInput.type = 'password';
                toggleIcon.setAttribute('data-lucide', 'eye');
            }
            
            // Re-initialize Lucide icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            console.error('Error toggling password visibility:', error);
        }
    }

    // ===== ENHANCED DATA MANAGEMENT (OFFLINE SUPPORT) =====
    loadUsers() {
        try {
            let users = localStorage.getItem('users');
            if (!users && 'caches' in window) {
                // Try to load from cache if localStorage fails
                this.loadFromCache().then(cachedUsers => {
                    if (cachedUsers) {
                        localStorage.setItem('users', JSON.stringify(cachedUsers));
                    }
                });
            }
            return users ? JSON.parse(users) : {};
        } catch (error) {
            console.error('Error loading users:', error);
            return {};
        }
    }

    async loadFromCache() {
        try {
            if ('caches' in window) {
                const cache = await caches.open('private-vault-user-data');
                const response = await cache.match('/user-data');
                if (response) {
                    return await response.json();
                }
            }
        } catch (error) {
            console.warn('Could not load from cache:', error);
        }
        return null;
    }

    saveUsers(users) {
        try {
            localStorage.setItem('users', JSON.stringify(users));
            
            // Also cache for offline use
            if ('caches' in window) {
                caches.open('private-vault-user-data').then(cache => {
                    cache.put('/user-data', new Response(JSON.stringify(users)));
                });
            }
            
            // Notify service worker about data update
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'CACHE_USER_DATA',
                    users: users
                });
            }
        } catch (error) {
            console.error('Error saving users:', error);
            this.showToast('Error saving data', 'error');
        }
    }

    // FIXED: Load user data with proper tag handling
    async loadUserData() {
        try {
            const users = this.loadUsers();
            const userData = users[this.currentUser];
            
            if (userData) {
                this.notes = userData.notes || [];
                this.categories = userData.categories || this.getDefaultCategories();
                this.tags = userData.tags || [];
                
                // Extract all unique tags from notes and user tags
                this.extractAllTags();
                
                this.renderNotes();
                this.updateNavigationCounts();
                this.renderCategories();
                this.renderTags();
                
                // Update masonry layout
                setTimeout(() => this.updateMasonryLayout(), 100);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showToast('Error loading notes', 'error');
        }
    }

    // FIXED: Save user data with proper tag sync
    saveUserData() {
        if (!this.currentUser) return;
        
        try {
            const users = this.loadUsers();
            if (users[this.currentUser]) {
                users[this.currentUser].notes = this.notes;
                users[this.currentUser].categories = this.categories;
                users[this.currentUser].tags = Array.from(this.allTags);
                users[this.currentUser].lastModified = new Date().toISOString();
                this.saveUsers(users);
                
                // Update counts after saving
                this.updateNavigationCounts();
                this.renderCategories(); // This will update category counts
                this.renderTags(); // This will update tag counts
            }
        } catch (error) {
            console.error('Error saving user data:', error);
            this.showToast('Error saving data', 'error');
        }
    }

    getDefaultCategories() {
        return [
            { id: 'personal', name: 'Personal', color: '#3b82f6', count: 0 },
            { id: 'work', name: 'Work', color: '#10b981', count: 0 },
            { id: 'ideas', name: 'Ideas', color: '#f59e0b', count: 0 }
        ];
    }

    // ===== OFFLINE SYNC =====
    async syncOfflineChanges() {
        if (this.isOffline) return;
        
        try {
            // In a real app, this would sync with a server
            // For now, just ensure data is properly cached
            this.saveUserData();
            this.showToast('Data synchronized', 'success');
        } catch (error) {
            console.error('Sync error:', error);
        }
    }

    // ===== UTILITY FUNCTIONS =====
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            return 'Today';
        } else if (diffDays === 2) {
            return 'Yesterday';
        } else if (diffDays <= 7) {
            return `${diffDays - 1} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    stripHtml(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    getWordCount(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    // ===== UI MANAGEMENT =====
    showAuthSection() {
        const authSection = document.getElementById('auth-section');
        const appContainer = document.getElementById('app-container');
        
        if (authSection) authSection.classList.remove('hidden');
        if (appContainer) appContainer.classList.add('hidden');
    }

    showMainApp() {
        const authSection = document.getElementById('auth-section');
        const appContainer = document.getElementById('app-container');
        
        if (authSection) authSection.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');
        
        // Initialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        // Initialize Quill if not already done
        if (!this.quillEditor) {
            this.initializeQuillEditor();
        }
        
        // Update masonry layout
        setTimeout(() => this.updateMasonryLayout(), 200);
    }

    clearForms() {
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const rememberMeCheckbox = document.getElementById('remember-me');
        const searchInput = document.getElementById('search-input');
        
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';
        if (rememberMeCheckbox) rememberMeCheckbox.checked = false;
        if (searchInput) searchInput.value = '';
    }

    // ===== SEARCH FUNCTIONALITY =====
    handleSearch(query) {
        this.searchQuery = query.toLowerCase();
        
        const searchClear = document.getElementById('search-clear');
        if (searchClear) {
            if (query.length > 0) {
                searchClear.classList.remove('hidden');
            } else {
                searchClear.classList.add('hidden');
            }
        }
        
        this.renderNotes();
    }

    clearSearch() {
        const searchInput = document.getElementById('search-input');
        const searchClear = document.getElementById('search-clear');
        
        if (searchInput) searchInput.value = '';
        if (searchClear) searchClear.classList.add('hidden');
        
        this.searchQuery = '';
        this.renderNotes();
    }

    // ===== FILTERING & SORTING =====
    setActiveFilter(filter) {
        this.activeFilter = filter;
        this.activeCategory = null;
        this.activeTag = null;
        
        // Update nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeNavItem = document.querySelector(`[data-filter="${filter}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
        
        this.renderNotes();
        this.updateFiltersBar();
    }

    setActiveCategory(categoryId) {
        this.activeCategory = categoryId;
        this.activeFilter = 'category';
        this.activeTag = null;
        
        // Update category items
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('active');
        });
        
        this.renderNotes();
        this.updateFiltersBar();
    }

    setActiveTag(tagName) {
        this.activeTag = tagName;
        this.activeFilter = 'tag';
        this.activeCategory = null;
        
        // Update tag items
        document.querySelectorAll('.tag-item').forEach(item => {
            item.classList.remove('active');
        });
        
        this.renderNotes();
        this.updateFiltersBar();
    }

    setSortBy(sortBy) {
        this.sortBy = sortBy;
        this.renderNotes();
    }

    setViewMode(mode) {
        this.viewMode = mode;
        
        document.querySelectorAll('.view-toggle .btn').forEach(btn => btn.classList.remove('active'));
        
        const activeViewBtn = document.getElementById(`${mode}-view`);
        if (activeViewBtn) {
            activeViewBtn.classList.add('active');
        }
        
        const notesGrid = document.getElementById('notes-grid');
        if (notesGrid) {
            if (mode === 'list') {
                notesGrid.classList.add('list-view');
                notesGrid.classList.remove('masonry-grid');
            } else {
                notesGrid.classList.remove('list-view');
                notesGrid.classList.add('masonry-grid');
                // Update masonry layout
                setTimeout(() => this.updateMasonryLayout(), 100);
            }
        }
    }

    toggleSortMenu() {
        const menu = document.getElementById('sort-menu');
        if (menu) {
            menu.classList.toggle('hidden');
        }
    }

    updateFiltersBar() {
        const filtersBar = document.getElementById('filters-bar');
        const activeFiltersList = document.getElementById('active-filters-list');
        
        if (!filtersBar || !activeFiltersList) return;
        
        let hasFilters = false;
        activeFiltersList.innerHTML = '';
        
        if (this.searchQuery) {
            activeFiltersList.appendChild(this.createFilterTag('Search', this.searchQuery, () => this.clearSearch()));
            hasFilters = true;
        }
        
        if (this.activeCategory) {
            const category = this.categories.find(c => c.id === this.activeCategory);
            if (category) {
                activeFiltersList.appendChild(this.createFilterTag('Category', category.name, () => this.clearCategoryFilter()));
                hasFilters = true;
            }
        }
        
        if (this.activeTag) {
            activeFiltersList.appendChild(this.createFilterTag('Tag', this.activeTag, () => this.clearTagFilter()));
            hasFilters = true;
        }
        
        if (hasFilters) {
            filtersBar.classList.remove('hidden');
        } else {
            filtersBar.classList.add('hidden');
        }
    }

    createFilterTag(type, value, onRemove) {
        const tag = document.createElement('div');
        tag.className = 'filter-tag';
        tag.innerHTML = `
            <span>${type}: ${value}</span>
            <button type="button"><i data-lucide="x" width="12" height="12"></i></button>
        `;
        
        const removeBtn = tag.querySelector('button');
        if (removeBtn) {
            removeBtn.addEventListener('click', onRemove);
        }
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        return tag;
    }

    clearCategoryFilter() {
        this.activeCategory = null;
        this.setActiveFilter('all');
    }

    clearTagFilter() {
        this.activeTag = null;
        this.setActiveFilter('all');
    }

    // ===== NOTES MANAGEMENT =====
    createNote() {
        const note = {
            id: this.generateId(),
            title: '',
            content: '',
            plainText: '',
            category: null,
            tags: [],
            isPinned: false,
            isFavorite: false,
            color: '#ffffff',
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString()
        };
        
        this.currentNote = note;
        this.showNoteModal(note);
    }

    editNote(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (note) {
            this.currentNote = { ...note }; // Create a copy for editing
            this.showNoteModal(this.currentNote);
        }
    }

    async saveCurrentNote() {
        if (!this.currentNote) return;
        
        const titleInput = document.getElementById('note-title-input');
        if (!titleInput || !this.quillEditor) return;
        
        const title = titleInput.value.trim();
        const content = this.quillEditor.root.innerHTML;
        const plainText = this.quillEditor.getText().trim();
        
        if (!title && !plainText) {
            this.showToast('Note cannot be empty', 'error');
            return;
        }
        
        this.currentNote.title = title || 'Untitled';
        this.currentNote.content = content;
        this.currentNote.plainText = plainText;
        this.currentNote.modifiedAt = new Date().toISOString();
        
        // Find existing note or create new one
        const existingIndex = this.notes.findIndex(n => n.id === this.currentNote.id);
        
        if (existingIndex >= 0) {
            this.notes[existingIndex] = this.currentNote;
        } else {
            this.notes.push(this.currentNote);
        }
        
        this.saveUserData();
        this.renderNotes();
        this.updateNavigationCounts();
        this.closeNoteModal();
        
        this.showToast('Note saved successfully', 'success');
        
        // Update masonry layout
        setTimeout(() => this.updateMasonryLayout(), 100);
    }

    deleteCurrentNote() {
        if (!this.currentNote) return;
        
        if (confirm('Are you sure you want to delete this note?')) {
            this.notes = this.notes.filter(n => n.id !== this.currentNote.id);
            this.saveUserData();
            this.renderNotes();
            this.updateNavigationCounts();
            this.closeNoteModal();
            this.showToast('Note deleted', 'success');
            
            // Update masonry layout
            setTimeout(() => this.updateMasonryLayout(), 100);
        }
    }

    duplicateNote(noteId) {
        const original = this.notes.find(n => n.id === noteId);
        if (original) {
            const duplicate = {
                ...original,
                id: this.generateId(),
                title: `${original.title} (Copy)`,
                createdAt: new Date().toISOString(),
                modifiedAt: new Date().toISOString()
            };
            
            this.notes.push(duplicate);
            this.saveUserData();
            this.renderNotes();
            this.showToast('Note duplicated', 'success');
            
            // Update masonry layout
            setTimeout(() => this.updateMasonryLayout(), 100);
        }
    }

    toggleNotePinned(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (note) {
            note.isPinned = !note.isPinned;
            note.modifiedAt = new Date().toISOString();
            this.saveUserData();
            this.renderNotes();
            this.updateNavigationCounts();
        }
    }

    toggleNoteFavorite(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (note) {
            note.isFavorite = !note.isFavorite;
            note.modifiedAt = new Date().toISOString();
            this.saveUserData();
            this.renderNotes();
            this.updateNavigationCounts();
        }
    }

    // ===== NOTE RENDERING WITH MASONRY =====
    renderNotes() {
        const container = document.getElementById('notes-grid');
        const emptyState = document.getElementById('empty-state');
        
        if (!container || !emptyState) return;
        
        let filteredNotes = this.getFilteredNotes();
        
        if (filteredNotes.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        
        // Sort notes
        filteredNotes = this.sortNotes(filteredNotes);
        
        container.innerHTML = filteredNotes.map(note => this.createNoteCard(note)).join('');
        
        // Add event listeners to note cards
        container.querySelectorAll('.note-card').forEach(card => {
            const noteId = card.dataset.noteId;
            
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.note-action')) {
                    this.editNote(noteId);
                }
            });
        });
        
        // Initialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        // Update masonry layout after render
        setTimeout(() => this.updateMasonryLayout(), 50);
    }

    getFilteredNotes() {
        let filtered = [...this.notes];
        
        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(note => 
                note.title.toLowerCase().includes(this.searchQuery) ||
                note.plainText.toLowerCase().includes(this.searchQuery) ||
                note.tags.some(tag => tag.toLowerCase().includes(this.searchQuery))
            );
        }
        
        // Apply category/tag/special filters
        switch (this.activeFilter) {
            case 'pinned':
                filtered = filtered.filter(note => note.isPinned);
                break;
            case 'favorites':
                filtered = filtered.filter(note => note.isFavorite);
                break;
            case 'recent':
                filtered = filtered.filter(note => {
                    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    return new Date(note.modifiedAt) > dayAgo;
                });
                break;
            case 'category':
                if (this.activeCategory) {
                    filtered = filtered.filter(note => note.category === this.activeCategory);
                }
                break;
            case 'tag':
                if (this.activeTag) {
                    filtered = filtered.filter(note => note.tags.includes(this.activeTag));
                }
                break;
        }
        
        return filtered;
    }

    sortNotes(notes) {
        return notes.sort((a, b) => {
            switch (this.sortBy) {
                case 'dateCreated':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'dateModified':
                    return new Date(b.modifiedAt) - new Date(a.modifiedAt);
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'category':
                    const aCat = this.categories.find(c => c.id === a.category)?.name || '';
                    const bCat = this.categories.find(c => c.id === b.category)?.name || '';
                    return aCat.localeCompare(bCat);
                default:
                    return new Date(b.modifiedAt) - new Date(a.modifiedAt);
            }
        });
    }

    createNoteCard(note) {
        const category = this.categories.find(c => c.id === note.category);
        const preview = this.stripHtml(note.content);
        
        return `
            <div class="note-card ${note.isPinned ? 'pinned' : ''}" data-note-id="${note.id}">
                <div class="note-header">
                    <h3 class="note-title">${this.escapeHtml(note.title)}</h3>
                    <div class="note-actions">
                        <button class="note-action ${note.isPinned ? 'active' : ''}" 
                                onclick="app.toggleNotePinned('${note.id}')" 
                                title="Pin note">
                            <i data-lucide="pin" width="16" height="16"></i>
                        </button>
                        <button class="note-action ${note.isFavorite ? 'active' : ''}" 
                                onclick="app.toggleNoteFavorite('${note.id}')" 
                                title="Favorite">
                            <i data-lucide="heart" width="16" height="16"></i>
                        </button>
                        <button class="note-action" 
                                onclick="app.duplicateNote('${note.id}')" 
                                title="Duplicate">
                            <i data-lucide="copy" width="16" height="16"></i>
                        </button>
                    </div>
                </div>
                
                <div class="note-content">${this.escapeHtml(preview)}</div>
                
                <div class="note-footer">
                    <div class="note-metadata">
                        ${category ? `
                            <span class="note-category">
                                <span class="category-color" style="background-color: ${category.color}"></span>
                                ${category.name}
                            </span>
                        ` : ''}
                        ${note.tags.length > 0 ? `
                            <div class="note-tags">
                                ${note.tags.slice(0, 5).map(tag => `<span class="note-tag">${this.escapeHtml(tag)}</span>`).join('')}
                                ${note.tags.length > 5 ? `<span class="note-tag">+${note.tags.length - 5}</span>` : ''}
                            </div>
                        ` : ''}
                    </div>
                    <span class="note-date" title="${new Date(note.modifiedAt).toLocaleString()}">
                        ${this.formatDate(note.modifiedAt)}
                    </span>
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // ===== MODAL MANAGEMENT =====
    showNoteModal(note) {
        const modal = document.getElementById('note-modal');
        const titleInput = document.getElementById('note-title-input');
        
        if (!modal || !titleInput) return;
        
        titleInput.value = note.title;
        
        // Update editor content
        if (this.quillEditor) {
            this.quillEditor.root.innerHTML = note.content;
        }
        
        // Update metadata
        const createdEl = document.getElementById('note-created');
        const modifiedEl = document.getElementById('note-modified');
        
        if (createdEl) {
            createdEl.textContent = `Created: ${this.formatDate(note.createdAt)}`;
        }
        if (modifiedEl) {
            modifiedEl.textContent = `Modified: ${this.formatDate(note.modifiedAt)}`;
        }
        
        this.updateWordCount();
        this.updateCategoryDisplay(note.category);
        this.updateTagsDisplay(note.tags);
        
        modal.classList.remove('hidden');
        titleInput.focus();
        
        // Initialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // FIXED: Category selection functionality
    updateCategoryDisplay(categoryId) {
        const currentCategoryEl = document.getElementById('current-category');
        if (!currentCategoryEl) return;
        
        if (categoryId) {
            const category = this.categories.find(c => c.id === categoryId);
            if (category) {
                currentCategoryEl.textContent = category.name;
            } else {
                currentCategoryEl.textContent = 'No Category';
            }
        } else {
            currentCategoryEl.textContent = 'No Category';
        }
    }

    // FIXED: Tags display functionality
    updateTagsDisplay(tags) {
        const currentTagsEl = document.getElementById('current-tags');
        if (!currentTagsEl) return;
        
        if (tags && tags.length > 0) {
            currentTagsEl.textContent = `${tags.length} tag${tags.length === 1 ? '' : 's'}`;
        } else {
            currentTagsEl.textContent = 'No tags';
        }
    }

    showCategorySelectModal() {
        const modal = document.getElementById('category-select-modal');
        const listContainer = document.getElementById('category-select-list');
        
        if (!modal || !listContainer) return;
        
        // Build category selection list
        let html = `
            <div class="category-select-item no-category ${!this.currentNote.category ? 'active' : ''}" 
                 onclick="app.selectNoteCategory(null)">
                <span>No Category</span>
            </div>
        `;
        
        this.categories.forEach(category => {
            html += `
                <div class="category-select-item ${this.currentNote.category === category.id ? 'active' : ''}" 
                     onclick="app.selectNoteCategory('${category.id}')">
                    <span class="category-color" style="background-color: ${category.color}"></span>
                    <span>${this.escapeHtml(category.name)}</span>
                </div>
            `;
        });
        
        listContainer.innerHTML = html;
        modal.classList.remove('hidden');
    }

    selectNoteCategory(categoryId) {
        if (this.currentNote) {
            this.currentNote.category = categoryId;
            this.updateCategoryDisplay(categoryId);
        }
        this.closeCategorySelectModal();
    }

    closeCategorySelectModal() {
        const modal = document.getElementById('category-select-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // ===== COMPLETE TAGS MANAGEMENT SYSTEM =====
    
    // Extract all unique tags from notes
    extractAllTags() {
        this.allTags.clear();
        this.notes.forEach(note => {
            if (note.tags && Array.isArray(note.tags)) {
                note.tags.forEach(tag => this.allTags.add(tag));
            }
        });
        
        // Also add any standalone tags
        if (this.tags && Array.isArray(this.tags)) {
            this.tags.forEach(tag => this.allTags.add(tag));
        }
    }

    // Show tags management modal for current note
    showTagsModal() {
        if (!this.currentNote) return;
        
        const modal = document.getElementById('tags-modal');
        const tagInput = document.getElementById('tag-input');
        
        if (!modal || !tagInput) return;
        
        // Clear input
        tagInput.value = '';
        
        // Update displays
        this.updateCurrentTagsDisplay();
        this.updateAvailableTagsDisplay();
        
        modal.classList.remove('hidden');
        tagInput.focus();
    }

    // Update current note tags display
    updateCurrentTagsDisplay() {
        const container = document.getElementById('current-tags-display');
        if (!container || !this.currentNote) return;
        
        container.innerHTML = '';
        
        if (this.currentNote.tags && this.currentNote.tags.length > 0) {
            this.currentNote.tags.forEach(tag => {
                const tagChip = this.createTagChip(tag, true, () => this.removeTagFromNote(tag));
                container.appendChild(tagChip);
            });
        } else {
            container.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">No tags added</span>';
        }
    }

    // Update available tags display
    updateAvailableTagsDisplay() {
        const container = document.getElementById('available-tags-display');
        if (!container) return;
        
        container.innerHTML = '';
        
        const availableTags = Array.from(this.allTags).filter(tag => 
            !this.currentNote.tags || !this.currentNote.tags.includes(tag)
        );
        
        if (availableTags.length > 0) {
            availableTags.forEach(tag => {
                const tagChip = this.createTagChip(tag, false, () => this.addTagToNote(tag));
                container.appendChild(tagChip);
            });
        } else {
            container.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">No available tags</span>';
        }
    }

    // Create a tag chip element
    createTagChip(tag, removable = false, onClick = null) {
        const chip = document.createElement('div');
        chip.className = `tag-chip ${removable ? 'removable' : 'available'}`;
        
        if (removable) {
            chip.innerHTML = `
                <span>${this.escapeHtml(tag)}</span>
                <span class="tag-remove">×</span>
            `;
        } else {
            chip.innerHTML = `<span>${this.escapeHtml(tag)}</span>`;
        }
        
        if (onClick) {
            chip.addEventListener('click', onClick);
        }
        
        return chip;
    }

    // Add tag from input field
    addTagFromInput() {
        const tagInput = document.getElementById('tag-input');
        if (!tagInput) return;
        
        const input = tagInput.value.trim();
        if (!input) return;
        
        // Split by comma and add each tag
        const tags = input.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        
        tags.forEach(tag => {
            if (tag.length > 20) {
                this.showToast(`Tag "${tag}" is too long (max 20 characters)`, 'error');
                return;
            }
            this.addTagToNote(tag);
        });
        
        tagInput.value = '';
    }

    // Add tag to current note
    addTagToNote(tag) {
        if (!this.currentNote) return;
        
        if (!this.currentNote.tags) {
            this.currentNote.tags = [];
        }
        
        if (!this.currentNote.tags.includes(tag)) {
            this.currentNote.tags.push(tag);
            this.allTags.add(tag);
            this.updateCurrentTagsDisplay();
            this.updateAvailableTagsDisplay();
        }
    }

    // Remove tag from current note
    removeTagFromNote(tag) {
        if (!this.currentNote || !this.currentNote.tags) return;
        
        this.currentNote.tags = this.currentNote.tags.filter(t => t !== tag);
        this.updateCurrentTagsDisplay();
        this.updateAvailableTagsDisplay();
    }

    // Save tags and close modal
    saveTags() {
        this.updateTagsDisplay(this.currentNote.tags);
        this.closeTagsModal();
        this.showToast('Tags updated', 'success');
    }

    // Close tags modal
    closeTagsModal() {
        const modal = document.getElementById('tags-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // Show create tag modal
    showCreateTagModal() {
        const modal = document.getElementById('create-tag-modal');
        const input = document.getElementById('new-tag-input');
        
        if (!modal || !input) return;
        
        input.value = '';
        modal.classList.remove('hidden');
        input.focus();
    }

    // Save new tag
    saveCreateTag() {
        const input = document.getElementById('new-tag-input');
        if (!input) return;
        
        const tagName = input.value.trim();
        if (!tagName) {
            this.showToast('Tag name is required', 'error');
            return;
        }
        
        if (tagName.length > 20) {
            this.showToast('Tag name is too long (max 20 characters)', 'error');
            return;
        }
        
        if (this.allTags.has(tagName)) {
            this.showToast('Tag already exists', 'error');
            return;
        }
        
        this.allTags.add(tagName);
        this.saveUserData();
        this.renderTags();
        this.closeCreateTagModal();
        this.showToast('Tag created', 'success');
    }

    // Close create tag modal
    closeCreateTagModal() {
        const modal = document.getElementById('create-tag-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    closeNoteModal() {
        const modal = document.getElementById('note-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        this.currentNote = null;
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
        this.currentNote = null;
    }

    // ===== RICH TEXT EDITOR =====
    initializeQuillEditor() {
        const editorContainer = document.getElementById('note-editor');
        if (!editorContainer || typeof Quill === 'undefined') {
            console.warn('Quill editor not available, using fallback');
            this.initializeFallbackEditor();
            return;
        }
        
        const toolbarOptions = [
            ['bold', 'italic', 'underline', 'strike'],
            ['blockquote', 'code-block'],
            [{ 'header': 1 }, { 'header': 2 }],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'script': 'sub'}, { 'script': 'super' }],
            [{ 'indent': '-1'}, { 'indent': '+1' }],
            ['link'],
            ['clean']
        ];

        try {
            this.quillEditor = new Quill('#note-editor', {
                theme: 'snow',
                modules: {
                    toolbar: toolbarOptions
                },
                placeholder: 'Start writing your note...'
            });

            // Add event listeners
            this.quillEditor.on('text-change', () => {
                this.updateWordCount();
                this.scheduleAutoSave();
            });
        } catch (error) {
            console.warn('Quill initialization failed, using fallback:', error);
            this.initializeFallbackEditor();
        }
    }

    // Fallback editor for offline use
    initializeFallbackEditor() {
        const editorContainer = document.getElementById('note-editor');
        if (!editorContainer) return;
        
        editorContainer.innerHTML = `
            <div style="border: 1px solid var(--border-color); border-radius: var(--border-radius);">
                <div style="padding: 8px; border-bottom: 1px solid var(--border-color); background: var(--bg-secondary);">
                    <button type="button" onclick="document.execCommand('bold')" style="margin: 0 4px; padding: 4px 8px;">B</button>
                    <button type="button" onclick="document.execCommand('italic')" style="margin: 0 4px; padding: 4px 8px;">I</button>
                    <button type="button" onclick="document.execCommand('underline')" style="margin: 0 4px; padding: 4px 8px;">U</button>
                </div>
                <div id="fallback-editor" contenteditable="true" style="min-height: 300px; padding: 12px; outline: none;"></div>
            </div>
        `;
        
        const fallbackEditor = document.getElementById('fallback-editor');
        
        this.quillEditor = {
            root: fallbackEditor,
            getText: () => fallbackEditor.textContent || '',
            on: (event, callback) => {
                if (event === 'text-change') {
                    fallbackEditor.addEventListener('input', callback);
                }
            }
        };
        
        fallbackEditor.addEventListener('input', () => {
            this.updateWordCount();
            this.scheduleAutoSave();
        });
    }

    updateWordCount() {
        if (this.quillEditor) {
            const text = this.quillEditor.getText();
            const wordCount = this.getWordCount(text);
            const wordCountEl = document.getElementById('note-word-count');
            if (wordCountEl) {
                wordCountEl.textContent = `${wordCount} words`;
            }
        }
    }

    // ===== AUTO-SAVE =====
    setupAutoSave() {
        this.autoSaveTimeout = null;
    }

    scheduleAutoSave() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        this.autoSaveTimeout = setTimeout(() => {
            if (this.currentNote) {
                this.autoSaveCurrentNote();
            }
        }, 2000); // Auto-save after 2 seconds of inactivity
    }

    autoSaveCurrentNote() {
        if (!this.currentNote || !this.quillEditor) return;
        
        const titleInput = document.getElementById('note-title-input');
        if (!titleInput) return;
        
        const title = titleInput.value.trim();
        const content = this.quillEditor.root.innerHTML;
        const plainText = this.quillEditor.getText().trim();
        
        if (!title && !plainText) return; // Don't save empty notes
        
        this.currentNote.title = title || 'Untitled';
        this.currentNote.content = content;
        this.currentNote.plainText = plainText;
        this.currentNote.modifiedAt = new Date().toISOString();
        
        // Find existing note or create new one
        const existingIndex = this.notes.findIndex(n => n.id === this.currentNote.id);
        
        if (existingIndex >= 0) {
            this.notes[existingIndex] = this.currentNote;
        } else {
            this.notes.push(this.currentNote);
        }
        
        this.saveUserData();
        this.showToast('Auto-saved', 'success', 1000);
    }

    // ===== CATEGORIES MANAGEMENT =====
    showCategoryModal(category = null) {
        const modal = document.getElementById('category-modal');
        const title = document.getElementById('category-modal-title');
        const nameInput = document.getElementById('category-name-input');
        
        if (!modal || !title || !nameInput) return;
        
        if (category) {
            title.textContent = 'Edit Category';
            nameInput.value = category.name;
            this.selectColorOption(category.color);
        } else {
            title.textContent = 'Add Category';
            nameInput.value = '';
            this.selectColorOption('#3b82f6');
        }
        
        modal.classList.remove('hidden');
        nameInput.focus();
    }

    saveCategory() {
        const nameInput = document.getElementById('category-name-input');
        const selectedColorOption = document.querySelector('.color-option.active');
        
        if (!nameInput || !selectedColorOption) return;
        
        const name = nameInput.value.trim();
        const selectedColor = selectedColorOption.dataset.color;
        
        if (!name) {
            this.showToast('Category name is required', 'error');
            return;
        }
        
        // Check for duplicate category names
        const existingCategory = this.categories.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (existingCategory) {
            this.showToast('Category name already exists', 'error');
            return;
        }
        
        const category = {
            id: this.generateId(),
            name: name,
            color: selectedColor,
            count: 0
        };
        
        this.categories.push(category);
        this.saveUserData();
        this.renderCategories();
        this.closeCategoryModal();
        this.showToast('Category created', 'success');
    }

    closeCategoryModal() {
        const modal = document.getElementById('category-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    selectColorOption(color) {
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('active');
            if (option.dataset.color === color) {
                option.classList.add('active');
            }
        });
    }

    selectColor(element) {
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('active');
        });
        element.classList.add('active');
    }

    // FIXED: Render categories with proper counting
    renderCategories() {
        const container = document.getElementById('categories-list');
        if (!container) return;
        
        if (this.categories.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); font-style: italic; padding: 8px;">No categories yet</p>';
            return;
        }
        
        container.innerHTML = this.categories.map(category => `
            <div class="category-item ${this.activeCategory === category.id ? 'active' : ''}"
                 onclick="app.setActiveCategory('${category.id}')">
                <span class="category-color" style="background-color: ${category.color}"></span>
                <span class="category-name">${this.escapeHtml(category.name)}</span>
                <span class="category-count">${this.getCategoryCount(category.id)}</span>
            </div>
        `).join('');
    }

    getCategoryCount(categoryId) {
        return this.notes.filter(note => note.category === categoryId).length;
    }

    // FIXED: Render tags with proper counting
    renderTags() {
        const container = document.getElementById('tags-list');
        if (!container) return;
        
        const tagsArray = Array.from(this.allTags);
        
        if (tagsArray.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); font-style: italic; padding: 8px;">No tags yet</p>';
            return;
        }
        
        container.innerHTML = tagsArray.map(tag => `
            <div class="tag-item ${this.activeTag === tag ? 'active' : ''}"
                 onclick="app.setActiveTag('${tag}')">
                <span class="tag-name">#${this.escapeHtml(tag)}</span>
                <span class="tag-count">${this.getTagCount(tag)}</span>
            </div>
        `).join('');
    }

    getTagCount(tag) {
        return this.notes.filter(note => note.tags && note.tags.includes(tag)).length;
    }

    // ===== NAVIGATION COUNTS =====
    updateNavigationCounts() {
        const allCountEl = document.getElementById('all-count');
        const pinnedCountEl = document.getElementById('pinned-count');
        const favoritesCountEl = document.getElementById('favorites-count');
        const recentCountEl = document.getElementById('recent-count');
        
        if (allCountEl) allCountEl.textContent = this.notes.length;
        if (pinnedCountEl) {
            pinnedCountEl.textContent = this.notes.filter(note => note.isPinned).length;
        }
        if (favoritesCountEl) {
            favoritesCountEl.textContent = this.notes.filter(note => note.isFavorite).length;
        }
        if (recentCountEl) {
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            recentCountEl.textContent = this.notes.filter(note => new Date(note.modifiedAt) > dayAgo).length;
        }
    }

    // ===== EXPORT/IMPORT =====
    exportNotes() {
        if (this.notes.length === 0) {
            this.showToast('No notes to export', 'error');
            return;
        }
        
        const exportData = {
            notes: this.notes,
            categories: this.categories,
            tags: Array.from(this.allTags),
            exportDate: new Date().toISOString(),
            version: '2.0'
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `private-vault-export-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showToast('Notes exported successfully', 'success');
    }

    importNotes() {
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.click();
        }
    }

    handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importData = JSON.parse(e.target.result);
                
                if (importData.notes && Array.isArray(importData.notes)) {
                    const importCount = importData.notes.length;
                    
                    // Merge notes (avoid duplicates by ID)
                    importData.notes.forEach(importedNote => {
                        const existingNote = this.notes.find(n => n.id === importedNote.id);
                        if (!existingNote) {
                            this.notes.push(importedNote);
                        }
                    });
                    
                    // Merge categories if they exist
                    if (importData.categories && Array.isArray(importData.categories)) {
                        importData.categories.forEach(importedCategory => {
                            const existingCategory = this.categories.find(c => c.id === importedCategory.id);
                            if (!existingCategory) {
                                this.categories.push(importedCategory);
                            }
                        });
                    }
                    
                    // Merge tags if they exist
                    if (importData.tags && Array.isArray(importData.tags)) {
                        importData.tags.forEach(tag => this.allTags.add(tag));
                    }
                    
                    this.saveUserData();
                    this.extractAllTags();
                    this.renderNotes();
                    this.renderCategories();
                    this.renderTags();
                    this.updateNavigationCounts();
                    
                    this.showToast(`Imported ${importCount} notes successfully`, 'success');
                } else {
                    this.showToast('Invalid file format', 'error');
                }
            } catch (error) {
                console.error('Import error:', error);
                this.showToast('Error importing file', 'error');
            }
        };
        
        reader.readAsText(file);
        event.target.value = ''; // Clear file input
    }

    // ===== SETTINGS MODAL =====
    showSettingsModal() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    closeSettingsModal() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // ===== KEYBOARD SHORTCUTS =====
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when not in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.classList.contains('ql-editor')) {
                // Handle shortcuts within editor
                if (e.target.classList.contains('ql-editor')) {
                    if (e.ctrlKey || e.metaKey) {
                        switch (e.key) {
                            case 's':
                                e.preventDefault();
                                this.saveCurrentNote();
                                break;
                        }
                    }
                    if (e.key === 'Escape') {
                        this.closeNoteModal();
                    }
                }
                return;
            }
            
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'n':
                        e.preventDefault();
                        this.createNote();
                        break;
                    case 'f':
                        e.preventDefault();
                        const searchInput = document.getElementById('search-input');
                        if (searchInput) searchInput.focus();
                        break;
                    case 'e':
                        e.preventDefault();
                        this.exportNotes();
                        break;
                }
            }
            
            // Escape key to close modals
            if (e.key === 'Escape') {
                this.closeAllModals();
                
                // Close dropdowns
                document.querySelectorAll('.dropdown-menu').forEach(menu => {
                    menu.classList.add('hidden');
                });
            }
        });
    }

    // ===== BULK OPERATIONS =====
    toggleBulkSelect() {
        // Implementation for bulk selection mode
        this.showToast('Bulk select mode (coming soon)', 'info');
    }

    // ===== TOAST NOTIFICATIONS =====
    showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        
        const iconMap = {
            success: 'check-circle',
            error: 'alert-circle',
            warning: 'alert-triangle',
            info: 'info'
        };
        
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i data-lucide="${iconMap[type] || 'info'}" class="toast-icon"></i>
            <span class="toast-message">${this.escapeHtml(message)}</span>
            <button class="toast-close">
                <i data-lucide="x" width="16" height="16"></i>
            </button>
        `;
        
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                toast.remove();
            });
        }
        
        container.appendChild(toast);
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        // Auto remove toast
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, duration);
    }
}

// ===== APPLICATION INITIALIZATION =====
const app = new NotesApp();

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// ===== GLOBAL ERROR HANDLING =====
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    if (app && app.showToast) {
        app.showToast('An unexpected error occurred', 'error');
    }
});

// ===== SERVICE WORKER REGISTRATION =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}