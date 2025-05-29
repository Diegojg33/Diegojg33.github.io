// server.js

const express = require('express');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const cors = require('cors');
const path = require('path'); // Para construir rutas de archivo de forma segura

const app = express();
const httpPort = 3000;

// --- CONFIGURACIÓN DE CORS ---
// Permite peticiones desde tu URL específica de GitHub Pages
// y opcionalmente desde localhost para desarrollo local del frontend.
const allowedOrigins = [
    'https://Diegojg33.github.io', // Reemplaza si tu usuario/repo es diferente
    // 'http://localhost:3000' // Descomenta si sirves y pruebas el frontend localmente
];

app.use(cors({
    origin: function (origin, callback) {
        // Permite peticiones sin 'origin' (como Postman, apps móviles, o si el archivo HTML se abre localmente como file://)
        // O si el origen está en la lista de permitidos
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn(`Origen no permitido por CORS: ${origin}`); // Log para depuración
            callback(new Error('Origen no permitido por CORS'));
        }
    }
}));

// --- SERVIR ARCHIVOS ESTÁTICOS DESDE LA RAÍZ DEL PROYECTO ---
// __dirname se refiere al directorio donde server.js está actualmente.
app.use(express.static(__dirname));

// --- RUTA PARA SERVIR index.html CUANDO SE ACCEDE A LA RAÍZ DEL SITIO (/) ---
// Esto asegura que tu página principal se cargue.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- CONFIGURACIÓN DEL PUERTO SERIE CON EL ARDUINO ---
// ¡¡¡IMPORTANTE!!! Cambia 'COM_DE_TU_ARDUINO' al puerto serie correcto de tu Arduino.
// En Windows es algo como 'COM3', 'COM4', etc.
// En Linux/macOS es algo como '/dev/ttyUSB0', '/dev/ttyACM0'.
const arduinoPortPath = 'COM_DE_TU_ARDUINO'; // <--- ¡¡¡CAMBIA ESTO!!!
let serialPort;

try {
    serialPort = new SerialPort({
        path: arduinoPortPath,
        baudRate: 9600, // Debe coincidir con Serial.begin() en Arduino
    });
} catch (err) {
    console.error(`Error inicial al intentar configurar el puerto ${arduinoPortPath}.`);
    console.error(err);
    // No salimos del proceso aquí, intentaremos conectar en 'open' o manejar el error en las rutas
}

// Parser para leer líneas de datos del Arduino
const parser = serialPort ? serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' })) : null;

if (serialPort) {
    serialPort.on('open', () => {
        console.log(`Puerto serie ${arduinoPortPath} abierto.`);
    });

    if (parser) {
        parser.on('data', (data) => {
            console.log('Arduino dice:', data);
            // Aquí podrías enviar esta data a la página web usando WebSockets si quieres feedback en tiempo real
        });
    }

    serialPort.on('error', (err) => {
        console.error('Error en el puerto serie:', err.message);
        // Podrías intentar cerrar y reabrir el puerto aquí, o simplemente loguear el error.
    });

    serialPort.on('close', () => {
        console.log(`Puerto serie ${arduinoPortPath} cerrado.`);
        // Podrías intentar reabrirlo aquí si es un cierre inesperado.
    });
} else {
    console.error(`No se pudo inicializar el puerto serie ${arduinoPortPath}. El control del Arduino no funcionará.`);
}


// --- RUTA PARA CONTROLAR LOS LEDS ---
app.get('/control-led', (req, res) => {
    const comando = req.query.comando; // Ej: /control-led?comando=LED1_ON

    if (!serialPort || !serialPort.isOpen) {
        console.error('El puerto serie no está abierto o no está disponible.');
        return res.status(503).send('Error: Puerto serie no disponible en este momento.'); // 503 Service Unavailable
    }

    if (comando) {
        console.log(`Recibido de la web: '${comando}'. Enviando a Arduino...`);
        serialPort.write(comando + '\n', (err) => { // Añadimos '\n' porque el Arduino lee hasta el salto de línea
            if (err) {
                console.error('Error al escribir en el puerto serie:', err.message);
                return res.status(500).send('Error al enviar comando al Arduino.');
            }
            console.log(`Comando '${comando}' enviado al Arduino.`);
            res.send(`Comando '${comando}' enviado al Arduino.`);
        });
    } else {
        res.status(400).send('Comando no especificado en la petición.'); // 400 Bad Request
    }
});

// --- INICIAR EL SERVIDOR WEB ---
app.listen(httpPort, () => {
    console.log(`Servidor web escuchando en http://localhost:${httpPort}`);
    console.log(`Abre http://localhost:3000 en tu navegador para pruebas locales.`);
    if (!serialPort) {
        console.warn(`ADVERTENCIA: El servidor se inició, pero el puerto serie ${arduinoPortPath} no pudo ser configurado. El control del Arduino no funcionará.`);
    }
});

// --- MANEJO DE CIERRE GRACEFUL DEL PROGRAMA (opcional pero buena práctica) ---
process.on('SIGINT', () => { // Se activa con Ctrl+C
    console.log('\nCerrando conexión serial y servidor...');
    if (serialPort && serialPort.isOpen) {
        serialPort.close((err) => {
            if (err) {
                console.error('Error al cerrar el puerto serie:', err.message);
            } else {
                console.log('Puerto serie cerrado.');
            }
            process.exit(0); // Salir después de cerrar el puerto
        });
    } else {
        process.exit(0); // Salir si el puerto no estaba abierto
    }
});