// variaveisglobais
let usuarioLogado = null;
let postagens = [];
let postagemEditando = null;
let imagemEditando = null;
let comentariosVisiveis = {};
let comentarios = {};
let postagemAtualComentario = null;
let imagemSelecionada = null;
let resultadosBusca = [];
let buscaAtiva = false;
let filtrosAtuais = {
    termo: '',
    tipo: 'todos',
    ordenacao: 'recentes',
    apenasFixados: false,
    comImagens: false,
    periodo: 'todos'
};

// inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado, iniciando.')
    carregarUsuario();

    const postsContainer = document.getElementById('posts-container');
    if (postsContainer) {
        console.log('Página index, carregando posts.');
        carregarPostagens();

        const modalPost = document.getElementById('modalPost');
        const formPost = document.getElementById('formPost');

        if (modalPost && formPost) {
            console.log('Configurando modal de postagem.');
            formPost.addEventListener('submit', criarPostagem);

            window.addEventListener('click', function(event) {
                if (event.target === modalPost) {
                    fecharModalPost();
                }
            });

            const inputImagem = document.getElementById('postImagem');
            if (inputImagem) {
                console.log('Configurando input de imagem.');
                inputImagem.addEventListener('change', function(e) {
                    const file = e.target.files[0];
                    if (file) {
                        const tamanhoMaximo = 5 * 1024 * 1024;
                        if (file.size > tamanhoMaximo) {
                            alert('A imagem é muito grande. Por favor, selecione uma imagem menor que 5MB.');
                            inputImagem.value = '';
                            return;
                        }
                        
                        const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                        if (!tiposPermitidos.includes(file.type)) {
                            alert('Por favor, selecione apenas imagens nos formatos JPG, PNG, GIF ou WebP.');
                            inputImagem.value = '';
                            return;
                        }
                        
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            imagemSelecionada = e.target.result;
                            document.getElementById('previewImg').src = imagemSelecionada;
                            document.getElementById('imagemPreview').style.display = 'block';
                            
                            console.log('Imagem de', Math.round(file.size / 1024), 'KB aceita com sucesso!');
                        };
                        
                        reader.onerror = function() {
                            alert('Erro ao ler a imagem. Tente novamente.');
                            inputImagem.value = '';
                        };
                        
                        reader.readAsDataURL(file);
                    }
                });
            }
        } else {
            console.log('Modal ou form de postagem não encontrados');
        }

        const formComentario = document.getElementById('formComentario');
        if (formComentario) {
            console.log('Configurando formulário de comentários.');
            formComentario.addEventListener('submit', async function(event) {
                event.preventDefault();
                
                if (!postagemAtualComentario || !usuarioLogado) return;

                const conteudo = document.getElementById('comentarioConteudo').value;

                try {
                    const response = await fetch('https://onirotalk-backend.onrender.com/comentario', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            conteudo,
                            postagem_id: postagemAtualComentario,
                            usuario_id: usuarioLogado.id
                        })
                    });

                    const data = await response.json();
                    
                    if (data.erro) {
                        alert('Erro ao comentar: ' + data.mensagem);
                        return;
                    }

                    fecharModalComentario();
                    
                    const container = document.getElementById(`comentarios-${postagemAtualComentario}`);
                    if (container && container.style.display !== 'none') {
                        carregarComentarios(postagemAtualComentario);
                    }

                    alert('Comentário adicionado com sucesso!');
                    
                } catch (error) {
                    console.error('Erro ao comentar:', error);
                    alert('Erro ao adicionar comentário');
                }
            });
        } else {
            console.log('Formulário de comentários não encontrado');
        }

        const formEditarPost = document.getElementById('formEditarPost');
        if (formEditarPost) {
            console.log('Configurando formulário de edição.');
            formEditarPost.addEventListener('submit', async function(event) {
                event.preventDefault();
                
                if (!postagemEditando || !usuarioLogado) return;

                const titulo = document.getElementById('editarTitulo').value;
                const descricao = document.getElementById('editarDescricao').value;
                const imagem = imagemSelecionada || imagemEditando;

                try {
                    const response = await fetch(`https://onirotalk-backend.onrender.com/postagem/${postagemEditando}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            titulo,
                            descricao,
                            imagem: imagem,
                            usuario_id: usuarioLogado.id
                        })
                    });

                    const data = await response.json();
                    
                    if (data.erro) {
                        alert('Erro: ' + data.mensagem);
                        return;
                    }

                    const index = postagens.findIndex(p => p.id === postagemEditando);
                    if (index !== -1) {
                        postagens[index] = data.postagem;
                    }

                    alert('Postagem atualizada com sucesso!');
                    renderizarPostagens();
                    fecharModalEditarPost();
                    
                } catch (error) {
                    console.error('Erro ao editar postagem:', error);
                    alert('Erro ao editar postagem');
                }
            });
        }
    } else {
        console.log('Não é página index, ignorando funções de posts');
    }
});

function removerImagem() {
    if (postagemEditando) {
        imagemEditando = null;
    }
    
    imagemSelecionada = null;
    const inputImagem = document.getElementById('postImagem');
    const imagemPreview = document.getElementById('imagemPreview');
    
    if (inputImagem) {
        inputImagem.value = '';
    }
    if (imagemPreview) {
        imagemPreview.style.display = 'none';
    }
}

function removerImagemEdicao() {
    imagemSelecionada = null;
    imagemEditando = null;
    document.getElementById('editarImagem').value = '';
    document.getElementById('editarImagemPreview').style.display = 'none';
    document.getElementById('imagemAtualContainer').innerHTML = '<p>Imagem será removida</p>';
}

function carregarUsuario() {
    const usuarioSalvo = localStorage.getItem('usuario');
    console.log('localStorage usuario:', usuarioSalvo);

    if (usuarioSalvo) {
        usuarioLogado = JSON.parse(usuarioSalvo);
        console.log('Usuário logado:', usuarioLogado)
        atualizarInterfaceUsuario();
        return true;
    } else {
        console.log('Usuário não logado - modo convidado');
        mostrarModoConvidado();
        return false;
    }
}

function mostrarModoConvidado() {
    const userName = document.querySelector('.user-name');
    const onlineStatus = document.querySelector('.online-status');
    
    userName.textContent = 'Convidado';
    onlineStatus.textContent = 'Offline';
    onlineStatus.style.color = '#e74c3c';
    
    const addPostButton = document.querySelector('.add-post');
    if (usuarioLogado) {
        addPostButton.style.display = 'flex';
    } else {
        addPostButton.style.display = 'none';
    }

    const postsContainer = document.getElementById('posts-container');
    postsContainer.innerHTML = `
        <div class="guest-message">
            <h3>Bem-vindo ao Onirotalk!</h3>
            <p>Faça <a href="../pages/login.html" style="color: #3498db;">login</a> ou <a href="../pages/cadastro.html" style="color: #3498db;">cadastre-se</a> para interagir com a comunidade.</p>
            <div class="posts-guest">
            </div>
        </div>
    `;
    
    carregarPostagensConvidados();
}

async function carregarPostagens() {
    const container = document.getElementById('posts-container');
    
    if (!container) {
        console.log('Não está na página index, ignorando carregamento de posts');
        return;
    }

    try {
        console.log('Buscando postagens.');
        const response = await fetch('https://onirotalk-backend.onrender.com/postagens');
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Resposta da API:', data);
        
        if (data.erro) {
            console.error('Erro ao carregar postagens:', data.mensagem);
            container.innerHTML = '<div class="error">Erro ao carregar postagens</div>';
            return;
        }
        
        postagens = data.postagens;
        console.log(`${postagens.length} postagens carregadas`);
        renderizarPostagens();
        
    } catch (error) {
        console.error('Erro ao carregar postagens:', error);
        if (container) {
            container.innerHTML = `
                <div class="error">
                    Erro ao carregar postagens: ${error.message}
                    <br><small>Verifique se o servidor está rodando na porta 3000</small>
                </div>
            `;
        }
    }
}

async function carregarPostagensConvidados() {
    try {
        const response = await fetch('https://onirotalk-backend.onrender.com/postagens');
        const data = await response.json();
        
        if (!data.erro) {
            const container = document.querySelector('.posts-guest');
            container.innerHTML = data.postagens.map(postagem => `
                <div class="post guest-post">
                    <div class="post-header">
                    <div class="user-info" onclick="abrirPerfilUsuario(${postagem.usuario_id})" style="cursor: pointer;">
                    </div>
                    
                    <div class="post-content">
                        <h3>${postagem.titulo}</h3>
                        <p>${postagem.descricao}</p>
                        ${postagem.imagem ? `<img src="${postagem.imagem}" class="post-image" alt="Imagem do post">` : ''}
                    </div>
                    
                    <div class="post-stats">
                        <span>${postagem.likes || 0} 👍</span>
                        <span>${postagem.deslikes || 0} 👎</span>
                        <span>${postagem.total_comentarios || 0} 💬</span>
                    </div>
                    
                    <div class="post-actions">
                        <button class="btn-action disabled" onclick="alert('Faça login para interagir!')">
                            👍 Like (${postagem.likes || 0})
                        </button>
                        <button class="btn-action disabled" onclick="alert('Faça login para interagir!')">
                            👎 Deslike (${postagem.deslikes || 0})
                        </button>
                        <button class="btn-action disabled" onclick="alert('Faça login para interagir!')">
                            💬 Comentar
                        </button>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Erro ao carregar posts para convidado:', error);
    }
}

async function carregarComentarios(postagemId) {
    try {
        const response = await fetch(`https://onirotalk-backend.onrender.com/comentarios/${postagemId}`);
        const data = await response.json();
        
        if (!data.erro) {
            comentarios[postagemId] = data.comentarios;
            renderizarComentarios(postagemId);
        }
    } catch (error) {
        console.error('Erro ao carregar comentários:', error);
    }
}

function renderizarComentarios(postagemId) {
    const container = document.getElementById(`comentarios-${postagemId}`);
    if (!container) return;

    const comentariosLista = container.querySelector('.comentarios-lista');
    const comentariosData = comentarios[postagemId] || [];

    if (comentariosData.length === 0) {
        comentariosLista.innerHTML = '<p class="no-comments">Nada por aqui!</p>';
        return;
    }

    comentariosLista.innerHTML = comentariosData.map(comentario => `
        <div class="comentario-item" data-comentario-id="${comentario.id}">
            <div class="comentario-header">
                <div class="comentario-avatar" onclick="abrirPerfilUsuario(${comentario.usuario_id})" style="cursor: pointer; background-color: #${comentario.usuario_id.toString().padStart(6, '0')}">
                    ${comentario.foto_perfil ? `<img src="${comentario.foto_perfil}" alt="${comentario.nome}">` : comentario.nome.charAt(0).toUpperCase()}
                </div>
                <span class="comentario-author" onclick="abrirPerfilUsuario(${comentario.usuario_id})" style="cursor: pointer;">${comentario.nome}</span>
                <span class="comentario-time">${formatarData(comentario.data_criacao)}</span>
                
                ${usuarioLogado && usuarioLogado.is_admin ? `
                <button class="btn-admin comentario-deletar-btn" onclick="deletarComentario(${comentario.id}, ${postagemId})" title="Deletar Comentário">
                    🗑️
                </button>
                ` : ''}
            </div>
            <div class="comentario-content">
                ${converterMarkdownParaHTML(comentario.conteudo)}
            </div>
        </div>
    `).join('');
}

function atualizarInterfaceUsuario() {
    const userName = document.querySelector('.user-name');
    const onlineStatus = document.querySelector('.online-status');
    const addPostButton = document.querySelector('.add-post');
    const headerAvatar = document.getElementById('header-avatar');
    
    if (!userName || !onlineStatus) {
        console.log('Elementos de usuário não encontrados nesta página');
        return;
    }
    
    if (usuarioLogado) {
        console.log('Atualizando interface para usuário logado');
        
        const usuarioParaLog = {
            ...usuarioLogado,
            foto_perfil: usuarioLogado.foto_perfil ? 
                usuarioLogado.foto_perfil.substring(0, 50) + '...' : 
                null
        };
        console.log('Usuário logado:', usuarioParaLog);
        
        userName.textContent = usuarioLogado.nome;
        onlineStatus.textContent = 'Online';
        onlineStatus.style.color = '#2ecc71';
        
        if (headerAvatar) {
            if (usuarioLogado.foto_perfil) {
                headerAvatar.innerHTML = `<img src="${usuarioLogado.foto_perfil}" alt="${usuarioLogado.nome}">`;
            } else {
                headerAvatar.textContent = usuarioLogado.nome.charAt(0).toUpperCase();
                headerAvatar.style.backgroundColor = `#${usuarioLogado.id.toString().padStart(6, '0')}`;
            }
        }
        
        if (addPostButton) {
            addPostButton.style.display = 'flex';
        }
    } else {
        console.log('Atualizando interface para convidado');
        userName.textContent = 'Convidado';
        onlineStatus.textContent = 'Offline';
        onlineStatus.style.color = '#e74c3c';
        
        if (headerAvatar) {
            headerAvatar.textContent = '?';
            headerAvatar.style.backgroundColor = '#ccc';
        }
        
        if (addPostButton) {
            addPostButton.style.display = 'none';
        }
    }
}

function abrirPerfilUsuario(usuarioId) {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuario'));
    if (!usuarioLogado) {
        alert('Você precisa estar logado para visualizar perfis!');
        window.location.href = '../pages/login.html';
        return;
    }
    
    window.location.href = `perfil-visualizacao.html?id=${usuarioId}`;
}

function abrirModalPost() {
    const modalPost = document.getElementById('modalPost');
    if (!modalPost) {
        console.log('Modal de postagem não encontrado nesta página');
        return;
    }
    
    if (!usuarioLogado) {
        alert('Você precisa estar logado para criar uma postagem!');
        window.location.href = '../pages/login.html';
        return;
    }
    modalPost.style.display = 'block';
}

function fecharModalPost() {
    const modalPost = document.getElementById('modalPost');
    const formPost = document.getElementById('formPost');
    
    if (modalPost) {
        modalPost.style.display = 'none';
    }
    
    if (formPost) {
        formPost.reset();
    }
    
    const imagemPreview = document.getElementById('imagemPreview');
    if (imagemPreview) {
        imagemPreview.style.display = 'none';
    }
    
    postagemEditando = null;
    imagemEditando = null;
    imagemSelecionada = null;
    
    const tituloModal = document.querySelector('#modalPost h2');
    const botaoSubmit = document.querySelector('#modalPost button[type="submit"]');
    
    if (tituloModal) tituloModal.textContent = 'Criar Novo Post';
    if (botaoSubmit) botaoSubmit.textContent = 'Publicar Post';
    
    const inputImagem = document.getElementById('postImagem');
    if (inputImagem) {
        inputImagem.value = '';
    }
}

function abrirModalEditarPost(postagemId) {
    if (!usuarioLogado) {
        alert('Você precisa estar logado para editar postagens!');
        return;
    }

    const postagem = postagens.find(p => p.id === postagemId);
    if (!postagem) {
        alert('Postagem não encontrada!');
        return;
    }

    const isDono = postagem.usuario_id === usuarioLogado.id;
    const isAdmin = usuarioLogado.is_admin;

    if (!isDono && !isAdmin) {
        alert('Você só pode editar suas próprias postagens!');
        return;
    }

    postagemEditando = postagemId;
    imagemEditando = postagem.imagem;

    document.getElementById('editarTitulo').value = postagem.titulo;
    document.getElementById('editarDescricao').value = postagem.descricao;

    const imagemAtualContainer = document.getElementById('imagemAtualContainer');
    const editarImagemPreview = document.getElementById('editarImagemPreview');
    const editarPreviewImg = document.getElementById('editarPreviewImg');
    
    if (postagem.imagem) {
        imagemAtualContainer.innerHTML = `<img src="${postagem.imagem}" alt="Imagem atual" style="max-width: 200px; max-height: 150px; border-radius: 5px;">`;
        editarPreviewImg.src = postagem.imagem;
        editarImagemPreview.style.display = 'block';
    } else {
        imagemAtualContainer.innerHTML = '<p>Nenhuma imagem</p>';
        editarImagemPreview.style.display = 'none';
    }

    const inputEditarImagem = document.getElementById('editarImagem');
    if (inputEditarImagem) {
        inputEditarImagem.onchange = function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    imagemSelecionada = e.target.result;
                    editarPreviewImg.src = imagemSelecionada;
                    editarImagemPreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        };
    }

    document.getElementById('modalEditarPost').style.display = 'block';
}

function fecharModalEditarPost() {
    postagemEditando = null;
    imagemEditando = null;
    imagemSelecionada = null;
    
    document.getElementById('formEditarPost').reset();
    document.getElementById('imagemAtualContainer').innerHTML = '';
    document.getElementById('editarImagemPreview').style.display = 'none';
    
    document.getElementById('modalEditarPost').style.display = 'none';
}

function abrirModalComentario(postagemId) {
    if (!usuarioLogado) {
        alert('Você precisa estar logado para comentar!');
        return;
    }

    postagemAtualComentario = postagemId;
    document.getElementById('modalComentario').style.display = 'block';
    document.getElementById('comentarioConteudo').focus();
}

function fecharModalComentario() {
    document.getElementById('modalComentario').style.display = 'none';
    document.getElementById('formComentario').reset();
    postagemAtualComentario = null;
}

async function criarPostagem(event) {
    event.preventDefault();
    
    const titulo = document.getElementById('postTitulo').value;
    const descricao = document.getElementById('postDescricao').value;
    const imagem = imagemSelecionada || imagemEditando;

    console.log('===debug frontend===');
    console.log('Modo:', postagemEditando ? 'EDITANDO' : 'CRIANDO');
    console.log('Postagem ID:', postagemEditando);
    console.log('Título:', titulo);
    console.log('Descrição:', descricao.substring(0, 100) + '...');
    console.log('Imagem:', !!imagem);

    try {
        let url, method;
        
        if (postagemEditando) {
            url = `https://onirotalk-backend.onrender.com/postagem/${postagemEditando}`;
            method = 'PUT';
        } else {
            url = 'https://onirotalk-backend.onrender.com/postagem';
            method = 'POST';
        }

        console.log('Enviando para servidor.');
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                titulo,
                descricao,
                imagem: imagem,
                usuario_id: usuarioLogado.id
            })
        });

        console.log('Resposta do servidor:');
        console.log('  - Status:', response.status);
        console.log('  - OK:', response.ok);

        const responseText = await response.text();
        console.log('  - Conteúdo:', responseText);

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Erro ao parsear JSON:', parseError);
            throw new Error('Resposta inválida do servidor');
        }
        
        if (data.erro) {
            console.error('Erro do servidor:', data.mensagem);
            alert('Erro: ' + data.mensagem);
            return;
        }

        console.log('Sucesso!');

        if (postagemEditando) {
            const index = postagens.findIndex(p => p.id === postagemEditando);
            if (index !== -1) {
                postagens[index] = data.postagem;
            }
            alert('Postagem atualizada com sucesso!');
        } else {
            postagens.unshift(data.postagem);
            alert('Postagem criada com sucesso!');
        }

        renderizarPostagens();
        fecharModalPost();
        
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro: ' + error.message);
    }
}

