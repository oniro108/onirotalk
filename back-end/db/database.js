import mysql from "mysql2/promise";

// config de conexão com o mysql
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT),
    ssl: {
        rejectUnauthorized: false
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// cria um conjunto de conexões com o bd, reutiliza conexões
const pool = mysql.createPool(dbConfig);

async function inicializarBanco() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Conectado ao banco de dados com sucesso.')
    

        //cria tabela se não existe ou verifica ela
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS usuario (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nome VARCHAR(100) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE,
                senha VARCHAR(255) NOT NULL,
                foto_perfil TEXT DEFAULT NULL,
                bio TEXT DEFAULT NULL,
                is_admin BOOLEAN DEFAULT FALSE,
                is_banido BOOLEAN DEFAULT FALSE,
                is_silenciado BOOLEAN DEFAULT FALSE,
                data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Tabela usuario verificada/criada com sucesso.');

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS postagem (
                id INT PRIMARY KEY AUTO_INCREMENT,
                titulo VARCHAR(255) NOT NULL,
                descricao TEXT NOT NULL,
                imagem LONGTEXT DEFAULT NULL,
                usuario_id INT NOT NULL,
                is_fixado BOOLEAN DEFAULT FALSE,
                data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
        )
        `);
        console.log('Tabela postagem verificada/criada com sucesso.');

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS comentario (
                id INT PRIMARY KEY AUTO_INCREMENT,
                conteudo TEXT NOT NULL,
                usuario_id INT NOT NULL,
                postagem_id INT NOT NULL,
                data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
                FOREIGN KEY (postagem_id) REFERENCES postagem(id) ON DELETE CASCADE
        )
        `);
        console.log('Tabela comentario verificada/criada com sucesso.');

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS reacao (
                id INT PRIMARY KEY AUTO_INCREMENT,
                tipo ENUM('postagem', 'comentario') NOT NULL,
                id_objeto INT NOT NULL,
                usuario_id INT NOT NULL,
                tipo_reacao ENUM('like', 'deslike') NOT NULL,
                data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
                UNIQUE KEY (tipo, id_objeto, usuario_id)
        )
        `);
        console.log('Tabela reação verificada/criada com sucesso.');

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS faq (
                id INT PRIMARY KEY AUTO_INCREMENT,
                conteudo TEXT NOT NULL,
                usuario_id INT NOT NULL,
                data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
                data_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
            )
        `);
        console.log('Tabela faq verificada/criada com sucesso.');

        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM usuario');

        if(rows[0].count === 0){
            await connection.execute(
                `INSERT INTO usuario (nome, email, senha, is_admin)
                VALUES (?, ?, ?, ?)`,
                ['oneiro', 'mezzomotheo@gmail.com', 'adminmaster', true]
            );
            console.log('Usuário admin criado com sucesso');
        }

    } catch (error) {
        console.error('Erro ao inicializar banco de dados:', error);
    } finally {
        if (connection) {
            connection.release();
        }
    }

}

// inicializa quando tudo for acabado
inicializarBanco();
// exporta a pool pra uso nas rotas
export default pool;