                                                // creating session
import express from "express";  
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg";
import dotenv from "dotenv";

import bcrypt from "bcrypt";

import session from "express-session";
import connectPgSimple from "connect-pg-simple";


dotenv.config();

const app = express();
app.use(express.static("public"));
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));

const db = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});



db.connect()
    .then(() => console.log("Connected to DB"))
    .catch(err => console.error("DB connection error:", err));   ;

const PgSession = connectPgSimple(session);

app.use(session({
  store: new PgSession({
    pool: db,              // reuse your existing pg client
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET || "supersecret",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// Make user available in all views
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

                                                //auth page paths


const SALT_ROUNDS = 12;

// Register
app.get("/auth/register", (req, res) => {
  res.render("register.ejs");
});

app.post("/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await db.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email",
      [name, email, hashed]
    );
    req.session.user = result.rows[0];
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.redirect("/auth/register");
  }
});

// Login
app.get("/auth/login", (req, res) => {
  res.render("login.ejs");
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query("SELECT * FROM users WHERE email=$1", [email]);
    const user = result.rows[0];
    if (!user) return res.redirect("/auth/login");

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.redirect("/auth/login");

    req.session.user = { id: user.id, email: user.email, name: user.name };
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.redirect("/auth/login");
  }
});

// Logout
app.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.redirect("/");
  });
});

function ensureAuth(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/auth/login");
}



                                            //all routes (backend)


async function getList(userId){
    const result = await db.query(
        "SELECT * FROM books WHERE owner_id = $1 ORDER BY rating DESC",
        [userId]
    );
    return result.rows;
}


app.get('/', async (req, res) => {
    if (!req.session.user) {
        // if not logged in, maybe show empty list or redirect
        return res.redirect("/auth/login");
    }

    let list = await getList(req.session.user.id);

    res.render("index.ejs", {
        name: req.session.user.name,
        summary: 'A collection of books I have read and my thoughts on them.',
        books: list,
    });
});

app.post("/add",async(req,res)=>{
    res.render("new.ejs");
})

app.post("/book/add",async (req,res)=>{
    const title= req.body["title"];
    const rating=req.body["rating"];
    const shortSummary=req.body["shortSummary"];
    let input = title;
    let formatted = input.trim().toLowerCase().split(/\s+/).join('+');
    // console.log(formatted);
    try {
        const result= await axios.get("https://openlibrary.org/search.json?q="+ formatted);
        const data=result.data;
        // console.log(data);
        const key=data.docs[0].cover_i;
        // console.log(key);
        let coverUrl="https://imgs.search.brave.com/SdhzRYTF9UYs6yEGSI40WY8Q9Qb_PbUqi6naB9S2aNk/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS5pc3RvY2twaG90/by5jb20vaWQvMTE2/ODIyNzExOC9waG90/by9hbnRpcXVlLWJs/dWUtaGFyZGNvdmVy/LWJvb2sud2VicD9h/PTEmYj0xJnM9NjEy/eDYxMiZ3PTAmaz0y/MCZjPVlFY256SndV/NWFDcVlnUXFPQ0lX/MHVlckZxLTVNOTNG/cDFDWkQyY1hYdjg9";
        if(key){
            // console.log("DFsaf");
            coverUrl="https://covers.openlibrary.org/b/id/"+key+"-M.jpg";
        }
        // console.log(shortSummary);
        try {
            await db.query(
            "INSERT INTO books (title,rating,shortsummary,coverurl,owner_id) VALUES ($1,$2,$3,$4,$5)",
            [title, rating, shortSummary, coverUrl, req.session.user.id]
            );
        } catch (error) {
            console.log(error);
            res.redirect("/");
        }
        res.redirect("/");

        } catch (error) {
            console.log(error);
            res.redirect("/");
        }
    })

app.post("/book/delete",async(req,res)=>{
    const bookid=req.body["delete"];
    try {
        await db.query("DELETE FROM books WHERE id=$1 AND owner_id=$2", [bookid, req.session.user.id]);
    } catch (error) {
        console.log(error);
    }
    res.redirect("/");
})

app.get("/book/read/:id", async (req, res) => {
    const bookid = req.params.id; // dynamic for each request
    try {
        const details = await db.query("SELECT * FROM books WHERE id=$1;", [bookid]);
        const result = details.rows[0];
        const list = {
            id: result.id,
            title: result.title,
            rating: result.rating,
            summary: result.shortsummary,
            notes: result.notes,
            coverUrl: result.coverurl,
        };
        res.render("details.ejs", { book: list });
    } catch (error) {
        console.log(error);
        res.redirect("/");
    }
});


app.post("/book/edit",async(req,res)=>{
    if(req.body["edit"]==="back"){
        res.redirect("/");
    }
    else{
        const bookid=req.body["edit"];
        const summary=req.body["summary"];
        const notes=req.body["notes"];
        try {
            await db.query(
                "UPDATE books SET shortsummary=$1, notes=$2 WHERE id=$3 AND owner_id=$4",
                [summary, notes, bookid, req.session.user.id]
            );
            res.redirect(`/book/read/${bookid}`); // dynamic now


            
        } catch (error) {
            console.log(error);
        }
    }
})


app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
