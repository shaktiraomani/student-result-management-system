# Gyan Ganga Vidhya Mandir - Mark & Result Portal

A comprehensive **Mark Management and Result System** developed for educational institutions. This web application allows Admins to manage school data, Teachers to enter marks and attendance, and Students to view and print their report cards instantly.

Developed by **Aapbiti News by SRM**.

![Project Preview](https://via.placeholder.com/800x400?text=Result+Portal+Preview)

## 🚀 Features

### 🎓 Student Portal
- **Instant Result Access**: Students can check results using Class and Roll Number.
- **Downloadable Report Cards**: Generate and print professional report cards (PDF format).
- **Responsive Design**: Works seamlessly on mobile and desktop.

### 👩‍🏫 Teacher Portal
- **Secure Login**: Individual teacher profiles.
- **Class & Subject Management**: View assigned classes and manage specific subjects.
- **Marks Entry**: Easy-to-use interface for entering Theory and Internal Assessment marks.
- **Attendance Management**: Input total working days and present days.
- **AI-Powered Remarks**: Generate personalized, encouraging remarks for students using **Google Gemini AI**.
- **Bulk Printing**: Generate report cards for the entire class in one click.

### 🛠 Admin Portal
- **Dashboard Overview**: Statistics on students, teachers, and subjects.
- **Student Management**: Add, Edit, Delete students. **Bulk Upload via CSV supported**.
- **Teacher Management**: Create teacher accounts and assign classes via checkboxes.
- **Subject Management**: Define subjects, max marks (Theory/IA) for specific classes.
- **School Configuration**: Update school name, logo, address, and session year.
- **Template Customization**: Choose from 5 different Report Card designs (Classic, Modern, Professional, Elegant, Corporate) and customize colors/fonts.

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Vite (configured for single-file output)
- **AI Integration**: Google GenAI SDK (Gemini 2.5 Flash)
- **Backend & Database**: Google Apps Script (GAS) & Google Sheets

---

## ⚙️ Installation & Local Development

To run this project locally for development purposes (using volatile RAM storage):

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/gyan-ganga-portal.git
    cd gyan-ganga-portal
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables**
    Create a `.env` file in the root directory and add your Google Gemini API Key:
    ```env
    VITE_GEMINI_API_KEY=your_google_genai_api_key_here
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```
    The app will open at `http://localhost:5173`.
    *Note: In local mode, data is stored in RAM and will be lost on refresh.*

---

## ☁️ Deployment (Google Apps Script)

This project is designed to be hosted entirely on **Google Drive/Sheets** for free.

### Step 1: Build the Project
Run the build command. This uses a custom Vite plugin to inline all CSS and JS into a single HTML file.
```bash
npm run build
```
*Output file: `dist/index.html`*

### Step 2: Google Sheets Setup
1.  Create a new **Google Sheet**.
2.  Go to **Extensions** > **Apps Script**.
3.  Rename the project (e.g., "Result Portal").

### Step 3: Server Code
1.  Open `Code.gs` in the Apps Script editor.
2.  Copy the content of `google-apps-script.js` from this repository and paste it into `Code.gs`.
3.  Save the file (Ctrl+S).

### Step 4: Client Code
1.  Create a new HTML file in Apps Script named `Index.html`.
2.  Open `dist/index.html` on your computer, copy **all** the content, and paste it into the `Index.html` file in Apps Script.
3.  **Important**: Find where `GoogleGenAI` is initialized in the code (search for `new GoogleGenAI`) and ensure your API Key is passed correctly if environment variables aren't preserved in the build.

### Step 5: Deploy
1.  Click **Deploy** > **New deployment**.
2.  Select type: **Web app**.
3.  Description: "Initial Deploy".
4.  Execute as: **Me**.
5.  Who has access: **Anyone** (or "Anyone with Google account" based on your preference).
6.  Click **Deploy** and authorize permissions.
7.  Copy the **Web App URL**. This is your live portal link!

---

## 📂 CSV Format for Bulk Upload

When uploading students via CSV, use the following column order (headers are optional but recommended):

`SR No, Roll No, Name, Father Name, Mother Name, Class Name, Mobile, DOB, Address`

**Example:**
```csv
2024001, 101, Amit Sharma, Rajesh Sharma, Sunita Sharma, Class 10, 9876543210, 2008-05-12, Delhi
```

---

## 📄 License

This project is licensed under the MIT License.

**Developed with ❤️ by Aapbiti News by SRM**
