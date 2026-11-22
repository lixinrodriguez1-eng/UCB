-- Tablas de Caserita (base micaserita).
-- Siguen los tipos de types/movimiento.ts y types/roles.ts.
-- Se puede ejecutar varias veces: nada se borra ni se duplica.

-- Ventas, compras y fiados que registra la caserita.
CREATE TABLE IF NOT EXISTS movimientos (
  id          TEXT PRIMARY KEY,
  fecha       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  tipo        TEXT          NOT NULL CHECK (tipo IN ('venta', 'compra', 'fiado')),
  producto    TEXT          NOT NULL,
  categoria   TEXT,
  cantidad    NUMERIC(12,3) NOT NULL CHECK (cantidad >= 0),
  unidad      TEXT          NOT NULL,
  total       NUMERIC(12,2) NOT NULL CHECK (total >= 0),   -- Bs
  cliente     TEXT,
  pago        TEXT          NOT NULL CHECK (pago IN ('efectivo', 'qr')),
  solo_deuda  BOOLEAN       NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS movimientos_fecha_idx   ON movimientos (fecha DESC);
CREATE INDEX IF NOT EXISTS movimientos_cliente_idx ON movimientos (lower(cliente));

-- Pagos (totales o a cuenta) de lo que un cliente tenía fiado.
CREATE TABLE IF NOT EXISTS pagos (
  id       TEXT PRIMARY KEY,
  fecha    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  cliente  TEXT          NOT NULL,
  monto    NUMERIC(12,2) NOT NULL CHECK (monto > 0),       -- Bs
  pago     TEXT          NOT NULL CHECK (pago IN ('efectivo', 'qr'))
);
CREATE INDEX IF NOT EXISTS pagos_cliente_idx ON pagos (lower(cliente));

-- Celulares de los clientes (clave: nombre normalizado, ej. "rosa").
CREATE TABLE IF NOT EXISTS contactos (
  clave_cliente TEXT PRIMARY KEY,
  celular       TEXT NOT NULL
);

-- Pedidos de la caserita a productores o mayoristas.
CREATE TABLE IF NOT EXISTS pedidos (
  id            TEXT PRIMARY KEY,
  fecha         TIMESTAMPTZ   NOT NULL DEFAULT now(),
  productor_id  TEXT          NOT NULL,
  caserita      TEXT          NOT NULL,
  mercado       TEXT          NOT NULL,
  total         NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  estado        TEXT          NOT NULL DEFAULT 'pendiente'
                CHECK (estado IN ('pendiente', 'entregado', 'cobrado')),
  ejemplo       BOOLEAN       NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS pedido_items (
  id                 BIGSERIAL PRIMARY KEY,
  pedido_id          TEXT          NOT NULL REFERENCES pedidos (id) ON DELETE CASCADE,
  producto           TEXT          NOT NULL,
  cantidad           NUMERIC(12,3) NOT NULL CHECK (cantidad > 0),
  unidad             TEXT          NOT NULL,
  precio             NUMERIC(12,2) NOT NULL CHECK (precio >= 0),  -- Bs por unidad
  total              NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  equivale_cantidad  NUMERIC(12,3),
  equivale_unidad    TEXT
);
CREATE INDEX IF NOT EXISTS pedido_items_pedido_idx ON pedido_items (pedido_id);

-- Reservas que hacen las familias en un puesto.
CREATE TABLE IF NOT EXISTS reservas (
  id             TEXT PRIMARY KEY,
  fecha          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  puesto_id      TEXT          NOT NULL,
  familia        TEXT          NOT NULL,
  total          NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  pago           TEXT          NOT NULL CHECK (pago IN ('qr', 'efectivo', 'fiado')),
  estado         TEXT          NOT NULL DEFAULT 'reservada'
                 CHECK (estado IN ('reservada', 'entregada')),
  calificacion   SMALLINT      CHECK (calificacion BETWEEN 1 AND 5),
  ejemplo        BOOLEAN       NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS reserva_items (
  id          BIGSERIAL PRIMARY KEY,
  reserva_id  TEXT          NOT NULL REFERENCES reservas (id) ON DELETE CASCADE,
  producto    TEXT          NOT NULL,
  cantidad    NUMERIC(12,3) NOT NULL CHECK (cantidad > 0),
  unidad      TEXT          NOT NULL,
  precio      NUMERIC(12,2) NOT NULL CHECK (precio >= 0),
  total       NUMERIC(12,2) NOT NULL CHECK (total >= 0)
);
CREATE INDEX IF NOT EXISTS reserva_items_reserva_idx ON reserva_items (reserva_id);

-- Estrellas que las familias dan a un puesto.
CREATE TABLE IF NOT EXISTS calificaciones (
  id         TEXT PRIMARY KEY,
  fecha      TIMESTAMPTZ NOT NULL DEFAULT now(),
  puesto_id  TEXT        NOT NULL,
  estrellas  SMALLINT    NOT NULL CHECK (estrellas BETWEEN 1 AND 5),
  familia    TEXT        NOT NULL,
  ejemplo    BOOLEAN     NOT NULL DEFAULT false
);

-- Precios que la caserita decide mostrar a las familias.
CREATE TABLE IF NOT EXISTS publicados (
  producto  TEXT          NOT NULL,
  unidad    TEXT          NOT NULL,
  precio    NUMERIC(12,2) NOT NULL CHECK (precio >= 0),
  PRIMARY KEY (producto, unidad)
);
