import * as SQLite from 'expo-sqlite';

export const getLocalDb = async () => {
  return await SQLite.openDatabaseAsync('burger_kong_local.db');
};

export const initLocalDatabase = async () => {
  const db = await getLocalDb();
  
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      is_available INTEGER DEFAULT 1,
      image_url TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories (id)
    );

    CREATE TABLE IF NOT EXISTS modifiers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      extra_price REAL NOT NULL,
      is_available INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      profile_id TEXT,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pendiente',
      payment_method TEXT NOT NULL,
      sincronizado INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products (id)
    );

    CREATE TABLE IF NOT EXISTS sale_item_modifiers (
      id TEXT PRIMARY KEY,
      sale_item_id TEXT NOT NULL,
      modifier_id TEXT NOT NULL,
      extra_price_applied REAL NOT NULL,
      FOREIGN KEY (sale_item_id) REFERENCES sale_items (id) ON DELETE CASCADE,
      FOREIGN KEY (modifier_id) REFERENCES modifiers (id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  console.log("¡Base de datos SQLite local mapeada e inicializada con éxito!");
};