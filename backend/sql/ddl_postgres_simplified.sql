-- =================================================================
-- DDL SIMPLIFICADO - Solo Personal / Gestión de Personal
-- =================================================================

-- Limpiar esquema anterior
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =================================================================
-- 1. ARCHIVOS (Para documentos de personal)
-- =================================================================
CREATE TABLE archivos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  url text NOT NULL,
  nombre_archivo text,
  mime text,
  tamano integer,
  subido_en timestamptz DEFAULT now()
);

-- =================================================================
-- 2. DIVISIONES DE MÉXICO (Catálogo de direcciones)
-- =================================================================
CREATE TABLE mx_divisiones (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo_postal text NOT NULL,
  colonia text NOT NULL,
  municipio text NOT NULL,
  estado text NOT NULL
);

-- Índice para búsquedas rápidas por CP
CREATE INDEX idx_mx_cp ON mx_divisiones(codigo_postal);
CREATE INDEX idx_mx_estado_municipio ON mx_divisiones(estado, municipio);

-- =================================================================
-- 3. USUARIOS / PERSONAL
-- =================================================================
CREATE TABLE usuarios (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  
  -- Datos Personales
  nombre_completo text NOT NULL,
  nombre text,                    -- Opcional, para primer nombre
  apellidos text,                 -- Opcional, para apellidos separados
  curp text NOT NULL,
  rfc text,
  sexo text CHECK (sexo IN ('mujer', 'hombre', 'otro', 'prefiere_no_decir')),
  edad integer,
  fecha_nacimiento date,
  
  -- Datos Laborales
  rol text NOT NULL CHECK (rol IN (
    'Director', 'Coordinador', 'Psicólogo', 'Doctor', 'Abogado', 
    'Trabajador Social', 'Analista'
  )),
  tipo_contrato text NOT NULL CHECK (tipo_contrato IN ('Empleado', 'Voluntario')),
  estatus text NOT NULL CHECK (estatus IN ('Activo', 'Inactivo')) DEFAULT 'Activo',
  
  -- Contacto
  telefono text,
  telefono_secundario text,
  
  -- Dirección
  calle text,
  num_exterior text,
  num_interior text,
  ubicacion_id uuid REFERENCES mx_divisiones(id),
  
  -- Documentos
  id_type text CHECK (id_type IN ('INE', 'Pasaporte', 'Otro')),
  id_number text,
  proof_address_id uuid REFERENCES archivos(id),
  proof_id_id uuid REFERENCES archivos(id),
  
  -- Auditoría
  creado_en timestamptz DEFAULT now(),
  actualizado_en timestamptz DEFAULT now()
);

-- Índices útiles
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_usuarios_tipo_contrato ON usuarios(tipo_contrato);
CREATE INDEX idx_usuarios_estatus ON usuarios(estatus);

-- =================================================================
-- 4. CONTACTOS DE EMERGENCIA (Opcional, para datos adicionales)
-- =================================================================
CREATE TABLE contactos_usuarios (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id uuid REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  relacion text,
  telefono text NOT NULL,
  creado_en timestamptz DEFAULT now()
);

CREATE INDEX idx_contactos_usuario ON contactos_usuarios(usuario_id);
