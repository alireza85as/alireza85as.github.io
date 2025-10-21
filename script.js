// Linux Desktop Environment JavaScript
class LinuxDesktop {
    constructor() {
        this.windows = new Map();
        this.windowZIndex = 1000;
        this.draggedWindow = null;
        this.dragOffset = { x: 0, y: 0 };
        this.bootComplete = false;
        this.currentWallpaper = 'default';
        this.notifications = [];
        this.systemStats = {
            cpu: 45,
            ram: 62,
            disk: 78
        };
        this.resizing = false;
        this.resizeHandle = null;
        
        this.init();
    }

    init() {
        this.startBootSequence();
        this.setupEventListeners();
        this.updateClock();
        this.updateSystemStats();
        setInterval(() => this.updateClock(), 1000);
        setInterval(() => this.updateSystemStats(), 3000);
        
        // Welcome notification
        setTimeout(() => {
            this.showNotification('Welcome to AliOS', 'System ready! Click desktop icons to explore.', 'success');
        }, 5000);
    }

    startBootSequence() {
        setTimeout(() => {
            document.getElementById('boot-screen').style.display = 'none';
            document.getElementById('desktop').classList.remove('hidden');
            this.bootComplete = true;
        }, 4000);
    }

    setupEventListeners() {
        // Desktop icon clicks
        document.querySelectorAll('.desktop-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                const appName = e.currentTarget.getAttribute('data-app');
                this.openApp(appName);
            });
        });

        // Start button
        document.getElementById('start-button').addEventListener('click', () => {
            this.toggleStartMenu();
        });

        // Start menu app items
        document.querySelectorAll('.app-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const appName = e.currentTarget.getAttribute('data-app');
                this.openApp(appName);
                this.hideStartMenu();
            });
        });

        // Category filtering
        document.querySelectorAll('.category').forEach(category => {
            category.addEventListener('click', (e) => {
                this.filterApps(e.currentTarget.getAttribute('data-category'));
            });
        });

        // Context menu
        document.getElementById('desktop').addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e.clientX, e.clientY);
        });

        // Hide menus when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.start-menu') && !e.target.closest('.start-button')) {
                this.hideStartMenu();
            }
            if (!e.target.closest('.context-menu')) {
                this.hideContextMenu();
            }
        });

        // Window dragging
        document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));

        // Power options
        document.querySelectorAll('.power-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const action = e.currentTarget.getAttribute('title').toLowerCase();
                this.handlePowerAction(action);
            });
        });
    }

    updateClock() {
        const now = new Date();
        const time = now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
        const date = now.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
        
        document.querySelector('.system-clock .time').textContent = time;
        document.querySelector('.system-clock .date').textContent = date;
    }

    openApp(appName) {
        if (this.windows.has(appName)) {
            this.focusWindow(appName);
            return;
        }

        const window = this.createWindow(appName);
        this.windows.set(appName, window);
        this.addToTaskbar(appName);
    }

    createWindow(appName) {
        const windowsContainer = document.getElementById('windows-container');
        const window = document.createElement('div');
        window.className = 'window';
        window.setAttribute('data-app', appName);
        window.style.zIndex = ++this.windowZIndex;
        
        // Position window with slight offset
        const offset = this.windows.size * 30;
        window.style.left = `${100 + offset}px`;
        window.style.top = `${50 + offset}px`;
        window.style.width = '600px';
        window.style.height = '400px';

        const appData = this.getAppData(appName);
        
        window.innerHTML = `
            <div class="window-header">
                <div class="window-title">
                    <i class="${appData.icon}"></i>
                    ${appData.title}
                </div>
                <div class="window-controls">
                    <div class="window-control minimize" data-action="minimize"></div>
                    <div class="window-control maximize" data-action="maximize"></div>
                    <div class="window-control close" data-action="close"></div>
                </div>
            </div>
            <div class="window-content">
                ${this.getAppContent(appName)}
            </div>
        `;

        // Window control events
        window.querySelectorAll('.window-control').forEach(control => {
            control.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = e.target.getAttribute('data-action');
                this.handleWindowControl(appName, action);
            });
        });

        // Focus window on click
        window.addEventListener('mousedown', () => {
            this.focusWindow(appName);
        });

        windowsContainer.appendChild(window);
        
        // Animate window appearance
        window.style.opacity = '0';
        window.style.transform = 'scale(0.8)';
        setTimeout(() => {
            window.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            window.style.opacity = '1';
            window.style.transform = 'scale(1)';
        }, 10);

        this.initializeAppLogic(appName, window);
        
        return window;
    }

    getAppData(appName) {
        const apps = {
            about: { icon: 'fas fa-user-circle', title: 'About Alireza' },
            portfolio: { icon: 'fas fa-folder', title: 'Portfolio' },
            terminal: { icon: 'fas fa-terminal', title: 'Terminal' },
            browser: { icon: 'fas fa-globe', title: 'Browser' },
            notes: { icon: 'fas fa-sticky-note', title: 'Notes' },
            gallery: { icon: 'fas fa-images', title: 'Gallery' },
            music: { icon: 'fas fa-music', title: 'Music Player' },
            settings: { icon: 'fas fa-cog', title: 'Settings' },
            files: { icon: 'fas fa-folder-open', title: 'File Manager' },
            calculator: { icon: 'fas fa-calculator', title: 'Calculator' },
            editor: { icon: 'fas fa-edit', title: 'Text Editor' },
            trash: { icon: 'fas fa-trash', title: 'Trash' }
        };
        return apps[appName] || { icon: 'fas fa-window', title: 'Unknown App' };
    }

    showNotification(title, message, type = 'info', duration = 5000) {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        notification.className = 'notification';
        
        const id = Date.now();
        notification.innerHTML = `
            <div class="notification-header">
                <div class="notification-title">
                    <i class="fas ${
                        type === 'success' ? 'fa-check-circle' :
                        type === 'warning' ? 'fa-exclamation-triangle' :
                        type === 'error' ? 'fa-times-circle' :
                        'fa-info-circle'
                    }"></i>
                    ${title}
                </div>
                <div class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </div>
            </div>
            <div class="notification-message">${message}</div>
        `;
        
        container.appendChild(notification);
        
        // Auto-remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideInRight 0.3s ease reverse';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
    }
    
    updateSystemStats() {
        // Simulate changing system stats
        this.systemStats.cpu = Math.max(20, Math.min(90, this.systemStats.cpu + (Math.random() - 0.5) * 10));
        this.systemStats.ram = Math.max(30, Math.min(95, this.systemStats.ram + (Math.random() - 0.5) * 8));
        this.systemStats.disk = Math.max(50, Math.min(95, this.systemStats.disk + (Math.random() - 0.5) * 2));
        
        const cpuElement = document.getElementById('cpu-usage');
        const ramElement = document.getElementById('ram-usage');
        const diskElement = document.getElementById('disk-usage');
        
        if (cpuElement) {
            cpuElement.textContent = Math.round(this.systemStats.cpu) + '%';
            cpuElement.parentElement.nextElementSibling.firstElementChild.style.width = this.systemStats.cpu + '%';
        }
        if (ramElement) {
            ramElement.textContent = Math.round(this.systemStats.ram) + '%';
            ramElement.parentElement.nextElementSibling.firstElementChild.style.width = this.systemStats.ram + '%';
        }
        if (diskElement) {
            diskElement.textContent = Math.round(this.systemStats.disk) + '%';
            diskElement.parentElement.nextElementSibling.firstElementChild.style.width = this.systemStats.disk + '%';
        }
    }
    
    changeWallpaper(wallpaperName) {
        const desktop = document.getElementById('desktop');
        
        // Remove current wallpaper class
        desktop.classList.remove('wallpaper-1', 'wallpaper-2', 'wallpaper-3', 'wallpaper-4', 'wallpaper-5');
        
        // Add new wallpaper class
        if (wallpaperName !== 'default') {
            desktop.classList.add(wallpaperName);
        }
        
        this.currentWallpaper = wallpaperName;
        this.showNotification('Wallpaper Changed', `Desktop background updated to ${wallpaperName}`, 'success', 3000);
        
        // Update wallpaper selection UI
        document.querySelectorAll('.wallpaper-option').forEach(option => {
            option.classList.remove('selected');
        });
        document.querySelector(`.wallpaper-option.${wallpaperName}`).classList.add('selected');
    }

    getAppContent(appName) {
        switch (appName) {
            case 'about':
                return `
                    <div class="app-content">
                        <h2>Alireza</h2>
                        <div style="display: flex; align-items: center; gap: 20px; margin: 20px 0;">
                            <div style="width: 80px; height: 80px; background: linear-gradient(45deg, #00d4ff, #0099cc); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem;">
                                <i class="fas fa-user"></i>
                            </div>
                            <div>
                                <h3>Senior Software Engineer</h3>
                                <p style="opacity: 0.8; margin: 5px 0;">Full-Stack Developer & Linux Enthusiast</p>
                                <p style="opacity: 0.7; font-size: 0.9rem;">📧 ali.reza@example.com</p>
                                <p style="opacity: 0.7; font-size: 0.9rem;">🌐 linkedin.com/in/alireza</p>
                            </div>
                        </div>
                        <p>Passionate about creating innovative solutions and building exceptional user experiences. Specializing in modern web technologies, system architecture, and open-source development.</p>
                        <div style="margin-top: 20px;">
                            <h4>Skills & Expertise:</h4>
                            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;">
                                <span style="background: rgba(0, 212, 255, 0.2); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">JavaScript</span>
                                <span style="background: rgba(0, 212, 255, 0.2); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">Python</span>
                                <span style="background: rgba(0, 212, 255, 0.2); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">React</span>
                                <span style="background: rgba(0, 212, 255, 0.2); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">Node.js</span>
                                <span style="background: rgba(0, 212, 255, 0.2); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">Linux</span>
                                <span style="background: rgba(0, 212, 255, 0.2); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">Docker</span>
                            </div>
                        </div>
                    </div>
                `;

            case 'portfolio':
                return `
                    <div class="app-content">
                        <h2>My Projects</h2>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-top: 20px;">
                            <div style="background: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 8px;">
                                <h3>E-Commerce Platform</h3>
                                <p style="opacity: 0.8; font-size: 0.9rem; margin: 10px 0;">A full-stack e-commerce solution built with React and Node.js</p>
                                <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                                    <span style="background: rgba(0, 212, 255, 0.3); padding: 2px 6px; border-radius: 3px; font-size: 0.7rem;">React</span>
                                    <span style="background: rgba(0, 212, 255, 0.3); padding: 2px 6px; border-radius: 3px; font-size: 0.7rem;">Node.js</span>
                                    <span style="background: rgba(0, 212, 255, 0.3); padding: 2px 6px; border-radius: 3px; font-size: 0.7rem;">MongoDB</span>
                                </div>
                            </div>
                            <div style="background: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 8px;">
                                <h3>Task Management App</h3>
                                <p style="opacity: 0.8; font-size: 0.9rem; margin: 10px 0;">Collaborative task management with real-time updates</p>
                                <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                                    <span style="background: rgba(0, 212, 255, 0.3); padding: 2px 6px; border-radius: 3px; font-size: 0.7rem;">Vue.js</span>
                                    <span style="background: rgba(0, 212, 255, 0.3); padding: 2px 6px; border-radius: 3px; font-size: 0.7rem;">Socket.io</span>
                                    <span style="background: rgba(0, 212, 255, 0.3); padding: 2px 6px; border-radius: 3px; font-size: 0.7rem;">PostgreSQL</span>
                                </div>
                            </div>
                            <div style="background: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 8px;">
                                <h3>Linux Desktop Environment</h3>
                                <p style="opacity: 0.8; font-size: 0.9rem; margin: 10px 0;">Interactive desktop simulation for web browsers</p>
                                <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                                    <span style="background: rgba(0, 212, 255, 0.3); padding: 2px 6px; border-radius: 3px; font-size: 0.7rem;">JavaScript</span>
                                    <span style="background: rgba(0, 212, 255, 0.3); padding: 2px 6px; border-radius: 3px; font-size: 0.7rem;">CSS3</span>
                                    <span style="background: rgba(0, 212, 255, 0.3); padding: 2px 6px; border-radius: 3px; font-size: 0.7rem;">HTML5</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

            case 'terminal':
                return `
                    <div class="terminal-content">
                        <div class="terminal-line">
                            <span class="terminal-prompt">alireza@aliOS:~$</span> <span class="terminal-command">whoami</span>
                        </div>
                        <div class="terminal-line terminal-output">Alireza - Senior Software Engineer</div>
                        <div class="terminal-line">
                            <span class="terminal-prompt">alireza@aliOS:~$</span> <span class="terminal-command">ls -la</span>
                        </div>
                        <div class="terminal-line terminal-output">total 42</div>
                        <div class="terminal-line terminal-output">drwxr-xr-x  5 alireza alireza  4096 Sep  3 14:30 .</div>
                        <div class="terminal-line terminal-output">drwxr-xr-x  3 root    root     4096 Sep  1 10:00 ..</div>
                        <div class="terminal-line terminal-output">-rw-r--r--  1 alireza alireza   220 Sep  1 10:00 .bash_logout</div>
                        <div class="terminal-line terminal-output">-rw-r--r--  1 alireza alireza  3771 Sep  1 10:00 .bashrc</div>
                        <div class="terminal-line terminal-output">drwxr-xr-x  2 alireza alireza  4096 Sep  3 14:30 Desktop</div>
                        <div class="terminal-line terminal-output">drwxr-xr-x  2 alireza alireza  4096 Sep  3 14:30 Documents</div>
                        <div class="terminal-line terminal-output">drwxr-xr-x  5 alireza alireza  4096 Sep  3 14:30 Projects</div>
                        <div class="terminal-line">
                            <span class="terminal-prompt">alireza@aliOS:~$</span> <span class="terminal-command">cat /etc/motd</span>
                        </div>
                        <div class="terminal-line terminal-output">Welcome to AliOS - Powered by Innovation</div>
                        <div class="terminal-line terminal-output">System uptime: 42 days, 13:37</div>
                        <div class="terminal-line terminal-output">Last login: Today at 14:30 from 192.168.1.100</div>
                        <div class="terminal-line">
                            <span class="terminal-prompt">alireza@aliOS:~$</span> <span class="terminal-command">echo "Hello, World!"</span>
                        </div>
                        <div class="terminal-line terminal-output">Hello, World!</div>
                        <div class="terminal-line">
                            <span class="terminal-prompt">alireza@aliOS:~$</span> <span style="animation: blink 1s infinite;">_</span>
                        </div>
                    </div>
                `;

            case 'browser':
                return `
                    <div class="app-content">
                        <div style="background: rgba(255, 255, 255, 0.1); padding: 10px; border-radius: 6px; margin-bottom: 15px;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                <div style="display: flex; gap: 5px;">
                                    <div style="width: 12px; height: 12px; background: #ff5f56; border-radius: 50%;"></div>
                                    <div style="width: 12px; height: 12px; background: #ffbd2e; border-radius: 50%;"></div>
                                    <div style="width: 12px; height: 12px; background: #27ca3f; border-radius: 50%;"></div>
                                </div>
                                <div style="flex: 1; background: rgba(255, 255, 255, 0.1); padding: 5px 10px; border-radius: 15px; font-size: 0.8rem;">
                                    https://alireza.dev
                                </div>
                            </div>
                        </div>
                        <div style="text-align: center; padding: 20px;">
                            <h2>Alireza Portfolio</h2>
                            <p style="margin: 20px 0; opacity: 0.8;">Welcome to my digital space</p>
                            <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
                                <a href="#" style="color: #00d4ff; text-decoration: none; padding: 8px 16px; border: 1px solid #00d4ff; border-radius: 4px;">GitHub</a>
                                <a href="#" style="color: #00d4ff; text-decoration: none; padding: 8px 16px; border: 1px solid #00d4ff; border-radius: 4px;">LinkedIn</a>
                                <a href="#" style="color: #00d4ff; text-decoration: none; padding: 8px 16px; border: 1px solid #00d4ff; border-radius: 4px;">Resume</a>
                            </div>
                        </div>
                    </div>
                `;

            case 'notes':
                return `
                    <div class="app-content">
                        <h2>Sticky Notes</h2>
                        <div style="display: grid; gap: 15px; margin-top: 20px;">
                            <div style="background: #ffeb3b; color: #333; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                                <h4 style="margin: 0 0 10px 0; color: #333;">Project Ideas 💡</h4>
                                <p style="margin: 0; font-size: 0.9rem; color: #333;">- Build a voice-controlled desktop assistant<br/>- Create an AI-powered code reviewer<br/>- Develop a real-time collaboration platform</p>
                            </div>
                            <div style="background: #4caf50; color: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                                <h4 style="margin: 0 0 10px 0;">Learning Goals 🎯</h4>
                                <p style="margin: 0; font-size: 0.9rem;">- Master Kubernetes orchestration<br/>- Explore WebAssembly possibilities<br/>- Deep dive into system design patterns</p>
                            </div>
                            <div style="background: #ff9800; color: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                                <h4 style="margin: 0 0 10px 0;">Quotes 📝</h4>
                                <p style="margin: 0; font-size: 0.9rem; font-style: italic;">"The best way to predict the future is to invent it." - Alan Kay</p>
                            </div>
                        </div>
                    </div>
                `;

            case 'gallery':
                return `
                    <div class="app-content">
                        <h2>Gallery</h2>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-top: 20px;">
                            <div style="background: linear-gradient(45deg, #667eea 0%, #764ba2 100%); aspect-ratio: 1; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-image" style="font-size: 2rem; opacity: 0.7;"></i>
                            </div>
                            <div style="background: linear-gradient(45deg, #f093fb 0%, #f5576c 100%); aspect-ratio: 1; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-mountain" style="font-size: 2rem; opacity: 0.7;"></i>
                            </div>
                            <div style="background: linear-gradient(45deg, #4facfe 0%, #00f2fe 100%); aspect-ratio: 1; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-camera" style="font-size: 2rem; opacity: 0.7;"></i>
                            </div>
                            <div style="background: linear-gradient(45deg, #43e97b 0%, #38f9d7 100%); aspect-ratio: 1; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-palette" style="font-size: 2rem; opacity: 0.7;"></i>
                            </div>
                        </div>
                        <p style="text-align: center; opacity: 0.7; margin-top: 20px; font-size: 0.9rem;">Photo collection placeholder - Click to upload images</p>
                    </div>
                `;

            case 'music':
                return `
                    <div class="app-content">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <h2>Music Player</h2>
                            <div style="width: 120px; height: 120px; background: linear-gradient(45deg, #ff6b6b, #4ecdc4); border-radius: 50%; margin: 20px auto; display: flex; align-items: center; justify-content: center; font-size: 3rem;">
                                <i class="fas fa-music"></i>
                            </div>
                            <h3 style="margin: 10px 0 5px 0;">Coding Playlist</h3>
                            <p style="opacity: 0.7; font-size: 0.9rem;">Lo-fi Hip Hop Mix</p>
                        </div>
                        <div style="display: flex; justify-content: center; gap: 15px; margin: 20px 0;">
                            <button style="background: rgba(255,255,255,0.1); border: none; color: white; padding: 8px 12px; border-radius: 50%; cursor: pointer;"><i class="fas fa-step-backward"></i></button>
                            <button style="background: #00d4ff; border: none; color: white; padding: 12px 16px; border-radius: 50%; cursor: pointer; font-size: 1.2rem;"><i class="fas fa-play"></i></button>
                            <button style="background: rgba(255,255,255,0.1); border: none; color: white; padding: 8px 12px; border-radius: 50%; cursor: pointer;"><i class="fas fa-step-forward"></i></button>
                        </div>
                        <div style="margin: 20px 0;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; opacity: 0.7;">
                                <span>2:34</span>
                                <span>4:12</span>
                            </div>
                            <div style="background: rgba(255,255,255,0.2); height: 4px; border-radius: 2px; margin: 5px 0; overflow: hidden;">
                                <div style="background: #00d4ff; height: 100%; width: 60%; border-radius: 2px;"></div>
                            </div>
                        </div>
                    </div>
                `;

            case 'settings':
                return `
                    <div class="app-content">
                        <h2>System Settings</h2>
                        <div style="margin-top: 20px;">
                            <div style="margin-bottom: 20px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                                <h4 style="margin: 0 0 15px 0;">Desktop Background</h4>
                                <div class="wallpaper-grid">
                                    <div class="wallpaper-option default selected" data-wallpaper="default" title="Default"></div>
                                    <div class="wallpaper-option wallpaper-1" data-wallpaper="wallpaper-1" title="Purple Dream"></div>
                                    <div class="wallpaper-option wallpaper-2" data-wallpaper="wallpaper-2" title="Sunset"></div>
                                    <div class="wallpaper-option wallpaper-3" data-wallpaper="wallpaper-3" title="Ocean Blue"></div>
                                    <div class="wallpaper-option wallpaper-4" data-wallpaper="wallpaper-4" title="Forest Green"></div>
                                    <div class="wallpaper-option wallpaper-5" data-wallpaper="wallpaper-5" title="Warm Gradient"></div>
                                </div>
                            </div>
                            <div style="margin-bottom: 20px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                                <h4 style="margin: 0 0 10px 0;">Appearance</h4>
                                <div style="display: flex; align-items: center; justify-content: space-between; margin: 10px 0;">
                                    <span>Dark Theme</span>
                                    <div class="toggle-switch active" data-setting="dark-theme">
                                        <div class="toggle-slider"></div>
                                    </div>
                                </div>
                                <div style="display: flex; align-items: center; justify-content: space-between; margin: 10px 0;">
                                    <span>Desktop Effects</span>
                                    <div class="toggle-switch active" data-setting="effects">
                                        <div class="toggle-slider"></div>
                                    </div>
                                </div>
                                <div style="display: flex; align-items: center; justify-content: space-between; margin: 10px 0;">
                                    <span>Show Desktop Widgets</span>
                                    <div class="toggle-switch active" data-setting="widgets">
                                        <div class="toggle-slider"></div>
                                    </div>
                                </div>
                            </div>
                            <div style="margin-bottom: 20px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                                <h4 style="margin: 0 0 10px 0;">System</h4>
                                <div style="margin: 10px 0;">
                                    <span>Language: English (US)</span>
                                </div>
                                <div style="margin: 10px 0;">
                                    <span>Timezone: UTC+0</span>
                                </div>
                                <div style="margin: 10px 0;">
                                    <span>Version: AliOS 2025.1</span>
                                </div>
                                <div style="margin: 15px 0;">
                                    <button style="background: #00d4ff; border: none; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer;" onclick="window.desktopInstance.showNotification('System Info', 'AliOS running perfectly! CPU: ${Math.round(window.desktopInstance.systemStats.cpu)}%, RAM: ${Math.round(window.desktopInstance.systemStats.ram)}%', 'info')">
                                        System Information
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

            case 'trash':
                return `
                    <div class="app-content">
                        <h2>Trash</h2>
                        <div style="text-align: center; padding: 40px 20px; opacity: 0.6;">
                            <i class="fas fa-trash" style="font-size: 4rem; margin-bottom: 20px;"></i>
                            <p>Trash is empty</p>
                            <p style="font-size: 0.8rem; margin-top: 10px;">Deleted files will appear here</p>
                        </div>
                        <div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                            <h4 style="margin: 0 0 10px 0;">Easter Egg Files 🥚</h4>
                            <div style="font-size: 0.9rem; opacity: 0.8;">
                                <div style="margin: 5px 0; cursor: pointer; padding: 5px; border-radius: 4px;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">📄 old_resume_v47.pdf</div>
                                <div style="margin: 5px 0; cursor: pointer; padding: 5px; border-radius: 4px;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">🎵 never_gonna_give_you_up.mp3</div>
                                <div style="margin: 5px 0; cursor: pointer; padding: 5px; border-radius: 4px;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">💻 hello_world.exe</div>
                                <div style="margin: 5px 0; cursor: pointer; padding: 5px; border-radius: 4px;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">🔥 mixtape_2019.wav</div>
                            </div>
                        </div>
                    </div>
                `;
                
            case 'files':
                return `
                    <div class="app-content">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 6px;">
                            <i class="fas fa-home" style="cursor: pointer; padding: 5px;"></i>
                            <i class="fas fa-chevron-right" style="opacity: 0.5; font-size: 0.7rem;"></i>
                            <span>Home</span>
                            <div style="margin-left: auto; display: flex; gap: 10px;">
                                <i class="fas fa-list" style="cursor: pointer; padding: 5px;" title="List View"></i>
                                <i class="fas fa-th-large" style="cursor: pointer; padding: 5px; color: #00d4ff;" title="Grid View"></i>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 15px;">
                            <div style="text-align: center; padding: 10px; border-radius: 8px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">
                                <i class="fas fa-folder" style="font-size: 2.5rem; color: #f39c12; margin-bottom: 8px;"></i>
                                <div style="font-size: 0.8rem;">Documents</div>
                            </div>
                            <div style="text-align: center; padding: 10px; border-radius: 8px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">
                                <i class="fas fa-folder" style="font-size: 2.5rem; color: #f39c12; margin-bottom: 8px;"></i>
                                <div style="font-size: 0.8rem;">Downloads</div>
                            </div>
                            <div style="text-align: center; padding: 10px; border-radius: 8px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">
                                <i class="fas fa-folder" style="font-size: 2.5rem; color: #f39c12; margin-bottom: 8px;"></i>
                                <div style="font-size: 0.8rem;">Pictures</div>
                            </div>
                            <div style="text-align: center; padding: 10px; border-radius: 8px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">
                                <i class="fas fa-folder" style="font-size: 2.5rem; color: #f39c12; margin-bottom: 8px;"></i>
                                <div style="font-size: 0.8rem;">Videos</div>
                            </div>
                            <div style="text-align: center; padding: 10px; border-radius: 8px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">
                                <i class="fas fa-file-alt" style="font-size: 2.5rem; color: #3498db; margin-bottom: 8px;"></i>
                                <div style="font-size: 0.8rem;">resume.pdf</div>
                            </div>
                            <div style="text-align: center; padding: 10px; border-radius: 8px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">
                                <i class="fas fa-code" style="font-size: 2.5rem; color: #e74c3c; margin-bottom: 8px;"></i>
                                <div style="font-size: 0.8rem;">portfolio.js</div>
                            </div>
                        </div>
                    </div>
                `;
                
            case 'calculator':
                return `
                    <div class="app-content">
                        <div style="background: #2c3e50; padding: 20px; border-radius: 8px;">
                            <div style="background: #1a1a1a; padding: 15px; border-radius: 4px; margin-bottom: 15px; text-align: right; font-family: monospace; font-size: 1.5rem; min-height: 40px; display: flex; align-items: center; justify-content: flex-end;" id="calc-display">0</div>
                            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
                                <button class="calc-btn" onclick="window.desktopInstance.calcClear()">C</button>
                                <button class="calc-btn" onclick="window.desktopInstance.calcOperation('/')">÷</button>
                                <button class="calc-btn" onclick="window.desktopInstance.calcOperation('*')">×</button>
                                <button class="calc-btn" onclick="window.desktopInstance.calcDelete()">⌫</button>
                                <button class="calc-btn" onclick="window.desktopInstance.calcNumber('7')">7</button>
                                <button class="calc-btn" onclick="window.desktopInstance.calcNumber('8')">8</button>
                                <button class="calc-btn" onclick="window.desktopInstance.calcNumber('9')">9</button>
                                <button class="calc-btn" onclick="window.desktopInstance.calcOperation('-')">-</button>
                                <button class="calc-btn" onclick="window.desktopInstance.calcNumber('4')">4</button>
                                <button class="calc-btn" onclick="window.desktopInstance.calcNumber('5')">5</button>
                                <button class="calc-btn" onclick="window.desktopInstance.calcNumber('6')">6</button>
                                <button class="calc-btn" onclick="window.desktopInstance.calcOperation('+')">+</button>
                                <button class="calc-btn" onclick="window.desktopInstance.calcNumber('1')">1</button>
                                <button class="calc-btn" onclick="window.desktopInstance.calcNumber('2')">2</button>
                                <button class="calc-btn" onclick="window.desktopInstance.calcNumber('3')">3</button>
                                <button class="calc-btn" style="grid-row: span 2; background: #00d4ff;" onclick="window.desktopInstance.calcEquals()">=</button>
                                <button class="calc-btn" style="grid-column: span 2;" onclick="window.desktopInstance.calcNumber('0')">0</button>
                                <button class="calc-btn" onclick="window.desktopInstance.calcNumber('.')">.</button>
                            </div>
                        </div>
                    </div>
                `;
                
            case 'editor':
                return `
                    <div class="app-content" style="height: 100%; display: flex; flex-direction: column;">
                        <div style="display: flex; gap: 10px; margin-bottom: 10px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 6px; align-items: center;">
                            <i class="fas fa-file" style="cursor: pointer; padding: 5px;" title="New File"></i>
                            <i class="fas fa-folder-open" style="cursor: pointer; padding: 5px;" title="Open File"></i>
                            <i class="fas fa-save" style="cursor: pointer; padding: 5px;" title="Save" onclick="window.desktopInstance.showNotification('File Saved', 'Document saved successfully!', 'success', 2000)"></i>
                            <div style="border-left: 1px solid rgba(255,255,255,0.2); height: 20px; margin: 0 5px;"></div>
                            <i class="fas fa-bold" style="cursor: pointer; padding: 5px;" title="Bold"></i>
                            <i class="fas fa-italic" style="cursor: pointer; padding: 5px;" title="Italic"></i>
                            <i class="fas fa-underline" style="cursor: pointer; padding: 5px;" title="Underline"></i>
                            <span style="margin-left: auto; font-size: 0.8rem; opacity: 0.7;">untitled.txt</span>
                        </div>
                        <textarea style="flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 15px; color: #ffffff; font-family: 'Courier New', monospace; font-size: 0.9rem; resize: none; outline: none;" placeholder="Start typing here...">Welcome to AliOS Text Editor!

This is a simple text editor where you can:
- Write notes and documents
- Edit code files
- Create quick memos

Enjoy writing!</textarea>
                    </div>
                `;

            default:
                return `
                    <div class="app-content">
                        <h2>Unknown Application</h2>
                        <p>This application is not yet implemented.</p>
                    </div>
                `;
        }
    }

    // Calculator functions
    calcNumber(num) {
        const display = document.getElementById('calc-display');
        if (display.textContent === '0') {
            display.textContent = num;
        } else {
            display.textContent += num;
        }
    }
    
    calcOperation(op) {
        const display = document.getElementById('calc-display');
        display.textContent += ' ' + op + ' ';
    }
    
    calcEquals() {
        const display = document.getElementById('calc-display');
        try {
            const result = eval(display.textContent.replace('×', '*').replace('÷', '/'));
            display.textContent = result;
        } catch (e) {
            display.textContent = 'Error';
        }
    }
    
    calcClear() {
        document.getElementById('calc-display').textContent = '0';
    }
    
    calcDelete() {
        const display = document.getElementById('calc-display');
        if (display.textContent.length > 1) {
            display.textContent = display.textContent.slice(0, -1);
        } else {
            display.textContent = '0';
        }
    }

    initializeAppLogic(appName, windowElement) {
        // Add specific app initialization logic here
        if (appName === 'terminal') {
            // Add blinking cursor animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        if (appName === 'music') {
            const playButton = windowElement.querySelector('.fa-play').parentElement;
            playButton.addEventListener('click', () => {
                const icon = playButton.querySelector('i');
                if (icon.classList.contains('fa-play')) {
                    icon.classList.remove('fa-play');
                    icon.classList.add('fa-pause');
                    this.showNotification('Music Player', 'Now playing: Lo-fi Hip Hop Mix', 'info', 3000);
                } else {
                    icon.classList.remove('fa-pause');
                    icon.classList.add('fa-play');
                    this.showNotification('Music Player', 'Playback paused', 'info', 2000);
                }
            });
        }
        
        if (appName === 'settings') {
            // Initialize wallpaper selection
            setTimeout(() => {
                windowElement.querySelectorAll('.wallpaper-option').forEach(option => {
                    option.addEventListener('click', (e) => {
                        const wallpaperName = e.target.getAttribute('data-wallpaper');
                        this.changeWallpaper(wallpaperName);
                    });
                });
                
                // Initialize toggle switches
                windowElement.querySelectorAll('.toggle-switch').forEach(toggle => {
                    toggle.addEventListener('click', (e) => {
                        const setting = e.currentTarget.getAttribute('data-setting');
                        e.currentTarget.classList.toggle('active');
                        
                        if (setting === 'widgets') {
                            const widgets = document.querySelector('.desktop-widgets');
                            widgets.style.display = e.currentTarget.classList.contains('active') ? 'flex' : 'none';
                            this.showNotification('Settings', `Desktop widgets ${e.currentTarget.classList.contains('active') ? 'enabled' : 'disabled'}`, 'success', 2000);
                        }
                    });
                });
            }, 100);
        }
        
        // Add resize handles to windows
        this.addResizeHandles(windowElement);
    }
    
    addResizeHandles(windowElement) {
        const handles = [
            { class: 'resize-se', cursor: 'se-resize' },
            { class: 'resize-e', cursor: 'e-resize' },
            { class: 'resize-s', cursor: 's-resize' }
        ];
        
        handles.forEach(handle => {
            const resizeHandle = document.createElement('div');
            resizeHandle.className = `window-resize-handle ${handle.class}`;
            resizeHandle.style.cursor = handle.cursor;
            
            resizeHandle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                this.startResize(e, windowElement, handle.class);
            });
            
            windowElement.appendChild(resizeHandle);
        });
    }
    
    startResize(e, windowElement, handleType) {
        this.resizing = true;
        this.resizeHandle = handleType;
        this.draggedWindow = windowElement;
        this.dragOffset = {
            x: e.clientX,
            y: e.clientY,
            width: windowElement.offsetWidth,
            height: windowElement.offsetHeight
        };
        e.preventDefault();
    }

    handleWindowControl(appName, action) {
        const window = this.windows.get(appName);
        if (!window) return;

        switch (action) {
            case 'close':
                this.closeWindow(appName);
                break;
            case 'minimize':
                this.minimizeWindow(appName);
                break;
            case 'maximize':
                this.toggleMaximizeWindow(appName);
                break;
        }
    }

    closeWindow(appName) {
        const window = this.windows.get(appName);
        if (!window) return;

        // Animate window closing
        window.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        window.style.opacity = '0';
        window.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            window.remove();
            this.windows.delete(appName);
            this.removeFromTaskbar(appName);
        }, 300);
    }

    minimizeWindow(appName) {
        const window = this.windows.get(appName);
        if (!window) return;

        window.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        window.style.opacity = '0';
        window.style.transform = 'scale(0.8) translateY(20px)';
        window.style.pointerEvents = 'none';
        
        // Update taskbar button state
        const taskbarApp = document.querySelector(`[data-app="${appName}"].taskbar-app`);
        if (taskbarApp) {
            taskbarApp.classList.remove('active');
            taskbarApp.style.opacity = '0.6';
        }
    }

    toggleMaximizeWindow(appName) {
        const window = this.windows.get(appName);
        if (!window) return;

        if (window.classList.contains('maximized')) {
            // Restore window
            window.classList.remove('maximized');
            window.style.transition = 'all 0.3s ease';
        } else {
            // Maximize window
            window.classList.add('maximized');
            window.style.transition = 'all 0.3s ease';
        }
    }

    focusWindow(appName) {
        const window = this.windows.get(appName);
        if (!window) return;

        // Restore if minimized
        window.style.opacity = '1';
        window.style.transform = window.classList.contains('maximized') ? 'none' : 'scale(1)';
        window.style.pointerEvents = 'all';
        
        // Bring to front
        window.style.zIndex = ++this.windowZIndex;
        
        // Update taskbar
        document.querySelectorAll('.taskbar-app').forEach(app => app.classList.remove('active'));
        const taskbarApp = document.querySelector(`[data-app="${appName}"].taskbar-app`);
        if (taskbarApp) {
            taskbarApp.classList.add('active');
            taskbarApp.style.opacity = '1';
        }
    }

    addToTaskbar(appName) {
        const taskbarApps = document.getElementById('taskbar-apps');
        const appData = this.getAppData(appName);
        
        const taskbarApp = document.createElement('div');
        taskbarApp.className = 'taskbar-app active';
        taskbarApp.setAttribute('data-app', appName);
        taskbarApp.innerHTML = `<i class="${appData.icon}"></i>`;
        taskbarApp.title = appData.title;
        
        taskbarApp.addEventListener('click', () => {
            if (this.windows.has(appName)) {
                const window = this.windows.get(appName);
                if (window.style.opacity === '0' || window.style.pointerEvents === 'none') {
                    this.focusWindow(appName);
                } else {
                    this.minimizeWindow(appName);
                }
            }
        });
        
        taskbarApps.appendChild(taskbarApp);
    }

    removeFromTaskbar(appName) {
        const taskbarApp = document.querySelector(`[data-app="${appName}"].taskbar-app`);
        if (taskbarApp) {
            taskbarApp.remove();
        }
    }

    handleMouseDown(e) {
        const windowHeader = e.target.closest('.window-header');
        if (!windowHeader) return;
        
        const window = windowHeader.closest('.window');
        if (!window || window.classList.contains('maximized')) return;
        
        this.draggedWindow = window;
        const rect = window.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        window.classList.add('dragging');
        e.preventDefault();
    }

    handleMouseMove(e) {
        if (!this.draggedWindow) return;
        
        if (this.resizing) {
            const deltaX = e.clientX - this.dragOffset.x;
            const deltaY = e.clientY - this.dragOffset.y;
            
            const minWidth = 300;
            const minHeight = 200;
            const maxWidth = window.innerWidth - parseInt(this.draggedWindow.style.left || 0);
            const maxHeight = window.innerHeight - parseInt(this.draggedWindow.style.top || 0) - 48;
            
            if (this.resizeHandle.includes('e')) {
                const newWidth = Math.max(minWidth, Math.min(maxWidth, this.dragOffset.width + deltaX));
                this.draggedWindow.style.width = newWidth + 'px';
            }
            
            if (this.resizeHandle.includes('s')) {
                const newHeight = Math.max(minHeight, Math.min(maxHeight, this.dragOffset.height + deltaY));
                this.draggedWindow.style.height = newHeight + 'px';
            }
        } else {
            const x = e.clientX - this.dragOffset.x;
            const y = e.clientY - this.dragOffset.y;
            
            // Keep window within bounds
            const maxX = window.innerWidth - this.draggedWindow.offsetWidth;
            const maxY = window.innerHeight - this.draggedWindow.offsetHeight - 48; // Account for taskbar
            
            this.draggedWindow.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
            this.draggedWindow.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
        }
    }

    handleMouseUp(e) {
        if (this.draggedWindow) {
            this.draggedWindow.classList.remove('dragging');
            this.draggedWindow = null;
            this.resizing = false;
            this.resizeHandle = null;
        }
    }

    toggleStartMenu() {
        const startMenu = document.getElementById('start-menu');
        startMenu.classList.toggle('hidden');
    }

    hideStartMenu() {
        document.getElementById('start-menu').classList.add('hidden');
    }

    filterApps(category) {
        document.querySelectorAll('.category').forEach(cat => cat.classList.remove('active'));
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
        
        const appItems = document.querySelectorAll('.app-item');
        appItems.forEach(item => {
            const itemCategory = item.getAttribute('data-category');
            if (category === 'all' || itemCategory === category) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    showContextMenu(x, y) {
        const contextMenu = document.getElementById('context-menu');
        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
        contextMenu.classList.remove('hidden');
    }

    hideContextMenu() {
        document.getElementById('context-menu').classList.add('hidden');
    }

    handlePowerAction(action) {
        switch (action) {
            case 'lock':
                this.showBootScreen('Locking screen...');
                break;
            case 'restart':
                this.showBootScreen('Restarting system...');
                break;
            case 'shutdown':
                document.body.innerHTML = '<div style="background: #000; color: #fff; height: 100vh; display: flex; align-items: center; justify-content: center; font-family: monospace;"><div>System halted.</div></div>';
                break;
        }
    }

    showBootScreen(message) {
        const bootScreen = document.getElementById('boot-screen');
        const bootStatus = bootScreen.querySelector('.boot-status');
        bootStatus.textContent = message;
        
        bootScreen.style.display = 'flex';
        document.getElementById('desktop').classList.add('hidden');
        
        setTimeout(() => {
            bootScreen.style.display = 'none';
            document.getElementById('desktop').classList.remove('hidden');
        }, 3000);
    }
}

// Initialize the desktop when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.desktopInstance = new LinuxDesktop();
});

// Add CSS for calculator buttons and toggle switches
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    .calc-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        padding: 15px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 1.1rem;
        transition: background 0.2s;
    }
    
    .calc-btn:hover {
        background: rgba(255, 255, 255, 0.2);
    }
    
    .calc-btn:active {
        background: rgba(255, 255, 255, 0.3);
    }
    
    .toggle-switch {
        width: 40px;
        height: 20px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 10px;
        position: relative;
        cursor: pointer;
        transition: background 0.3s;
    }
    
    .toggle-switch.active {
        background: #00d4ff;
    }
    
    .toggle-slider {
        width: 16px;
        height: 16px;
        background: white;
        border-radius: 50%;
        position: absolute;
        top: 2px;
        left: 2px;
        transition: transform 0.3s;
    }
    
    .toggle-switch.active .toggle-slider {
        transform: translateX(20px);
    }
`;
document.head.appendChild(additionalStyles);