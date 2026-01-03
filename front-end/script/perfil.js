let usuarioPerfil = null;
let imagemPerfilSelecionada = null;

document.addEventListener('DOMContentLoaded', function() {
    carregarUsuarioPerfil();
    configurarEventListeners();
});

function carregarUsuarioPerfil() {
    const usuarioSalvo = localStorage.getItem('usuario');
    if (usuarioSalvo) {
        usuarioPerfil = JSON.parse(usuarioSalvo);
        atualizarInterfacePerfil();
        carregarEstatisticas();
    } else {
        window.location.href = 'login.html';
    }
}

function atualizarInterfacePerfil() {
    if (!usuarioPerfil) return;

    document.getElementById('nomeUsuario').textContent = usuarioPerfil.nome;
    document.getElementById('emailUsuario').textContent = usuarioPerfil.email;
    
    if (usuarioPerfil.data_criacao) {
        const data = new Date(usuarioPerfil.data_criacao);
        document.getElementById('dataCriacao').textContent = 
            `Membro desde: ${data.toLocaleDateString('pt-BR')}`;
    }

    const fotoPerfil = document.getElementById('fotoPerfil');
    if (usuarioPerfil.foto_perfil) {
        fotoPerfil.innerHTML = `<img src="${usuarioPerfil.foto_perfil}" alt="${usuarioPerfil.nome}">`;
    } else {
        fotoPerfil.textContent = usuarioPerfil.nome.charAt(0).toUpperCase();
        fotoPerfil.style.backgroundColor = `#${usuarioPerfil.id.toString().padStart(6, '0')}`;
    }

    document.getElementById('inputNome').value = usuarioPerfil.nome;
    document.getElementById('inputEmail').value = usuarioPerfil.email;
    document.getElementById('inputBio').value = usuarioPerfil.bio || '';
}

function comprimirImagemPerfil(file, maxWidth = 200, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        reader.onload = function(e) {
            img.onload = function() {
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                ctx.drawImage(img, 0, 0, width, height);
                
                const base64 = canvas.toDataURL('image/jpeg', quality);
                console.log('📐 Imagem comprimida. Tamanho original:', file.size, 'bytes. Base64:', base64.length, 'caracteres');
                resolve(base64);
            };
            img.src = e.target.result;
        };
        
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function configurarEventListeners() {
    document.getElementById('inputFoto').addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (file) {
            console.log('Arquivo selecionado:', file.name, 'Tamanho:', file.size, 'bytes');
            
            if (file.size > 2 * 1024 * 1024) {
                alert('Arquivo muito grande! Escolha uma imagem menor que 2MB.');
                this.value = '';
                return;
            }
            
            try {
                const imagemComprimida = await comprimirImagemPerfil(file);
                imagemPerfilSelecionada = imagemComprimida;
                
                document.getElementById('fotoPerfil').innerHTML = 
                    `<img src="${imagemComprimida}" alt="${usuarioPerfil.nome}">`;
                    
            } catch (error) {
                console.error('Erro ao processar imagem:', error);
                alert('Erro ao processar a imagem.');
            }
        }
    });
    
    document.getElementById('formPerfil').addEventListener('submit', salvarPerfil);
}

async function salvarPerfil(event) {
    event.preventDefault();
    
    // verificação adiiconal pra garantir que usuarioPerfili esteja inicializando
    if (!usuarioPerfil) {
        console.error('usuarioPerfil não está inicializado');
        alert('Erro: Dados do usuário não carregados. Recarregue a página.');
        return;
    }
    
    const nome = document.getElementById('inputNome').value;
    const email = document.getElementById('inputEmail').value;
    const bio = document.getElementById('inputBio').value;
    const senhaAtual = document.getElementById('inputSenhaAtual').value;
    const novaSenha = document.getElementById('inputNovaSenha').value;
    const confirmarSenha = document.getElementById('inputConfirmarSenha').value;

    console.log('Tentando salvar perfil.', { nome, email, bio, temSenhaNova: !!novaSenha });

    if (novaSenha && novaSenha !== confirmarSenha) {
        alert('As senhas não coincidem!');
        return;
    }

    try {
        const dados = {
            usuario_id: usuarioPerfil.id,
            nome,
            email,
            bio,
            foto_perfil: imagemPerfilSelecionada || usuarioPerfil.foto_perfil,
            senha_atual: senhaAtual,
            nova_senha: novaSenha
        };

        console.log('Enviando dados:', dados);

        const response = await fetch('http://onirotalk-backend.onrender.com/perfil', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
        });

        console.log('Status da resposta:', response.status);

        const responseText = await response.text();
        console.log('Resposta (texto):', responseText);

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Erro ao parsear JSON:', parseError);
            alert('Erro no servidor. A rota /perfil pode não existir.');
            return;
        }

        if (data.erro) {
            alert('Erro ao salvar perfil: ' + data.mensagem);
            return;
        }

        console.log('Perfil salvo com sucesso!');
        
        usuarioPerfil = data.usuario;
        localStorage.setItem('usuario', JSON.stringify(data.usuario));
        
        alert('Perfil atualizado com sucesso!');
        
        document.getElementById('inputSenhaAtual').value = '';
        document.getElementById('inputNovaSenha').value = '';
        document.getElementById('inputConfirmarSenha').value = '';
        
    } catch (error) {
        console.error('Erro completo:', error);
        alert('Erro de conexão: ' + error.message);
    }
}

async function carregarEstatisticas() {
    // verificação adicional
    if (!usuarioPerfil) {
        console.error('usuarioPerfil não está inicializado para carregar estatísticas');
        return;
    }
    
    try {
        const response = await fetch(`http://onirotalk-backend.onrender.com/usuario/${usuarioPerfil.id}/estatisticas`);
        const data = await response.json();
        
        if (!data.erro) {
            document.getElementById('totalPosts').textContent = data.total_posts || 0;
            document.getElementById('totalLikes').textContent = data.total_likes || 0;
            document.getElementById('totalComentarios').textContent = data.total_comentarios || 0;
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

function fazerLogout() {
    if (confirm('Tem certeza que deseja sair da sua conta?')) {
        localStorage.removeItem('usuario');
        window.location.href = '../pages/index.html';
    }
}