// ⚠️ ¡REEMPLAZA ESTA URL con la que copiaste en el Paso 5!
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz3ACy3uzcj8fK6Fiq4LWqQVFrYtRVTArQ26xOGjGHosh-N2PDhpXROXfm8xeAZSnA/exec';

let fotoDataURL = null;

// Generar lotes 1-168
const optgroup = document.getElementById('lotesOptgroup');
for (let i = 1; i <= 168; i++) {
    const option = document.createElement('option');
    option.value = `LOTE-${i}`;
    option.textContent = `Lote ${i}`;
    optgroup.appendChild(option);
}

// Vista previa de foto
document.getElementById('foto').addEventListener('change', function(e) {
    const preview = document.getElementById('preview');
    preview.innerHTML = '';
    if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            fotoDataURL = e.target.result;
            const img = document.createElement('img');
            img.src = e.target.result;
            preview.appendChild(img);
        };
        reader.readAsDataURL(this.files[0]);
    } else {
        fotoDataURL = null;
    }
});

// Obtener última lectura
async function obtenerUltimaLectura(lote) {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getLast&lote=${encodeURIComponent(lote)}`);
        return await response.json();
    } catch (error) {
        console.error(error);
        return null;
    }
}

// Subir foto
async function subirFoto(blobData, nombre) {
    const formData = new FormData();
    formData.append('file', blobData, nombre);
    
    const response = await fetch(`${SCRIPT_URL}?action=upload`, {
        method: 'POST',
        body: formData
    });
    const result = await response.json();
    return result.success ? result.fileUrl : null;
}

// Guardar registro
async function guardarRegistro(registro) {
    const response = await fetch(`${SCRIPT_URL}?action=save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registro)
    });
    return await response.json();
}

// Calcular consumo
function calcularConsumo(lecturaActual, lecturaAnterior, fechaActual, fechaAnterior) {
    if (!lecturaAnterior) return null;
    const diffLectura = lecturaActual - lecturaAnterior;
    const dias = Math.ceil((new Date(fechaActual) - new Date(fechaAnterior)) / (1000*60*60*24));
    return { dias: dias, promedio: (diffLectura / dias).toFixed(2) };
}

// Mostrar info anterior
function mostrarInfoAnterior(ultima, lecturaActual) {
    if (!ultima || !ultima.lectura) {
        document.getElementById('infoAnterior').style.display = 'none';
        return;
    }
    
    const calculo = calcularConsumo(lecturaActual, ultima.lectura, new Date(), ultima.fecha);
    if (calculo) {
        document.getElementById('fechaAnt').textContent = new Date(ultima.fecha).toLocaleDateString();
        document.getElementById('lecturaAnt').textContent = ultima.lectura;
        document.getElementById('dias').textContent = calculo.dias;
        document.getElementById('promedio').textContent = `${calculo.promedio} unidades/día`;
        document.getElementById('infoAnterior').style.display = 'block';
    }
}

function mostrarMensaje(texto, tipo) {
    const msg = document.getElementById('mensaje');
    msg.textContent = texto;
    msg.className = `message ${tipo}`;
    setTimeout(() => {
        msg.textContent = '';
        msg.className = 'message';
    }, 4000);
}

function limpiarFormulario() {
    document.getElementById('lote').value = '';
    document.getElementById('lectura').value = '';
    document.getElementById('observaciones').value = '';
    document.getElementById('foto').value = '';
    document.getElementById('preview').innerHTML = '';
    document.getElementById('infoAnterior').style.display = 'none';
    fotoDataURL = null;
}

// Evento guardar
document.getElementById('registroForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const lote = document.getElementById('lote').value;
    const lectura = parseInt(document.getElementById('lectura').value);
    const observaciones = document.getElementById('observaciones').value;
    
    if (!lote || !lectura) {
        mostrarMensaje('Complete lote y lectura', 'error');
        return;
    }
    
    const ultima = await obtenerUltimaLectura(lote);
    if (ultima && ultima.lectura && lectura <= ultima.lectura) {
        mostrarMensaje(`La lectura (${lectura}) debe ser mayor a la anterior (${ultima.lectura})`, 'error');
        return;
    }
    
    const submitBtn = document.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Guardando...';
    submitBtn.disabled = true;
    
    try {
        const lecturaId = `${lote}_${Date.now()}`;
        let fotoUrl = null;
        
        if (fotoDataURL) {
            const blob = await fetch(fotoDataURL).then(r => r.blob());
            fotoUrl = await subirFoto(blob, `foto_${lecturaId}.jpg`);
        }
        
        const registro = {
            id: lecturaId,
            lote: lote,
            lectura: lectura,
            observaciones: observaciones,
            fecha: new Date().toISOString(),
            fotoUrl: fotoUrl
        };
        
        const resultado = await guardarRegistro(registro);
        
        if (resultado.success) {
            mostrarMensaje('✅ Registro guardado con éxito', 'success');
            mostrarInfoAnterior(ultima, lectura);
            setTimeout(limpiarFormulario, 2000);
        } else {
            mostrarMensaje('Error al guardar', 'error');
        }
    } catch (error) {
        mostrarMensaje('Error de conexión', 'error');
    } finally {
        submitBtn.textContent = '💾 Guardar';
        submitBtn.disabled = false;
    }
});

// Botón nuevo registro
document.getElementById('nuevoBtn').addEventListener('click', () => {
    limpiarFormulario();
    mostrarMensaje('Formulario limpio', 'success');
});

// Cargar info al seleccionar lote
document.getElementById('lote').addEventListener('change', async (e) => {
    if (e.target.value) {
        const ultima = await obtenerUltimaLectura(e.target.value);
        if (ultima && ultima.lectura) {
            const lecturaActual = document.getElementById('lectura').value;
            if (lecturaActual) mostrarInfoAnterior(ultima, parseInt(lecturaActual));
            else document.getElementById('infoAnterior').style.display = 'none';
        }
    }
});