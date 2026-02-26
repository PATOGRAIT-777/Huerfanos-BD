// dashboard.js - controla la tabla de personal en dashboard.html
const API_BASE = 'http://localhost:3000/api/auth';

async function loadPersonal() {
    try {
        const headers = {};
    const token = localStorage.getItem('token');
    if(token) headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch(`${API_BASE}/users`, { headers });
        if (!res.ok) throw new Error('Error cargando lista');
        const lista = await res.json();
        renderTable(lista);
    } catch (e) {
        console.error(e);
        alert('No se pudo cargar el listado de personal');
    }
}

function renderTable(data) {
    const tbody = document.querySelector('#personal-table tbody');
    tbody.innerHTML = '';
    const tipoFilter = document.getElementById('filter-tipo').value;
    const rolFilter = document.getElementById('filter-rol').value;

    data.forEach(u => {
        if (tipoFilter && u.tipo_contrato !== tipoFilter) return;
        if (rolFilter && u.rol !== rolFilter) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${u.nombre_completo}</td>
            <td>${u.rol}</td>
            <td>${u.tipo_contrato}</td>
            <td>${u.estatus}</td>
            <td>
                <button data-id="${u.id}" class="btn-view">Consultar</button>
                <button data-id="${u.id}" class="btn-edit">Editar</button>
                ${u.estatus === 'Activo' ?
                  `<button data-id="${u.id}" class="btn-revoke">Revocar</button>` :
                  `<button data-id="${u.id}" class="btn-activate">Activar</button>`}
                <button data-id="${u.id}" class="btn-delete">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // attach listeners after rows exist
    tbody.querySelectorAll('.btn-view').forEach(btn => btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        window.location.href = `formAgregar.html?id=${id}&view=true`;
    }));

    tbody.querySelectorAll('.btn-edit').forEach(btn => btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        window.location.href = `formAgregar.html?id=${id}`;
    }));

    tbody.querySelectorAll('.btn-revoke').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (!confirm('¿Deseas cambiar el estatus a Inactivo?')) return;
        await fetch(`${API_BASE}/users/${id}/status`, {
            method: 'PATCH',
            headers:{
                'Content-Type':'application/json',
                'Authorization':'Bearer ' + (localStorage.getItem('token')||'')
            },
            body: JSON.stringify({ estatus: 'Inactivo' })
        });
        loadPersonal();
    }));
    tbody.querySelectorAll('.btn-activate').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (!confirm('¿Deseas activar nuevamente a esta persona?')) return;
        await fetch(`${API_BASE}/users/${id}/status`, {
            method: 'PATCH',
            headers:{
                'Content-Type':'application/json',
                'Authorization':'Bearer ' + (localStorage.getItem('token')||'')
            },
            body: JSON.stringify({ estatus: 'Activo' })
        });
        loadPersonal();
    }));

    tbody.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (!confirm('¿Eliminar permanentemente a este usuario?')) return;
        await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE', headers: { 'Authorization':'Bearer ' + (localStorage.getItem('token')||'') } });
        loadPersonal();
    }));
}

// filtros
['filter-tipo','filter-rol'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener('change', loadPersonal);
});

const newBtn = document.getElementById('btn-new-personal');
if (newBtn) newBtn.addEventListener('click', () => {
    window.location.href = 'formAgregar.html';
});

// cargar inicialmente
loadPersonal();
