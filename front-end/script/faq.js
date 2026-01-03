let usuarioFAQ = null;
let modoEdicao = false;
let conteudoOriginal = '';

document.addEventListener('DOMContentLoaded', function() {
    carregarUsuarioFAQ();
    carregarFAQ();
});

function carregarUsuarioFAQ() {
    const usuarioSalvo = localStorage.getItem('usuario');
    if (usuarioSalvo) {
        usuarioFAQ = JSON.parse(usuarioSalvo);
        console.log('Usuário FAQ carregado:', usuarioFAQ) //debug 
        verificarPermissoesAdmin();
    } else {
        console.log('nenhum usuário logado no FAQ');
    }
}

function verificarPermissoesAdmin() {
    console.log('Verificando permissões:', usuarioFAQ);

    const adminControls = document.getElementById('adminControls');
    if (!adminControls) {
        console.log('admincontrols não encontrado.'); //debuggg
        return;
    }

    if (usuarioFAQ && usuarioFAQ.is_admin) {
        console.log('Usuário É admin.');
        adminControls.style.display = 'block';
    } else {
        console.log('Usuário NÃO é admin.')
        adminControls.style.display = 'none';
    }
}

async function carregarFAQ() {
    try {
        const response = await fetch('http://onirotalk-backend.onrender.com/faq');
        const data = await response.json();
        
        if (data.erro) {
            document.getElementById('faqContent').innerHTML = 
                '<p>Erro ao carregar FAQ.</p>';
            return;
        }

        if (data.conteudo) {
            document.getElementById('faqContent').innerHTML = 
                converterMarkdownParaHTML(data.conteudo);
            conteudoOriginal = data.conteudo;
        } else {
            document.getElementById('faqContent').innerHTML = 
                '<p>Nenhum conteúdo disponível no momento.</p>';
            conteudoOriginal = '';
        }
        
    } catch (error) {
        console.error('Erro ao carregar FAQ:', error);
        document.getElementById('faqContent').innerHTML = 
            '<p>Erro ao carregar FAQ.</p>';
    }
}

function habilitarEdicao() {
    if (!usuarioFAQ || !usuarioFAQ.is_admin) {
        alert('Apenas administradores podem editar o FAQ.');
        return;
    }

    modoEdicao = true;
    document.getElementById('faqViewMode').style.display = 'none';
    document.getElementById('faqEditMode').style.display = 'block';
    document.getElementById('adminControls').style.display = 'none';
    
    document.getElementById('faqEditor').value = conteudoOriginal;
}

function cancelarEdicao() {
    modoEdicao = false;
    document.getElementById('faqViewMode').style.display = 'block';
    document.getElementById('faqEditMode').style.display = 'none';
    
    if (usuarioFAQ && usuarioFAQ.is_admin) {
        document.getElementById('adminControls').style.display = 'block';
    }
}

async function salvarFAQ() {
    if (!usuarioFAQ || !usuarioFAQ.is_admin) {
        alert('Apenas administradores podem salvar o FAQ.');
        return;
    }

    const novoConteudo = document.getElementById('faqEditor').value;

    try {
        const response = await fetch('http://onirotalk-backend.onrender.com/faq', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                conteudo: novoConteudo,
                usuario_id: usuarioFAQ.id
            })
        });

        const data = await response.json();
        
        if (data.erro) {
            alert('Erro ao salvar FAQ: ' + data.mensagem);
            return;
        }

        alert('FAQ salvo com sucesso!');
        conteudoOriginal = novoConteudo;
        cancelarEdicao();
        carregarFAQ();
        
    } catch (error) {
        console.error('Erro ao salvar FAQ:', error);
        alert('Erro ao salvar FAQ');
    }
}

function formatText(tipo) {
    const editor = document.getElementById('faqEditor');
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = editor.value.substring(start, end);
    
    let textoFormatado = '';
    
    switch(tipo) {
        case 'bold':
            textoFormatado = `**${selectedText}**`;
            break;
        case 'italic':
            textoFormatado = `*${selectedText}*`;
            break;
        case 'heading1':
            textoFormatado = `# ${selectedText}`;
            break;
        case 'heading2':
            textoFormatado = `## ${selectedText}`;
            break;
        case 'heading3':
            textoFormatado = `### ${selectedText}`;
            break;
        case 'list':
            textoFormatado = selectedText.split('\n').map(line => `- ${line}`).join('\n');
            break;
        case 'link':
            textoFormatado = `[${selectedText}](https://)`;
            break;
        case 'code':
            textoFormatado = `\`${selectedText}\``;
            break;
    }
    
    editor.value = editor.value.substring(0, start) + textoFormatado + editor.value.substring(end);
    editor.focus();
}

function previewFAQ() {
    const conteudo = document.getElementById('faqEditor').value;
    const preview = converterMarkdownParaHTML(conteudo);
    
    const previewWindow = window.open('', 'Preview FAQ', 'width=800,height=600');
    previewWindow.document.write(`
        <html>
            <head><title>Preview FAQ</title></head>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h1>Preview do FAQ</h1>
                <div>${preview}</div>
                <br>
                <button onclick="window.close()">Fechar</button>
            </body>
        </html>
    `);
}

function converterMarkdownParaHTML(markdown) {
    return markdown
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        .replace(/^- (.*$)/gim, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>')
        .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank">$1</a>')
        .replace(/`(.*?)`/gim, '<code>$1</code>')
        .replace(/\n/g, '<br>');
}