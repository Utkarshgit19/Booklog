# BookLog
A web app to keep track of books I’ve read, with their cover images, short summaries, ratings, and personal notes.
Built using Node.js, Express, PostgreSQL, and EJS templates.

🚀 Features
Add Books: Add new books with title, short summary, cover image, rating, and personal notes.

View Books: Display all books in a card-based layout with cover images and ratings.

Read More: View detailed information about each book, including notes and summary.

Delete Books: Remove books from your collection.

Secure Storage: All data stored securely in a PostgreSQL database.

Responsive Design: Works on both desktop and mobile devices.

🛠️ Tech Stack
Frontend: HTML, CSS, EJS

Backend: Node.js, Express

Database: PostgreSQL (Neon)

Deployment: Render

🔒 Authentication

Register: Create an account with name, email, and password.

Login: Access your book collection using your credentials.

Logout: Securely log out of your account.

⚡ Notes

The app fetches book cover images automatically from the Open Library API.

In case of network issues, a default placeholder cover is used.

Data is only visible to the logged-in user.