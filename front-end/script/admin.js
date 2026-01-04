let usuarios = [];
let usuarioLogado = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('painelk do admin carregado.');
    verificarPermissaoAdmin();
});

async function verificarPermissaoAdmin() {
    const usuarioSalvo = localStorage.getItem('usuario');
    
    if (!usuarioSalvo) {
        window.location.href = 'login.html';
        return;
    }

    usuarioLogado = JSON.parse(usuarioSalvo);
    console.log('Usuário logado no admin:', usuarioLogado);

    if (!usuarioLogado.is_admin) {
        console.log('Usuário NÃO é admin');
        document.querySelector('.admin-panel').innerHTML = `
            <div class="error">
                <h2>Acesso Negado</h2>
                <p>Você não tem permissão para acessar esta página.</p>
                <p><strong>Status:</strong> ${usuarioLogado.nome} (Não administrador)</p>
                <button onclick="window.location.href='index.html'" class="btn-voltar">
                    Voltar ao Feed
                </button>
            </div>
        `;
        return;
    }

    console.log('Usuário É admin, carregando painel.');

    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = 'block';
    });

    atualizarInterfaceAdmin();
    carregarUsuarios();
}

function atualizarInterfaceAdmin() {
    const userName = document.querySelector('.user-name');
    const onlineStatus = document.querySelector('.online-status');
    const headerAvatar = document.getElementById('header-avatar');
    
    if (userName && onlineStatus) {
        userName.textContent = usuarioLogado.nome + ' (Admin)';
        onlineStatus.textContent = 'Online';
        onlineStatus.style.color = '#2ecc71';
    }
    
    if (headerAvatar) {
        if (usuarioLogado.foto_perfil) {
            headerAvatar.innerHTML = `<img src="${usuarioLogado.foto_perfil}" alt="${usuarioLogado.nome}">`;
        } else {
            headerAvatar.textContent = usuarioLogado.nome.charAt(0).toUpperCase();
            headerAvatar.style.backgroundColor = `#${usuarioLogado.id.toString().padStart(6, '0')}`;
        }
    }
}

async function carregarUsuarios() {
    try {
        console.log('Carregando usuários...');
        console.log('ID do usuário logado:', usuarioLogado.id);
        
        const url = `https://onirotalk-backend.onrender.com/admin/usuarios?usuario_id=${usuarioLogado.id}`;
        console.log('URL da req:', url);

        const response = await fetch(url);
        
        console.log('Status da resposta:', response.status);
        console.log('OK?', response.ok);

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Resposta da API:', data);
        
        if (data.erro) {
            document.getElementById('usuariosContainer').innerHTML = `
                <div class="error">${data.mensagem}</div>
            `;
            return;
        }

        usuarios = data.usuarios;
        console.log(`${usuarios.length} usuários carregados`);
        atualizarEstatisticas();
        renderizarUsuarios();
        
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        document.getElementById('usuariosContainer').innerHTML = `
            <div class="error">
                Erro ao carregar usuários: ${error.message}
                <br><br>
                <button onclick="carregarUsuarios()" class="btn-desfazer">🔄 Tentar Novamente</button>
            </div>
        `;
    }
}

function atualizarEstatisticas() {
    const totalUsuarios = usuarios.length;
    const totalAdmins = usuarios.filter(u => u.is_admin).length;
    const totalBanidos = usuarios.filter(u => u.is_banido).length;
    const totalSilenciados = usuarios.filter(u => u.is_silenciado).length;

    document.getElementById('totalUsuarios').textContent = totalUsuarios;
    document.getElementById('totalAdmins').textContent = totalAdmins;
    document.getElementById('totalBanidos').textContent = totalBanidos;
    document.getElementById('totalSilenciados').textContent = totalSilenciados;
}

