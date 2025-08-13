import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});


const app = express();
const port = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

db.connect();

let id;
async function getList(){
    const result=await db.query("SELECT * FROM books ORDER BY rating DESC");
    const list=result.rows;
    // console.log(list);
    return list;

};

app.get('/', async (req, res) => {
    let list=await getList();
    res.render("index.ejs", {
        name: 'Utkarsh Nandankar',
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
            await db.query("INSERT INTO books (title,rating,shortsummary,coverurl) VALUES ($1,$2,$3,$4) ;",[title,rating,shortSummary,coverUrl]);
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
        await db.query("DELETE FROM books WHERE id=($1);",[bookid]);
    } catch (error) {
        console.log(error);
    }
    res.redirect("/");
})

app.get("/book/read",async(req,res)=>{
    const bookid=id;
    // console.log(bookid);
    try {
        const details=await db.query("SELECT * FROM books WHERE id=($1);",[bookid]);
        const result=details.rows[0];
        // console.log(result);
        const list={
            id: result.id,
            title: result.title,
            rating: result.rating,
            summary: result.shortsummary,
            notes: result.notes,
            coverUrl:result.coverurl,
        }
        res.render("details.ejs",{book:list});

    } catch (error) {
        console.log(error);
    }
})

app.post("/book/read",async(req,res)=>{
    const bookid=req.body["readmore"];
    id=bookid;
    // console.log(bookid);
   res.redirect("/book/read");
})

app.post("/book/edit",async(req,res)=>{
    if(req.body["edit"]==="back"){
        res.redirect("/");
    }
    else{
        const bookid=req.body["edit"];
        const summary=req.body["summary"];
        const notes=req.body["notes"];
        try {
            await db.query("UPDATE books SET shortsummary=$1,notes=$2 WHERE id=$3;",[summary,notes,bookid]);
            res.redirect("/book/read");
            
        } catch (error) {
            console.log(error);
        }
    }
})


app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});