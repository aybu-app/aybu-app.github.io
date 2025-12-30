# AYBU Medicine Phase I Schedule

A mobile-first, offline-capable schedule application for AYBU Medicine Phase I students.

## Features
- 📅 **Offline Schedule**: View your class schedule without internet access.
- 🌓 **Dark Mode**: Automatic or manual dark mode support.
- 📱 **PWA Support**: Install as a native app on iOS and Android.
- 🍽️ **Dining Menu**: View the daily cafeteria menu.
- 🔍 **Global Search**: Instantly find any class or topic in the semester.
- 🇹🇷 **Multi-language**: English and Turkish support.

## Project Structure
- `index.html`: Main HTML file.
- `css/`: Stylesheets.
- `js/`: Application logic (modularized).
- `schedule.xlsx`: The schedule data file.
- `manifest.json`: PWA configuration.
- `sw.js`: Service Worker for offline capabilities.

## Setup
1. Clone the repository.
2. Open `index.html` in a modern browser.
3. For PWA features, serve the directory via HTTPS or localhost.

## Customization
- **Schedule**: Update `schedule.xlsx` to change the timetable.
- **Theme**: Modify `js/tailwind.config.js` or `css/style.css` for visual changes.
