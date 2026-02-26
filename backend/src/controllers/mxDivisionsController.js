// El catálogo maestro de divisiones proviene del JSON suministrado.
// Cargamos el archivo una sola vez en memoria.
const path = require('path');
const mxData = require(path.join(__dirname, '../../scripts/mx_divisions.json'));

// Verificar que los datos se cargaron correctamente
if (!mxData || Object.keys(mxData).length === 0) {
  console.error('⚠️  ERROR: mx_divisions.json no tiene datos o no se cargó correctamente');
} else {
  console.log(`✓ mx_divisions.json cargado: ${Object.keys(mxData).length} estados`);
}

// Obtener todos los estados (solo los que tienen municipios)
exports.getStates = async (req, res) => {
  try {
    if (!mxData || Object.keys(mxData).length === 0) {
      return res.status(500).json({ message: 'Datos de divisiones no cargados' });
    }
    const estados = Object.keys(mxData)
      .filter(estado => mxData[estado] && Object.keys(mxData[estado]).length > 0)
      .sort((a,b)=>a.localeCompare(b,'es'));
    res.json(estados);
  } catch (err) {
    console.error('Error fetching states from JSON:', err);
    res.status(500).json({ message: 'Error fetching states' });
  }
};

// Obtener municipios por estado
exports.getMunicipalitiesByState = async (req, res) => {
  const { estado } = req.params;
  try {
    if (!mxData) {
      return res.status(500).json({ message: 'Datos no cargados' });
    }
    const municipios = (estado && mxData[estado])
      ? Object.keys(mxData[estado]).filter(m => mxData[estado][m] && mxData[estado][m].length > 0).sort((a,b)=>a.localeCompare(b,'es'))
      : [];
    res.json(municipios);
  } catch (err) {
    console.error('Error fetching municipalities from JSON:', err);
    res.status(500).json({ message: 'Error fetching municipalities' });
  }
};

// Obtener colonias por municipio y estado
exports.getColoniasByMunicipalityAndState = async (req, res) => {
  const { estado, municipio } = req.params;
  try {
    const list = [];
    if (estado && municipio && mxData[estado] && mxData[estado][municipio]) {
      mxData[estado][municipio].forEach(o => {
        list.push({ colonia: o.name, codigo_postal: o.cp });
      });
      list.sort((a,b)=>a.colonia.localeCompare(b.colonia,'es'));
    }
    res.json(list);
  } catch (err) {
    console.error('Error fetching colonias from JSON:', err);
    res.status(500).json({ message: 'Error fetching colonias' });
  }
};

// Obtener información de la división por CP (usa JSON)
exports.getDivisionByCP = async (req, res) => {
    const { cp } = req.params;
    try {
        const matches = [];
        for(const estado of Object.keys(mxData)) {
            for(const municipio of Object.keys(mxData[estado])) {
                mxData[estado][municipio].forEach(o => {
                    if(o.cp === cp) {
                        matches.push({ estado, municipio, colonia: o.name, codigo_postal: o.cp });
                    }
                });
            }
        }
        if(matches.length>0) res.json(matches);
        else res.status(404).json({ message: 'No division found for this CP' });
    } catch (err) {
        console.error('Error fetching division by CP:', err);
        res.status(500).json({ message: 'Error fetching division by CP' });
    }
};