// public/js/script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- SELECTORES DE ELEMENTOS DEL DOM ---
    const loginSection = document.getElementById('login-section');
    const controlPanelSection = document.getElementById('control-panel-section');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('loginButton');
    const logoutButton = document.getElementById('logoutButton');
    const loginError = document.getElementById('login-error');
    const statusElement = document.getElementById('status');
    const ledSwitches = document.querySelectorAll('.switch input[type="checkbox"]');

    // NUEVO: Selector para el input de la URL de Ngrok
    const ngrokUrlInput = document.getElementById('ngrokUrlInput');

    // Variable para almacenar la URL de Ngrok.
    // Puedes pre-llenarla aquí si haces commit/push con una URL fija,
    // o dejarla vacía para que se tome del input.
const NGROK_URL = 'https://5786-190-186-2-134.ngrok-free.app';
    // --- CONFIGURACIÓN DEL LOGIN (CLIENT-SIDE - NO SEGURO PARA PRODUCCIÓN) ---
    const VALID_PASSWORD = "1234";

    // --- FUNCIONES ---

    function handleLogin() {
        const password = passwordInput.value;

        if (password === VALID_PASSWORD) {
            loginSection.style.display = 'none';
            controlPanelSection.style.display = 'block';
            loginError.textContent = '';

            // Si el input de Ngrok existe y está vacío, darle foco
            if (ngrokUrlInput && !ngrokUrlInput.value && !NGROK_URL) {
                 ngrokUrlInput.focus();
                 statusElement.textContent = "Por favor, ingresa la URL del servidor (Ngrok).";
                 statusElement.style.color = "orange";
            } else if (ngrokUrlInput && ngrokUrlInput.value) {
                NGROK_URL = ngrokUrlInput.value.trim(); // Tomar valor del input si ya existe
            }

        } else {
            loginError.textContent = 'Usuario o contraseña incorrectos.';
            passwordInput.value = '';
            passwordInput.focus();
        }
    }

    function handleLogout() {
        controlPanelSection.style.display = 'none';
        loginSection.style.display = 'block';
        statusElement.textContent = '';
        usernameInput.value = 'admin';
        passwordInput.value = '1234';
        // NGROK_URL = ''; // Opcional: limpiar la URL de Ngrok al salir
        // if (ngrokUrlInput) ngrokUrlInput.value = ''; // Opcional: limpiar el campo
        ledSwitches.forEach(sw => sw.checked = false);
    }

    async function controlLed(ledNumber, isOn) {
        const accion = isOn ? 'ON' : 'OFF';
        const comando = `LED${ledNumber}_${accion}`;

        // Tomar la URL de Ngrok del input si está presente y tiene valor,
        // de lo contrario, usar la variable NGROK_URL (que podría estar hardcodeada).
        let currentNgrokUrl = NGROK_URL;
        if (ngrokUrlInput && ngrokUrlInput.value.trim()) {
            currentNgrokUrl = ngrokUrlInput.value.trim();
        }

        if (!currentNgrokUrl) {
            statusElement.textContent = 'Error: URL del servidor (Ngrok) no configurada.';
            statusElement.style.color = 'red';
            console.error('URL de Ngrok no definida.');
            if (ngrokUrlInput) ngrokUrlInput.focus(); // Poner foco en el input
            return;
        }

        statusElement.textContent = `Enviando comando: ${comando}...`;
        statusElement.style.color = '#ffc107';

        try {
            const targetUrl = `${currentNgrokUrl}/control-led?comando=${encodeURIComponent(comando)}`;
            console.log("Intentando conectar a:", targetUrl); // Para depuración
            const response = await fetch(targetUrl);

            if (response.ok) {
                const mensajeServidor = await response.text();
                statusElement.textContent = `Servidor: ${mensajeServidor}`;
                statusElement.style.color = 'green';
                console.log(`Comando enviado: ${comando}, Respuesta: ${mensajeServidor}`);
            } else {
                const errorTexto = await response.text();
                statusElement.textContent = `Error del servidor (${response.status}): ${errorTexto || 'No se pudo comunicar.'}`;
                statusElement.style.color = 'red';
                console.error(`Error al enviar comando ${comando} a ${currentNgrokUrl}: ${response.status}`, errorTexto);
            }
        } catch (error) {
            statusElement.textContent = `Error de red con ${currentNgrokUrl}: ${error.message || 'No se pudo conectar al servidor.'}`;
            statusElement.style.color = 'red';
            console.error(`Error de red al enviar comando a ${currentNgrokUrl}:`, error);
        }
    }

    // --- ASIGNACIÓN DE EVENT LISTENERS ---
    if (loginButton) {
        loginButton.addEventListener('click', handleLogin);
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    if (passwordInput) {
        passwordInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleLogin();
            }
        });
    }

    if (ledSwitches.length > 0) {
        ledSwitches.forEach(switchElement => {
            switchElement.addEventListener('change', function() {
                const ledNumber = this.dataset.ledNumber;
                const isChecked = this.checked;
                controlLed(ledNumber, isChecked);
            });
        });
    }

    // Opcional: si quieres que el cambio en el input de Ngrok actualice la variable NGROK_URL al instante
    if (ngrokUrlInput) {
        ngrokUrlInput.addEventListener('change', function() {
            NGROK_URL = this.value.trim();
            if (NGROK_URL) {
                console.log('URL de Ngrok establecida a:', NGROK_URL);
                statusElement.textContent = `URL del servidor actualizada a: ${NGROK_URL}`;
                statusElement.style.color = "blue";
            } else {
                statusElement.textContent = "URL del servidor (Ngrok) borrada.";
                statusElement.style.color = "orange";
            }
        });
        // Para cargarla al inicio si ya tiene un valor (ej. por autocompletar del navegador)
        if (ngrokUrlInput.value.trim()) {
             NGROK_URL = ngrokUrlInput.value.trim();
        }
    }

    console.log("Script del cliente cargado y listo para Ngrok.");
});