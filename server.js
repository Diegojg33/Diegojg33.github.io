// server.js

// 1. Importar las librerías necesarias
const express = require('express');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const cors = require('cors'); // Importar CORS

// 2. Configurar la aplicación Express
const app = express();
const httpPort = 3000; // Puerto en el que escuchará el servidor web local

// 3. --- CONFIGURAR CORS ---
// Define la URL exacta de tu página de GitHub Pages.
// ¡¡¡REEMPLAZA ESTO CON TU URL REAL!!!
const GITHUB_PAGES_URL = 'https://Diegojg33.github.io/'; 
// Ejemplo: const GITHUB_PAGES_URL = 'https://diegojg33.github.io';

const allowedOrigins = [
    GITHUB_PAGES_URL,
    // Puedes añadir otros orígenes si los necesitas para desarrollo, por ejemplo:
    // 'http://localhost:3000', // Si sirves el frontend localmente para pruebas
    // 'http://127.0.0.1:3000'
];

app.use(cors({
    origin: function (origin, callback) {
        // `origin` es la URL desde donde viene la petición.
        // Puede ser `undefined` para peticiones del mismo origen o algunas herramientas.
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            console.log(`CORS: Petición permitida desde el origen: ${origin || 'mismo origen/desconocido'}`);
            callback(null, true); // Permitir la petición
        } else {
            console.error(`CORS: Petición BLOQUEADA desde el origen: ${origin}. Orígenes permitidos: ${allowedOrigins.join(', ')}`);
            callback(new Error(`El origen ${origin} no está permitido por la política CORS.`)); // Bloquear la petición
        }
    }
}));
// --------------------

// 4. Servir archivos estáticos desde la carpeta 'public'
// Esto debe ir DESPUÉS de la configuración de CORS si quieres que CORS se aplique también
// a las peticiones de archivos estáticos (aunque para GET de archivos no suele ser un problema).
// Para nuestro caso, donde CORS es principalmente para la ruta /control-led, el orden es flexible.
app.use(express.static(__dirname));

// 5. ----- CONFIGURACIÓN DEL PUERTO SERIE -----
// ¡IMPORTANTE! Cambia 'COM_DE_TU_ARDUINO' al puerto serie correcto de tu Arduino.
// Ejemplo para Windows: 'COM3', 'COM5', etc.
// Ejemplo para Linux: '/dev/ttyUSB0', '/dev/ttyACM0', etc.
// Ejemplo para macOS: '/dev/cu.usbmodemXXXXX', etc.
const arduinoPortPath = 'COM5'; // <--- ¡¡¡REEMPLAZA ESTO!!!
let serialPort;
let parser;

try {
    serialPort = new SerialPort({
        path: arduinoPortPath,
        baudRate: 9600, // Debe coincidir con Serial.begin() en Arduino
    });

    parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    serialPort.on('open', () => {
        console.log(`Puerto serie ${arduinoPortPath} abierto.`);
    });

    parser.on('data', (data) => {
        console.log('Arduino dice:', data);
        // Aquí podrías enviar esta data a la página web usando WebSockets si quieres feedback en tiempo real
    });

    serialPort.on('error', (err) => {
        console.error('Error en el puerto serie:', err.message);
    });

    serialPort.on('close', () => {
        console.log(`Puerto serie ${arduinoPortPath} cerrado.`);
    });

} catch (err) {
    console.error(`Error al intentar crear o abrir el puerto ${arduinoPortPath}. ¿Está conectado el Arduino? ¿Es el puerto correcto?`);
    console.error(err);
    // Considera no salir del proceso si solo el puerto serial falla, para que el servidor HTTP siga funcionando.
    // process.exit(1);
}
// ----------------------------------------

// 6. Ruta para controlar los LEDs
app.get('/control-led', (req, res) => {
    const comando = req.query.comando; // Ej: /control-led?comando=LED1_ON

    if (!serialPort || !serialPort.isOpen) {
        console.error('El puerto serie no está abierto o no está disponible.');
        // Envía una respuesta clara al cliente
        return res.status(503).send('Error: El puerto serie para comunicarse con el Arduino no está disponible.');
    }

    if (comando) {
        console.log(`Comando '${comando}' recibido de la web. Enviando a Arduino...`);
        serialPort.write(comando + '\n', (err) => { // Añadimos '\n' porque el Arduino lee hasta el salto de línea
            if (err) {
                console.error('Error al escribir en el puerto serie:', err.message);
                return res.status(500).send('Error al enviar comando al Arduino.');
            }
            console.log(`Comando '${comando}' enviado correctamente al Arduino.`);
            res.send(`Comando '${comando}' enviado al Arduino.`);
        });
    } else {
        res.status(400).send('Comando no especificado en la petición.');
    }
});

// 7. Iniciar el servidor web
app.listen(httpPort, () => {
    console.log(`Servidor web escuchando en http://localhost:${httpPort}`);
    console.log(`Tu frontend (si está en GitHub Pages) debería apuntar a la URL de Ngrok.`);
    console.log(`Asegúrate de que la URL de GitHub Pages (${GITHUB_PAGES_URL}) esté en 'allowedOrigins' para CORS.`);
});

// 8. Manejo de cierre del programa para cerrar el puerto serie (opcional pero buena práctica)
process.on('SIGINT', () => { // Ctrl+C
    console.log('Cerrando conexión serial por SIGINT...');
    if (serialPort && serialPort.isOpen) {
        serialPort.close((err) => {
            if (err) {
                console.error('Error al cerrar el puerto serie en SIGINT:', err.message);
                process.exit(1);
            }
            console.log('Puerto serie cerrado correctamente.');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});