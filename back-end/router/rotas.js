import { Router } from "express";
import db from '../db/database.js';

const rotas = Router();

// middleware que verifica se o user tá banido (middleware é conexão entre OS e os apps executados)
const verificarBanimento = async (req, res, next) => {
    let connection;
    try {
        if (req.path.includes('/admin/')) {
            return next();
        }

        const usuario_id = (req.body && req.body.usuario_id) || (req.query && req.query.usuario_id);
        
        if (!usuario_id) {
            return next();
        }

        connection = await db.getConnection();
        
        const [usuarios] = await connection.execute(
            'SELECT is_banido FROM usuario WHERE id = ?',
            [usuario_id]
        );

        if (usuarios.length > 0 && usuarios[0].is_banido) {
            return res.status(403).json({
                erro: true,
                mensagem: 'Usuário banido. Você não pode acessar este recurso.'
            });
        }

        next();
    } catch (error) {
        console.error('Erro ao verificar banimento:', error);
        next();
    } finally {
        if (connection) connection.release();
    }
};

// middleware pra verificar se user tá silenciado
const verificarSilenciado = async (req, res, next) => {
    let connection;
    try {
        if (req.path.includes('/admin/')) {
            return next();
        }

        const usuario_id = (req.body && req.body.usuario_id) || (req.query && req.query.usuario_id);
        
        if (!usuario_id) {
            return next();
        }

        connection = await db.getConnection();
        
        const [usuarios] = await connection.execute(
            'SELECT is_silenciado FROM usuario WHERE id = ?',
            [usuario_id]
        );

        if (usuarios.length > 0 && usuarios[0].is_silenciado) {
            if (req.method === 'POST' && (req.path.includes('/postagem') || req.path.includes('/comentario'))) {
                return res.status(403).json({
                    erro: true,
                    mensagem: 'Usuário silenciado. Você não pode criar posts ou comentários.'
                });
            }
        }

        next();
    } catch (error) {
        console.error('Erro ao verificar silenciado:', error);
        next();
    } finally {
        if (connection) connection.release();
    }
};

