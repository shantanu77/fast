# Fast Scanner 🛡️

High-performance website security and speed analysis tool. Built with ❤️ by **Ashwat Singh**, a 10-year-old developer from Heritage Experiential School, Gurgaon.

## 🚀 Features

- **Live Speed Analysis**: Get real-time performance grades (A+ to F) based on load time.
- **Safety Check**: Automated security scanning for HTTPS, suspicious URL patterns, and common vulnerabilities.
- **Bug Detection**: Identifies missing meta tags, SEO issues, and HTTP errors.
- **Community Ratings**: Rate websites and view feedback from other users.
- **Live Statistics**: Real-time tracking of active users, total scans, and reviews.
- **Premium UI**: Modern, dark-themed interface with glassmorphism and smooth animations.

## 🛠️ Tech Stack

- **Frontend**: React.js, Vanilla CSS (Premium Dark Theme)
- **Backend**: Python, Flask, Flask-SQLAlchemy
- **Database**: MySQL
- **Analysis**: BeautifulSoup4, Requests

## 📦 Installation & Setup

### Prerequisites
- Python 3.8+
- Node.js & npm
- MySQL Server

### Backend Setup
1. Navigate to the `backend` directory.
2. Create a `.env` file with your database credentials:
   ```env
   MYSQL_USER=your_user
   MYSQL_PASSWORD=your_password
   MYSQL_HOST=localhost
   MYSQL_DB=fast_db
   ```
3. Install dependencies: `pip install -r requirements.txt`
4. Run the API: `python app.py`

### Frontend Setup
1. Navigate to the `frontend` directory.
2. Install dependencies: `npm install`
3. Start the dev server: `npm start`

## 🚢 Deployment

The project includes automated deployment scripts for Windows (`deploy.ps1`) and Linux (`deploy.sh`).

```powershell
./deploy.ps1
```

Live Site: [http://fast.omnihire.in](http://fast.omnihire.in)