function renderizarUsuarios() {
    const container = document.getElementById('usuariosContainer');
    
    if (usuarios.length === 0) {
        container.innerHTML = '<div class="error">Nenhum usuário encontrado</div>';
        return;
    }

    container.innerHTML = usuarios.map(usuario => {
        const dataCriacao = new Date(usuario.data_criacao).toLocaleDateString('pt-BR');
        const dataSilenciado = usuario.data_silenciado ? new Date(usuario.data_silenciado).toLocaleDateString('pt-BR') : null;
        const dataBanido = usuario.data_banido ? new Date(usuario.data_banido).toLocaleDateString('pt-BR') : null;

        let cardClass = 'usuario-card';
        if (usuario.is_banido) cardClass += ' banido';
        else if (usuario.is_silenciado) cardClass += ' silenciado';
        else if (usuario.is_admin) cardClass += ' admin';

        return `
            <div class="${cardClass}" data-user-id="${usuario.id}">
                <div class="usuario-header">
                    <div class="usuario-avatar">
                        ${usuario.foto_perfil ? 
                            `<img src="${usuario.foto_perfil}" alt="${usuario.nome}">` : 
                            usuario.nome.charAt(0).toUpperCase()
                        }
                    </div>
                    <div class="usuario-info">
                        <div class="usuario-nome">${usuario.nome}</div>
                        <div class="usuario-email">${usuario.email}</div>
                        <div class="usuario-stats">
                            <span>Membro desde: ${dataCriacao}</span>
                        </div>
                        <div class="usuario-status">
                            ${usuario.is_admin ? '<span class="status-badge status-admin">ADMIN</span>' : ''}
                            ${usuario.is_banido ? `<span class="status-badge status-banido">BANIDO (${dataBanido})</span>` : ''}
                            ${usuario.is_silenciado ? `<span class="status-badge status-silenciado">SILENCIADO (${dataSilenciado})</span>` : ''}
                        </div>
                    </div>
                </div>
                
                ${usuario.bio ? `<div class="usuario-bio">${usuario.bio}</div>` : ''}
                <div class="usuario-actions">
                    ${!usuario.is_admin ? `
                        ${usuario.is_silenciado ? 
                            `<button class="btn-desfazer" onclick="desilenciarUsuario(${usuario.id})">🔊 Desilenciar</button>` :
                            `<button class="btn-silenciar" onclick="silenciarUsuario(${usuario.id})">🔇 Silenciar</button>`
                        }
                        
                        ${usuario.is_banido ? 
                            `<button class="btn-desfazer" onclick="desbanirUsuario(${usuario.id})">🔓 Desbanir</button>` :
                            `<button class="btn-banir" onclick="banirUsuario(${usuario.id})">🚫 Banir</button>`
                        }
                        
                        <button class="btn-excluir" onclick="excluirUsuario(${usuario.id})">🗑️ Excluir</button>
                    ` : `
                        <span style="color: #7f8c8d; font-size: 12px;">Administrador</span>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

async function silenciarUsuario(usuarioId) {
    try {
        const response = await fetch(`https://onirotalk-backend.onrender.com/admin/silenciar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                usuario_id: usuarioId,
                admin_id: usuarioLogado.id,
                acao: 'silenciar'
            })
        });

        const data = await response.json();
        
        if (data.erro) {
            alert('Erro: ' + data.mensagem);
            return;
        }

        alert(data.mensagem);
        carregarUsuarios();
        
    } catch (error) {
        console.error('Erro ao silenciar usuário:', error);
        alert('Erro ao silenciar usuário: ' + error.message);
    }
}

async function desilenciarUsuario(usuarioId) {
    try {
        const response = await fetch(`https://onirotalk-backend.onrender.com/admin/silenciar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                usuario_id: usuarioId,
                admin_id: usuarioLogado.id,
                acao: 'desilenciar'
            })
        });

        const data = await response.json();
        
        if (data.erro) {
            alert('Erro: ' + data.mensagem);
            return;
        }

        alert(data.mensagem);
        carregarUsuarios();
        
    } catch (error) {
        console.error('Erro ao desilenciar usuário:', error);
        alert('Erro ao desilenciar usuário: ' + error.message);
    }
}

async function banirUsuario(usuarioId) {
    if (!confirm('Tem certeza que deseja banir este usuário? Ele não poderá acessar o site.')) {
        return;
    }

    try {
        const response = await fetch(`https://onirotalk-backend.onrender.com/admin/banir`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                usuario_id: usuarioId,
                admin_id: usuarioLogado.id,
                acao: 'banir'
            })
        });

        const data = await response.json();
        
        if (data.erro) {
            alert('Erro: ' + data.mensagem);
            return;
        }

        alert(data.mensagem);
        carregarUsuarios();
        
    } catch (error) {
        console.error('Erro ao banir usuário:', error);
        alert('Erro ao banir usuário: ' + error.message);
    }
}

async function desbanirUsuario(usuarioId) {
    try {
        const response = await fetch(`https://onirotalk-backend.onrender.com/admin/banir`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                usuario_id: usuarioId,
                admin_id: usuarioLogado.id,
                acao: 'desbanir'
            })
        });

        const data = await response.json();
        
        if (data.erro) {
            alert('Erro: ' + data.mensagem);
            return;
        }

        alert(data.mensagem);
        carregarUsuarios();
        
    } catch (error) {
        console.error('Erro ao desbanir usuário:', error);
        alert('Erro ao desbanir usuário: ' + error.message);
    }
}

async function excluirUsuario(usuarioId) {
    if (!confirm('ATENÇÃO: Tem certeza que deseja EXCLUIR este usuário? TODOS os dados serão perdidos permanentemente. Esta ação não pode ser desfeita!')) {
        return;
    }

    try {
        const response = await fetch(`https://onirotalk-backend.onrender.com/admin/excluir`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                usuario_id: usuarioId,
                admin_id: usuarioLogado.id
            })
        });

        const data = await response.json();
        
        if (data.erro) {
            alert('Erro: ' + data.mensagem);
            return;
        }

        alert(data.mensagem);
        carregarUsuarios();
        
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        alert('Erro ao excluir usuário: ' + error.message);
    }
}