// rotas de autenticação
rotas.post('/cadastro', async (req, res) => {
    let connection;
    try {
        const { nome, email, senha } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({ 
                erro: true, 
                mensagem: 'Nome, email e senha são obrigatórios' 
            });
        }

        if (senha.length < 6) {
            return res.status(400).json({ 
                erro: true, 
                mensagem: 'Senha deve ter pelo menos 6 caracteres' 
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                erro: true,
                mensagem: 'Formato de email inválido'
            });
        }

        connection = await db.getConnection();

        const [usuariosExistente] = await connection.execute(
            'SELECT id FROM usuario WHERE email = ? OR nome = ?',
            [email, nome]
        );

        if (usuariosExistente.length > 0) {
            return res.status(409).json({ 
                erro: true, 
                mensagem: 'Email ou nome de usuário já cadastrado' 
            });
        }

        const [resultado] = await connection.execute(
            `INSERT INTO usuario (nome, email, senha) 
             VALUES (?, ?, ?)`,
            [nome, email, senha]
        );

        res.status(201).json({
            erro: false,
            mensagem: 'Usuário cadastrado com sucesso!',
            usuario: {
                id: resultado.insertId,
                nome: nome,
                email: email
            }
        });

    } catch (error) {
        console.error('Erro no cadastro:', error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                erro: true,
                mensagem: 'Email ou nome de usuário já existe'
            });
        }
        
        res.status(500).json({ 
            erro: true, 
            mensagem: 'Erro interno do servidor' 
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

rotas.post('/login', verificarBanimento, verificarSilenciado, async (req, res) => {
    let connection;
    try {
        const { email, senha } = req.body;

        connection = await db.getConnection();

        const [usuarios] = await connection.execute(
            'SELECT id, nome, email, senha, foto_perfil, bio, is_admin, is_banido, is_silenciado, data_criacao FROM usuario WHERE email = ?',
            [email]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({ 
                erro: true, 
                mensagem: 'Email ou senha incorretos' 
            });
        }

        const usuario = usuarios[0];

        if (usuario.is_banido) {
            return res.status(403).json({
                erro: true,
                mensagem: 'Usuário banido. Contate um administrador.'
            });
        }

        if (senha !== usuario.senha) {
            return res.status(401).json({ 
                erro: true, 
                mensagem: 'Email ou senha incorretos' 
            });
        }

        const isAdminBoolean = Boolean(usuario.is_admin);

        res.json({
            erro: false,
            mensagem: 'Login realizado com sucesso!',
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                foto_perfil: usuario.foto_perfil,
                bio: usuario.bio,
                is_admin: isAdminBoolean,
                is_banido: usuario.is_banido,
                is_silenciado: usuario.is_silenciado,
                data_criacao: usuario.data_criacao
            }
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ 
            erro: true, 
            mensagem: 'Erro interno do servidor' 
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// rotas de postagens
rotas.post('/postagem', verificarBanimento, verificarSilenciado, async (req, res) => {
    let connection;
    try {
        const { titulo, descricao, imagem, usuario_id } = req.body;

        if (!titulo || !descricao || !usuario_id) {
            return res.status(400).json({
                erro: true,
                mensagem: 'Título, descrição e usuário são obrigatórios'
            });
        }

        if (imagem && !imagem.startsWith('data:image/')) {
            return res.status(400).json({
                erro: true,
                mensagem: 'Formato de imagem inválido.'
            });
        }

        if (imagem) {
            console.log('Imagem recebida:', Math.round(imagem.length / 1024) + 'KB');
        }

        connection = await db.getConnection();

        const [usuarios] = await connection.execute(
            'SELECT is_silenciado FROM usuario WHERE id = ?',
            [usuario_id]
        );

        if (usuarios.length > 0 && usuarios[0].is_silenciado) {
            return res.status(403).json({
                erro: true,
                mensagem: 'Usuário silenciado. Você não pode criar posts.'
            });
        }

        const [resultado] = await connection.execute(
            `INSERT INTO postagem (titulo, descricao, imagem, usuario_id) 
             VALUES (?, ?, ?, ?)`,
            [titulo, descricao, imagem, usuario_id]
        );

        console.log('Postagem inserida no banco de dados, id:', resultado.insertId);

        const [postagens] = await connection.execute(
            `SELECT p.*, u.nome, u.foto_perfil 
             FROM postagem p 
             JOIN usuario u ON p.usuario_id = u.id 
             WHERE p.id = ?`,
            [resultado.insertId]
        );

        res.status(201).json({
            erro: false,
            mensagem: 'Postagem criada com sucesso!',
            postagem: postagens[0]
        });

    } catch (error) {
        console.error('Erro ao criar postagem:', error);
        
        if (error.code === 'ER_DATA_TOO_LONG') {
            return res.status(400).json({
                erro: true,
                mensagem: 'Imagem muito grande para o banco de dados. Por favor, use uma imagem menor.'
            });
        }
        
        res.status(500).json({
            erro: true,
            mensagem: 'Erro interno do servidor: ' + error.message
        });
    } finally {
        if (connection) {
            connection.release();
            console.log('Conexão liberada.')
        }
    }
});

rotas.get('/postagens', verificarBanimento, async (req, res) => {
    let connection;
    try {
        console.log('Conectando ao banco.');
        connection = await db.getConnection();
        console.log('Conectado ao banco.');

        const [postagens] = await connection.execute(`
            SELECT p.*, u.nome, u.foto_perfil
            FROM postagem p 
            JOIN usuario u ON p.usuario_id = u.id 
            ORDER BY p.is_fixado DESC, p.data_criacao DESC
        `);

        console.log('Postagens encontradas:', postagens.length);

        const postagensContadores = await Promise.all(
            postagens.map(async (postagem) => {
                const [likes] = await connection.execute(
                    `SELECT COUNT(*) as count FROM reacao WHERE tipo = 'postagem' AND id_objeto = ? AND tipo_reacao = 'like'`,
                    [postagem.id]
                );

                const [deslikes] = await connection.execute(
                    `SELECT COUNT(*) as count FROM reacao WHERE tipo = 'postagem' AND id_objeto = ? AND tipo_reacao = 'deslike'`,
                    [postagem.id]
                );

                const [comentarios] = await connection.execute(
                    `SELECT COUNT(*) as count FROM comentario WHERE postagem_id = ?`,
                    [postagem.id]
                );

                return {
                    ...postagem,
                    likes: likes[0].count,
                    deslikes: deslikes[0].count,
                    total_comentarios: comentarios[0].count
                };
            })
        )

        res.json({
            erro: false,
            postagens: postagensContadores
        });

    } catch (error) {
        console.error('Erro ao buscar postagens:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({
            erro: true,
            mensagem: 'Erro interno do servidor'
        });
    } finally {
        if (connection) {
            connection.release();
            console.log('Conexão liberada.')
        }
    }
});

rotas.put('/postagem/:id', verificarBanimento, async (req, res) => {
    let connection;
    try {
        const postagemId = req.params.id;
        const { titulo, descricao, imagem, usuario_id } = req.body;

        if (!titulo || !descricao || !usuario_id) {
            return res.status(400).json({
                erro: true,
                mensagem: 'Título, descrição e usuário são obrigatórios'
            });
        }

        connection = await db.getConnection();

        const [postagens] = await connection.execute(
            'SELECT usuario_id FROM postagem WHERE id = ?',
            [postagemId]
        );

        if (postagens.length === 0) {
            return res.status(404).json({
                erro: true,
                mensagem: 'Postagem não encontrada'
            });
        }

        const postagem = postagens[0];

        const [usuarios] = await connection.execute(
            'SELECT is_admin FROM usuario WHERE id = ?',
            [usuario_id]
        );

        const isAdmin = usuarios.length > 0 && usuarios[0].is_admin;
        const isDono = postagem.usuario_id === parseInt(usuario_id);

        if (!isAdmin && !isDono) {
            return res.status(403).json({
                erro: true,
                mensagem: 'Você não tem permissão para editar esta postagem'
            });
        }

        await connection.execute(
            'UPDATE postagem SET titulo = ?, descricao = ?, imagem = ? WHERE id = ?',
            [titulo, descricao, imagem, postagemId]
        );

        const [postagensAtualizadas] = await connection.execute(
            `SELECT p.*, u.nome, u.foto_perfil 
             FROM postagem p 
             JOIN usuario u ON p.usuario_id = u.id 
             WHERE p.id = ?`,
            [postagemId]
        );

        res.json({
            erro: false,
            mensagem: 'Postagem atualizada com sucesso!',
            postagem: postagensAtualizadas[0]
        });

    } catch (error) {
        console.error('Erro ao editar postagem:', error);
        res.status(500).json({
            erro: true,
            mensagem: 'Erro interno do servidor'
        });
    } finally {
        if (connection) connection.release();
    }
});

rotas.delete('/postagem/:id', verificarBanimento, async (req, res) => {
    let connection;
    try {
        const postagemId = req.params.id;
        const { usuario_id } = req.body;

        connection = await db.getConnection();

        const [postagens] = await connection.execute(
            'SELECT usuario_id FROM postagem WHERE id = ?',
            [postagemId]
        );

        if (postagens.length === 0) {
            return res.status(404).json({
                erro: true,
                mensagem: 'Postagem não encontrada'
            });
        }

        const postagem = postagens[0];

        const [usuarios] = await connection.execute(
            'SELECT is_admin FROM usuario WHERE id = ?',
            [usuario_id]
        );

        const isAdmin = usuarios.length > 0 && usuarios[0].is_admin;
        const isDono = postagem.usuario_id === parseInt(usuario_id);

        if (!isAdmin && !isDono) {
            return res.status(403).json({
                erro: true,
                mensagem: 'Você não tem permissão para excluir esta postagem'
            });
        }

        await connection.execute(
            'DELETE FROM postagem WHERE id = ?',
            [postagemId]
        );

        res.json({
            erro: false,
            mensagem: 'Postagem excluída com sucesso!'
        });

    } catch (error) {
        console.error('Erro ao excluir postagem:', error);
        res.status(500).json({
            erro: true,
            mensagem: 'Erro interno do servidor'
        });
    } finally {
        if (connection) connection.release();
    }
});

// rotas de comentários
rotas.post('/comentario', verificarBanimento, verificarSilenciado, async (req, res) => {
    let connection;
    try {
        const { conteudo, postagem_id, usuario_id } = req.body;

        if (!conteudo || !postagem_id || !usuario_id) {
            return res.status(400).json({
                erro: true,
                mensagem: 'Conteúdo, postagem e usuário são obrigatórios'
            });
        }

        connection = await db.getConnection();

        const [usuarios] = await connection.execute(
            'SELECT is_silenciado FROM usuario WHERE id = ?',
            [usuario_id]
        );

        if (usuarios.length > 0 && usuarios[0].is_silenciado) {
            return res.status(403).json({
                erro: true,
                mensagem: 'Usuário silenciado. Você não pode comentar.'
            });
        }

        const [resultado] = await connection.execute(
            'INSERT INTO comentario (conteudo, postagem_id, usuario_id) VALUES (?, ?, ?)',
            [conteudo, postagem_id, usuario_id]
        );

        res.json({
            erro: false,
            mensagem: 'Comentário adicionado com sucesso!'
        });

    } catch (error) {
        console.error('Erro ao criar comentário:', error);
        res.status(500).json({
            erro: true,
            mensagem: 'Erro interno do servidor'
        });
    } finally {
        if (connection) connection.release();
    }
});

rotas.get('/comentarios/:postagemId', verificarBanimento, async (req, res) => {
    let connection;
    try {
        const postagemId = req.params.postagemId;
        connection = await db.getConnection();

        const [comentarios] = await connection.execute(`
            SELECT c.*, u.nome, u.foto_perfil 
            FROM comentario c 
            JOIN usuario u ON c.usuario_id = u.id 
            WHERE c.postagem_id = ? 
            ORDER BY c.data_criacao ASC
        `, [postagemId]);

        res.json({
            erro: false,
            comentarios: comentarios
        });

    } catch (error) {
        console.error('Erro ao buscar comentários:', error);
        res.status(500).json({
            erro: true,
            mensagem: 'Erro interno do servidor'
        });
    } finally {
        if (connection) connection.release();
    }
});

rotas.delete('/comentario/:id', verificarBanimento, async (req, res) => {
    let connection;
    try {
        const comentarioId = req.params.id;
        const { usuario_id } = req.body;

        connection = await db.getConnection();
        const [usuarios] = await connection.execute(
            'SELECT is_admin FROM usuario WHERE id = ?',
            [usuario_id]
        );

        if (usuarios.length === 0 || !usuarios[0].is_admin) {
            return res.status(403).json({
                erro: true,
                mensagem: 'Apenas administradores podem deletar comentários'
            });
        }

        await connection.execute(
            'DELETE FROM comentario WHERE id = ?',
            [comentarioId]
        );

        res.json({
            erro: false,
            mensagem: 'Comentário deletado com sucesso!'
        });

    } catch (error) {
        console.error('Erro ao deletar comentário:', error);
        res.status(500).json({
            erro: true,
            mensagem: 'Erro interno do servidor'
        });
    } finally {
        if (connection) connection.release();
    }
});

// rotas de reações
rotas.post('/reacao', verificarBanimento, async (req, res) => {
    let connection;
    try {
        const { tipo, id_objeto, usuario_id, tipo_reacao } = req.body;

        connection = await db.getConnection();

        const [reacoes] = await connection.execute(
            'SELECT id FROM reacao WHERE tipo = ? AND id_objeto = ? AND usuario_id = ?',
            [tipo, id_objeto, usuario_id]
        );

        if (reacoes.length > 0) {
            if (tipo_reacao === 'none') {
                await connection.execute(
                    'DELETE FROM reacao WHERE id = ?',
                    [reacoes[0].id]
                );
            } else {
                await connection.execute(
                    'UPDATE reacao SET tipo_reacao = ? WHERE id = ?',
                    [tipo_reacao, reacoes[0].id]
                );
            }
        } else if (tipo_reacao !== 'none') {
            await connection.execute(
                'INSERT INTO reacao (tipo, id_objeto, usuario_id, tipo_reacao) VALUES (?, ?, ?, ?)',
                [tipo, id_objeto, usuario_id, tipo_reacao]
            );
        }

        const [likes] = await connection.execute(
            'SELECT COUNT(*) as count FROM reacao WHERE tipo = ? AND id_objeto = ? AND tipo_reacao = "like"',
            [tipo, id_objeto]
        );

        const [deslikes] = await connection.execute(
            'SELECT COUNT(*) as count FROM reacao WHERE tipo = ? AND id_objeto = ? AND tipo_reacao = "deslike"',
            [tipo, id_objeto]
        );

        res.json({
            erro: false,
            likes: likes[0].count,
            deslikes: deslikes[0].count
        });

    } catch (error) {
        console.error('Erro na reação:', error);
        res.status(500).json({
            erro: true,
            mensagem: 'Erro interno do servidor'
        });
    } finally {
        if (connection) connection.release();
    }
});

// rotas de perfil
rotas.put('/perfil', verificarBanimento, async (req, res) => {
    let connection;
    try {
        const { usuario_id, nome, email, bio, foto_perfil, senha_atual, nova_senha } = req.body;

        connection = await db.getConnection();

        const [usuariosComEmail] = await connection.execute(
            'SELECT id FROM usuario WHERE email = ? AND id != ?',
            [email, usuario_id]
        );

        if (usuariosComEmail.length > 0) {
            return res.status(409).json({
                erro: true,
                mensagem: 'Este email já está em uso por outro usuário'
            });
        }

        if (nova_senha) {
            const [usuarios] = await connection.execute(
                'SELECT senha FROM usuario WHERE id = ?',
                [usuario_id]
            );

            if (usuarios.length === 0) {
                return res.status(404).json({
                    erro: true,
                    mensagem: 'Usuário não encontrado'
                });
            }

            const usuario = usuarios[0];
            
            if (senha_atual !== usuario.senha) {
                return res.status(401).json({
                    erro: true,
                    mensagem: 'Senha atual incorreta'
                });
            }

            await connection.execute(
                'UPDATE usuario SET nome = ?, email = ?, bio = ?, foto_perfil = ?, senha = ? WHERE id = ?',
                [nome, email, bio, foto_perfil, nova_senha, usuario_id]
            );
        } else {
            await connection.execute(
                'UPDATE usuario SET nome = ?, email = ?, bio = ?, foto_perfil = ? WHERE id = ?',
                [nome, email, bio, foto_perfil, usuario_id]
            );
        }

        const [usuariosAtualizados] = await connection.execute(
            'SELECT id, nome, email, foto_perfil, bio, data_criacao FROM usuario WHERE id = ?',
            [usuario_id]
        );

        res.json({
            erro: false,
            mensagem: 'Perfil atualizado com sucesso!',
            usuario: usuariosAtualizados[0]
        });

    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(500).json({
            erro: true,
            mensagem: 'Erro interno do servidor'
        });
    } finally {
        if (connection) connection.release();
    }
});

rotas.get('/usuario/:id', async (req, res) => {
    let connection;
    try {
        const usuarioId = req.params.id;
        connection = await db.getConnection();

        const [usuarios] = await connection.execute(
            'SELECT id, nome, email, foto_perfil, bio, data_criacao FROM usuario WHERE id = ? AND is_banido = FALSE',
            [usuarioId]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                erro: true,
                mensagem: 'Usuário não encontrado'
            });
        }

        res.json({
            erro: false,
            usuario: usuarios[0]
        });

    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({
            erro: true,
            mensagem: 'Erro interno do servidor'
        });
    } finally {
        if (connection) connection.release();
    }
});

rotas.get('/usuario/:id/estatisticas', verificarBanimento, async (req, res) => {
    let connection;
    try {
        const usuarioId = req.params.id;
        connection = await db.getConnection();

        const [totalPosts] = await connection.execute(
            'SELECT COUNT(*) as count FROM postagem WHERE usuario_id = ?',
            [usuarioId]
        );

        const [totalLikes] = await connection.execute(
            `SELECT COUNT(*) as count FROM reacao r 
             JOIN postagem p ON r.id_objeto = p.id 
             WHERE r.tipo = 'postagem' AND r.tipo_reacao = 'like' AND p.usuario_id = ?`,
            [usuarioId]
        );

        const [totalComentarios] = await connection.execute(
            'SELECT COUNT(*) as count FROM comentario WHERE usuario_id = ?',
            [usuarioId]
        );

        res.json({
            erro: false,
            total_posts: totalPosts[0].count,
            total_likes: totalLikes[0].count,
            total_comentarios: totalComentarios[0].count
        });

    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({
            erro: true,
            mensagem: 'Erro interno do servidor'
        });
    } finally {
        if (connection) connection.release();
    }
});

// rotas do faq
rotas.get('/faq', verificarBanimento, async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();

        const [faq] = await connection.execute(
            'SELECT conteudo FROM faq ORDER BY id DESC LIMIT 1'
        );

        if (faq.length > 0) {
            res.json({
                erro: false,
                conteudo: faq[0].conteudo
            });
        } else {
            res.json({
                erro: false,
                conteudo: '# Bem-vindo ao FAQ\n\nEste é o conteúdo padrão do FAQ. Administradores podem editar este conteúdo.'
            });
        }

    } catch (error) {
        console.error('Erro ao buscar FAQ:', error);
        res.status(500).json({
            erro: true,
            mensagem: 'Erro interno do servidor'
        });
    } finally {
        if (connection) connection.release();
    }
});

rotas.put('/faq', async (req, res) => {
    let connection;
    try {
        const { conteudo, usuario_id } = req.body;

        connection = await db.getConnection();
        const [usuarios] = await connection.execute(
            'SELECT is_admin FROM usuario WHERE id = ?',
            [usuario_id]
        );

        if (usuarios.length === 0 || !usuarios[0].is_admin) {
            return res.status(403).json({
                erro: true,
                mensagem: 'Apenas administradores podem editar o FAQ'
            });
        }

        const [faqExistente] = await connection.execute(
            'SELECT id FROM faq ORDER BY id DESC LIMIT 1'
        );

        if (faqExistente.length > 0) {
            await connection.execute(
                'UPDATE faq SET conteudo = ?, data_atualizacao = NOW() WHERE id = ?',
                [conteudo, faqExistente[0].id]
            );
        } else {
            await connection.execute(
                'INSERT INTO faq (conteudo, usuario_id) VALUES (?, ?)',
                [conteudo, usuario_id]
            );
        }

        res.json({
            erro: false,
            mensagem: 'FAQ atualizado com sucesso!'
        });

    } catch (error) {
        console.error('Erro ao salvar FAQ:', error);
        res.status(500).json({
            erro: true,
            mensagem: 'Erro interno do servidor'
        });
    } finally {
        if (connection) connection.release();
    }
});

// rotas admin
rotas.get('/admin/usuarios', verificarBanimento, async (req, res) => {
    console.log('Rota /admin/usuarios chamada');
    let connection;
    try {
        const usuario_id = req.query.usuario_id;
        console.log('ID do admin:', usuario_id);

        if (!usuario_id) {
            return res.status(400).json({
                erro: true,
                mensagem: 'ID do administrador é obrigatório'
            });
        }

        connection = await db.getConnection();

        const [usuarios] = await connection.execute(
            'SELECT is_admin FROM usuario WHERE id = ?',
            [usuario_id]
        );

        if (usuarios.length === 0 || !usuarios[0].is_admin) {
            return res.status(403).json({
                erro: true,
                mensagem: 'Apenas administradores podem acessar esta página'
            });
        }

        const [todosUsuarios] = await connection.execute(`
            SELECT id, nome, email, foto_perfil, bio, is_admin, is_banido, is_silenciado,
                   data_criacao
            FROM usuario 
            ORDER BY data_criacao DESC
        `);

        console.log(`${todosUsuarios.length} usuários encontrados`);

        res.json({
            erro: false,
            usuarios: todosUsuarios
        });

    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({
            erro: true,
            mensagem: 'Erro interno do servidor: ' + error.message
        });
    } finally {
        if (connection) connection.release();
    }
});

rotas.post('/admin/silenciar', verificarBanimento, async (req, res) => {
    console.log('Rota silenciar chamada');
    let connection;
    try {
        const { usuario_id, admin_id, acao } = req.body;

        if (!usuario_id || !admin_id) {
            return res.status(400).json({
                erro: true,
                mensagem: 'IDs são obrigatórios'
            });
        }

        connection = await db.getConnection();
        
        const [admins] = await connection.execute(
            'SELECT is_admin FROM usuario WHERE id = ?',
            [admin_id]
        );

        if (admins.length === 0 || !admins[0].is_admin) {
            return res.status(403).json({
                erro: true,
                mensagem: 'Apenas administradores podem silenciar usuários'
            });
        }

        const is_silenciado = acao === 'silenciar';
        
        await connection.execute(
            'UPDATE usuario SET is_silenciado = ? WHERE id = ?',
            [is_silenciado, usuario_id]
        );

        res.json({
            erro: false,
            mensagem: `Usuário ${is_silenciado ? 'silenciado' : 'desilenciado'} com sucesso!`
        });

    } catch (error) {
        console.error('Erro ao silenciar usuário:', error);
        res.status(500).json({
            erro: true,
            mensagem: 'Erro interno do servidor: ' + error.message
        });
    } finally {
        if (connection) connection.release();
    }
});

rotas.post('/admin/banir', verificarBanimento, async (req, res) => {
    console.log('Rota banir chamada');
    let connection;
    try {
        const { usuario_id, admin_id, acao } = req.body;

        if (!usuario_id || !admin_id) {
            return res.status(400).json({
                erro: true,
                mensagem: 'IDs são obrigatórios'
            });
        }

        connection = await db.getConnection();
        
        const [admins] = await connection.execute(
            'SELECT is_admin FROM usuario WHERE id = ?',
            [admin_id]
        );

        if (admins.length === 0 || !admins[0].is_admin) {
            return res.status(403).json({
                erro: true,
                mensagem: 'Apenas administradores podem banir usuários'
            });
        }

        const is_banido = acao === 'banir';
        
        await connection.execute(
            'UPDATE usuario SET is_banido = ? WHERE id = ?',
            [is_banido, usuario_id]
        );

        res.json({
            erro: false,
            mensagem: `Usuário ${is_banido ? 'banido' : 'desbanido'} com sucesso!`
        });

    } catch (error) {
        console.error('Erro ao banir usuário:', error);
        res.status(500).json({
            erro: true,
            mensagem: 'Erro interno do servidor: ' + error.message
        });
    } finally {
        if (connection) connection.release();
    }
});

rotas.post('/admin/excluir', verificarBanimento, async (req, res) => {
    console.log('Rota excluir chamada');
    let connection;
    try {
        const { usuario_id, admin_id } = req.body;

        if (!usuario_id || !admin_id) {
            return res.status(400).json({
                erro: true,
                mensagem: 'IDs são obrigatórios'
            });
        }

        connection = await db.getConnection();
        
        const [admins] = await connection.execute(
            'SELECT is_admin FROM usuario WHERE id = ?',
            [admin_id]
        );

        if (admins.length === 0 || !admins[0].is_admin) {
            return res.status(403).json({
                erro: true,
                mensagem: 'Apenas administradores podem excluir usuários'
            });
        }

        if (parseInt(usuario_id) === parseInt(admin_id)) {
            return res.status(400).json({
                erro: true,
                mensagem: 'Você não pode excluir sua própria conta'
            });
        }

        await connection.execute(
            'DELETE FROM usuario WHERE id = ?',
            [usuario_id]
        );

        res.json({
            erro: false,
            mensagem: 'Usuário excluído com sucesso!'
        });

    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        res.status(500).json({
            erro: true,
            mensagem: 'Erro interno do servidor: ' + error.message
        });
    } finally {
        if (connection) connection.release();
    }
});

rotas.put('/postagem/:id/fixar', verificarBanimento, async (req, res) => {
    let connection;
    try {
        const postagemId = req.params.id;
        const { is_fixado, usuario_id } = req.body;

        connection = await db.getConnection();
        const [usuarios] = await connection.execute(
            'SELECT is_admin FROM usuario WHERE id = ?',
            [usuario_id]
        );

        if (usuarios.length === 0 || !usuarios[0].is_admin) {
            return res.status(403).json({
                erro: true,
                mensagem: 'Apenas administradores podem fixar posts'
            });
        }

        await connection.execute(
            'UPDATE postagem SET is_fixado = ? WHERE id = ?',
            [is_fixado, postagemId]
        );

        res.json({
            erro: false,
            mensagem: `Post ${is_fixado ? 'fixado' : 'desfixado'} com sucesso!`
        });

    } catch (error) {
        console.error('Erro ao fixar post:', error);
        res.status(500).json({
            erro: true,
            mensagem: 'Erro interno do servidor'
        });
    } finally {
        if (connection) connection.release();
    }
});

export default rotas;