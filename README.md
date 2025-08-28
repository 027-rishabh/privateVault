# Private Vault
### A Privacy-First Progressive Web App for Smart Note-Taking

<div align="center">
  
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://GitHub.com/Naereen/StrapDown.js/graphs/commit-activity)
[![made-with-javascript](https://img.shields.io/badge/Made%20with-JavaScript-1f425f.svg)](https://www.javascript.com)
[![PWA](https://img.shields.io/badge/PWA-enabled-5A0FC8.svg)](https://web.dev/progressive-web-apps/)
[![Offline](https://img.shields.io/badge/Offline-capable-green.svg)](https://web.dev/offline-ux-considerations/)

**[Live Demo](https://027-rishabh.github.io/privateVault/)** · **[Documentation](https://github.com/027-rishabh/privateVault/wiki)** · **[Report Bug](https://github.com/027-rishabh/privateVault/issues)** · **[Request Feature](https://github.com/027-rishabh/privateVault/issues)**

</div>

---

## Table of Contents

- [About The Project](#about-the-project)
- [Features](#features)
- [Motivation](#motivation)
- [Built With](#built-with)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Offline Support](#offline-support)
- [Screenshots](#screenshots)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)
- [Acknowledgments](#acknowledgments)

---

## About The Project

**Private Vault** is a modern, **privacy-first** Progressive Web App (PWA) designed for secure note-taking and personal knowledge management. Built with cutting-edge web technologies, it delivers a seamless experience both online and offline, ensuring your notes are always accessible and completely private.

**Live Application**: [https://027-rishabh.github.io/privateVault/](https://027-rishabh.github.io/privateVault/)

### Why Private Vault?

- **Complete Privacy**: Your data never leaves your device - no servers, no tracking, no accounts required
- **Works Everywhere**: Runs in any modern browser and installs like a native app
- **Offline-First**: Full functionality without an internet connection
- **Lightning Fast**: Instant loading and responsive interface
- **Beautiful Design**: Modern, clean interface with intuitive user experience

---

## Features

### **Rich Text Editing**
- Advanced WYSIWYG editor powered by Quill.js
- Support for formatting, lists, code blocks, and quotes
- Real-time word count and auto-save functionality

### **Smart Organization**
- **Categories**: Color-coded organization system
- **Tags**: Flexible labeling for cross-referencing
- **Search**: Lightning-fast full-text search across all notes
- **Filters**: Quick filtering by category, tags, or favorites

### **Data Management**
- **Local Storage**: All data stored securely in your browser
- **Export/Import**: Backup and transfer notes via JSON/Markdown
- **Multi-User**: Support for multiple isolated user accounts

### **User Experience**
- **Masonry Layout**: Dynamic card sizing based on content length
- **Pin & Favorite**: Mark important notes for quick access
- **Responsive Design**: Perfect on desktop, tablet, and mobile
- **Preserved Formatting**: Text displays exactly as entered with original spacing

### **Technical Excellence**
- **Progressive Web App**: Install on any device
- **Service Worker**: Robust offline functionality
- **Cache Strategy**: Intelligent resource caching
- **Performance**: Optimized for speed and efficiency

---

## Motivation

In an era where digital privacy is increasingly important, most note-taking applications require cloud accounts, sync your data to remote servers, or have limited offline capabilities. **Private Vault** was created to solve these problems:

### The Problem
- Popular apps require accounts and subscriptions
- Your personal notes are stored on company servers
- Limited or no offline functionality
- Feature restrictions behind paywalls
- Privacy concerns with data collection

### Our Solution
- **Zero Registration**: Start using immediately, no accounts needed
- **Your Device, Your Data**: Everything stays local and private
- **Full Offline Support**: Works perfectly without internet
- **Completely Free**: All features available to everyone
- **Privacy by Design**: No tracking, no analytics, no data collection

---

## Built With

### Frontend Technologies
- **HTML5** - Semantic markup and structure
- **CSS3** - Modern styling with Grid, Flexbox, and Custom Properties
- **JavaScript ES6+** - Dynamic functionality and interactivity

### Libraries & APIs
- **[Quill.js](https://quilljs.com/)** - Rich text editor
- **[Lucide Icons](https://lucide.dev/)** - Beautiful SVG icons
- **Web APIs** - LocalStorage, Service Worker, Cache API, Fetch API

### PWA Features
- **Service Worker** - Offline functionality and caching
- **Web App Manifest** - Installation and app-like experience
- **Cache API** - Intelligent resource management
- **Background Sync** - Data synchronization when online

---

## Getting Started

### Prerequisites

- Modern web browser (Chrome 88+, Firefox 85+, Safari 14+, Edge 88+)
- No additional software or accounts required!

### Installation

#### Option 1: Direct Use (Recommended)
1. **Visit the live app**: [https://027-rishabh.github.io/privateVault/](https://027-rishabh.github.io/privateVault/)
2. **Click "Install"** when prompted to add to your device
3. **Start taking notes** immediately!

#### Option 2: Local Development
```bash
# Clone the repository
git clone https://github.com/027-rishabh/privateVault.git

# Navigate to the project directory
cd privateVault

# Serve the files (using any static server)
npx serve .
# OR
python -m http.server 8080
# OR use VS Code Live Server extension

# Open your browser and navigate to localhost
```

### First Time Setup
1. **Create an account** (local only - no registration required)
2. **Choose a username and password** (stored locally on your device)
3. **Start creating notes** with the rich text editor
4. **Organize with categories and tags** for easy retrieval

---

## Usage

### Creating Your First Note
```
1. Click the "New Note" button
2. Add a title and start writing
3. Use the formatting toolbar for rich text
4. Assign categories and tags for organization
5. Your note auto-saves as you type!
```

### Organization Tips
- **Use Categories** for broad topics (Work, Personal, Ideas)
- **Use Tags** for specific themes that cross categories
- **Pin important notes** for quick access
- **Favorite frequently used notes** for easy retrieval

### Advanced Features
- **Search**: Use the search bar to find notes instantly
- **Filters**: Click category/tag items in sidebar to filter
- **Export**: Backup all your notes via Settings > Export
- **Offline**: Turn off your internet - everything still works!

---

## Offline Support

Private Vault is designed as an **offline-first** application:

### How It Works
- **Service Worker** caches all app resources
- **LocalStorage** preserves all your data
- **Cache API** manages dependencies intelligently
- **Fallback systems** ensure functionality without external resources

### Offline Capabilities
- Create, edit, and delete notes
- Search and filter existing notes
- Access all categories and tags
- Use the rich text editor
- Export data for backup
- Full app functionality maintained

### Online Benefits
- Updated app resources when available
- Import functionality for restoring backups
- Enhanced icon and resource loading

---

## Screenshots

<div align="center">

### Main Dashboard
![Dashboard](./screenshots/dashboard.png)
*Clean, organized view of all your notes with smart categorization*

### Rich Text Editor  
![Editor](./screenshots/editor.png)
*Powerful editor with formatting tools and real-time preview*

### Mobile Experience
![Mobile](./screenshots/mobile.png)
*Responsive design that works perfectly on all devices*

### Offline Mode
![Offline](./screenshots/offline.png)
*Full functionality maintained even without internet connection*

</div>

---

## Roadmap

### Phase 1: Core Features
- [x] Rich text editor with formatting
- [x] Category and tag system
- [x] Local storage and offline support
- [x] Search and filtering
- [x] Export/Import functionality
- [x] Progressive Web App features
- [x] Enhanced header distribution
- [x] Preserved text formatting (no auto-justification)

### Phase 2: Enhanced Experience
- [ ] **Dark mode** theme support
- [ ] **Advanced search** with filters and operators
- [ ] **Note templates** for common formats
- [ ] **Keyboard shortcuts** for power users
- [ ] **Advanced export options** (PDF, Word, etc.)

### Phase 3: Collaboration (Future)
- [ ] **Optional cloud sync** (with encryption)
- [ ] **Multi-device synchronization**
- [ ] **Sharing capabilities** (with privacy controls)
- [ ] **Real-time collaboration** features
- [ ] **Version history** and change tracking

### Phase 4: Advanced Features
- [ ] **Plugin system** for extensions
- [ ] **Advanced formatting** (tables, charts, etc.)
- [ ] **File attachments** (images, documents)
- [ ] **Calendar integration** for note scheduling
- [ ] **AI-powered features** (optional, privacy-first)

---

## Contributing

We love contributions! Private Vault is an open-source project, and we welcome developers of all skill levels.

### How to Contribute

1. **Fork the Project**
2. **Create your Feature Branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your Changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to the Branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

### Development Guidelines

- **Code Style**: Follow the existing code style and conventions
- **Testing**: Test your changes thoroughly before submitting
- **Documentation**: Update documentation for new features
- **Commits**: Use clear, descriptive commit messages

### Areas Where We Need Help

- **Bug Fixes** - Help us squash bugs and improve stability
- **New Features** - Implement items from our roadmap
- **Documentation** - Improve guides and documentation
- **Design** - Enhance UI/UX and visual design
- **Accessibility** - Make the app more accessible to all users
- **Testing** - Add automated tests and improve coverage

---

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### What this means:
- **Commercial use** - Use in commercial projects
- **Modification** - Modify and adapt the code
- **Distribution** - Share and distribute freely  
- **Private use** - Use for personal projects
- **Liability** - No warranty or liability provided
- **Warranty** - Software provided "as is"

---

## Contact

### Project Maintainer
**Rishabh** - [@027-rishabh](https://github.com/027-rishabh)

### Get In Touch
- **GitHub**: [027-rishabh](https://github.com/027-rishabh)

### Project Links
- **Live Application**: [https://027-rishabh.github.io/privateVault/](https://027-rishabh.github.io/privateVault/)
- **Repository**: [https://github.com/027-rishabh/privateVault](https://github.com/027-rishabh/privateVault)
- **Issues**: [https://github.com/027-rishabh/privateVault/issues](https://github.com/027-rishabh/privateVault/issues)
- **Discussions**: [https://github.com/027-rishabh/privateVault/discussions](https://github.com/027-rishabh/privateVault/discussions)

---

## Acknowledgments

### Inspiration & References
- **[Notion](https://notion.so)** - For demonstrating powerful note-taking UX
- **[Obsidian](https://obsidian.md)** - For local-first philosophy inspiration
- **[Standard Notes](https://standardnotes.org)** - For privacy-focused approach
- **[Joplin](https://joplinapp.org)** - For open-source note-taking reference

### Technologies & Libraries
- **[Quill.js](https://quilljs.com/)** - Incredible rich text editor
- **[Lucide Icons](https://lucide.dev/)** - Beautiful, consistent icon set
- **[MDN Web Docs](https://developer.mozilla.org/)** - Essential web development reference
- **[Can I Use](https://caniuse.com/)** - Browser compatibility reference

### Community & Resources
- **[PWA Builder](https://www.pwabuilder.com/)** - Progressive Web App resources
- **[Web.dev](https://web.dev/)** - Modern web development best practices
- **[Shields.io](https://shields.io/)** - Awesome README badges
- **[Best README Template](https://github.com/othneildrew/Best-README-Template)** - README structure inspiration

### Special Thanks
- **Contributors** - Everyone who has contributed code, ideas, or feedback
- **Bug Reporters** - Users who help improve the app by reporting issues
- **Feature Requesters** - Community members who suggest new features
- **Advocates** - People who share and promote the project

---

<div align="center">

### Thank you for using Private Vault!

**Built with care for privacy, productivity, and peace of mind.**

**Star this repo** if you find it helpful | **Fork it** to make it your own | **Share it** with others

[![GitHub stars](https://img.shields.io/github/stars/027-rishabh/privateVault.svg?style=social&label=Star)](https://github.com/027-rishabh/privateVault)
[![GitHub forks](https://img.shields.io/github/forks/027-rishabh/privateVault.svg?style=social&label=Fork)](https://github.com/027-rishabh/privateVault/fork)
[![Twitter](https://img.shields.io/twitter/url/https/github.com/027-rishabh/privateVault.svg?style=social)](https://twitter.com/intent/tweet?text=Check%20out%20Private%20Vault%20-%20A%20privacy-first%20note-taking%20PWA!&url=https://027-rishabh.github.io/privateVault/)

</div>
