import express from "express";
import cors from "cors";
import rotas from "./router/rotas.js";

const app = express();

const PORT = 3000;

// config do cors pro live server na porta 5500
app.use(cors({
    origin: [
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "https://onirotalk.vercel.app",

    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
}));

app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({extended:true, limit: '10mb'}));
app.use("/", rotas);

app.listen(PORT, ()=>{
    console.log(`Servidor rodando na porta ${PORT}`);
});