function renderizarPostagens() {
    const container = document.getElementById('posts-container');
    
    if (!container) {
        console.log('Não está na página index, ignorando renderização de posts');
        return;
    }
    
    const postsParaRenderizar = buscaAtiva ? resultadosBusca : postagens;
    
    if (postsParaRenderizar.length === 0) {
        if (buscaAtiva) {
            container.innerHTML = `
                <div class="no-posts">
                    <h3>Nenhum resultado encontrado</h3>
                    <p>Tente ajustar os termos de busca ou <a href="javascript:void(0)" onclick="limparBusca()">voltar para todas as postagens</a>.</p>
                </div>
            `;
        } else {
            container.innerHTML = '<div class="no-posts">Nada por aqui!</div>';
        }
        return;
    }

    container.innerHTML = postsParaRenderizar.map(postagem => {
        const isDono = usuarioLogado && postagem.usuario_id === usuarioLogado.id;
        const isAdmin = usuarioLogado && usuarioLogado.is_admin;
        const podeEditar = isDono || isAdmin;
        const podeExcluir = isDono || isAdmin;

        return `
        <div class="post ${buscaAtiva ? 'resultado-busca' : ''}" data-post-id="${postagem.id}">
            <div class="post-header">
                <div class="user-info" onclick="abrirPerfilUsuario(${postagem.usuario_id})" style="cursor: pointer;">
                    <div class="user-avatar" style="background-color: #${postagem.usuario_id.toString().padStart(6, '0')}">
                        ${postagem.foto_perfil ? `<img src="${postagem.foto_perfil}" alt="${postagem.nome}">` : postagem.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <strong>${postagem.nome}</strong>
                        <span class="post-time">${formatarData(postagem.data_criacao)}</span>
                    </div>
                </div>
                
                <div class="post-actions-header">
                    ${podeEditar ? `
                    <div class="user-actions">
                        <button class="btn-edit" onclick="abrirModalEditarPost(${postagem.id})" title="Editar Post">
                            ✏️
                        </button>
                    </div>
                    ` : ''}
                    
                    ${podeExcluir ? `
                    <div class="user-actions">
                        <button class="btn-delete ${isAdmin && !isDono ? 'admin-delete' : ''}" 
                                onclick="excluirPostagem(${postagem.id})" 
                                title="${isAdmin && !isDono ? 'Excluir Post (Admin)' : 'Excluir Post'}">
                            🗑️
                        </button>
                    </div>
                    ` : ''}
                    
                    ${isAdmin ? `
                    <div class="admin-actions">
                        <button class="btn-admin fixar-btn" onclick="fixarPostagem(${postagem.id}, ${postagem.is_fixado})" title="${postagem.is_fixado ? 'Desfixar' : 'Fixar'}">
                            ${postagem.is_fixado ? '📌' : '📍'}
                        </button>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            ${postagem.is_fixado ? '<div class="post-fixado">📌 Fixado</div>' : ''}
            
            <div class="post-content">
                <h3>${postagem.titulo}</h3>
                <div class="post-descricao">${converterMarkdownParaHTML(postagem.descricao)}</div>
                ${postagem.imagem ? `<img src="${postagem.imagem}" class="post-image" alt="Imagem do post">` : ''}
            </div>
            
            <div class="post-stats">
                <span>${postagem.likes || 0} 👍</span>
                <span>${postagem.deslikes || 0} 👎</span>
                <span>${postagem.total_comentarios || 0} 💬</span>
            </div>
            
            <div class="post-actions">
                <button class="btn-action like-btn" onclick="curtirPostagem(${postagem.id})">
                    👍 Like
                </button>
                <button class="btn-action deslike-btn" onclick="descurtirPostagem(${postagem.id})">
                    👎 Deslike
                </button>
                <button class="btn-action comment-btn" onclick="abrirModalComentario(${postagem.id})">
                    💬 Comentar
                </button>
                <button class="btn-action toggle-comments-btn" onclick="toggleComentarios(${postagem.id})">
                    👁️ Comentários
                </button>
            </div>
            
            <div id="comentarios-${postagem.id}" class="comentarios-container" style="display: none;">
                <div class="comentarios-lista">
                    <p class="no-comments">Nada por aqui!</p>
                </div>
            </div>
        </div>
        `;
    }).join('');

    if (buscaAtiva) {
        const primeiroPost = container.querySelector('.post');
        if (primeiroPost) {
            primeiroPost.insertAdjacentHTML('beforebegin', `
                <div class="busca-ativa-indicator">
                    <span>Exibindo resultados da busca</span>
                    <button onclick="limparBusca()" class="btn-limpar-busca">✕ Limpar busca</button>
                </div>
            `);
        }
    }
}

async function curtirPostagem(postagemId) {
    if (!usuarioLogado) {
        alert('Você precisa estar logado para interagir!');
        return;
    }

    const postElement = document.querySelector(`[data-post-id="${postagemId}"]`);
    if (!postElement) return;

    const likeBtn = postElement.querySelector('.like-btn');
    const deslikeBtn = postElement.querySelector('.deslike-btn');

    const jaCurtido = likeBtn.classList.contains('active');
    
    try {
        const response = await fetch('https://onirotalk-backend.onrender.com/reacao', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tipo: 'postagem',
                id_objeto: postagemId,
                usuario_id: usuarioLogado.id,
                tipo_reacao: jaCurtido ? 'none' : 'like'
            })
        });

        const data = await response.json();
        
        if (!data.erro) {
            if (jaCurtido) {
                likeBtn.classList.remove('active');
            } else {
                likeBtn.classList.add('active');
                deslikeBtn.classList.remove('active');
            }
            
            const postagemIndex = postagens.findIndex(p => p.id === postagemId);
            if (postagemIndex !== -1) {
                postagens[postagemIndex].likes = data.likes;
                postagens[postagemIndex].deslikes = data.deslikes;
            }
        }
    } catch (error) {
        console.error('Erro na reação:', error);
    }
}

async function descurtirPostagem(postagemId) {
    if (!usuarioLogado) {
        alert('Você precisa estar logado para interagir!');
        return;
    }

    const postElement = document.querySelector(`[data-post-id="${postagemId}"]`);
    if (!postElement) return;

    const likeBtn = postElement.querySelector('.like-btn');
    const deslikeBtn = postElement.querySelector('.deslike-btn');

    const jaDescurtido = deslikeBtn.classList.contains('active');
    
    try {
        const response = await fetch('https://onirotalk-backend.onrender.com/reacao', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tipo: 'postagem',
                id_objeto: postagemId,
                usuario_id: usuarioLogado.id,
                tipo_reacao: jaDescurtido ? 'none' : 'deslike'
            })
        });

        const data = await response.json();
        
        if (!data.erro) {
            if (jaDescurtido) {
                deslikeBtn.classList.remove('active');
            } else {
                deslikeBtn.classList.add('active');
                likeBtn.classList.remove('active');
            }
            
            const postagemIndex = postagens.findIndex(p => p.id === postagemId);
            if (postagemIndex !== -1) {
                postagens[postagemIndex].likes = data.likes;
                postagens[postagemIndex].deslikes = data.deslikes;
            }
        }
    } catch (error) {
        console.error('Erro na reação:', error);
    }
}

async function enviarReacao(tipo, id_objeto, tipo_reacao) {
    if (!usuarioLogado) {
        alert('Você precisa estar logado para interagir!');
        return;
    }

    try {
        const response = await fetch('https://onirotalk-backend.onrender.com/reacao', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tipo,
                id_objeto,
                usuario_id: usuarioLogado.id,
                tipo_reacao
            })
        });

        const data = await response.json();
        
        if (!data.erro) {
            const postElement = document.querySelector(`[data-post-id="${id_objeto}"]`);
            if (postElement) {
                const likeBtn = postElement.querySelector('.like-btn');
                const deslikeBtn = postElement.querySelector('.deslike-btn');
                
                likeBtn.innerHTML = `👍 Like (${data.likes})`;
                deslikeBtn.innerHTML = `👎 Deslike (${data.deslikes})`;
            }
            
            const postagemIndex = postagens.findIndex(p => p.id === id_objeto);
            if (postagemIndex !== -1) {
                postagens[postagemIndex].likes = data.likes;
                postagens[postagemIndex].deslikes = data.deslikes;
            }
        }
    } catch (error) {
        console.error('Erro na reação:', error);
    }
}

function toggleComentarios(postagemId) {
    const container = document.getElementById(`comentarios-${postagemId}`);
    if (!container) return;
    
    if (container.style.display === 'none') {
        container.style.display = 'block';
        carregarComentarios(postagemId);
    } else {
        container.style.display = 'none';
    }
}

function formatarData(dataString) {
    const data = new Date(dataString);
    return data.toLocaleString('pt-BR');
}

function formatarTexto(tipo, textareaId = null) {
    let textarea;
    if (textareaId) {
        textarea = document.getElementById(textareaId);
    } else {
        textarea = document.getElementById('comentarioConteudo') || 
                   document.getElementById('postDescricao');
    }
    
    if (!textarea) {
        console.error('Textarea não encontrado');
        return;
    }
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    let textoFormatado = '';
    let cursorOffset = 0;
    
    switch(tipo) {
        case 'bold':
            textoFormatado = `**${selectedText}**`;
            cursorOffset = 2;
            break;
        case 'italic':
            textoFormatado = `*${selectedText}*`;
            cursorOffset = 1;
            break;
        case 'strike':
            textoFormatado = `~~${selectedText}~~`;
            cursorOffset = 2;
            break;
        case 'h1':
            textoFormatado = `# ${selectedText}`;
            break;
        case 'h2':
            textoFormatado = `## ${selectedText}`;
            break;
        case 'link':
            textoFormatado = `[${selectedText}](https://)`;
            cursorOffset = -1;
            break;
    }
    
    textarea.value = textarea.value.substring(0, start) + 
                     textoFormatado + 
                     textarea.value.substring(end);
    
    const newCursorPos = start + textoFormatado.length + cursorOffset;
    textarea.focus();
    textarea.setSelectionRange(newCursorPos, newCursorPos);
}

async function fixarPostagem(postagemId, estaFixado) {
    if (!usuarioLogado || !usuarioLogado.is_admin) {
        alert('Apenas administradores podem fixar posts!');
        return;
    }

    if (!confirm(`Tem certeza que deseja ${estaFixado ? 'desfixar' : 'fixar'} este post?`)) {
        return;
    }

    try {
        const response = await fetch(`https://onirotalk-backend.onrender.com/postagem/${postagemId}/fixar`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                is_fixado: !estaFixado,
                usuario_id: usuarioLogado.id
            })
        });

        const data = await response.json();
        
        if (data.erro) {
            alert('Erro: ' + data.mensagem);
            return;
        }

        alert(`Post ${estaFixado ? 'desfixado' : 'fixado'} com sucesso!`);
        carregarPostagens();
        
    } catch (error) {
        console.error('Erro ao fixar post:', error);
        alert('Erro ao fixar postagem');
    }
}

