# AYBU Medicine Phase I Schedule

A Progressive Web App (PWA) for viewing the AYBU Medicine Phase I schedule.

## Features
- **Offline Capable**: Works without internet once loaded.
- **Dual Language**: English and Turkish support.
- **Dark Mode**: Automatic system detection and manual toggle.
- **Search**: Fast client-side search for classes.
- **Special Events**: Highlights holidays, exams, and special days.
- **Dining Menu**: Integrated dining menu viewer.

## Project Structure
This project uses a standard web structure:

- `index.html`: The main application entry point (schedule view).
- `menu.html`: The standalone dining menu viewer.
- `css/`: Contains `styles.css` for custom styles.
- `js/`: Contains JavaScript modules:
  - `app.js`: Main application logic.
  - `menu.js`: Logic for the menu page.
  - `theme.js`: Shared theme management.
  - `tailwind.config.js`: Tailwind CSS configuration.
- `assets/`: Icons and static assets.
- `sw.js`: Service Worker implementation for PWA functionality.
- `schedule.xlsx`: The source data file for the schedule.

## Development
This is a static site. You can run it locally using any static file server:

```bash
# Using python
python3 -m http.server

# Using node http-server
npx http-server
```

Open `http://localhost:8000` in your browser.

## Technologies
- HTML5 / CSS3
- JavaScript (ES6+)
- [Tailwind CSS](https://tailwindcss.com) (via CDN for simplicity)
- [SheetJS](https://sheetjs.com) (for parsing Excel files)
- [FontAwesome](https://fontawesome.com) (for icons)
