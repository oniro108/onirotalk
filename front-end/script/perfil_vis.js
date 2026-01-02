let usuarioVisualizado = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Página de visualização de perfil carregada');
    carregarUsuarioVisualizado();
});

function carregarUsuarioVisualizado() {
    const urlParams = new URLSearchParams(window.location.search);
    const usuarioId = urlParams.get('id');
    
    console.log('Buscando usuário ID:', usuarioId);
    
    if (!usuarioId) {
        document.querySelector('.perfil-container').innerHTML = `
            <div class="error">
                <h2>Perfil não encontrado</h2>
                <p>O usuário solicitado não existe.</p>
                <button onclick="window.history.back()" class="btn-voltar">← Voltar</button>
            </div>
        `;
        return;
    }

    // verificaa se tá logado antes de buscar o usuário
    const usuarioLogado = JSON.parse(localStorage.getItem('usuario'));
    if (!usuarioLogado) {
        alert('Você precisa estar logado para visualizar perfis!');
        window.location.href = 'login.html';
        return;
    }

    buscarUsuario(usuarioId);
}

async function buscarUsuario(usuarioId) {
    try {
        console.log('Buscando usuário no servidor.');
        const response = await fetch(`http://localhost:3000/usuario/${usuarioId}`);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Resposta do servidor:', data);
        
        if (data.erro) {
            document.querySelector('.perfil-container').innerHTML = `
                <div class="error">
                    <h2>Erro ao carregar perfil</h2>
                    <p>${data.mensagem}</p>
                    <button onclick="window.history.back()" class="btn-voltar">← Voltar</button>
                </div>
            `;
            return;
        }

        usuarioVisualizado = data.usuario;
        console.log('Usuário carregado:', usuarioVisualizado);
        atualizarInterfacePerfil();
        carregarEstatisticas(usuarioId);
        
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        document.querySelector('.perfil-container').innerHTML = `
            <div class="error">
                <h2>Erro de conexão</h2>
                <p>Não foi possível carregar o perfil: ${error.message}</p>
                <button onclick="window.history.back()" class="btn-voltar">← Voltar</button>
            </div>
        `;
    }
}

function atualizarInterfacePerfil() {
    if (!usuarioVisualizado) return;

    document.getElementById('nomeUsuario').textContent = usuarioVisualizado.nome;
    document.getElementById('emailUsuario').textContent = usuarioVisualizado.email;
    
    // formatar data de criação
    if (usuarioVisualizado.data_criacao) {
        const data = new Date(usuarioVisualizado.data_criacao);
        document.getElementById('dataCriacao').textContent = 
            `Membro desde: ${data.toLocaleDateString('pt-BR')}`;
    }

    // atualizar bio
    const bioElement = document.getElementById('bioUsuario');
    if (usuarioVisualizado.bio) {
        bioElement.textContent = usuarioVisualizado.bio;
        bioElement.style.display = 'block';
    } else {
        bioElement.style.display = 'none';
    }

    // atualizar foto de perfil
    const fotoPerfil = document.getElementById('fotoPerfil');
    if (usuarioVisualizado.foto_perfil) {
        fotoPerfil.innerHTML = `<img src="${usuarioVisualizado.foto_perfil}" alt="${usuarioVisualizado.nome}">`;
    } else {
        fotoPerfil.textContent = usuarioVisualizado.nome.charAt(0).toUpperCase();
        fotoPerfil.style.backgroundColor = `#${usuarioVisualizado.id.toString().padStart(6, '0')}`;
    }

    // atualizar título da página
    document.title = `Onirotalk - ${usuarioVisualizado.nome}`;
}

async function carregarEstatisticas(usuarioId) {
    try {
        console.log('Carregando estatísticas.');
        const response = await fetch(`http://localhost:3000/usuario/${usuarioId}/estatisticas`);
        const data = await response.json();
        
        if (!data.erro) {
            console.log('Estatísticas carregadas:', data);
            document.getElementById('totalPosts').textContent = data.total_posts || 0;
            document.getElementById('totalLikes').textContent = data.total_likes || 0;
            document.getElementById('totalComentarios').textContent = data.total_comentarios || 0;
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

// função de busca
function abrirBusca() {
    alert('Funcionalidade de busca em desenvolvimento!');
}