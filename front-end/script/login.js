document.getElementById('loginForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const mensagemDiv = document.getElementById('mensagem');
    
    mensagemDiv.style.display = 'none';
    mensagemDiv.textContent = '';
    
    try {
        const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, senha })
        });
        
        const data = await response.json();
        
        if (data.erro) {
            mensagemDiv.style.display = 'block';
            mensagemDiv.style.color = '#e74c3c';
            mensagemDiv.textContent = data.mensagem;
        } else {
            mensagemDiv.style.display = 'block';
            mensagemDiv.style.color = '#2ecc71';
            mensagemDiv.textContent = data.mensagem;
            
            localStorage.setItem('usuario', JSON.stringify(data.usuario));
            console.log('Usuário salvo no localStorage:', data.usuario);
            
            setTimeout(() => {
                console.log("Redirecionando para index.")
                window.location.href = 'index.html';
            }, 1000);
        }
        
    } catch (error) {
        console.error('Erro:', error);
        mensagemDiv.style.display = 'block';
        mensagemDiv.style.color = '#e74c3c';
        mensagemDiv.textContent = 'Erro ao conectar com o servidor';
    }
});