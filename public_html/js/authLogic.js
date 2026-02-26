// Archivo: public_html/js/authLogic.js
const API_URL = 'http://localhost:3000/api/auth';

document.addEventListener('DOMContentLoaded', () => {
    
    // --- LÓGICA LOGIN ---
    // Buscamos cualquier form que tenga action="#login"
    const loginForm = document.querySelector('form[action="#login"]');
    
    // Unificamos el ID del mensaje: puede ser 'login-message' o 'loginMessage' según tu HTML
    const loginMessage = document.getElementById('login-message') || document.getElementById('loginMessage');

    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Obtenemos valores. Soporta 'usr'/'pass' (formAgregar) y 'email'/'password' (initPag)
        const email = (loginForm.usr && loginForm.usr.value) || (loginForm.email && loginForm.email.value);
        const password = (loginForm.pass && loginForm.pass.value) || (loginForm.password && loginForm.password.value);

        if(!email || !password) {
            mostrarMensaje(loginMessage, 'Por favor ingresa correo y contraseña', 'error');
            return;
        }

        if(loginMessage) {
            loginMessage.style.display = 'block';
            loginMessage.textContent = 'Verificando...';
            loginMessage.className = 'form-message'; // Clase base
        }

        try {
          const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });

          const data = await res.json();

          if (res.ok) {
            // Guardar sesión
            localStorage.setItem('token', data.token);
            localStorage.setItem('usuario', JSON.stringify(data.user)); 
            
            if(loginMessage) {
                loginMessage.textContent = '¡Éxito! Redirigiendo...';
                loginMessage.style.color = 'green';
            }

            // --- REDIRECCIÓN GENERAL ---
            setTimeout(() => {
                // Para esta nueva dirección, siempre llevaremos al dashboard de personal
                window.location.href = 'dashboard.html';
            }, 800);

          } else {
            mostrarMensaje(loginMessage, data.message || 'Credenciales incorrectas', 'error');
          }
        } catch (error) {
          console.error(error);
          mostrarMensaje(loginMessage, 'Error de conexión con el servidor', 'error');
        }
      });
    }

    // --- LÓGICA REGISTRO ---
    const registerForm = document.querySelector('form[action="#register"]');
    const regMessage = document.getElementById('register-message');

    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const p1 = document.getElementById('password');
        const p2 = document.getElementById('password_confirm');
        
        if (p1 && p2 && p1.value !== p2.value) {
          mostrarMensaje(regMessage, "Las contraseñas no coinciden", 'error');
          return;
        }

        const formData = new FormData(registerForm);
        // si hay fecha de nacimiento, calculamos edad
        if(registerForm.fecha_nacimiento && registerForm.fecha_nacimiento.value) {
            const bd = new Date(registerForm.fecha_nacimiento.value);
            const now = new Date();
            let age = now.getFullYear() - bd.getFullYear();
            if(now < new Date(bd.getFullYear()+age, bd.getMonth(), bd.getDate())) age--;
            formData.set('edad', age);
        }

        try {
          const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            body: formData 
          });

          const data = await res.json();

          if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('usuario', JSON.stringify(data.user));
            alert('¡Registro exitoso!');
            
            // después de registrarse siempre vamos al dashboard de personal
            window.location.href = 'dashboard.html';

          } else {
            mostrarMensaje(regMessage, data.message || 'Error al registrarse', 'error');
          }
        } catch (error) {
          console.error(error);
          mostrarMensaje(regMessage, 'Error de conexión', 'error');
        }
      });
    }

    function mostrarMensaje(elemento, texto, tipo) {
      if(!elemento) return;
      elemento.textContent = texto;
      // Ajuste para soportar estilos de initPag (simple texto) o formAgregar (clases css)
      if(elemento.classList.contains('form-message')) {
          elemento.className = `form-message ${tipo}`;
      } else {
          elemento.style.color = tipo === 'error' ? 'red' : 'green';
      }
      elemento.style.display = 'block';
    }
});