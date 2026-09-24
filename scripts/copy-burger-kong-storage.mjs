import { createClient } from '@supabase/supabase-js';

const SOURCE_URL = 'https://wkcijycvvvsspiqptoyi.supabase.co';
const DESTINATION_URL = 'https://lzkcqrelwynecsyvhhsy.supabase.co';

const BUCKET = 'product-images';

const destinationKey = process.env.DORIAN_SERVICE_ROLE_KEY;

if (!destinationKey) {
  throw new Error(
    'Falta la variable de entorno DORIAN_SERVICE_ROLE_KEY.'
  );
}

const destination = createClient(
  DESTINATION_URL,
  destinationKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

const objects = [
  {
    path: '02c13fff-7805-433d-a3b1-6ac21ddff673/main',
    contentType: 'image/jpeg',
    cacheControl: '3600',
  },
  {
    path: '25a16470-c0ed-4b68-a085-78b66a54cb8b/main',
    contentType: 'image/jpeg',
    cacheControl: '3600',
  },
  {
    path: '889e2457-e025-4f0a-9d6e-bd7c87da433c/main',
    contentType: 'image/jpeg',
    cacheControl: '3600',
  },
  {
    path: '905901b9-031d-4ed5-9616-aec73fb92fca/main',
    contentType: 'image/jpeg',
    cacheControl: '3600',
  },
  {
    path: '93014bac-ba7f-4ce4-ac05-5984ca1a8a4e/main',
    contentType: 'image/jpeg',
    cacheControl: '3600',
  },
  {
    path: '95668898-969b-40d4-9eeb-8fd76f95c683/1789083464018.jpg',
    contentType: 'image/jpeg',
    cacheControl: '31536000',
  },
  {
    path: '95668898-969b-40d4-9eeb-8fd76f95c683/main',
    contentType: 'image/jpeg',
    cacheControl: '3600',
  },
  {
    path: 'a6a5df0a-dfb0-4dd8-b690-2eddf1c0c7c1/main',
    contentType: 'image/jpeg',
    cacheControl: '3600',
  },
];

let copied = 0;

for (const object of objects) {
  const sourceUrl =
    `${SOURCE_URL}/storage/v1/object/public/${BUCKET}/${object.path}`;

  console.log(`Descargando: ${object.path}`);

  const response = await fetch(sourceUrl);

  if (!response.ok) {
    throw new Error(
      `No se pudo descargar ${object.path}: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.arrayBuffer();

  console.log(`Subiendo: ${object.path}`);

  const { error } = await destination.storage
    .from(BUCKET)
    .upload(
      object.path,
      data,
      {
        contentType: object.contentType,
        cacheControl: object.cacheControl,
        upsert: true,
      }
    );

  if (error) {
    throw new Error(
      `Error subiendo ${object.path}: ${error.message}`
    );
  }

  copied += 1;
  console.log(`OK (${copied}/${objects.length})`);
}

console.log('');
console.log(`Migración terminada. ${copied} archivos copiados.`);