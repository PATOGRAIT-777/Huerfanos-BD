(function(){
  // CORRECCIÓN AQUÍ: Cambiamos 'mx-divisions' por 'mxDivisions' (tal cual se llama tu archivo en routes/)
  const BASE_API_URL = 'http://localhost:3000/api/mxDivisions';

  // DOM elements
  const stateSelect = document.getElementById('mx_state');
  const municipioSelect = document.getElementById('mx_municipio');
  const coloniaSelect = document.getElementById('mx_colonia');
  const cpInput = document.querySelector('input[name="cp"]');
  const yearEl = document.getElementById('year');

  if(yearEl) yearEl.textContent = new Date().getFullYear();

  // Helpers globales para validaciones
  window.regValNum = function(event) {
    const numeros = "1234567890";
    const tecla = String.fromCharCode(event.which || event.keyCode);
    if (numeros.indexOf(tecla) === -1) { alert("Por favor, ingresa solo números"); return false; }
    return true;
  };

  window.regValText = function(event) {
    const letras = "abcdefghijklmnñopqrstuvwxyzABCDEFGHIJKLMNÑOPQRSTUVWXYZ ";
    const tecla = String.fromCharCode(event.which || event.keyCode);
    if (letras.indexOf(tecla) === -1) { alert("Por favor, ingresa solo texto"); return false; }
    return true;
  };

  // --- API FETCH FUNCTIONS ---
  async function fetchStates() {
    try {
      if(!stateSelect) {
        console.error('❌ stateSelect no encontrado en DOM');
        return;
      }
      stateSelect.disabled = true;
      stateSelect.innerHTML = '<option value="">Cargando estados...</option>';
      console.log('📡 Solicitud a:', `${BASE_API_URL}/states`);
      
      const response = await fetch(`${BASE_API_URL}/states`);
      console.log('📨 Respuesta status:', response.status);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const states = await response.json();
      console.log('✅ Estados recibidos:', states.length, states);
      
      if (!states || states.length === 0) {
        stateSelect.innerHTML = '<option value="">-- No hay estados disponibles --</option>';
        stateSelect.disabled = false;
        return;
      }
      
      stateSelect.innerHTML = '<option value="">-- Selecciona estado --</option>';
      states.sort((a,b)=>a.localeCompare(b,'es')).forEach(state => {
        const opt = document.createElement('option');
        opt.value = state;
        opt.textContent = state;
        stateSelect.appendChild(opt);
      });
      stateSelect.disabled = false;
    } catch (error) {
      console.error('❌ Error fetching states:', error);
      if(stateSelect) {
         stateSelect.innerHTML = '<option value="">-- Error al cargar --</option>';
         stateSelect.disabled = false;
      }
    }
  }

  async function fetchMunicipalities(state) {
    try {
      municipioSelect.disabled = true;
      municipioSelect.innerHTML = '<option value="">Cargando municipios...</option>';
      
      const response = await fetch(`${BASE_API_URL}/municipalities/${encodeURIComponent(state)}`);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const municipalities = await response.json();
      
      municipioSelect.innerHTML = '<option value="">-- Selecciona municipio --</option>';
      coloniaSelect.innerHTML = '<option value="">-- Selecciona colonia --</option>';
      cpInput.value = '';
      
      municipalities.sort((a,b)=>a.localeCompare(b,'es')).forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        municipioSelect.appendChild(opt);
      });
      municipioSelect.disabled = false;
      coloniaSelect.disabled = true;
    } catch (error) {
      console.error('Error fetching municipalities:', error);
      municipioSelect.innerHTML = '<option value="">-- Error --</option>';
      municipioSelect.disabled = false;
    }
  }

  async function fetchColonias(state, municipio) {
    try {
      coloniaSelect.disabled = true;
      coloniaSelect.innerHTML = '<option value="">Cargando colonias...</option>';
      
      const response = await fetch(`${BASE_API_URL}/colonias/${encodeURIComponent(state)}/${encodeURIComponent(municipio)}`);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const colonias = await response.json(); 
      
      coloniaSelect.innerHTML = '<option value="">-- Selecciona colonia --</option>';
      cpInput.value = '';
      
      colonias.sort((x,y)=> (x.colonia||'').localeCompare(y.colonia||'','es')).forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.colonia;
        opt.textContent = c.colonia;
        opt.dataset.cp = c.codigo_postal;
        coloniaSelect.appendChild(opt);
      });
      coloniaSelect.disabled = false;
    } catch (error) {
      console.error('Error fetching colonias:', error);
      coloniaSelect.innerHTML = '<option value="">-- Error --</option>';
      coloniaSelect.disabled = false;
    }
  }

  // Listeners
  if(stateSelect) stateSelect.addEventListener('change', () => {
    const selectedState = stateSelect.value;
    if (selectedState) fetchMunicipalities(selectedState);
  });

  if(municipioSelect) municipioSelect.addEventListener('change', () => {
    const selectedState = stateSelect.value;
    const selectedMunicipio = municipioSelect.value;
    if (selectedState && selectedMunicipio) fetchColonias(selectedState, selectedMunicipio);
  });

  if(coloniaSelect) coloniaSelect.addEventListener('change', () => {
    const selectedColoniaOption = coloniaSelect.options[coloniaSelect.selectedIndex];
    if (selectedColoniaOption && selectedColoniaOption.dataset.cp) cpInput.value = selectedColoniaOption.dataset.cp;
  });

  // Carga inicial
  fetchStates();

  // Mostrar campos extra dependiendo del rol profesional
  const roleSelect = document.querySelector('select[name="rol"]');
  const extraContainer = document.getElementById('extraFieldsContainer');
  if(roleSelect && extraContainer) {
    roleSelect.addEventListener('change', () => {
      const val = roleSelect.value;
      extraContainer.innerHTML = '';
      if(val === 'Doctor' || val === 'Psicólogo' || val === 'Abogado') {
        const label = document.createElement('label');
        label.innerHTML =
          (val === 'Doctor' ? 'Cédula Profesional' :
           val === 'Psicólogo' ? 'Número de registro' :
           'Cédula / Adscripción') +
          `<input type="text" name="cedula_${val.toLowerCase().replace(/\s+/g,'_')}" placeholder="Ingrese cédula o registro">`;
        extraContainer.appendChild(label);
      }
      // otros roles no requieren campos extra por ahora
    });
  }

  // Si hay query param ?id=..., cargamos datos para edición
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('id');
  const viewMode = urlParams.get('view') === 'true';
  if(editId) {
    // añadir enlace de retorno
    const titleEl = document.querySelector('.reg-card h2');
    if(titleEl) {
      const back = document.createElement('a');
      back.href = 'dashboard.html';
      back.textContent = '← Volver al listado';
      back.style.display = 'inline-block';
      back.style.marginBottom = '8px';
      titleEl.parentNode.insertBefore(back, titleEl);
    }
    loadForEdit(editId, viewMode);
  }

  // Función para cargar datos de un usuario y rellenar el formulario
  async function loadForEdit(id, viewMode=false) {
    try {
      const headers = {};
      const tkn = localStorage.getItem('token');
      if(tkn) headers['Authorization'] = 'Bearer ' + tkn;
      const res = await fetch(`http://localhost:3000/api/auth/profile?id=${id}`, { headers });
      if(!res.ok) throw new Error('Perfil no encontrado');
      const u = await res.json();
      const form = document.querySelector('form[action="#register"]');
      const titleEl = document.querySelector('.reg-card h2');
      if(titleEl) titleEl.textContent = viewMode ? 'Consultar personal' : 'Editar personal';
      // hide login section when editing/viewing
      const loginCard = document.querySelector('.reg-card:nth-of-type(2)');
      if(loginCard) loginCard.style.display = 'none';
      if(form) {
        form.action = '#update';
        // ocultar contraseñas al editar porque no se manejan aquí
        const pwd1 = form.querySelector('input[name="password"]');
        const pwd2 = form.querySelector('input[name="password_confirm"]');
        if(pwd1) pwd1.closest('label').style.display='none';
        if(pwd2) pwd2.closest('label').style.display='none';
        
        // si es solo consulta, deshabilitamos todos los campos y ocultamos el botón
        if(viewMode) {
          form.querySelectorAll('input,select').forEach(i=>i.disabled=true);
          form.querySelector('button[type="submit"]').style.display='none';
        }

        form.nombre.value = u.nombre || u.nombre_completo || '';
        // Apellidos separados si es posible
        if(u.nombre_completo) {
          const parts = u.nombre_completo.split(' ');
          form.nombre.value = parts.slice(0, -1).join(' ');
          form.apellidos.value = parts.slice(-1).join(' ');
        }
        form.curp.value = u.curp || '';
        form.rfc.value = u.rfc || '';
        if(form.sexo) form.sexo.value = u.sexo || '';
        if(form.fecha_nacimiento) form.fecha_nacimiento.value = u.fecha_nacimiento || '';
        form.email.value = u.email || '';
        form.telefono.value = u.telefono || '';
        form.telefono2.value = u.telefono_secundario || '';
        form.calle_num.value = u.calle || '';
        form.num_int.value = u.num_interior || '';
        if(u.tipo_contrato) form.tipo_contrato.value = u.tipo_contrato;
        if(u.rol) form.rol.value = u.rol;
        if(u.estatus) {
            const statusLabel = document.createElement('label');
            statusLabel.innerHTML = `Estatus
                <select name="estatus">
                  <option${u.estatus==='Activo'?' selected':''}>Activo</option>
                  <option${u.estatus==='Inactivo'?' selected':''}>Inactivo</option>
                </select>`;
            form.insertBefore(statusLabel, form.querySelector('button[type="submit"]').parentNode);
        }
        // seleccionar ubicación
        if(u.ubicacion && u.ubicacion.estado) {
          stateSelect.value = u.ubicacion.estado;
          await fetchMunicipalities(u.ubicacion.estado);
          municipioSelect.value = u.ubicacion.municipio;
          await fetchColonias(u.ubicacion.estado, u.ubicacion.municipio);
          coloniaSelect.value = u.ubicacion.colonia;
          if(cpInput) cpInput.value = u.ubicacion.codigo_postal;
        }
      }
    } catch(err) {
      console.error('Error cargando datos de edición', err);
      alert('No se pudieron cargar los datos para editar');
    }
  }

  // Listener para manejar submit de actualización si estamos editando
  document.querySelector('form[action="#register"]').addEventListener('submit', async function(e){
    const form = this;
    if(form.action === '#update' && editId) {
      e.preventDefault();
      const fd = new FormData(form);
      // convertir FormData a objeto JSON
      const obj = {};
      for(const [k,v] of fd.entries()) { obj[k] = v; }
      // calcular edad si se proporciona fecha de nacimiento
      if(obj.fecha_nacimiento) {
        const bd = new Date(obj.fecha_nacimiento);
        const now = new Date();
        let age = now.getFullYear() - bd.getFullYear();
        if(now < new Date(bd.getFullYear()+age, bd.getMonth(), bd.getDate())) age--;
        obj.edad = age;
      }
      obj.id = editId;
      try {
        const headers = {'Content-Type':'application/json'};
        const tkn = localStorage.getItem('token');
        if(tkn) headers['Authorization'] = 'Bearer ' + tkn;
        const res = await fetch('http://localhost:3000/api/auth/update-user', {
          method: 'PUT', headers, body: JSON.stringify(obj)
        });
        const data = await res.json();
        if(res.ok) {
          alert('Registro actualizado');
          window.location.href = 'dashboard.html';
        } else {
          alert('Error: ' + data.message);
        }
      } catch(err) {
        console.error(err); alert('Error de conexión');
      }
    }
  });

})();