async function deletarComentario(comentarioId, postagemId) {
    if (!usuarioLogado || !usuarioLogado.is_admin) {
        alert('Apenas administradores podem deletar comentários!');
        return;
    }

    if (!confirm('Tem certeza que deseja deletar este comentário? Esta ação não pode ser desfeita.')) {
        return;
    }

    try {
        const response = await fetch(`https://onirotalk-backend.onrender.com/comentario/${comentarioId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                usuario_id: usuarioLogado.id
            })
        });

        const data = await response.json();
        
        if (data.erro) {
            alert('Erro: ' + data.mensagem);
            return;
        }

        alert('Comentário deletado com sucesso!');
        carregarComentarios(postagemId);
        
    } catch (error) {
        console.error('Erro ao deletar comentário:', error);
        alert('Erro ao deletar comentário');
    }
}

function converterMarkdownParaHTML(markdown) {
    if (!markdown) return '';
    
    let html = markdown;
    
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
    
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
    
    html = html.replace(/~~(.*?)~~/gim, '<s>$1</s>');
    
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    
    html = html.replace(/^\s*[-*] (.*$)/gim, '<li>$1</li>');
    
    html = html.replace(/(<li>.*<\/li>)+/gims, function(match) {
        return '<ul>' + match + '</ul>';
    });
    
    html = html.replace(/\n/g, '<br>');
    
    html = html.split('\n\n').map(paragraph => {
        if (paragraph.trim() === '') return '';
        if (paragraph.trim().startsWith('<') && 
            (paragraph.includes('</h1>') || paragraph.includes('</h2>') || 
             paragraph.includes('</h3>') || paragraph.includes('</ul>') ||
             paragraph.includes('</li>'))) {
            return paragraph;
        }
        return '<p>' + paragraph + '</p>';
    }).join('');
    
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p><br><\/p>/g, '');
    
    return html;
}

function abrirBusca() {
    const modalBusca = document.getElementById('modalBusca');
    if (!modalBusca) {
        console.log('Modal de busca não encontrado');
        return;
    }
    modalBusca.style.display = 'block';
}

function fecharModalBusca() {
    const modalBusca = document.getElementById('modalBusca');
    if (modalBusca) {
        modalBusca.style.display = 'none';
    }
}

function executarBusca() {
    const termo = document.getElementById('buscaTermo').value.trim();
    const tipo = document.getElementById('filtroTipo').value;
    const ordenacao = document.getElementById('filtroOrdenacao').value;
    const apenasFixados = document.getElementById('filtroApenasFixados').checked;
    const comImagens = document.getElementById('filtroComImagens').checked;
    const periodo = document.getElementById('filtroData').value;

    filtrosAtuais = {
        termo,
        tipo,
        ordenacao,
        apenasFixados,
        comImagens,
        periodo
    };

    buscarPostagens(filtrosAtuais);
}

function limparBusca() {
    document.getElementById('buscaTermo').value = '';
    document.getElementById('filtroTipo').value = 'todos';
    document.getElementById('filtroOrdenacao').value = 'recentes';
    document.getElementById('filtroApenasFixados').checked = false;
    document.getElementById('filtroComImagens').checked = false;
    document.getElementById('filtroData').value = 'todos';

    document.getElementById('resultadosBusca').style.display = 'none';
    
    if (buscaAtiva) {
        buscaAtiva = false;
        renderizarPostagens();
    }
}

function buscarPostagens(filtros) {
    if (!filtros.termo && !filtros.apenasFixados && !filtros.comImagens && filtros.periodo === 'todos') {
        alert('Por favor, preencha algum critério de busca ou selecione um filtro.');
        return;
    }

    resultadosBusca = [...postagens];

    if (filtros.termo) {
        const termoLower = filtros.termo.toLowerCase();
        resultadosBusca = resultadosBusca.filter(postagem => {
            switch (filtros.tipo) {
                case 'titulo':
                    return postagem.titulo.toLowerCase().includes(termoLower);
                case 'conteudo':
                    return postagem.descricao.toLowerCase().includes(termoLower);
                case 'autor':
                    return postagem.nome.toLowerCase().includes(termoLower);
                case 'todos':
                default:
                    return postagem.titulo.toLowerCase().includes(termoLower) ||
                           postagem.descricao.toLowerCase().includes(termoLower) ||
                           postagem.nome.toLowerCase().includes(termoLower);
            }
        });
    }

    if (filtros.apenasFixados) {
        resultadosBusca = resultadosBusca.filter(postagem => postagem.is_fixado);
    }

    if (filtros.comImagens) {
        resultadosBusca = resultadosBusca.filter(postagem => postagem.imagem);
    }

    if (filtros.periodo !== 'todos') {
        const agora = new Date();
        resultadosBusca = resultadosBusca.filter(postagem => {
            const dataPostagem = new Date(postagem.data_criacao);
            const diffTime = Math.abs(agora - dataPostagem);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            switch (filtros.periodo) {
                case 'hoje':
                    return diffDays <= 1;
                case 'semana':
                    return diffDays <= 7;
                case 'mes':
                    return diffDays <= 30;
                case 'ano':
                    return diffDays <= 365;
                default:
                    return true;
            }
        });
    }

    resultadosBusca.sort((a, b) => {
        switch (filtros.ordenacao) {
            case 'antigos':
                return new Date(a.data_criacao) - new Date(b.data_criacao);
            case 'likes':
                return (b.likes || 0) - (a.likes || 0);
            case 'comentarios':
                return (b.total_comentarios || 0) - (a.total_comentarios || 0);
            case 'recentes':
            default:
                return new Date(b.data_criacao) - new Date(a.data_criacao);
        }
    });

    exibirResultadosBusca(resultadosBusca, filtros);
}

function exibirResultadosBusca(resultados, filtros) {
    const containerResultados = document.getElementById('listaResultados');
    const containerEstatisticas = document.getElementById('estatisticasBusca');
    const secaoResultados = document.getElementById('resultadosBusca');

    if (resultados.length === 0) {
        containerResultados.innerHTML = `
            <div class="nenhum-resultado">
                <p>Nenhuma postagem encontrada com os critérios especificados.</p>
                <p>Tente ajustar os filtros ou os termos de busca.</p>
            </div>
        `;
    } else {
        containerResultados.innerHTML = resultados.map(postagem => `
            <div class="resultado-item" onclick="destaacarPostagem(${postagem.id})">
                <div class="resultado-header">
                    <div class="resultado-autor">
                        <div class="user-avatar pequeno" style="background-color: #${postagem.usuario_id.toString().padStart(6, '0')}">
                            ${postagem.foto_perfil ? `<img src="${postagem.foto_perfil}" alt="${postagem.nome}">` : postagem.nome.charAt(0).toUpperCase()}
                        </div>
                        <span class="autor-nome">${postagem.nome}</span>
                        ${postagem.is_fixado ? '<span class="badge-fixado">📌 Fixado</span>' : ''}
                    </div>
                    <span class="resultado-data">${formatarData(postagem.data_criacao)}</span>
                </div>
                
                <h4 class="resultado-titulo">${postagem.titulo}</h4>
                
                <div class="resultado-conteudo">
                    ${converterMarkdownParaHTML(limitarTexto(postagem.descricao, 150))}
                </div>
                
                <div class="resultado-stats">
                    <span>👍 ${postagem.likes || 0}</span>
                    <span>👎 ${postagem.deslikes || 0}</span>
                    <span>💬 ${postagem.total_comentarios || 0}</span>
                    ${postagem.imagem ? '<span>🖼️ Com imagem</span>' : ''}
                </div>
            </div>
        `).join('');
    }

    containerEstatisticas.innerHTML = `
        <p>Encontrados <strong>${resultados.length}</strong> resultado(s)</p>
        ${filtros.termo ? `<p>Termo: "${filtros.termo}"</p>` : ''}
    `;

    secaoResultados.style.display = 'block';
    
    buscaAtiva = true;
    renderizarPostagens();
}

function limitarTexto(texto, limite) {
    if (texto.length <= limite) return texto;
    return texto.substring(0, limite) + '...';
}

function destaaacarPostagem(postagemId) {
    fecharModalBusca();
    
    const postElement = document.querySelector(`[data-post-id="${postagemId}"]`);
    if (postElement) {
        postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        postElement.style.animation = 'destaque 2s ease-in-out';
        
        setTimeout(() => {
            postElement.style.animation = '';
        }, 2000);
    }
}

function comprimirImagem(file, qualidade = 0.7) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        
        img.onload = function() {
            URL.revokeObjectURL(url);
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            let width = img.width;
            let height = img.height;
            const maxWidth = 1200;
            const maxHeight = 1200;
            
            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            ctx.imageSmoothingQuality = 'high';
            
            ctx.drawImage(img, 0, 0, width, height);
            
            try {
                const formato = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                const qualidadeFinal = file.type === 'image/png' ? 1.0 : qualidade;
                
                const base64 = canvas.toDataURL(formato, qualidadeFinal);
                resolve(base64);
            } catch (error) {
                reject(new Error('Erro ao converter imagem: ' + error.message));
            }
        };
        
        img.onerror = function() {
            URL.revokeObjectURL(url);
            reject(new Error('Erro ao carregar a imagem'));
        };
        
        img.src = url;
    });
}

async function excluirPostagem(postagemId) {
    if (!usuarioLogado) {
        alert('Você precisa estar logado para excluir postagens!');
        return;
    }

    const postagem = postagens.find(p => p.id === postagemId);
    if (!postagem) {
        alert('Postagem não encontrada!');
        return;
    }

    const isDono = postagem.usuario_id === usuarioLogado.id;
    const isAdmin = usuarioLogado.is_admin;

    if (!isDono && !isAdmin) {
        alert('Você só pode excluir suas próprias postagens!');
        return;
    }

    let confirmMessage;
    if (isAdmin && !isDono) {
        confirmMessage = `AÇÃO DE ADMINISTRADOR\n\nVocê está prestes a excluir a postagem de "${postagem.nome}".\n\nEsta ação não pode ser desfeita. Tem certeza?`;
    } else {
        confirmMessage = 'Tem certeza que deseja excluir esta postagem? Esta ação não pode ser desfeita.';
    }

    if (!confirm(confirmMessage)) {
        return;
    }

    try {
        const response = await fetch(`https://onirotalk-backend.onrender.com/postagem/${postagemId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                usuario_id: usuarioLogado.id
            })
        });

        const data = await response.json();
        
        if (data.erro) {
            alert('Erro: ' + data.mensagem);
            return;
        }

        alert(isAdmin && !isDono ? 'Postagem excluída com sucesso (ação de administrador)!' : 'Postagem excluída com sucesso!');
        
        postagens = postagens.filter(p => p.id !== postagemId);
        renderizarPostagens();
        
    } catch (error) {
        console.error('Erro ao excluir postagem:', error);
        alert('Erro ao excluir postagem');
    }
}