import express from "express";
import cors from "cors";
import rotas from "./router/rotas.js";

const app = express();

const PORT = 3000;

// config do cors pro live server na porta 5500
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://192.168.2.115:5500'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
}));

app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({extended:true, limit: '10mb'}));

// middleware options
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Origin', 'http://localhost:5500');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.status(200).send();
        return;
    }
    next();
});

app.use("/", rotas);

app.listen(PORT, ()=>{
    console.log(`Servidor rodando na porta ${PORT}`);
});